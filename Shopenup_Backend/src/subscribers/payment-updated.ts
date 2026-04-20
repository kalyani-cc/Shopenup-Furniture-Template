import { SubscriberArgs, SubscriberConfig } from '@shopenup/framework';
import { Modules } from '@shopenup/framework/utils';
import type { INotificationModuleService } from '@shopenup/framework/types';
import emitPaymentRefundedEvent from '../workflows/emit-payment-refunded-event';
import emitPaymentCapturedEvent from '../workflows/emit-payment-captured-event';

// Log on module load to confirm subscriber is registered
console.log('✅ [payment-updated] Subscriber module loaded and registered for events: payment.created, payment.updated');

/**
 * Subscriber that listens to payment updates and triggers
 * payment notification workflows when payment status changes
 * 
 * Listens to framework events:
 * - payment.created/updated: When payments are created or updated
 */
export default async function paymentUpdatedHandler({
  event: { data, name },
  container,
}: SubscriberArgs<any>) {
  console.log(`🔔 [payment-updated] Event received: ${name}`, JSON.stringify(data, null, 2));

  try {
    const query = container.resolve('query');
    const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION);

    // Extract payment_id from different possible data structures
    const paymentId = data.id || data.payment_id;
    
    if (!paymentId) {
      console.warn(`[payment-updated] No payment ID found in event data:`, data);
      return;
    }

    // Fetch the payment with order details to check its status
    const { data: payments } = await query.graph({
      entity: 'payment',
      fields: [
        'id',
        'amount',
        'currency_code',
        'refunded_amount',
        'captured_at',
        'canceled_at',
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
      console.warn(`[payment-updated] Payment not found: ${paymentId}`);
      return;
    }

    const order = payment.payment_collection?.order;
    const orderDisplayId = order?.display_id || order?.id || 'N/A';
    const customerName = order?.customer
      ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || 'Customer'
      : 'Customer';
    const storeName = process.env.STORE_NAME || 'Store';
    const storefrontUrl = process.env.STOREFRONT_URL || '';

    // Check if payment was captured (has captured_at and no canceled_at)
    // IMPORTANT:
    // - Do NOT create admin notifications here to avoid duplicates.
    // - This subscriber's role is only to emit workflow events.
    if (payment.captured_at && !payment.canceled_at) {
      console.log(`[payment-updated] ✅ Payment captured detected! Emitting workflow event for payment ${payment.id}`);

      try {
        await emitPaymentCapturedEvent(container).run({
          input: {
            payment_id: payment.id,
            payment_collection_id: payment.payment_collection_id,
            amount: payment.amount,
            currency_code: payment.currency_code,
          },
        });
        console.log('[payment-updated] ✅ Payment captured workflow event emitted successfully');
      } catch (workflowError) {
        console.warn(`[payment-updated] ⚠️ Payment captured workflow emit failed (non-critical):`, workflowError);
      }
    }

    // Check if payment was refunded (check both refunded_amount field and refund table)
    // First check if there are refunds in the refund table
    const { data: refunds } = await query.graph({
      entity: 'refund',
      fields: ['id', 'amount'],
      filters: { payment_id: payment.id },
    });

    const totalRefunded = refunds?.reduce((sum: number, r: any) => sum + (r.amount || 0), 0) || 0;
    const hasRefund = totalRefunded > 0;

    if (hasRefund) {
      console.log(`[payment-updated] 💰 Payment refunded detected! Creating notification for payment ${payment.id} (refunded: ${totalRefunded})`);
      
      try {
        const originalAmount = payment.amount || 0;
        const isPartialRefund = totalRefunded > 0 && totalRefunded < originalAmount;
        
        // Do NOT create admin notifications here to avoid duplicates.
        // This subscriber's role is only to emit workflow events for refunds.
        try {
          await emitPaymentRefundedEvent(container).run({
            input: {
              payment_id: payment.id,
              payment_collection_id: payment.payment_collection_id,
              amount: totalRefunded,
              currency_code: payment.currency_code,
            },
          });
          console.log('[payment-updated] ✅ Payment refunded workflow event emitted successfully');
        } catch (workflowError) {
          console.warn(`[payment-updated] ⚠️ Workflow trigger failed (non-critical):`, workflowError);
        }
      } catch (error) {
        console.error(`[payment-updated] ❌ Payment refunded notification creation failed:`, error);
        console.error(`[payment-updated] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      }
    }
  } catch (error) {
    console.error(`[payment-updated] Error processing payment update:`, error);
  }
}

export const config: SubscriberConfig = {
  event: [
    'payment.created',
    'payment.updated',
  ],
};

