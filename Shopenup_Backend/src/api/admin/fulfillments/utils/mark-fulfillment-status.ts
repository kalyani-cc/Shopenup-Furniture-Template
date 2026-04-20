import { ShopenupRequest } from '@shopenup/framework';
import { Modules } from '@shopenup/framework/utils';
import type { IFulfillmentModuleService, IOrderModuleService } from '@shopenup/framework/types';
import { standardizeShiprocketMetadata } from './shiprocket-metadata';
import { createOrderShipmentWorkflow } from "@shopenup/shopenup/core-flows"
import { markOrderFulfillmentAsDeliveredWorkflow } from "@shopenup/shopenup/core-flows"

/**
 * Mark fulfillment as shipped (shared logic for webhook and API endpoint)
 */
export async function markFulfillmentAsShippedInternal(
  orderId: string,
  fulfillmentId: string,
  req: ShopenupRequest,
  options: {
    items?: Array<{ id: string; quantity: number }>;
    labels?: string[];
    no_notification?: boolean;
    tracking_status?: string;
    tracking_location?: string;
    courier_name?: string;
    awb?: string;
    shipped_at?: string;
  },
  logger: any,
): Promise<{ success: boolean; fulfillment_id: string; order_id: string; shipped_at: string }> {
  const {
    items = [],
    labels = [],
    no_notification = false,
    tracking_status,
    tracking_location,
    courier_name,
    awb,
    shipped_at: webhookShippedAt,
  } = options;

  // Resolve services
  const fulfillmentModuleService: IFulfillmentModuleService = req.scope.resolve(Modules.FULFILLMENT);
  const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER);
  
  // Validate order exists
  const order = await orderModuleService.retrieveOrder(orderId);
  if (!order) {
    throw new Error(`Order with ID ${orderId} not found`);
  }
  
  // Get fulfillment details
  const fulfillment = await fulfillmentModuleService.retrieveFulfillment(fulfillmentId);
  if (!fulfillment) {
    throw new Error(`Fulfillment with ID ${fulfillmentId} not found`);
  }

  // Verify fulfillment belongs to this order
  const query = req.scope.resolve("query") as any;
  const { data: orderFulfillments } = await query.graph({
    entity: "order_fulfillment",
    fields: ["order_id", "fulfillment_id"],
    filters: { order_id: orderId, fulfillment_id: fulfillmentId },
  });

  if (!orderFulfillments || orderFulfillments.length === 0) {
    throw new Error(`Fulfillment ${fulfillmentId} does not belong to order ${orderId}`);
  }

  const fulfillmentData = (fulfillment.data as any) || {};

  // Check if AWB exists (required for shipping)
  const awbCode = awb || fulfillmentData.awb_code;
  if (!awbCode) {
    throw new Error('Cannot mark as shipped - fulfillment does not have an AWB assigned');
  }

  // Check if already shipped
  if (fulfillment.shipped_at) {
    logger.info(`[Mark Fulfillment Status] ℹ️ Fulfillment ${fulfillment.id} already shipped at: ${fulfillment.shipped_at}`);
    return {
      success: true,
      fulfillment_id: fulfillmentId,
      order_id: orderId,
      shipped_at: fulfillment.shipped_at.toISOString(),
    };
  }

  // Check if canceled
  if (fulfillment.canceled_at) {
    throw new Error('Cannot mark canceled fulfillment as shipped');
  }

  const shippedAt = webhookShippedAt || new Date().toISOString();

  // Standardize and update Shiprocket metadata
  const standardizedMetadata = standardizeShiprocketMetadata(fulfillmentData, {
    last_status: tracking_status || 'Shipped',
    last_status_at: shippedAt,
    shipped_at: shippedAt,
    ...(courier_name && { courier_name }),
  });

  // Update fulfillment with shipped_at timestamp
  await fulfillmentModuleService.updateFulfillment(fulfillmentId, {
    // shipped_at: new Date(shippedAt),
    data: standardizedMetadata,
  });

  logger.info(`[Mark Fulfillment Status] ✅ Fulfillment ${fulfillmentId} marked as shipped`);

  // Create shipment records if items are provided
  if (items && items.length > 0) {
    try {
      // await orderModuleService.createShipment(orderId, {
      //   fulfillment_id: fulfillmentId,
      //   items: items.map((item: any) => ({
      //     id: item.id,
      //     quantity: item.quantity,
      //   })),
      //   labels: labels || [],
      //   no_notification: no_notification,
      // });
      const { result } = await createOrderShipmentWorkflow(req.scope).run({
        input: {
          order_id: orderId,
          fulfillment_id: fulfillmentId,
          no_notification: !no_notification,
          items,          // [{ id: "fulit_123", quantity: 1 }]
        },
      })
      logger.info(`[Mark Fulfillment Status] ✅ Shipment records created: ${JSON.stringify(result)}`);
    } catch (shipmentError: any) {
      logger.warn(`[Mark Fulfillment Status] ⚠️ Could not create shipment records: ${shipmentError?.message}`);
      // Don't fail the request - fulfillment was updated successfully
    }
  }

  return {
    success: true,
    fulfillment_id: fulfillmentId,
    order_id: orderId,
    shipped_at: shippedAt,
  };
}

