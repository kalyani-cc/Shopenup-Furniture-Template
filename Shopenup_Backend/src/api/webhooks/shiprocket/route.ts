import { ShopenupRequest, ShopenupResponse } from '@shopenup/framework';
import { Modules } from '@shopenup/framework/utils';
import type { IFulfillmentModuleService } from '@shopenup/framework/types';
import { standardizeShiprocketMetadata } from '../../admin/fulfillments/utils/shiprocket-metadata';
import {
  markFulfillmentAsShippedInternal,
  markFulfillmentAsDeliveredInternal,
} from '../../admin/fulfillments/utils/mark-fulfillment-status';

/**
 * Shiprocket Webhook Endpoint
 * 
 * POST /api/webhooks/shiprocket?token=<WEBHOOK_SECRET>
 * 
 * This endpoint:
 * 1. Verifies webhook token from query parameter (?token=WEBHOOK_SECRET)
 * 2. Receives webhook from Shiprocket when shipment status changes
 * 3. Responds immediately with 200 OK (critical for Shiprocket)
 * 4. Processes webhook asynchronously
 * 5. Finds fulfillment by AWB code or order_id
 * 6. Updates fulfillment status based on Shiprocket status
 * 
 * Authentication:
 * - Token must be provided in query parameter: ?token=<WEBHOOK_SECRET>
 * - WEBHOOK_SECRET must be set in environment variables
 * - If token doesn't match, webhook is rejected (but still returns 200 to avoid retries)
 * 
 * Shiprocket Webhook Payload (Actual Structure):
 * {
 *   "awb": 59629792084,
 *   "current_status": "Delivered",
 *   "order_id": "13905312",
 *   "current_timestamp": "2021-07-02 16:41:59",
 *   "etd": "2021-07-02 16:41:59",
 *   "current_status_id": 7,
 *   "shipment_status": "Delivered",
 *   "shipment_status_id": 7,
 *   "channel_order_id": "enter your channel order id",
 *   "channel": "enter your channel name",
 *   "courier_name": "enter courier_name",
 *   "scans": [...]
 * }
 * 
 * Status Mapping:
 * - "Shipped" / "SHIPMENT PICKED UP" -> markFulfillmentAsShipped
 * - "Delivered" / "SHIPMENT DELIVERED" -> markFulfillmentAsDelivered
 * - "Cancelled" -> cancelFulfillment
 * - "RTO Initiated" -> mark RTO initiated
 * - Other statuses -> metadata update only
 */
export async function POST(
  req: ShopenupRequest,
  res: ShopenupResponse,
) {
  const payload = req.body;
  const logger = req.scope.resolve('logger') as any;

  // Verify webhook token/secret
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (webhookSecret) {
    const isValid = verifyWebhookToken(req, webhookSecret);
    
    if (!isValid) {
      logger.warn('[Shiprocket Webhook] ⚠️ Invalid webhook token - request rejected');
      // Still return 200 to avoid retries, but don't process
      return res.status(200).json({ 
        received: true,
        error: 'Invalid token',
      });
    }
    
    logger.info('[Shiprocket Webhook] ✅ Webhook token verified');
  } else {
    logger.warn('[Shiprocket Webhook] ⚠️ WEBHOOK_SECRET not set - webhook authentication disabled');
  }

  // Always respond immediately (critical for Shiprocket)
  res.status(200).json({ received: true });

  // Process webhook asynchronously (do NOT block webhook response)
  processShiprocketWebhook(payload, req).catch((error) => {
    logger.error('[Shiprocket Webhook] ❌ Error processing webhook:', error);
  });

  return;
}

/**
 * Verify webhook token/secret from query parameter
 * Checks for token in URL: ?token=<secret>
 * Example: https://yourdomain.com/api/webhooks/shiprocket?token=sr
 */
function verifyWebhookToken(req: ShopenupRequest, expectedSecret: string): boolean {
  try {
    // Check query parameter
    const url = new URL(req.url || '', 'http://localhost');
    const tokenParam = url.searchParams.get('token');
    
    if (tokenParam && tokenParam === expectedSecret) {
      return true;
    }
  } catch (error) {
    // URL parsing failed
    return false;
  }

  return false;
}

/**
 * Process Shiprocket webhook payload asynchronously
 */
