import { ExecArgs } from '@shopenup/framework/types';

/**
 * Script to create missing payment captured and refunded notifications
 * for payments that should have them but don't
 * 
 * Usage: npx shopenup exec ./src/scripts/create-missing-payment-notifications.ts
 */
export default async function createMissingPaymentNotifications({ container }: ExecArgs) {
  console.log('🔍 [create-missing-payment-notifications] Starting...');

  try {
    const query = container.resolve('query');
    const notificationModuleService = container.resolve('notification');
    const adminEmail = process.env.DEFAULT_REPLY_TO || 'admin@localhost';
    const storeName = process.env.STORE_NAME || 'Store';
    const storefrontUrl = process.env.STOREFRONT_URL || '';

    let createdCount = 0;
    let skippedCount = 0;

    // Find payments that should have captured notifications
    console.log('📦 [create-missing-payment-notifications] Checking for captured payments...');
    const { data: capturedPayments } = await query.graph({
      entity: 'payment',
      fields: [
        'id',
        'amount',
        'currency_code',
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
      filters: {
        captured_at: { $ne: null },
        canceled_at: null,
      },
    });

    console.log(`📦 [create-missing-payment-notifications] Found ${capturedPayments?.length || 0} captured payments`);

    for (const payment of capturedPayments || []) {
      try {
        const paymentAny = payment as any;
        
        // Check if notification already exists
        const { data: existing } = await query.graph({
          entity: 'notification',
          fields: ['id', 'data', 'template'],
          filters: {
            deleted_at: null,
            resource_type: 'payment',
            resource_id: paymentAny.id,
            template: 'admin-ui',
          },
        });

        const hasExisting = existing?.some((n: any) => 
          n.template === 'admin-ui' && 
          n.data?.notification_type === 'payment_captured'
        );

        if (hasExisting) {
          skippedCount++;
          continue;
        }

        const order = paymentAny.payment_collection?.order;
        const orderDisplayId = order?.display_id || order?.id || 'N/A';
        const customerName = order?.customer
          ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || 'Customer'
          : 'Customer';

        await notificationModuleService.createNotifications({
          to: adminEmail,
          channel: 'email',
          template: 'admin-ui',
          resource_type: 'payment',
          resource_id: paymentAny.id,
          data: {
            title: `Payment Captured · Order #${orderDisplayId}`,
            description: `Payment of ${paymentAny.currency_code || 'USD'} ${paymentAny.amount || 0} captured for Order #${orderDisplayId}${order?.customer ? ` (${customerName})` : ''}.`,
            notification_type: 'payment_captured',
            resource_type: 'payment',
            resource_id: paymentAny.id,
            payment_id: paymentAny.id,
            payment_collection_id: paymentAny.payment_collection_id,
            order_id: order?.id,
            order_display_id: orderDisplayId,
            customer_name: customerName,
            customer_email: order?.email,
            amount: paymentAny.amount,
            currency_code: paymentAny.currency_code,
            payment_status: 'captured',
            order_link: order?.id ? `${storefrontUrl}/admin/orders/${order.id}` : '',
            payment_link: `${storefrontUrl}/admin/payments/${paymentAny.id}`,
            alert_level: 'INFO',
            captured_at: paymentAny.captured_at,
            triggered_at: new Date().toISOString(),
          },
        });

        createdCount++;
        console.log(`✅ [create-missing-payment-notifications] Created captured notification for payment ${paymentAny.id}`);
      } catch (error) {
        const paymentAny = payment as any;
        console.error(`❌ [create-missing-payment-notifications] Error creating notification for payment ${paymentAny.id}:`, error);
      }
    }

    // Find payments that should have refunded notifications
    // Query refunds directly using raw SQL since refund entity is not available
    console.log('💰 [create-missing-payment-notifications] Checking for refunded payments using raw SQL...');
    
    let refundedPayments: any[] = [];
    
    // Use raw SQL to query refunds with payment and order details
    const pg = await import("pg");
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      console.warn('⚠️ [create-missing-payment-notifications] DATABASE_URL not found, skipping refunds');
    } else {
      try {
        const client = new pg.Client({ connectionString });
        await client.connect();
        
        try {
          // First, get refunds with payment info
          const refundsResult = await client.query(`
            SELECT 
              r.id as refund_id,
              r.payment_id,
              r.amount as refund_amount,
              r.created_at as refund_created_at,
              p.id as payment_id,
              p.amount as payment_amount,
              p.currency_code,
              p.payment_collection_id
            FROM refund r
            LEFT JOIN payment p ON r.payment_id = p.id
            ORDER BY r.created_at DESC
          `);
          
          console.log(`💰 [create-missing-payment-notifications] Found ${refundsResult.rows.length} refunds in database`);
          
          // Group refunds by payment_id and calculate total refunded
          const refundedPaymentsMap = new Map();
          const paymentIds = new Set<string>();
          
          for (const row of refundsResult.rows || []) {
            const paymentId = row.payment_id;
            paymentIds.add(paymentId);
            
            if (!refundedPaymentsMap.has(paymentId)) {
              refundedPaymentsMap.set(paymentId, {
                id: row.payment_id,
                amount: row.payment_amount,
                currency_code: row.currency_code,
                payment_collection_id: row.payment_collection_id,
                refunds: [],
                totalRefunded: 0,
              });
            }
            const entry = refundedPaymentsMap.get(paymentId);
            entry.refunds.push({
              id: row.refund_id,
              amount: parseFloat(row.refund_amount),
            });
            entry.totalRefunded += parseFloat(row.refund_amount) || 0;
          }
          
          // Now fetch payment details with order info using query.graph for each payment
          for (const paymentId of paymentIds) {
            try {
              const { data: paymentData } = await query.graph({
                entity: 'payment',
                fields: [
                  'id',
                  'amount',
                  'currency_code',
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
                filters: {
                  id: paymentId,
                },
              });
              
              if (paymentData && paymentData.length > 0) {
                const payment = paymentData[0] as any;
                const entry = refundedPaymentsMap.get(paymentId);
                if (entry) {
                  entry.payment_collection = payment.payment_collection;
                }
              }
            } catch (error) {
              console.warn(`⚠️ [create-missing-payment-notifications] Could not fetch order details for payment ${paymentId}:`, error);
            }
          }
          
          refundedPayments = Array.from(refundedPaymentsMap.values()).map(entry => ({
            ...entry,
            refunded_amount: entry.totalRefunded,
          }));
          
          console.log(`💰 [create-missing-payment-notifications] Found ${refundedPayments.length} payments with refunds from database`);
        } finally {
          await client.end();
        }
      } catch (refundQueryError) {
        console.error('❌ [create-missing-payment-notifications] Error querying refunds:', refundQueryError);
        refundedPayments = [];
      }
    }

    console.log(`💰 [create-missing-payment-notifications] Found ${refundedPayments?.length || 0} refunded payments`);

    for (const payment of refundedPayments || []) {
      try {
        const paymentAny = payment as any;
        
        // Check if notification already exists
        const { data: existing } = await query.graph({
          entity: 'notification',
          fields: ['id', 'data', 'template'],
          filters: {
            deleted_at: null,
            resource_type: 'payment',
            resource_id: paymentAny.id,
            template: 'admin-ui',
          },
        });

        const hasExisting = existing?.some((n: any) => 
          n.template === 'admin-ui' && 
          n.data?.notification_type === 'payment_refunded'
        );

        if (hasExisting) {
          skippedCount++;
          continue;
        }

        const order = paymentAny.payment_collection?.order;
        const orderDisplayId = order?.display_id || order?.id || 'N/A';
        const customerName = order?.customer
          ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || 'Customer'
          : 'Customer';
        const originalAmount = paymentAny.amount || 0;
        const isPartialRefund = paymentAny.refunded_amount > 0 && paymentAny.refunded_amount < originalAmount;

        await notificationModuleService.createNotifications({
          to: adminEmail,
          channel: 'email',
          template: 'admin-ui',
          resource_type: 'payment',
          resource_id: paymentAny.id,
          data: {
            title: `${isPartialRefund ? 'Partial ' : ''}Payment Refunded · Order #${orderDisplayId}`,
            description: `${isPartialRefund ? 'Partial ' : ''}Refund of ${paymentAny.currency_code || 'USD'} ${paymentAny.refunded_amount.toFixed(2)} processed for Order #${orderDisplayId}${order?.customer ? ` (${customerName})` : ''}.`,
            notification_type: 'payment_refunded',
            resource_type: 'payment',
            resource_id: paymentAny.id,
            payment_id: paymentAny.id,
            payment_collection_id: paymentAny.payment_collection_id,
            order_id: order?.id,
            order_display_id: orderDisplayId,
            customer_name: customerName,
            customer_email: order?.email,
            refund_amount: paymentAny.refunded_amount,
            total_refunded: paymentAny.refunded_amount,
            original_amount: originalAmount,
            currency_code: paymentAny.currency_code,
            is_partial_refund: isPartialRefund,
            payment_status: 'refunded',
            order_link: order?.id ? `${storefrontUrl}/admin/orders/${order.id}` : '',
            payment_link: `${storefrontUrl}/admin/payments/${paymentAny.id}`,
            alert_level: 'INFO',
            triggered_at: new Date().toISOString(),
          },
        });

        createdCount++;
        console.log(`✅ [create-missing-payment-notifications] Created refunded notification for payment ${paymentAny.id}`);
      } catch (error) {
        const paymentAny = payment as any;
        console.error(`❌ [create-missing-payment-notifications] Error creating notification for payment ${paymentAny.id}:`, error);
      }
    }

    console.log(`\n✅ [create-missing-payment-notifications] Complete!`);
    console.log(`   Created: ${createdCount} notifications`);
    console.log(`   Skipped: ${skippedCount} (already exist)`);
  } catch (error) {
    console.error('❌ [create-missing-payment-notifications] Error:', error);
    throw error;
  }
}

