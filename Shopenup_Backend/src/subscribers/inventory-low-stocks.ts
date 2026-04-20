import { SubscriberArgs, SubscriberConfig } from '@shopenup/framework';
import { Modules } from '@shopenup/framework/utils';
import type { INotificationModuleService } from '@shopenup/framework/types';

// Log on module load to confirm subscriber is registered
console.log('✅ [inventory-low-stocks] Subscriber module loaded and registered for event: inventory.low_stock');

type InventoryLowStockEvent = {
  inventory_id: string;
  quantity: number;
  threshold?: number;
};

/**
 * Helper function to check if a notification already exists for an inventory item
 * within the last 24 hours to prevent duplicate notifications
 */
async function hasExistingNotification(
  query: any,
  inventoryId: string,
  hoursAgo: number = 24,
): Promise<boolean> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursAgo);
    const cutoffISO = cutoffDate.toISOString();

    // Method 1: Check by resource_type and resource_id (most reliable and specific)
    const { data: notificationsByResource } = await query.graph({
      entity: 'notification',
      fields: ['id', 'created_at'],
      filters: {
        deleted_at: null,
        resource_type: 'inventory',
        resource_id: inventoryId,
        created_at: { $gte: cutoffISO },
      },
      pagination: { take: 1 },
    });

    if (notificationsByResource && notificationsByResource.length > 0) {
      console.log(
        `[inventory-low-stocks] Found existing notification by resource_type/resource_id for inventory_id: ${inventoryId}`,
      );
      return true;
    }

    // Method 2: Check by template and data field (fallback for notifications without resource_type/resource_id)
    {
      const { data: notificationsByTemplate } = await query.graph({
        entity: 'notification',
        fields: ['id', 'data', 'created_at'],
        filters: {
          deleted_at: null,
          template: 'inventory-low-stock',
          created_at: { $gte: cutoffISO },
        },
        pagination: { take: 200 }, // Get recent notifications to check data field
      });

      if (notificationsByTemplate && notificationsByTemplate.length > 0) {
        // Check if any notification has matching inventory_id in data field
        const hasMatch = notificationsByTemplate.some((notif: any) => {
          try {
            // Handle both JSON string and object formats
            const notifData = typeof notif.data === 'string' ? JSON.parse(notif.data) : (notif.data || {});
            return (
              notifData.inventory_id === inventoryId ||
              notifData.inventory_item_id === inventoryId ||
              notifData.resource_id === inventoryId
            );
          } catch (e) {
            // If parsing fails, skip this notification
            return false;
          }
        });

        if (hasMatch) {
          console.log(
            `[inventory-low-stocks] Found existing notification by template/data field for inventory_id: ${inventoryId}`,
          );
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error('[inventory-low-stocks] Error checking existing notifications:', error);
    // If check fails, allow notification creation (fail open)
    return false;
  }
}

export default async function inventoryLowStockHandler({
  event: { data },
  container,
}: SubscriberArgs<InventoryLowStockEvent>) {
  console.log('🔔 [inventory-low-stocks] ====== SUBSCRIBER FUNCTION CALLED ======');
  console.log('🔔 [inventory-low-stocks] Event received:', JSON.stringify(data, null, 2));
  console.log('🔔 [inventory-low-stocks] Container available:', !!container);
  
  try {
    const query = container.resolve('query');
    console.log('🔔 [inventory-low-stocks] Query service resolved');
    
    const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION);
    console.log('🔔 [inventory-low-stocks] Notification service resolved');

  // ------------------------------
  // :one: Fetch inventory item + product
  // ------------------------------
  const {
    data: [inventory],
  } = await query.graph({
    entity: 'inventory_item',
    fields: [
      'id',
      'stocked_quantity',
      'reserved_quantity',
      'location_levels.*',
      'location_levels.available_quantity',
      'location_levels.stocked_quantity',
      'location_levels.reserved_quantity',
      'location_levels.location_id',
      'variants.*',
      'variants.product.*',
    ],
    filters: { id: data.inventory_id },
  });

  if (!inventory) {
    console.error(':x: Inventory not found:', data.inventory_id);
    return;
  }

  // Use first variant if available
  type InventoryRecord = typeof inventory & {
    location_id?: string;
    stocked_quantity?: number;
    reserved_quantity?: number;
    available_quantity?: number;
  };

  const inventoryRecord = inventory as InventoryRecord;

  const variant = inventoryRecord.variants?.[0];
  const product = variant?.product;

  if (!variant || !product) {
    console.warn(
      ':warning: Variant or Product missing for inventory:',
      data.inventory_id,
    );
    return;
  }

  // ------------------------------
  // :two: Build notification data
  // ------------------------------
  const threshold = data.threshold ?? 90; // fallback to 90
  // For feed channel, we don't need email, but we'll use it as a fallback identifier
  const adminEmail = process.env.DEFAULT_REPLY_TO || 'admin@localhost';

  const alertLevel =
    data.quantity <= threshold / 2 ? 'critical' : data.quantity <= threshold ? 'warning' : 'info';
  const storeName = process.env.STORE_NAME || 'Store';
  const productLink = `${process.env.STOREFRONT_URL || ''}/admin/products/${product.id}`;

  const notificationData = {
    subject: `Low Stock Alert · ${product.title}`,
    heading: 'Inventory Alert',
    message: `${product.title} (${variant.sku || 'SKU N/A'}) is below the safety threshold.`,
    product_id: product.id,
    product_title: product.title,
    product_handle: product.handle,
    variant_id: variant.id,
    variant_title: variant.title,
    variant_sku: variant.sku,
    inventory_id: inventory.id,
    inventory_item_id: inventory.id, // Frontend expects this field
    location_id: inventoryRecord.location_id,
    current_quantity: data.quantity,
    stocked_quantity: inventoryRecord.stocked_quantity,
    reserved_quantity: inventoryRecord.reserved_quantity,
    available_quantity: inventoryRecord.available_quantity,
    threshold,
    alert_level: alertLevel.toUpperCase(),
    status: 'LOW_STOCK',
    triggered_at: new Date().toISOString(),
    product_link: productLink,
    store_name: storeName,
  };

  console.log(':package: Low Stock Notification Data:', notificationData);

  // ------------------------------
  // :three: Check for existing notification before creating
  // ------------------------------
  const hasExisting = await hasExistingNotification(query, inventory.id, 24);
  
  if (hasExisting) {
    console.log(
      `🔔 [inventory-low-stocks] Skipping duplicate notification for inventory_id: ${inventory.id} (notification already exists in last 24 hours)`,
    );
    console.log('✅ [inventory-low-stocks] ====== SUBSCRIBER FUNCTION COMPLETED (duplicate skipped) ======');
    return;
  }
  
  console.log('🔔 [inventory-low-stocks] No existing notification found - will create new one');

  // ------------------------------
  // :four: Create Notification (appears in admin UI notification drawer)
  // Following Medusa/Shopenup pattern: Use 'feed' channel with 'admin-ui' template for admin notifications
  // This ensures notifications are stored in database and appear in admin UI
  // ------------------------------
  console.log('📧 [inventory-low-stocks] Creating admin notification with feed channel...');
  
  try {
    // Create admin notification using 'feed' channel (as per Medusa documentation for admin notifications)
    // This ensures the notification is stored in the database and appears in admin UI
    const notification = await notificationModuleService.createNotifications({
      to: '', // Empty string for admin notifications using feed channel
      channel: 'feed', // Feed channel as per Medusa/Shopenup documentation for admin panel notifications
      template: 'admin-ui', // Must be 'admin-ui' for admin panel notifications
      resource_type: 'inventory', // Set resource_type at top level for proper tracking
      resource_id: inventoryRecord.id, // Set resource_id at top level for duplicate prevention
      data: {
        title: `Low Stock Alert · ${product.title}`,
        description: `${product.title} (${variant.sku || 'SKU N/A'}) is below the safety threshold. Current quantity: ${data.quantity}, Threshold: ${threshold}`,
        // Include all additional data for filtering/display in frontend
        ...notificationData,
        notification_type: 'inventory_low_stock',
        resource_type: 'inventory',
        resource_id: inventoryRecord.id,
        alert_level: notificationData.alert_level,
      },
    });
    
    console.log('✅ [inventory-low-stocks] Admin notification created successfully:', JSON.stringify(notification, null, 2));
    
    // Optionally: Also send email notification if email provider is configured
    // This is separate from the admin UI notification
    if (adminEmail && adminEmail !== 'admin@localhost') {
      try {
        console.log('📧 [inventory-low-stocks] Creating email notification...');
        await notificationModuleService.createNotifications({
          to: adminEmail,
          template: 'inventory-low-stock',
          channel: 'email', // Email channel for actual email sending
          resource_type: 'inventory', // Set resource_type at top level
          resource_id: inventoryRecord.id, // Set resource_id at top level
          data: {
            ...notificationData,
            notification_type: 'inventory_low_stock',
            resource_type: 'inventory',
            resource_id: inventoryRecord.id,
            alert_level: notificationData.alert_level,
          },
        });
        console.log('✅ [inventory-low-stocks] Email notification created successfully');
      } catch (emailError) {
        console.warn('⚠️ [inventory-low-stocks] Email notification failed (non-critical):', emailError);
        // Don't throw - admin UI notification is more important
      }
    }
    
    console.log('✅ [inventory-low-stocks] ====== SUBSCRIBER FUNCTION COMPLETED ======');
  } catch (notifError) {
    console.error('❌ [inventory-low-stocks] Error creating notification:', notifError);
    console.error('❌ [inventory-low-stocks] Error details:', notifError instanceof Error ? notifError.message : String(notifError));
    throw notifError;
  }
  } catch (error) {
    console.error('❌ [inventory-low-stocks] ERROR in subscriber:', error);
    console.error('❌ [inventory-low-stocks] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

export const config: SubscriberConfig = {
  event: 'inventory.low_stock',
};