async function processShiprocketWebhook(
  payload: any,
  req: ShopenupRequest,
) {
  const logger = req.scope.resolve('logger') as any;
  const fulfillmentModuleService: IFulfillmentModuleService = req.scope.resolve(Modules.FULFILLMENT);

  try {
    logger.info('[Shiprocket Webhook] 📥 Received webhook payload:', JSON.stringify(payload, null, 2));

    // Extract webhook data (actual Shiprocket payload structure)
    const {
      awb,
      current_status,
      shipment_status,
      order_id: shiprocketOrderId,
      current_timestamp,
      etd,
      current_status_id,
      shipment_status_id,
      courier_name,
      channel_order_id,
      channel,
      scans,
    } = payload;

    // Use current_status or shipment_status (prefer current_status)
    const status = current_status || shipment_status;
    
    // Use current_timestamp or etd for scan date
    const scanDate = current_timestamp || etd || new Date().toISOString();

    // Convert AWB to string for comparison (AWB can be number or string)
    const awbCode = awb ? awb.toString() : null;

    if (!awbCode && !shiprocketOrderId) {
      logger.warn('[Shiprocket Webhook] ⚠️ No AWB or order_id in payload, skipping');
      return;
    }

    // Find fulfillment by AWB code (primary) or order_id (fallback)
    const fulfillment = await findFulfillmentByAwbOrOrderId(
      awbCode,
      shiprocketOrderId,
      req,
      fulfillmentModuleService,
      logger,
    );

    if (!fulfillment) {
      logger.warn(
        `[Shiprocket Webhook] ⚠️ Fulfillment not found for AWB: ${awbCode} or order_id: ${shiprocketOrderId}`,
      );
      return;
    }

    logger.info(
      `[Shiprocket Webhook] ✅ Found fulfillment ${fulfillment.id} for AWB: ${awbCode || 'N/A'} or order_id: ${shiprocketOrderId || 'N/A'}`,
    );

    // Update fulfillment metadata with standardized structure
    const fulfillmentData = (fulfillment.data as any) || {};
    
    // Standardize and update Shiprocket metadata (only informative fields)
    const standardizedMetadata = standardizeShiprocketMetadata(fulfillmentData, {
      ...(awbCode && { awb_code: awbCode }),
      last_status: status,
      last_status_at: scanDate,
      current_status_id: current_status_id || shipment_status_id,
      ...(courier_name && { courier_name }),
      ...(shiprocketOrderId && { shiprocket_order_id: typeof shiprocketOrderId === 'string' ? parseInt(shiprocketOrderId, 10) : shiprocketOrderId }),
      ...(scans && Array.isArray(scans) && { scans }),
    });

    // Update fulfillment metadata with standardized structure
    await fulfillmentModuleService.updateFulfillment(fulfillment.id, {
      data: standardizedMetadata,
    });

    logger.info(
      `[Shiprocket Webhook] 📝 Updated fulfillment metadata for ${fulfillment.id}`,
    );

    // Process status-specific actions
    await processStatusUpdate(
      status,
      fulfillment,
      fulfillmentModuleService,
      req,
      {
        awb: awbCode,
        scan_date: scanDate,
        courier_name,
      },
      logger,
    );
  } catch (error) {
    logger.error('[Shiprocket Webhook] ❌ Error processing webhook:', error);
    if (error instanceof Error) {
      logger.error('[Shiprocket Webhook] Error message:', error.message);
      logger.error('[Shiprocket Webhook] Error stack:', error.stack);
    }
  }
}

/**
 * Find fulfillment by AWB code or Shiprocket order_id
 */
async function findFulfillmentByAwbOrOrderId(
  awbCode: string | null,
  orderId: string | number | null,
  req: ShopenupRequest,
  fulfillmentModuleService: IFulfillmentModuleService,
  logger: any,
): Promise<any | null> {
  try {
    const query = req.scope.resolve('query') as any;
    const { data: fulfillments } = await query.graph({
      entity: 'fulfillment',
      fields: ['id', 'data', 'shipped_at', 'delivered_at', 'canceled_at', 'tracking_numbers'],
    });

    // Find by AWB code (primary method)
    if (awbCode) {
      const fulfillment = fulfillments.find((f: any) => matchesAwb(f, awbCode));
      if (fulfillment) {
        logger.info(`[Shiprocket Webhook] Found fulfillment by AWB: ${awbCode}`);
        return await fulfillmentModuleService.retrieveFulfillment(fulfillment.id);
      }
    }

    // Find by order_id (fallback)
    if (orderId) {
      const orderIdStr = orderId.toString();
      const fulfillment = fulfillments.find((f: any) => matchesOrderId(f, orderIdStr));
      if (fulfillment) {
        logger.info(`[Shiprocket Webhook] Found fulfillment by order_id: ${orderId}`);
        return await fulfillmentModuleService.retrieveFulfillment(fulfillment.id);
      }
    }

    logger.warn(
      `[Shiprocket Webhook] ⚠️ Could not find fulfillment by AWB: ${awbCode || 'N/A'} or order_id: ${orderId || 'N/A'}`,
    );

    return null;
  } catch (error: any) {
    logger.error('[Shiprocket Webhook] Error finding fulfillment:', error?.message);
    return null;
  }
}

