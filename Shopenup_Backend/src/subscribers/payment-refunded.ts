import { SubscriberArgs, SubscriberConfig } from '@shopenup/framework';
import { Modules } from '@shopenup/framework/utils';
import type { INotificationModuleService } from '@shopenup/framework/types';

// Log on module load to confirm subscriber is registered
console.log('✅ [payment-refunded] Subscriber module loaded and registered for event: payment.refunded');

type PaymentRefundedEvent = {
  id: string; // Payment ID (as per Medusa docs)
  payment_id?: string; // Fallback for custom events
  refund_id?: string;
  payment_collection_id?: string;
  order_id?: string;
  amount?: number;
  currency_code?: string;
};

export default async function paymentRefundedHandler({
  event: { data },
  container,
}: SubscriberArgs<PaymentRefundedEvent>) {
  console.log('🔔 [payment-refunded] ====== SUBSCRIBER FUNCTION CALLED ======');
  console.log('🔔 [payment-refunded] Event received:', JSON.stringify(data, null, 2));
  console.log('🔔 [payment-refunded] Container available:', !!container);

  try {
    const query = container.resolve('query');
    console.log('🔔 [payment-refunded] Query service resolved');

    const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION);
    console.log('🔔 [payment-refunded] Notification service resolved');

    // ------------------------------
    // :one: Fetch payment and refund details
    // ------------------------------
    // First get payment to find payment_collection_id and refunded_amount
    const { data: payments } = await query.graph({
      entity: 'payment',
      fields: [
        'id',
        'amount',
        'currency_code',
        'refunded_amount',
        'captured_at',
        'payment_collection_id',
      ],
      filters: { id: data.id || data.payment_id },
    });

    if (!payments || payments.length === 0) {
      console.error('❌ [payment-refunded] Payment not found:', data.id || data.payment_id);
      return;
    }

    const payment = payments[0] as any;
    
    console.log('🔔 [payment-refunded] Payment fetched:', {
      paymentId: payment.id,
      paymentAmount: payment.amount,
      paymentRefundedAmount: payment.refunded_amount,
      paymentCollectionId: payment.payment_collection_id,
    });

    // ------------------------------
    // :one-point-five: Fetch refund details from refund table
    // ------------------------------
    let refundAmount = 0;
    let totalRefunded = 0;
    
    // First, check if payment.refunded_amount is available (this is often updated before refunds are queried)
    // Use this as initial value, then try to get more accurate data from refund table
    console.log('🔔 [payment-refunded] Checking payment.refunded_amount:', {
      refundedAmount: payment.refunded_amount,
      isNull: payment.refunded_amount === null,
      isUndefined: payment.refunded_amount === undefined,
      type: typeof payment.refunded_amount,
    });
    
    if (payment.refunded_amount != null && Number(payment.refunded_amount) > 0) {
      console.log('✅ [payment-refunded] Found payment.refunded_amount:', payment.refunded_amount);
      totalRefunded = Number(payment.refunded_amount);
      refundAmount = Number(payment.refunded_amount); // Use as initial value
    } else {
      console.warn('⚠️ [payment-refunded] payment.refunded_amount is not available or is 0:', payment.refunded_amount);
    }
    
    try {
      // If refund_id is provided in event data, fetch that specific refund
      if (data.refund_id) {
        console.log('🔔 [payment-refunded] Fetching specific refund:', data.refund_id);
        try {
          const { data: refunds } = await query.graph({
            entity: 'refund',
            fields: ['id', 'amount', 'raw_amount', 'payment_id'],
            filters: { id: data.refund_id },
          });
          
          if (refunds && refunds.length > 0) {
            const refund = refunds[0] as any;
            refundAmount = Number(refund.amount) || Number(refund.raw_amount) || 0;
            console.log('✅ [payment-refunded] Found specific refund amount:', refundAmount);
          } else {
            console.warn('⚠️ [payment-refunded] Refund not found with ID:', data.refund_id);
          }
        } catch (refundQueryError) {
          console.error('❌ [payment-refunded] Error querying specific refund:', refundQueryError);
          // Continue to try fetching all refunds
        }
      }
      
      // Always fetch all refunds for this payment to calculate total refunded amount
      console.log('🔔 [payment-refunded] Fetching all refunds for payment:', payment.id);
      console.log('🔔 [payment-refunded] Payment details:', {
        paymentId: payment.id,
        paymentRefundedAmount: payment.refunded_amount,
        eventRefundId: data.refund_id,
        eventAmount: data.amount,
      });
      
      try {
        // Try querying refunds with payment_id filter using query.graph
        let allRefunds: any[] = [];
        try {
          const result = await query.graph({
            entity: 'refund',
            fields: ['id', 'amount', 'raw_amount', 'payment_id', 'created_at'],
            filters: { payment_id: payment.id },
          });
          allRefunds = result.data || [];
          console.log('🔔 [payment-refunded] Refund query.graph result:', {
            refundsFound: allRefunds.length,
            refunds: allRefunds,
          });
        } catch (graphQueryError) {
          console.warn('⚠️ [payment-refunded] query.graph failed, trying raw SQL:', graphQueryError);
          
          // Fallback to raw SQL query
          try {
            const pg = await import("pg");
            const connectionString = process.env.DATABASE_URL;
            
            if (connectionString) {
              const client = new pg.Client({ connectionString });
              await client.connect();
              
              try {
                const sqlResult = await client.query(
                  `SELECT id, amount, raw_amount, payment_id, created_at 
                   FROM refund 
                   WHERE payment_id = $1 AND deleted_at IS NULL 
                   ORDER BY created_at DESC`,
                  [payment.id]
                );
                
                allRefunds = sqlResult.rows || [];
                console.log('✅ [payment-refunded] Raw SQL query result:', {
                  refundsFound: allRefunds.length,
                  refunds: allRefunds,
                });
              } finally {
                await client.end();
              }
            }
          } catch (sqlError) {
            console.error('❌ [payment-refunded] Raw SQL query also failed:', sqlError);
          }
        }
        
        if (allRefunds && allRefunds.length > 0) {
          // Calculate total refunded amount from all refunds
          totalRefunded = allRefunds.reduce((sum: number, r: any) => {
            const refundAmt = Number(r.amount) || Number(r.raw_amount) || 0;
            console.log('🔔 [payment-refunded] Processing refund:', {
              refundId: r.id,
              amount: r.amount,
              raw_amount: r.raw_amount,
              calculatedAmount: refundAmt,
            });
            return sum + refundAmt;
          }, 0);
          
          // If we didn't get refundAmount from specific refund_id, use the latest refund amount
          if (refundAmount === 0 && allRefunds.length > 0) {
            // Sort by created_at descending to get the most recent refund
            const sortedRefunds = [...allRefunds].sort((a: any, b: any) => {
              const dateA = new Date(a.created_at || 0).getTime();
              const dateB = new Date(b.created_at || 0).getTime();
              return dateB - dateA;
            });
            const latestRefund = sortedRefunds[0] as any;
            refundAmount = Number(latestRefund.amount) || Number(latestRefund.raw_amount) || 0;
            console.log('✅ [payment-refunded] Using latest refund amount:', refundAmount);
          }
          
          console.log('✅ [payment-refunded] Total refunded amount from refund table:', totalRefunded);
          console.log('✅ [payment-refunded] Current refund amount:', refundAmount);
        } else {
          console.warn('⚠️ [payment-refunded] No refunds found in refund table for payment:', payment.id);
          console.warn('⚠️ [payment-refunded] This might mean:');
          console.warn('  1. Refund record not created yet when event fired');
          console.warn('  2. Refund table uses different payment_id format');
          console.warn('  3. Refund query is not working correctly');
          
          // If no refunds found but payment has refunded_amount, use that (already set above)
          if (refundAmount === 0 && payment.refunded_amount && payment.refunded_amount > 0) {
            console.log('✅ [payment-refunded] Using payment.refunded_amount as fallback:', payment.refunded_amount);
            refundAmount = Number(payment.refunded_amount);
            totalRefunded = Number(payment.refunded_amount);
          } else if (refundAmount === 0) {
            // Fallback to event data amount
            refundAmount = Number(data.amount) || 0;
            totalRefunded = Number(data.amount) || 0;
            console.log('⚠️ [payment-refunded] Using event data amount as fallback:', refundAmount);
          } else {
            console.log('✅ [payment-refunded] Using already set refundAmount from payment.refunded_amount:', refundAmount);
          }
        }
      } catch (allRefundsQueryError) {
        console.error('❌ [payment-refunded] Error querying all refunds:', allRefundsQueryError);
        console.error('❌ [payment-refunded] Error details:', allRefundsQueryError instanceof Error ? allRefundsQueryError.message : String(allRefundsQueryError));
        
        // Fallback to payment.refunded_amount or event data amount
        if (payment.refunded_amount && payment.refunded_amount > 0) {
          refundAmount = Number(payment.refunded_amount);
          totalRefunded = Number(payment.refunded_amount);
          console.log('✅ [payment-refunded] Using payment.refunded_amount after query error:', refundAmount);
        } else {
          refundAmount = Number(data.amount) || 0;
          totalRefunded = Number(data.amount) || 0;
          console.log('⚠️ [payment-refunded] Using event data amount after query error:', refundAmount);
        }
      }
    } catch (refundError) {
      console.error('❌ [payment-refunded] Error in refund fetching logic:', refundError);
      // Fallback to event data amount or payment.refunded_amount
      refundAmount = Number(data.amount) || Number(payment.refunded_amount) || 0;
      totalRefunded = Number(payment.refunded_amount) || refundAmount;
      console.log('⚠️ [payment-refunded] Using fallback refund amount after error:', refundAmount);
    }

    // Now fetch payment collection with order details
    const { data: paymentCollections } = await query.graph({
      entity: 'payment_collection',
      fields: [
        'id',
        'status',
        'amount',
        'currency_code',
        'order.*',
        'order.id',
        'order.email',
        'order.total',
        'order.currency_code',
        'order.customer.*',
        'order.customer.first_name',
        'order.customer.last_name',
      ],
      filters: { id: payment.payment_collection_id },
    });

    if (!paymentCollections || paymentCollections.length === 0) {
      console.error('❌ [payment-refunded] Payment collection not found:', payment.payment_collection_id);
      return;
    }

    const paymentCollection = paymentCollections[0] as any;
    const order = paymentCollection.order;

    // ------------------------------
    // :two: Build notification data
    // ------------------------------
    const storeName = process.env.STORE_NAME || 'Store';
    const storefrontUrl = process.env.STOREFRONT_URL || '';

    const orderLink = order?.id
      ? `${storefrontUrl}/order-details/${order.id}`
      : `${storefrontUrl}/admin/payments`;

    const currencyCode = data.currency_code || payment.currency_code || paymentCollection.currency_code || 'USD';
    const orderDisplayId = (order as any)?.display_id || order?.id || 'N/A';
    const customerName = order?.customer
      ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || 'Customer'
      : 'Customer';

    // Calculate if this is a partial refund
    // Original amount might be in smallest currency unit, convert if needed
    let originalAmount = payment.amount || paymentCollection.amount || 0;
    // If original amount is very large (> 1000), assume it's in smallest currency unit
    if (originalAmount > 1000) {
      originalAmount = originalAmount / 100;
    }
    const isPartialRefund = totalRefunded > 0 && totalRefunded < originalAmount;

    // If refund amount is 0, use original amount for display
    const displayAmount = (refundAmount === 0 || refundAmount === 0.00) ? originalAmount : refundAmount;

    console.log('💳 [payment-refunded] Refund details:');
    console.log('  - Refund Amount (current):', refundAmount);
    console.log('  - Total Refunded:', totalRefunded);
    console.log('  - Original Amount:', originalAmount);
    console.log('  - Is Partial Refund:', isPartialRefund);
    
    

    const notificationData = {
      subject: `${isPartialRefund ? 'Partial ' : ''}Refund Processed · Order #${orderDisplayId}`,
      heading: 'Payment Refunded',
      message: `${isPartialRefund ? 'Partial ' : ''}Refund of ${currencyCode} ${displayAmount.toFixed(2)} processed for Order #${orderDisplayId}${order?.customer ? ` (${customerName})` : ''}.`,
      payment_id: payment.id,
      refund_id: data.refund_id,
      payment_collection_id: paymentCollection.id,
      order_id: order?.id,
      order_display_id: orderDisplayId,
      customer_email: order?.email,
      customer_name: customerName,
      refund_amount: refundAmount,
      total_refunded: totalRefunded,
      original_amount: originalAmount,
      currency_code: currencyCode,
      is_partial_refund: isPartialRefund,
      payment_status: payment.status || 'refunded',
      order_link: orderLink,
      payment_link: `${storefrontUrl}/admin/payments/${payment.id}`,
      store_name: storeName,
      triggered_at: new Date().toISOString(),
    };

    console.log('💳 [payment-refunded] Payment Refunded Notification Data:', notificationData);

    // ------------------------------
    // :three: Create Notifications (customer and admin)
    // ------------------------------
    
    // Get customer email for customer notification
    const customerEmail = order?.email || order?.customer?.email;
    
    console.log('📧 [payment-refunded] Customer email check:');
    console.log('  - order?.email:', order?.email);
    console.log('  - order?.customer?.email:', order?.customer?.email);
    console.log('  - customerEmail:', customerEmail);

    // Validate refund amount before sending
    if (refundAmount <= 0) {
      console.warn('⚠️ [payment-refunded] Refund amount is 0 or invalid:', refundAmount);
      console.warn('⚠️ [payment-refunded] This might indicate the refund was not found in the refund table');
      console.warn('⚠️ [payment-refunded] Will still attempt to send notification with available data');
      // Still proceed with notification but log warning
      // Use a minimum value of 0.01 for display purposes if refundAmount is 0
      if (refundAmount === 0 && totalRefunded > 0) {
        refundAmount = totalRefunded;
        console.log('⚠️ [payment-refunded] Using totalRefunded as refundAmount:', refundAmount);
      }
    }

    // Send notification to customer (if email available)
    if (customerEmail) {
      console.log('📧 [payment-refunded] Creating customer notification to:', customerEmail);
      console.log('📧 [payment-refunded] Notification data:', JSON.stringify(notificationData, null, 2));
      try {
        const customerNotificationData = {
          ...notificationData,
          subject: `${isPartialRefund ? 'Partial ' : ''}Refund Processed · Order #${orderDisplayId}`,
          message: `${isPartialRefund ? 'Partial ' : ''}Refund of ${currencyCode} ${refundAmount.toFixed(2)} has been processed for your Order #${orderDisplayId}.`,
          order_link: order?.id ? `${storefrontUrl}/order-details/${order.id}` : '',
        };

        console.log('📧 [payment-refunded] Calling notificationModuleService.createNotifications...');
        const notificationResult = await notificationModuleService.createNotifications({
          to: customerEmail,
          channel: 'email',
          template: 'payment-refunded',
          data: customerNotificationData,
        });
        console.log('✅ [payment-refunded] Customer notification created successfully:', JSON.stringify(notificationResult, null, 2));
      } catch (customerNotifError) {
        console.error('❌ [payment-refunded] Error creating customer notification:', customerNotifError);
        console.error('❌ [payment-refunded] Error details:', customerNotifError instanceof Error ? customerNotifError.message : String(customerNotifError));
        console.error('❌ [payment-refunded] Error stack:', customerNotifError instanceof Error ? customerNotifError.stack : 'No stack trace');
        // Continue to create admin notification even if customer notification fails
      }
    } else {
      console.warn('⚠️ [payment-refunded] No customer email found, skipping customer notification');
      console.warn('⚠️ [payment-refunded] Order details:', {
        orderId: order?.id,
        orderEmail: order?.email,
        customerId: order?.customer?.id,
        customerEmail: order?.customer?.email,
      });
    }

    // Send notification to admin (appears in admin UI notification drawer)
    // Using 'feed' channel with 'admin-ui' template as per Medusa documentation for admin notifications
    console.log('📧 [payment-refunded] Creating admin notification...');
    try {
      const notification = await notificationModuleService.createNotifications({
        to: '', // Empty string for admin notifications using feed channel
        channel: 'feed', // Feed channel as per Medusa documentation for admin panel notifications
        template: 'admin-ui', // Must be 'admin-ui' for admin panel notifications
        data: {
          title: `${isPartialRefund ? 'Partial ' : ''}Payment Refunded · Order #${orderDisplayId}`,
          description: `${isPartialRefund ? 'Partial ' : ''}Refund of ${currencyCode} ${displayAmount.toFixed(2)} processed for Order #${orderDisplayId}${order?.customer ? ` (${customerName})` : ''}.`,
          // Include all additional data for filtering/display in frontend
          ...notificationData,
          notification_type: 'payment_refunded',
          resource_type: 'payment',
          resource_id: payment.id,
          alert_level: 'INFO', // Refunds are informational
        },
      });

      console.log('✅ [payment-refunded] Admin notification created successfully:', JSON.stringify(notification, null, 2));
      console.log('✅ [payment-refunded] ====== SUBSCRIBER FUNCTION COMPLETED ======');
    } catch (adminNotifError) {
      console.error('❌ [payment-refunded] Error creating admin notification:', adminNotifError);
      throw adminNotifError;
    }
  } catch (error) {
    console.error('❌ [payment-refunded] ERROR in subscriber:', error);
    console.error('❌ [payment-refunded] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

export const config: SubscriberConfig = {
  event: 'payment.refunded',
};

