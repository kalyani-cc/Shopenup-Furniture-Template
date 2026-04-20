import { SubscriberArgs, SubscriberConfig } from '@shopenup/framework';
import { Modules } from '@shopenup/framework/utils';
import type { INotificationModuleService } from '@shopenup/framework/types';

// Log on module load to confirm subscriber is registered
console.log('✅ [return-notification] Subscriber module loaded and registered for events: return.created, return.updated');

type ReturnEventData = {
  id: string;
  return_id?: string;
  order_id?: string;
  status?: string;
  requested_at?: string;
  received_at?: string;
  [key: string]: any;
};

export default async function returnNotificationHandler({
  event: { data, name },
  container,
}: SubscriberArgs<ReturnEventData>) {
  console.log('🔔 [return-notification] ====== SUBSCRIBER FUNCTION CALLED ======');
  console.log('🔔 [return-notification] Event received:', name, JSON.stringify(data, null, 2));

  try {
    const query = container.resolve('query');
    const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION);

    // Extract return ID from different possible data structures
    const returnId = data.id || data.return_id;
    
    if (!returnId) {
      console.warn('[return-notification] No return ID found in event data:', data);
      return;
    }

    // Fetch the return with order details
    const { data: returns } = await query.graph({
      entity: 'return',
      fields: [
        'id',
        'status',
        'order_id',
        'requested_at',
        'received_at',
        'order.*',
        'order.id',
        'order.display_id',
        'order.email',
        'order.total',
        'order.currency_code',
        'order.customer.*',
        'order.customer.first_name',
        'order.customer.last_name',
        '*items',
        '*items.item.*',
      ],
      filters: { id: returnId },
    });

    const returnData = returns?.[0] as any;
    if (!returnData) {
      console.warn(`[return-notification] Return not found: ${returnId}`);
      return;
    }

    const order = returnData.order;
    const orderDisplayId = order?.display_id || order?.id || 'N/A';
    const customerName = order?.customer
      ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || 'Customer'
      : 'Customer';
    const storeName = process.env.STORE_NAME || 'Store';
    const currencyCode = returnData.order?.currency_code || 'INR';

    // Determine notification type based on return status
    const isReturnRequested = returnData.requested_at && !returnData.received_at;
    const isReturnReceived = returnData.received_at;

    // Only create notifications for important events
    if (!isReturnRequested && !isReturnReceived) {
      console.log('[return-notification] Return status not relevant for notification, skipping');
      return;
    }

    // Calculate return items count
    const itemsCount = returnData.items?.length || 0;
    const itemsText = itemsCount === 1 ? 'item' : 'items';

    // Prepare notification data
    const notificationData = {
      return_id: returnData.id,
      order_id: order?.id,
      order_display_id: orderDisplayId,
      customer_name: customerName,
      customer_email: order?.email || '',
      return_status: returnData.status,
      items_count: itemsCount,
      currency_code: currencyCode,
      store_name: storeName,
      triggered_at: new Date().toISOString(),
    };

    let notificationTitle = '';
    let notificationDescription = '';

    // Check if return was just requested (has requested_at but no received_at)
    if (isReturnRequested) {
      // Return Request Notification
      notificationTitle = `Order #${orderDisplayId} is request to return`;
      notificationDescription = `Customer ${customerName} has requested a return for ${itemsCount} ${itemsText} from Order #${orderDisplayId}.`;
      
      console.log('📦 [return-notification] Creating return request notification...');
      
      try {
        const notification = await notificationModuleService.createNotifications({
          to: '', // Empty string for admin notifications using feed channel
          channel: 'feed', // Feed channel for admin panel notifications
          template: 'admin-ui', // Must be 'admin-ui' for admin panel notifications
          data: {
            title: notificationTitle,
            description: notificationDescription,
            ...notificationData,
            notification_type: 'return_requested',
            resource_type: 'return',
            resource_id: returnData.id,
            alert_level: 'INFO',
          },
        });

        console.log('✅ [return-notification] Return request notification created successfully:', JSON.stringify(notification, null, 2));
      } catch (error) {
        console.error('❌ [return-notification] Error creating return request notification:', error);
        throw error;
      }
    }
    
    // Check if return was just received (has received_at)
    if (isReturnReceived) {
      // Return Received Notification
      notificationTitle = `Return request completed`;
      notificationDescription = `Return for ${itemsCount} ${itemsText} from Order #${orderDisplayId} has been received and processed.`;
      
      console.log('📦 [return-notification] Creating return received notification...');
      
      try {
        const notification = await notificationModuleService.createNotifications({
          to: '', // Empty string for admin notifications using feed channel
          channel: 'feed', // Feed channel for admin panel notifications
          template: 'admin-ui', // Must be 'admin-ui' for admin panel notifications
          data: {
            title: notificationTitle,
            description: notificationDescription,
            ...notificationData,
            notification_type: 'return_received',
            resource_type: 'return',
            resource_id: returnData.id,
            alert_level: 'SUCCESS',
          },
        });

        console.log('✅ [return-notification] Return received notification created successfully:', JSON.stringify(notification, null, 2));
      } catch (error) {
        console.error('❌ [return-notification] Error creating return received notification:', error);
        throw error;
      }
    }

    console.log('✅ [return-notification] ====== SUBSCRIBER FUNCTION COMPLETED ======');
  } catch (error) {
    console.error('❌ [return-notification] ERROR in subscriber:', error);
    console.error('❌ [return-notification] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

export const config: SubscriberConfig = {
  event: [
    'return.created',
    'return.updated',
  ],
};