/**
 * Check if fulfillment matches AWB code
 */
function matchesAwb(fulfillment: any, awbCode: string): boolean {
  const data = fulfillment.data as any || {};
  const trackingNumbers = fulfillment.tracking_numbers || [];

  return (
    data.awb_code === awbCode ||
    data.awb_code?.toString() === awbCode ||
    data.shiprocket?.awb === awbCode ||
    data.shiprocket?.awb_code === awbCode ||
    trackingNumbers.includes(awbCode)
  );
}

/**
 * Check if fulfillment matches Shiprocket order_id
 */
function matchesOrderId(fulfillment: any, orderIdStr: string): boolean {
  const data = fulfillment.data as any || {};

  return (
    data.shiprocket?.order_id === orderIdStr ||
    data.shiprocket?.order_id?.toString() === orderIdStr ||
    data.shiprocket_order_id === orderIdStr ||
    data.shiprocket_order_id?.toString() === orderIdStr
  );
}

/**
 * Process status update based on Shiprocket status
 */
async function processStatusUpdate(
  currentStatus: string,
  fulfillment: any,
  fulfillmentModuleService: IFulfillmentModuleService,
  req: ShopenupRequest,
  webhookData: {
    awb?: string;
    scan_date?: string;
    courier_name?: string;
  },
  logger: any,
) {
  if (!currentStatus) {
    return;
  }

  const status = currentStatus.trim();

  logger.info(`[Shiprocket Webhook] 🔄 Processing status update: ${status} for fulfillment ${fulfillment.id}`);

  // Get order_id from fulfillment
  let orderId: string | null = null;
  try {
    const query = req.scope.resolve("query") as any;
    const { data: orderFulfillments } = await query.graph({
      entity: "order_fulfillment",
      fields: ["order_id"],
      filters: { fulfillment_id: fulfillment.id },
    });

    if (orderFulfillments && orderFulfillments.length > 0) {
      orderId = orderFulfillments[0].order_id;
    }
  } catch (error: any) {
    logger.warn('[Shiprocket Webhook] ⚠️ Could not get order_id:', error?.message);
  }

  if (!orderId) {
    logger.warn(`[Shiprocket Webhook] ⚠️ Could not find order_id for fulfillment ${fulfillment.id}, falling back to direct update`);
  }

  switch (status) {
    case 'Shipped':
    case 'SHIPMENT PICKED UP':
      await markAsShipped(fulfillment, fulfillmentModuleService, req, webhookData, orderId, logger);
      break;

    case 'Delivered':
    case 'SHIPMENT DELIVERED':
      await markAsDelivered(fulfillment, fulfillmentModuleService, req, webhookData, orderId, logger);
      break;

    case 'Cancelled':
    case 'Canceled':
      await cancelFulfillment(fulfillment, fulfillmentModuleService, logger);
      break;

    case 'RTO Initiated':
      await markRtoInitiated(fulfillment, fulfillmentModuleService, webhookData, logger);
      break;

    case 'RTO Delivered':
      await markRtoDelivered(fulfillment, fulfillmentModuleService, webhookData, logger);
      break;

    case 'AWB Assigned':
    case 'Pickup Scheduled':
    case 'In Transit':
    case 'Out for Delivery':
      // Just update metadata (already done above)
      logger.info(
        `[Shiprocket Webhook] ℹ️ Status ${status} - metadata updated only`,
      );
      break;

    default:
      logger.info(
        `[Shiprocket Webhook] ℹ️ Unknown status ${status} - metadata updated only`,
      );
      break;
  }
}

/**
 * Mark fulfillment as shipped (idempotent)
 * Calls the order-based shipments endpoint if order_id is available
 */
