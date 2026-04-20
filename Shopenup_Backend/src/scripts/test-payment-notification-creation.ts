/**
 * Test script to directly create a payment notification in the database
 * This bypasses the event system to test if notifications can be created
 * 
 * Run with: npx shopenup exec ./src/scripts/test-payment-notification-creation.ts
 */

import { ExecArgs } from '@shopenup/framework/types';

export default async function testPaymentNotificationCreation({ container }: ExecArgs) {
  console.log('🧪 Testing payment notification creation...\n');

  try {
    const notificationModuleService = container.resolve('notification');
    const query = container.resolve('query');
    const adminEmail = process.env.DEFAULT_REPLY_TO || 'admin@localhost';
    const storeName = process.env.STORE_NAME || 'Store';
    const storefrontUrl = process.env.STOREFRONT_URL || '';

    console.log('📋 Step 1: Checking notification service...');
    console.log(`   Admin Email: ${adminEmail}`);
    console.log(`   Store Name: ${storeName}`);
    console.log(`   Storefront URL: ${storefrontUrl}\n`);

    // Try to find a real payment to use
    console.log('📋 Step 2: Finding a payment to test with...');
    const { data: payments } = await query.graph({
      entity: 'payment',
      fields: [
        'id',
        'amount',
        'currency_code',
        'payment_collection_id',
      ],
      filters: {},
      pagination: { take: 1 },
    });

    if (!payments || payments.length === 0) {
      console.log('⚠️  No payments found. Creating test notification with dummy data...\n');
      
      // Create a test notification with dummy data
      const testNotificationData = {
        subject: 'Test Payment Failed · Order #TEST-001',
        heading: 'Payment Failed Alert (Test)',
        message: 'This is a test payment notification to verify the system is working.',
        payment_id: 'test_payment_123',
        payment_collection_id: 'test_paycol_123',
        order_id: 'test_order_123',
        order_display_id: 'TEST-001',
        customer_email: 'test@example.com',
        customer_name: 'Test Customer',
        amount: 100.00,
        currency_code: 'USD',
        payment_status: 'failed',
        error_message: 'Test payment failure',
        order_link: `${storefrontUrl}/admin/orders/test_order_123`,
        payment_link: `${storefrontUrl}/admin/payments/test_payment_123`,
        store_name: storeName,
        triggered_at: new Date().toISOString(),
        notification_type: 'payment_failed',
        resource_type: 'payment',
        resource_id: 'test_payment_123',
        alert_level: 'CRITICAL',
      };

      console.log('📋 Step 3: Creating test notification...');
      try {
        const notification = await notificationModuleService.createNotifications({
          to: adminEmail,
          template: 'payment-failed',
          channel: 'email',
          data: testNotificationData,
        });

        console.log('✅ Test notification created successfully!');
        console.log('   Notification ID:', (notification as any)?.id || 'N/A');
        console.log('   Template: payment-failed');
        console.log('   Channel: email');
        console.log('   Resource Type: payment\n');
        
        console.log('✅ Payment notification creation is working!');
        console.log('   You can now check the database for this notification.');
        return;
      } catch (error: any) {
        console.error('❌ Error creating test notification:', error.message);
        console.error('   Stack:', error.stack);
        throw error;
      }
    }

    // Use real payment data
    const payment = payments[0] as any;
    console.log(`   Found payment: ${payment.id}\n`);

    // Fetch payment collection and order details
    console.log('📋 Step 3: Fetching payment collection and order details...');
    const { data: paymentCollections } = await query.graph({
      entity: 'payment_collection',
      fields: [
        'id',
        'order.*',
        'order.id',
        'order.display_id',
        'order.email',
        'order.customer.*',
        'order.customer.first_name',
        'order.customer.last_name',
      ],
      filters: { id: payment.payment_collection_id },
    });

    const paymentCollection = paymentCollections?.[0] as any;
    const order = paymentCollection?.order;

    const orderDisplayId = (order as any)?.display_id || order?.id || 'N/A';
    const customerName = order?.customer
      ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || 'Customer'
      : 'Customer';

    const notificationData = {
      subject: `Test Payment Failed · Order #${orderDisplayId}`,
      heading: 'Payment Failed Alert (Test)',
      message: `Test notification: Payment of ${payment.currency_code || 'USD'} ${payment.amount || 0} failed for Order #${orderDisplayId}${order?.customer ? ` (${customerName})` : ''}.`,
      payment_id: payment.id,
      payment_collection_id: payment.payment_collection_id,
      order_id: order?.id,
      order_display_id: orderDisplayId,
      customer_email: order?.email,
      customer_name: customerName,
      amount: payment.amount,
      currency_code: payment.currency_code,
      payment_status: 'failed',
      error_message: 'Test payment failure',
      order_link: order?.id ? `${storefrontUrl}/admin/orders/${order.id}` : `${storefrontUrl}/admin/payments`,
      payment_link: `${storefrontUrl}/admin/payments/${payment.id}`,
      store_name: storeName,
      triggered_at: new Date().toISOString(),
      notification_type: 'payment_failed',
      resource_type: 'payment',
      resource_id: payment.id,
      alert_level: 'CRITICAL',
    };

    console.log('📋 Step 4: Creating notification with real payment data...');
    try {
      const notification = await notificationModuleService.createNotifications({
        to: adminEmail,
        template: 'payment-failed',
        channel: 'email',
        data: notificationData,
      });

      console.log('✅ Notification created successfully!');
      console.log('   Notification ID:', (notification as any)?.id || 'N/A');
      console.log('   Template: payment-failed');
      console.log('   Channel: email');
      console.log('   Resource Type: payment');
      console.log('   Payment ID:', payment.id);
      console.log('   Order Display ID:', orderDisplayId);
      console.log('\n✅ Payment notification creation is working!');
      console.log('   Run: npx shopenup exec ./src/scripts/check-payment-notifications.ts');
      console.log('   to verify the notification is in the database.');
    } catch (error: any) {
      console.error('❌ Error creating notification:', error.message);
      console.error('   Stack:', error.stack);
      throw error;
    }
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('   Stack:', error.stack);
    throw error;
  }
}

