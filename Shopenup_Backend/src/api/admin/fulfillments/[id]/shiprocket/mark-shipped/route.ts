import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from '@shopenup/framework';
import { Modules } from "@shopenup/framework/utils";
import type { IFulfillmentModuleService, IOrderModuleService } from "@shopenup/framework/types";

/**
 * Admin API endpoint to mark a fulfillment as shipped
 * 
 * POST /admin/fulfillments/:id/shiprocket/mark-shipped
 * 
 * This endpoint:
 * 1. Validates the fulfillment exists and has AWB
 * 2. Updates fulfillment.shipped_at timestamp
 * 3. Updates fulfillment.data with shipping info
 * 
 * Used by:
 * - Admin manually marking as shipped
 * - Shiprocket webhook when courier picks up the package
 * 
 * Request body (optional - for webhook):
 * {
 *   "tracking_status": "Picked Up",
 *   "tracking_location": "Mumbai Hub",
 *   "courier_name": "Xpressbees Surface",
 *   "awb": "1411235796"
 * }
 */

export async function POST(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse,
) {
  const { id: fulfillmentId } = req.params;

  try {

    // Parse request body (optional - may come from webhook)
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const {
      tracking_status,
      tracking_location,
      courier_name,
      awb,
      shipped_at: webhookShippedAt,
    } = body;

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

    const fulfillmentData = fulfillment.data as any || {};

    // Check if AWB exists (required for shipping)
    const awbCode = awb || fulfillmentData.awb_code;
    if (!awbCode) {
      return res.status(400).json({
        success: false,
        error: 'AWB not assigned',
        message: 'Cannot mark as shipped - fulfillment does not have an AWB assigned',
      });
    }

    // Check if already shipped
    if (fulfillment.shipped_at) {
      return res.json({
        success: true,
        fulfillment_id: fulfillmentId,
        shipped_at: fulfillment.shipped_at,
        message: 'Fulfillment is already marked as shipped',
        already_shipped: true,
      });
    }

    // Check if canceled
    if (fulfillment.canceled_at) {
      return res.status(400).json({
        success: false,
        error: 'Fulfillment canceled',
        message: 'Cannot mark canceled fulfillment as shipped',
      });
    }

    const shippedAt = webhookShippedAt || new Date().toISOString();

    // Update fulfillment data with shipping info
    const updatedData = {
      ...fulfillmentData,
      last_status: tracking_status || 'Shipped',
      last_tracking_location: tracking_location,
      shipped_at: shippedAt,
      // Update courier name if provided from webhook
      ...(courier_name && { courier_name }),
    };

    // Update fulfillment with shipped_at timestamp
    await fulfillmentModuleService.updateFulfillment(fulfillmentId, {
      shipped_at: new Date(shippedAt),
      data: updatedData,
    });


    // Try to update the order status as well (if we can find the order)
    try {
      // Get order_id from fulfillment data or query
      const query = req.scope.resolve("query") as any;
      const { data: [orderFulfillment] } = await query.graph({
        entity: "order_fulfillment",
        fields: ["order_id"],
        filters: { fulfillment_id: fulfillmentId },
      });

      
    } catch (orderError: any) {
      console.warn('[Shiprocket Mark Shipped] ⚠️ Could not update order status:', orderError?.message);
      // Don't fail the request - fulfillment was updated successfully
    }

    return res.json({
      success: true,
      fulfillment_id: fulfillmentId,
      shipped_at: shippedAt,
      tracking_status: tracking_status || 'Shipped',
      message: 'Fulfillment marked as shipped successfully',
    });
  } catch (error) {
    console.error('[Shiprocket Mark Shipped] ❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to mark as shipped',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}


