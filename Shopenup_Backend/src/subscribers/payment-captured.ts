import { SubscriberArgs, SubscriberConfig } from '@shopenup/framework';
import { Modules } from '@shopenup/framework/utils';
import type { INotificationModuleService } from '@shopenup/framework/types';

// Log on module load to confirm subscriber is registered
console.log('✅ [payment-captured] Subscriber module loaded and registered for event: payment.captured');

export default async function paymentCapturedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  console.log('🔔 [payment-captured] ====== SUBSCRIBER FUNCTION CALLED ======');
  console.log('🔔 [payment-captured] Event received:', JSON.stringify(data, null, 2));

  try {
    const query = container.resolve('query');
    const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION);

    // Get payment and related data (order, customer email)
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
      filters: { id: data.id }, // Event payload is { id: string } where id is payment ID
    });

    if (!payments || payments.length === 0) {
      console.error('❌ [payment-captured] Payment not found:', data.id);
      return;
    }

    const payment = payments[0] as any;
    const order = payment.payment_collection?.order;

    // Get customer email from order (optional - admin notification should always be created)
    const email = order?.email || order?.customer?.email;

    const storeName = process.env.STORE_NAME || 'Store';
    const storefrontUrl = process.env.STOREFRONT_URL || '';


    

    const orderDisplayId = order?.display_id || order?.id || 'N/A';
    const customerName = order?.customer
      ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || 'Customer'
      : 'Customer';

    // Build notification data for customer
    const customerNotificationData = {
      subject: `Payment Received · Order #${orderDisplayId}`,
      heading: 'Payment Confirmed',
      message: `Your payment of ${payment.currency_code || 'USD'} ${payment.amount || 0} has been successfully captured for Order #${orderDisplayId}.`,
      payment_id: payment.id,
      payment_collection_id: payment.payment_collection_id,
      order_id: order?.id,
      order_display_id: orderDisplayId,
      customer_email: email,
      customer_name: customerName,
      amount: payment.amount,
      currency_code: payment.currency_code,
      payment_status: 'captured',
      order_link: order?.id ? `${storefrontUrl}/order-details/${order.id}` : '',
      store_name: storeName,
      captured_at: payment.captured_at,
      triggered_at: new Date().toISOString(),
    };

    // Send notification to customer (if email available)
    if (email) {
      console.log('📧 [payment-captured] Creating customer notification...');
      try {
        await notificationModuleService.createNotifications({
          to: email,
          channel: 'email', // Use 'feed' for testing with local provider
          template: 'payment-captured', // Your provider template ID
          data: customerNotificationData,
        });
        console.log('✅ [payment-captured] Customer notification created successfully');
      } catch (customerNotifError) {
        console.error('❌ [payment-captured] Error creating customer notification:', customerNotifError);
        // Continue to create admin notification even if customer notification fails
      }
    } else {
      console.warn('⚠️ [payment-captured] No customer email found for order:', order?.id, '- Skipping customer notification');
    }

    // IMPORTANT:
    // - Do NOT create admin notifications here to avoid duplicates in the notification table.
    // - Admin notifications for payment captured are handled centrally in `payment-events.ts`.
    console.log('✅ [payment-captured] Skipping admin notification creation (handled by payment-events subscriber)');
    console.log('✅ [payment-captured] ====== SUBSCRIBER FUNCTION COMPLETED ======');
  } catch (error) {
    console.error('❌ [payment-captured] ERROR in subscriber:', error);
    console.error('❌ [payment-captured] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

export const config: SubscriberConfig = {
  event: 'payment.captured',
};