/**
 * Mark fulfillment as delivered (shared logic for webhook and API endpoint)
 */
export async function markFulfillmentAsDeliveredInternal(
  orderId: string,
  fulfillmentId: string,
  req: ShopenupRequest,
  options: {
    tracking_status?: string;
    tracking_location?: string;
    delivered_to?: string;
    pod_image?: string;
    delivered_at?: string;
  },
  logger: any,
): Promise<{ success: boolean; fulfillment_id: string; order_id: string; delivered_at: string }> {
  const {
    tracking_status,
    tracking_location,
    delivered_to,
    pod_image,
    delivered_at: webhookDeliveredAt,
  } = options;

  // Resolve services
  const fulfillmentModuleService: IFulfillmentModuleService = req.scope.resolve(Modules.FULFILLMENT);
  const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER);
  
  // Validate order exists
  const order = await orderModuleService.retrieveOrder(orderId);
  if (!order) {
    throw new Error(`Order with ID ${orderId} not found`);
  }
  
  // Get fulfillment details
  const fulfillment = await fulfillmentModuleService.retrieveFulfillment(fulfillmentId);
  if (!fulfillment) {
    throw new Error(`Fulfillment with ID ${fulfillmentId} not found`);
  }

  // Verify fulfillment belongs to this order
  const query = req.scope.resolve("query") as any;
  const { data: orderFulfillments } = await query.graph({
    entity: "order_fulfillment",
    fields: ["order_id", "fulfillment_id"],
    filters: { order_id: orderId, fulfillment_id: fulfillmentId },
  });

  if (!orderFulfillments || orderFulfillments.length === 0) {
    throw new Error(`Fulfillment ${fulfillmentId} does not belong to order ${orderId}`);
  }

  const fulfillmentData = (fulfillment.data as any) || {};

  // Check if AWB exists
  const awbCode = fulfillmentData.awb_code;
  if (!awbCode) {
    throw new Error('Cannot mark as delivered - fulfillment does not have an AWB assigned');
  }

  // Check if already delivered
  if (fulfillment.delivered_at) {
    logger.info(`[Mark Fulfillment Status] ℹ️ Fulfillment ${fulfillment.id} already delivered at: ${fulfillment.delivered_at}`);
    return {
      success: true,
      fulfillment_id: fulfillmentId,
      order_id: orderId,
      delivered_at: fulfillment.delivered_at.toISOString(),
    };
  }

  // Check if canceled
  if (fulfillment.canceled_at) {
    throw new Error('Cannot mark canceled fulfillment as delivered');
  }

  const deliveredAt = webhookDeliveredAt || new Date().toISOString();

  // If not yet shipped, mark as shipped first
  let shippedAt = fulfillment.shipped_at;
  if (!shippedAt) {
    logger.info(`[Mark Fulfillment Status] ℹ️ Fulfillment ${fulfillment.id} not shipped yet, marking as shipped first`);
    shippedAt = new Date(deliveredAt);
  }

  // Standardize and update Shiprocket metadata
  const standardizedMetadata = standardizeShiprocketMetadata(fulfillmentData, {
    last_status: tracking_status || 'Delivered',
    last_status_at: deliveredAt,
    shipped_at: shippedAt.toISOString(),
    delivered_at: deliveredAt,
    // Removed 'pod_image', 'delivered_to', and 'last_tracking_location' since they're not known properties of ShiprocketMetadata
  });

  const { result } = await markOrderFulfillmentAsDeliveredWorkflow(req.scope).run({
    input: {
      orderId,        // e.g. "order_ouc7y48qqumjh12ref"
      fulfillmentId,  // e.g. "ful_ohhaecrp9zcmjh1cd3m"
    },
  })


  // Update fulfillment with delivered_at timestamp
  await fulfillmentModuleService.updateFulfillment(fulfillmentId, {
    // shipped_at: shippedAt,
    // delivered_at: new Date(deliveredAt),
    data: standardizedMetadata,
  });

  logger.info(`[Mark Fulfillment Status] ✅ Fulfillment ${fulfillmentId} marked as delivered`);

  return {
    success: true,
    fulfillment_id: fulfillmentId,
    order_id: orderId,
    delivered_at: deliveredAt,
  };
}

