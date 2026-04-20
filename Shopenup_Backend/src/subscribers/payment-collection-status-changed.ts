import { SubscriberArgs, SubscriberConfig } from '@shopenup/framework';

// Log on module load to confirm subscriber is registered
console.log('✅ [payment-collection-status-changed] Subscriber module loaded and registered for event: payment_collection.status_changed');

type PaymentCollectionStatusChangedEvent = {
  payment_collection_id: string;
  status: string;
  previous_status?: string;
  order_id?: string;
};

export default async function paymentCollectionStatusChangedHandler({
  event: { data },
  container,
}: SubscriberArgs<PaymentCollectionStatusChangedEvent>) {
  console.log('🔔 [payment-collection-status-changed] ====== SUBSCRIBER FUNCTION CALLED ======');
  console.log('🔔 [payment-collection-status-changed] Event received:', JSON.stringify(data, null, 2));
  console.log('🔔 [payment-collection-status-changed] Container available:', !!container);

  try {
    const query = container.resolve('query');
    console.log('🔔 [payment-collection-status-changed] Query service resolved');

    const notificationModuleService = container.resolve('notification');
    console.log('🔔 [payment-collection-status-changed] Notification service resolved');

    // Only notify for important status changes
    const importantStatuses = ['awaiting', 'authorized', 'canceled'];
    if (!importantStatuses.includes(data.status)) {
      console.log(`ℹ️ [payment-collection-status-changed] Status '${data.status}' is not critical, skipping notification`);
      return;
    }

    // ------------------------------
    // :one: Fetch payment collection details
    // ------------------------------
    const { data: paymentCollections } = await query.graph({
      entity: 'payment_collection',
      fields: [
        'id',
        'amount',
        'currency_code',
        'status',
        'authorized_amount',
        'refunded_amount',
        'created_at',
        'completed_at',
        'order.*',
        'order.id',
        'order.display_id',
        'order.email',
        'order.total',
        'order.currency_code',
        'order.customer.*',
        'order.customer.first_name',
        'order.customer.last_name',
        'payments.*',
        'payments.id',
        'payments.amount',
        'payments.status',
      ],
      filters: { id: data.payment_collection_id },
    });

    if (!paymentCollections || paymentCollections.length === 0) {
      console.error('❌ [payment-collection-status-changed] Payment collection not found:', data.payment_collection_id);
      return;
    }

    const paymentCollection = paymentCollections[0];
    const order = paymentCollection.order;

    // ------------------------------
    // :two: Build notification data
    // ------------------------------
    const adminEmail = process.env.DEFAULT_REPLY_TO || 'admin@localhost';
    const storeName = process.env.STORE_NAME || 'Store';
    const storefrontUrl = process.env.STOREFRONT_URL || '';

    const orderLink = order?.id
      ? `${storefrontUrl}/admin/orders/${order.id}`
      : `${storefrontUrl}/admin/payments`;

    const amount = paymentCollection.amount || 0;
    const currencyCode = paymentCollection.currency_code || 'USD';
    const orderDisplayId = (order as any)?.display_id || order?.id || 'N/A';
    const customerName = order?.customer
      ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || 'Customer'
      : 'Customer';

    // Determine alert level based on status
    let alertLevel = 'INFO';
    let subject = '';
    let message = '';

    switch (data.status) {
      case 'awaiting':
        alertLevel = 'WARNING';
        subject = `Payment Awaiting · Order #${orderDisplayId}`;
        message = `Payment of ${currencyCode} ${amount.toFixed(2)} is awaiting for Order #${orderDisplayId}${order?.customer ? ` (${customerName})` : ''}.`;
        break;
      case 'authorized':
        alertLevel = 'INFO';
        subject = `Payment Authorized · Order #${orderDisplayId}`;
        message = `Payment of ${currencyCode} ${amount.toFixed(2)} has been authorized for Order #${orderDisplayId}${order?.customer ? ` (${customerName})` : ''}.`;
        break;
      case 'canceled':
        alertLevel = 'WARNING';
        subject = `Payment Canceled · Order #${orderDisplayId}`;
        message = `Payment of ${currencyCode} ${amount.toFixed(2)} was canceled for Order #${orderDisplayId}${order?.customer ? ` (${customerName})` : ''}.`;
        break;
      default:
        subject = `Payment Status Changed · Order #${orderDisplayId}`;
        message = `Payment collection status changed to '${data.status}' for Order #${orderDisplayId}${order?.customer ? ` (${customerName})` : ''}.`;
    }

    const notificationData = {
      subject,
      heading: 'Payment Collection Status Update',
      message,
      payment_collection_id: paymentCollection.id,
      order_id: order?.id,
      order_display_id: orderDisplayId,
      customer_email: order?.email,
      customer_name: customerName,
      amount,
      currency_code: currencyCode,
      status: data.status,
      previous_status: data.previous_status,
      authorized_amount: paymentCollection.authorized_amount,
      refunded_amount: paymentCollection.refunded_amount,
      order_link: orderLink,
      payment_collection_link: `${storefrontUrl}/admin/payments/${paymentCollection.id}`,
      store_name: storeName,
      triggered_at: new Date().toISOString(),
    };

    console.log('💳 [payment-collection-status-changed] Payment Collection Status Notification Data:', notificationData);

    // ------------------------------
    // :three: Create Notification (appears in admin UI notification drawer)
    // ------------------------------
    console.log('📧 [payment-collection-status-changed] Creating notification with email channel...');

    try {
      const notification = await notificationModuleService.createNotifications({
        to: adminEmail,
        template: 'payment-collection-status-changed',
        channel: 'email', // Same channel as order/inventory notifications - creates notification records in admin UI
        data: {
          ...notificationData,
          notification_type: 'payment_collection_status_changed',
          resource_type: 'payment',
          resource_id: paymentCollection.id,
          alert_level: alertLevel,
        },
      });

      console.log('✅ [payment-collection-status-changed] Notification created successfully:', JSON.stringify(notification, null, 2));
      console.log('✅ [payment-collection-status-changed] ====== SUBSCRIBER FUNCTION COMPLETED ======');
    } catch (notifError) {
      console.error('❌ [payment-collection-status-changed] Error creating notification:', notifError);
      throw notifError;
    }
  } catch (error) {
    console.error('❌ [payment-collection-status-changed] ERROR in subscriber:', error);
    console.error('❌ [payment-collection-status-changed] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

export const config: SubscriberConfig = {
  event: 'payment_collection.status_changed',
};