async function markAsShipped(
  fulfillment: any,
  fulfillmentModuleService: IFulfillmentModuleService,
  req: ShopenupRequest,
  webhookData: {
    awb?: string;
    scan_date?: string;
    courier_name?: string;
  },
  orderId: string | null,
  logger: any,
) {
  // Idempotency check
  if (fulfillment.shipped_at) {
    logger.info(
      `[Shiprocket Webhook] ℹ️ Fulfillment ${fulfillment.id} already shipped at: ${fulfillment.shipped_at}`,
    );
    return;
  }

  const fulfillmentDataCheck = (fulfillment.data as any) || {};
  if (fulfillment.canceled_at || fulfillmentDataCheck.canceled_at || fulfillmentDataCheck.canceled) {
    logger.warn(
      `[Shiprocket Webhook] ⚠️ Cannot mark canceled fulfillment ${fulfillment.id} as shipped`,
    );
    return;
  }

  // If we have order_id, call the same API endpoint handler that admin UI uses
  if (orderId) {
    try {
      // Get order items (same way admin UI does)
      const orderModuleService = req.scope.resolve(Modules.ORDER) as any;
      const order = await orderModuleService.retrieveOrder(orderId, {
        relations: ['items'],
      });

      // Get fulfillment items from order items
      // Map order items to fulfillment items format (same as admin UI)
      const items = (order.items || []).map((item: any) => ({
        id: item.id,
        quantity: item.quantity || 1,
      }));

      logger.info(`[Shiprocket Webhook] 📦 Found ${items.length} items from order ${orderId}`);

      // Prepare payload (same as admin UI sends)
      const shippedPayload = {
        items,
        labels: [],
        no_notification: false,
      };

      logger.info(`[Shiprocket Webhook] 📞 Calling markFulfillmentAsShippedInternal for order ${orderId}, fulfillment ${fulfillment.id}`);
      logger.info(`[Shiprocket Webhook] 📦 Payload: ${JSON.stringify(shippedPayload, null, 2)}`);

      await markFulfillmentAsShippedInternal(
        orderId,
        fulfillment.id,
        req,
        shippedPayload,
        logger,
      );

      logger.info(`[Shiprocket Webhook] ✅ Marked fulfillment ${fulfillment.id} as shipped`);
      return;
    } catch (error: any) {
      logger.warn(
        `[Shiprocket Webhook] ⚠️ Error calling shipments handler: ${error?.message}, falling back to direct update`,
      );
      // Fall through to direct update
    }
  }

  // Fallback: Direct update if order_id not available or API call failed
  logger.warn(`[Shiprocket Webhook] ⚠️ Falling back to direct update for fulfillment ${fulfillment.id}`);
  
  const fulfillmentData = (fulfillment.data as any) || {};
  const shippedAt = webhookData.scan_date ? new Date(webhookData.scan_date) : new Date();

  const standardizedMetadata = standardizeShiprocketMetadata(fulfillmentData, {
    last_status: 'Shipped',
    shipped_at: shippedAt.toISOString(),
    ...(webhookData.courier_name && { courier_name: webhookData.courier_name }),
  });

  await fulfillmentModuleService.updateFulfillment(fulfillment.id, {
    shipped_at: shippedAt,
    data: standardizedMetadata,
  });

  logger.info(`[Shiprocket Webhook] ✅ Marked fulfillment ${fulfillment.id} as shipped (fallback)`);
}

/**
 * Mark fulfillment as delivered (idempotent)
 * Calls the order-based mark-as-delivered endpoint if order_id is available
 */
