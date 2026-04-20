import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from '@shopenup/framework';
import { Modules } from "@shopenup/framework/utils";
import type { IFulfillmentModuleService } from "@shopenup/framework/types";

/**
 * Admin API endpoint to mark a fulfillment as packed
 * 
 * POST /admin/fulfillments/:id/shiprocket/mark-packed
 * 
 * This endpoint:
 * 1. Validates the fulfillment has an AWB assigned
 * 2. Updates fulfillment.data.packed = true
 * 3. Stores packed_at timestamp
 * 
 * No Shiprocket API call is made - this is internal status tracking only
 */

export async function POST(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse,
) {
  const { id: fulfillmentId } = req.params;

  try {

    // Resolve fulfillment module service
    const fulfillmentModuleService: IFulfillmentModuleService = req.scope.resolve(Modules.FULFILLMENT);
    
    // Get fulfillment details
    const fulfillment = await fulfillmentModuleService.retrieveFulfillment(fulfillmentId);
    
    if (!fulfillment) {
      return res.status(404).json({
        success: false,
        error: 'Fulfillment not found',
        message: `Fulfillment with ID ${fulfillmentId} not found`,
      });
    }

    // Check if AWB exists
    const fulfillmentData = fulfillment.data as any || {};
    const awbCode = fulfillmentData.awb_code;
    
    if (!awbCode) {
      return res.status(400).json({
        success: false,
        error: 'AWB not assigned',
        message: 'Cannot mark as packed - fulfillment does not have an AWB assigned',
      });
    }

    // Check if already packed
    if (fulfillmentData.packed) {
      return res.status(400).json({
        success: false,
        error: 'Already packed',
        message: 'Fulfillment is already marked as packed',
      });
    }

    // Update fulfillment data to mark as packed
    await fulfillmentModuleService.updateFulfillment(fulfillmentId, {
      data: {
        ...fulfillmentData,
        packed: true,
        packed_at: new Date().toISOString(),
      },
    });


    return res.json({
      success: true,
      fulfillment_id: fulfillmentId,
      packed: true,
      packed_at: new Date().toISOString(),
      message: 'Fulfillment marked as packed successfully',
    });
  } catch (error) {
    console.error('[Shiprocket Mark Packed] ❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to mark as packed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

