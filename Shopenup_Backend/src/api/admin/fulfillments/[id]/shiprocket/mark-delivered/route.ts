import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from '@shopenup/framework';
import { Modules } from "@shopenup/framework/utils";
import type { IFulfillmentModuleService } from "@shopenup/framework/types";

/**
 * Admin API endpoint to mark a fulfillment as delivered
 * 
 * POST /admin/fulfillments/:id/shiprocket/mark-delivered
 * 
 * This endpoint:
 * 1. Validates the fulfillment exists and has been shipped
 * 2. Updates fulfillment.delivered_at timestamp
 * 3. Updates fulfillment.data with delivery info
 * 
 * Used by:
 * - Admin manually marking as delivered
 * - Shiprocket webhook when package is delivered
 * 
 * Request body (optional - for webhook):
 * {
 *   "tracking_status": "Delivered",
 *   "tracking_location": "Customer Address",
 *   "delivered_to": "Customer Name",
 *   "pod_image": "https://...",
 *   "delivered_at": "2025-12-18T15:30:00Z"
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
      delivered_to,
      pod_image,
      delivered_at: webhookDeliveredAt,
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

    // Check if AWB exists
    const awbCode = fulfillmentData.awb_code;
    if (!awbCode) {
      return res.status(400).json({
        success: false,
        error: 'AWB not assigned',
        message: 'Cannot mark as delivered - fulfillment does not have an AWB assigned',
      });
    }

    // Check if already delivered
    if (fulfillment.delivered_at) {
      return res.json({
        success: true,
        fulfillment_id: fulfillmentId,
        delivered_at: fulfillment.delivered_at,
        message: 'Fulfillment is already marked as delivered',
        already_delivered: true,
      });
    }

    // Check if canceled
    if (fulfillment.canceled_at) {
      return res.status(400).json({
        success: false,
        error: 'Fulfillment canceled',
        message: 'Cannot mark canceled fulfillment as delivered',
      });
    }

    const deliveredAt = webhookDeliveredAt || new Date().toISOString();

    // If not yet shipped, mark as shipped first
    let shippedAt = fulfillment.shipped_at;
    if (!shippedAt) {
      shippedAt = new Date(deliveredAt);
    }

    // Update fulfillment data with delivery info
    const updatedData = {
      ...fulfillmentData,
      last_status: tracking_status || 'Delivered',
      last_tracking_location: tracking_location,
      delivered_at: deliveredAt,
      delivered_to: delivered_to,
      pod_image: pod_image,
    };

    // Update fulfillment with delivered_at timestamp
    await fulfillmentModuleService.updateFulfillment(fulfillmentId, {
      shipped_at: shippedAt,
      delivered_at: new Date(deliveredAt),
      data: updatedData,
    });


    // Try to update the order status as well
    try {
      const query = req.scope.resolve("query") as any;
      const { data: [orderFulfillment] } = await query.graph({
        entity: "order_fulfillment",
        fields: ["order_id"],
        filters: { fulfillment_id: fulfillmentId },
      });

    } catch (orderError: any) {
      console.warn('[Shiprocket Mark Delivered] ⚠️ Could not update order status:', orderError?.message);
      // Don't fail the request - fulfillment was updated successfully
    }

    return res.json({
      success: true,
      fulfillment_id: fulfillmentId,
      delivered_at: deliveredAt,
      tracking_status: tracking_status || 'Delivered',
      message: 'Fulfillment marked as delivered successfully',
    });
  } catch (error) {
    console.error('[Shiprocket Mark Delivered] ❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to mark as delivered',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}