async function markAsDelivered(
  fulfillment: any,
  fulfillmentModuleService: IFulfillmentModuleService,
  req: ShopenupRequest,
  webhookData: {
    awb?: string;
    scan_date?: string;
    courier_name?: string;
  },
  orderId: string | null,
  logger: any,
) {
  // Idempotency check
  if (fulfillment.delivered_at) {
    logger.info(
      `[Shiprocket Webhook] ℹ️ Fulfillment ${fulfillment.id} already delivered at: ${fulfillment.delivered_at}`,
    );
    return;
  }

  const fulfillmentDataCheck = (fulfillment.data as any) || {};
  if (fulfillment.canceled_at || fulfillmentDataCheck.canceled_at || fulfillmentDataCheck.canceled) {
    logger.warn(
      `[Shiprocket Webhook] ⚠️ Cannot mark canceled fulfillment ${fulfillment.id} as delivered`,
    );
    return;
  }

  // If we have order_id, call the same API endpoint handler that admin UI uses
  if (orderId) {
    try {
      // Prepare payload (same as admin UI sends)
      const deliveredPayload = {};

      logger.info(`[Shiprocket Webhook] 📞 Calling markFulfillmentAsDeliveredInternal for order ${orderId}, fulfillment ${fulfillment.id}`);

      await markFulfillmentAsDeliveredInternal(
        orderId,
        fulfillment.id,
        req,
        deliveredPayload,
        logger,
      );

      logger.info(`[Shiprocket Webhook] ✅ Marked fulfillment ${fulfillment.id} as delivered`);
      return;
    } catch (error: any) {
      logger.warn(
        `[Shiprocket Webhook] ⚠️ Error calling mark-as-delivered handler: ${error?.message}, falling back to direct update`,
      );
      // Fall through to direct update
    }
  }

  // Fallback: Direct update if order_id not available or API call failed
  logger.warn(`[Shiprocket Webhook] ⚠️ Falling back to direct update for fulfillment ${fulfillment.id}`);
  
  const deliveredAt = webhookData.scan_date ? new Date(webhookData.scan_date) : new Date();
  const shippedAt = fulfillment.shipped_at || deliveredAt;

  if (!fulfillment.shipped_at) {
    logger.info(`[Shiprocket Webhook] ℹ️ Fulfillment ${fulfillment.id} not shipped yet, marking as shipped first`);
  }

  const fulfillmentData = (fulfillment.data as any) || {};
  const standardizedMetadata = standardizeShiprocketMetadata(fulfillmentData, {
    last_status: 'Delivered',
    shipped_at: shippedAt.toISOString(),
    delivered_at: deliveredAt.toISOString(),
    ...(webhookData.courier_name && { courier_name: webhookData.courier_name }),
  });

  await fulfillmentModuleService.updateFulfillment(fulfillment.id, {
    shipped_at: shippedAt,
    delivered_at: deliveredAt,
    data: standardizedMetadata,
  });

  logger.info(`[Shiprocket Webhook] ✅ Marked fulfillment ${fulfillment.id} as delivered (fallback)`);
}

/**
 * Cancel fulfillment (idempotent)
 */
async function cancelFulfillment(
  fulfillment: any,
  fulfillmentModuleService: IFulfillmentModuleService,
  logger: any,
) {
  const fulfillmentData = (fulfillment.data as any) || {};
  if (fulfillment.canceled_at || fulfillmentData.canceled_at) {
    logger.info(`[Shiprocket Webhook] ℹ️ Fulfillment ${fulfillment.id} already canceled`);
    return;
  }

  await updateFulfillmentStatus(
    fulfillment,
    fulfillmentModuleService,
    'Cancelled',
    undefined,
    logger,
  );
}

/**
 * Mark RTO initiated
 */
async function markRtoInitiated(
  fulfillment: any,
  fulfillmentModuleService: IFulfillmentModuleService,
  webhookData: {
    awb?: string;
    scan_date?: string;
    courier_name?: string;
  },
  logger: any,
) {
  await updateFulfillmentStatus(
    fulfillment,
    fulfillmentModuleService,
    'RTO Initiated',
    webhookData.courier_name,
    logger,
  );
}

/**
 * Mark RTO delivered
 */
async function markRtoDelivered(
  fulfillment: any,
  fulfillmentModuleService: IFulfillmentModuleService,
  webhookData: {
    awb?: string;
    scan_date?: string;
    courier_name?: string;
  },
  logger: any,
) {
  await updateFulfillmentStatus(
    fulfillment,
    fulfillmentModuleService,
    'RTO Delivered',
    webhookData.courier_name,
    logger,
  );
}

/**
 * Helper function to update fulfillment status metadata
 */
async function updateFulfillmentStatus(
  fulfillment: any,
  fulfillmentModuleService: IFulfillmentModuleService,
  status: string,
  courierName?: string,
  logger?: any,
) {
  const fulfillmentData = (fulfillment.data as any) || {};
  const standardizedMetadata = standardizeShiprocketMetadata(fulfillmentData, {
    last_status: status,
    ...(courierName && { courier_name: courierName }),
  });

  await fulfillmentModuleService.updateFulfillment(fulfillment.id, {
    data: standardizedMetadata,
  });

  logger?.info(`[Shiprocket Webhook] ✅ Marked fulfillment ${fulfillment.id} as ${status}`);
}

