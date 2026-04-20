import type { SubscriberArgs, SubscriberConfig } from "@shopenup/framework";
import { Modules } from "@shopenup/framework/utils";
import type { INotificationModuleService } from "@shopenup/framework/types";

// Log on module load to confirm subscriber is registered
console.log('✅ [payment-events] Subscriber module loaded and registered for events: payment.captured, payment.refunded');

/**
 * Subscriber that listens to payment.captured and payment.refunded events
 * and creates admin notifications following Medusa pattern
 * 
 * This subscriber:
 * 1. Listens to payment.captured event (when payment is captured)
 * 2. Listens to payment.refunded event (when payment is refunded)
 * 3. Creates admin feed notifications using channel: 'feed' and template: 'admin-ui'
 * 4. Stores notifications in database for frontend to fetch
 */
type PaymentEventData = {
  id?: string;
  payment_id?: string;
  amount?: number;
  currency_code?: string;
  [key: string]: any;
};

export default async function paymentEventHandler({
  event: { data, name },
  container,
}: SubscriberArgs<PaymentEventData>) {
  const logger = container.resolve("logger") || console;
  logger.info(`🔔 [payment-events] PAYMENT EVENT RECEIVED: ${name}`);
  logger.info(`🔔 [payment-events] Event data: ${JSON.stringify(data, null, 2)}`);

  try {
    const query = container.resolve('query');
    const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION);

    // ============================================
    // STEP 1: Handle payment.captured event
    // ============================================
    if (name === "payment.captured") {
      const eventData = data as PaymentEventData;
      const paymentId = eventData.id || eventData.payment_id;
      
      if (!paymentId) {
        logger.warn("❌ [payment-events] No payment ID in payment.captured event");
        return;
      }

      logger.info(`📦 [payment-events] Processing payment captured for payment: ${paymentId}`);

      // Fetch payment with order details
      const { data: payments } = await query.graph({
        entity: 'payment',
        fields: [
          'id',
          'amount',
          'currency_code',
          'captured_at',
          'payment_collection_id',
          'payment_collection.*',
          'payment_collection.order.*',
          'payment_collection.order.id',
          'payment_collection.order.display_id',
          'payment_collection.order.email',
          'payment_collection.order.customer.*',
          'payment_collection.order.customer.first_name',
          'payment_collection.order.customer.last_name',
        ],
        filters: { id: paymentId },
      });

      const payment = payments?.[0] as any;
      if (!payment) {
        logger.warn(`❌ [payment-events] Payment not found: ${paymentId}`);
        return;
      }

      const order = payment.payment_collection?.order;
      const orderDisplayId = order?.display_id || order?.id || 'N/A';
      const customerName = order?.customer
        ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || 'Customer'
        : 'Customer';
      const storeName = process.env.STORE_NAME || 'Store';
      const storefrontUrl = process.env.STOREFRONT_URL || '';

      // Check if notification already exists to prevent duplicates
      const { data: existingNotifications } = await query.graph({
        entity: 'notification',
        fields: ['id', 'data', 'template', 'resource_id'],
        filters: {
          deleted_at: null,
          $or: [
            { resource_type: 'payment', resource_id: payment.id },
            { template: 'admin-ui' },
          ],
        },
        pagination: { take: 100 },
      });

      const hasExisting = existingNotifications?.some((n: any) => {
        const data = n.data || {};
        return (
          (n.resource_type === 'payment' && n.resource_id === payment.id) ||
          (data.resource_type === 'payment' && data.resource_id === payment.id) ||
          (data.payment_id === payment.id) ||
          (n.template === 'admin-ui' && data.notification_type === 'payment_captured' && 
           (data.payment_id === payment.id || data.resource_id === payment.id))
        );
      });

      if (hasExisting) {
        logger.info(`⚠️ [payment-events] Payment captured notification already exists for payment ${paymentId}, skipping...`);
        return;
      }

      logger.info(`📧 [payment-events] Creating admin notification for payment captured...`);

      // Create admin notification using feed channel and admin-ui template
      await notificationModuleService.createNotifications({
        to: '', // Empty string for admin feed notifications
        channel: 'feed', // Feed channel for admin panel notifications
        template: 'admin-ui', // Required template for admin notifications
        data: {
          title: `Payment Captured · Order #${orderDisplayId}`,
          description: `Payment of ${payment.currency_code || 'USD'} ${payment.amount || 0} captured for Order #${orderDisplayId}${order?.customer ? ` (${customerName})` : ''}.`,
          notification_type: 'payment_captured',
          resource_type: 'payment',
          resource_id: payment.id,
          payment_id: payment.id,
          payment_collection_id: payment.payment_collection_id,
          order_id: order?.id,
          order_display_id: orderDisplayId,
          customer_name: customerName,
          customer_email: order?.email,
          amount: payment.amount,
          currency_code: payment.currency_code,
          payment_status: 'captured',
          order_link: order?.id ? `${storefrontUrl}/admin/orders/${order.id}` : '',
          payment_link: `${storefrontUrl}/admin/payments/${payment.id}`,
          alert_level: 'INFO',
          captured_at: payment.captured_at,
          triggered_at: new Date().toISOString(),
        },
      });

      logger.info(`✅ [payment-events] Payment captured notification created successfully for payment ${paymentId}`);
    }

    // ============================================
    // STEP 2: Handle payment.refunded event
    // ============================================
    if (name === "payment.refunded") {
      const eventData = data as PaymentEventData;
      const paymentId = eventData.id || eventData.payment_id;
      
      if (!paymentId) {
        logger.warn("❌ [payment-events] No payment ID in payment.refunded event");
        return;
      }

      logger.info(`💰 [payment-events] Processing payment refunded for payment: ${paymentId}`);

      // Fetch payment with order details
      const { data: payments } = await query.graph({
        entity: 'payment',
        fields: [
          'id',
          'amount',
          'currency_code',
          'refunded_amount',
          'payment_collection_id',
          'payment_collection.*',
          'payment_collection.order.*',
          'payment_collection.order.id',
          'payment_collection.order.display_id',
          'payment_collection.order.email',
          'payment_collection.order.customer.*',
          'payment_collection.order.customer.first_name',
          'payment_collection.order.customer.last_name',
        ],
        filters: { id: paymentId },
      });

      const payment = payments?.[0] as any;
      if (!payment) {
        logger.warn(`❌ [payment-events] Payment not found: ${paymentId}`);
        return;
      }

      const order = payment.payment_collection?.order;
      const orderDisplayId = order?.display_id || order?.id || 'N/A';
      const customerName = order?.customer
        ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || 'Customer'
        : 'Customer';
      const storeName = process.env.STORE_NAME || 'Store';
      const storefrontUrl = process.env.STOREFRONT_URL || '';
      const refundAmount = payment.refunded_amount || eventData.amount || 0;
      // Original amount might be in smallest currency unit, convert if needed
      let originalAmount = payment.amount || 0;
      // If original amount is very large (> 1000), assume it's in smallest currency unit
      if (originalAmount > 1000) {
        originalAmount = originalAmount / 100;
      }
      const isPartialRefund = refundAmount > 0 && refundAmount < originalAmount;
      
      // If refund amount is 0, use original amount for display
      const displayAmount = (refundAmount === 0 || refundAmount === 0.00) ? originalAmount : refundAmount;

      // Check if notification already exists to prevent duplicates
      const { data: existingNotifications } = await query.graph({
        entity: 'notification',
        fields: ['id', 'data', 'template', 'resource_id'],
        filters: {
          deleted_at: null,
          $or: [
            { resource_type: 'payment', resource_id: payment.id },
            { template: 'admin-ui' },
          ],
        },
        pagination: { take: 100 },
      });

      const hasExisting = existingNotifications?.some((n: any) => {
        const data = n.data || {};
        return (
          (n.resource_type === 'payment' && n.resource_id === payment.id) ||
          (data.resource_type === 'payment' && data.resource_id === payment.id) ||
          (data.payment_id === payment.id) ||
          (n.template === 'admin-ui' && data.notification_type === 'payment_refunded' && 
           (data.payment_id === payment.id || data.resource_id === payment.id))
        );
      });

      if (hasExisting) {
        logger.info(`⚠️ [payment-events] Payment refunded notification already exists for payment ${paymentId}, skipping...`);
        return;
      }

      logger.info(`📧 [payment-events] Creating admin notification for payment refunded...`);

      // Create admin notification using feed channel and admin-ui template
      await notificationModuleService.createNotifications({
        to: '', // Empty string for admin feed notifications
        channel: 'feed', // Feed channel for admin panel notifications
        template: 'admin-ui', // Required template for admin notifications
        data: {
          title: `${isPartialRefund ? 'Partial ' : ''}Payment Refunded · Order #${orderDisplayId}`,
          description: `${isPartialRefund ? 'Partial ' : ''}Refund of ${payment.currency_code || 'USD'} ${displayAmount.toFixed(2)} processed for Order #${orderDisplayId}${order?.customer ? ` (${customerName})` : ''}.`,
          notification_type: 'payment_refunded',
          resource_type: 'payment',
          resource_id: payment.id,
          payment_id: payment.id,
          payment_collection_id: payment.payment_collection_id,
          order_id: order?.id,
          order_display_id: orderDisplayId,
          customer_name: customerName,
          customer_email: order?.email,
          refund_amount: refundAmount,
          total_refunded: refundAmount,
          original_amount: originalAmount,
          currency_code: payment.currency_code,
          is_partial_refund: isPartialRefund,
          payment_status: 'refunded',
          order_link: order?.id ? `${storefrontUrl}/admin/orders/${order.id}` : '',
          payment_link: `${storefrontUrl}/admin/payments/${payment.id}`,
          alert_level: 'INFO',
          triggered_at: new Date().toISOString(),
        },
      });

      logger.info(`✅ [payment-events] Payment refunded notification created successfully for payment ${paymentId}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    logger.error(`❌ [payment-events] Error processing payment event ${name}: ${errorMessage}`);
    if (error instanceof Error) {
      logger.error(error);
    } else {
      logger.error(`❌ [payment-events] Error stack: ${errorStack}`);
    }
  }
}

export const config: SubscriberConfig = {
  /**
   * Shopenup events to subscribe to
   * These events are emitted when payments are captured or refunded
   */
  event: [
    "payment.captured",
    "payment.refunded",
  ],
};

