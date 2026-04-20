import { ShopenupContainer } from '@shopenup/framework/types';

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

    const { data: existingNotifications } = await query.graph({
      entity: 'notification',
      fields: ['id'],
      filters: {
        deleted_at: null,
        $or: [
          { resource_type: 'inventory', resource_id: inventoryId },
          { template: 'inventory-low-stock' },
        ],
        created_at: { $gte: cutoffDate.toISOString() },
      },
      pagination: { take: 1 },
    });

    // Also check in data field for inventory_id
    if (!existingNotifications || existingNotifications.length === 0) {
      const { data: notificationsByData } = await query.graph({
        entity: 'notification',
        fields: ['id'],
        filters: {
          deleted_at: null,
          template: 'inventory-low-stock',
          created_at: { $gte: cutoffDate.toISOString() },
        },
        pagination: { take: 100 }, // Get recent notifications to check data field
      });

      if (notificationsByData && notificationsByData.length > 0) {
        // Check if any notification has matching inventory_id in data field
        const hasMatch = notificationsByData.some((notif: any) => {
          const data = notif.data || {};
          return (
            data.inventory_id === inventoryId ||
            data.inventory_item_id === inventoryId ||
            data.resource_id === inventoryId
          );
        });
        return hasMatch;
      }
    }

    return existingNotifications && existingNotifications.length > 0;
  } catch (error) {
    console.error('[sync-low-stock-notifications-job] Error checking existing notifications:', error);
    // If check fails, allow notification creation (fail open)
    return false;
  }
}

/**
 * Scheduled job to sync low stock items to notifications
 * Runs every hour to check for low stock items and create notifications
 * Only creates notifications if one doesn't already exist for the same inventory item in the last 24 hours
 */
export default async function syncLowStockNotifications(container: ShopenupContainer) {

  try {
    const query = container.resolve('query');
    const notificationModuleService = container.resolve('notification');
    const adminEmail = process.env.DEFAULT_REPLY_TO || 'admin@localhost';
    const storeName = process.env.STORE_NAME || 'Store';
    const storefrontUrl = process.env.STOREFRONT_URL || '';
    const threshold = 90; // Default threshold

    // Fetch low stock items
    const { data: products } = await query.graph({
      entity: 'product',
      fields: [
        'id',
        'title',
        'handle',
        'variants.*',
        'variants.id',
        'variants.title',
        'variants.sku',
        'variants.manage_inventory',
        'variants.inventory.*',
        'variants.inventory.id',
        'variants.inventory.location_levels.*',
        'variants.inventory.location_levels.stocked_quantity',
        'variants.inventory.location_levels.reserved_quantity',
        'variants.inventory.location_levels.incoming_quantity',
        'variants.inventory.location_levels.location_id',
        'variants.inventory.location_levels.stock_locations.*',
        'variants.inventory.location_levels.stock_locations.name',
      ],
    });

    if (!products || products.length === 0) {
      return;
    }

    // Collect low stock items
    const lowStockItems: Array<{
      product_id: string;
      product_name: string;
      variant_id: string;
      variant_title: string;
      sku: string | null;
      inventory_id: string;
      location_id: string;
      location_name: string;
      stocked_quantity: number;
      reserved_quantity: number;
      available_quantity: number;
    }> = [];

    for (const product of products) {
      if (!product.variants || !Array.isArray(product.variants)) continue;

      for (const variant of product.variants) {
        if (!variant.manage_inventory) continue;
        if (!variant.inventory || !Array.isArray(variant.inventory)) continue;

        for (const inventoryItem of variant.inventory) {
          if (!inventoryItem.location_levels || !Array.isArray(inventoryItem.location_levels)) {
            continue;
          }

          for (const locationLevel of inventoryItem.location_levels) {
            const stockedQty = locationLevel.stocked_quantity || 0;
            const reservedQty = locationLevel.reserved_quantity || 0;
            const incomingQty = locationLevel.incoming_quantity || 0;
            
            const availableQty = stockedQty - reservedQty + incomingQty;

            if (availableQty <= threshold) {
              const locationName = locationLevel.stock_locations?.[0]?.name || 'Unknown Location';
              
              lowStockItems.push({
                product_id: product.id,
                product_name: product.title,
                variant_id: variant.id,
                variant_title: variant.title,
                sku: variant.sku,
                inventory_id: inventoryItem.id,
                location_id: locationLevel.location_id,
                location_name: locationName,
                stocked_quantity: stockedQty,
                reserved_quantity: reservedQty,
                available_quantity: availableQty,
              });
            }
          }
        }
      }
    }


    if (lowStockItems.length === 0) {
      return;
    }

    // Create notifications for low stock items
    let notificationsCreated = 0;
    let notificationsSkipped = 0;
    let notificationsDuplicated = 0;

    for (const item of lowStockItems) {
      try {
        // Check if notification already exists for this inventory item in the last 24 hours
        const hasExisting = await hasExistingNotification(query, item.inventory_id, 24);
        
        if (hasExisting) {
          notificationsDuplicated++;
          continue;
        }

        const alertLevel = item.available_quantity <= threshold / 2 ? 'critical' : 'warning';
        const productLink = `${storefrontUrl}/admin/products/${item.product_id}`;

        const notificationData = {
          subject: `Low Stock Alert · ${item.product_name}`,
          heading: 'Inventory Alert',
          message: `${item.product_name} (${item.sku || 'SKU N/A'}) is below the safety threshold.`,
          product_id: item.product_id,
          product_title: item.product_name,
          variant_id: item.variant_id,
          variant_title: item.variant_title,
          variant_sku: item.sku,
          inventory_id: item.inventory_id,
          inventory_item_id: item.inventory_id, // Frontend expects this field
          location_id: item.location_id,
          location_name: item.location_name,
          current_quantity: item.available_quantity,
          stocked_quantity: item.stocked_quantity,
          reserved_quantity: item.reserved_quantity,
          available_quantity: item.available_quantity,
          threshold,
          alert_level: alertLevel.toUpperCase(),
          status: 'LOW_STOCK',
          triggered_at: new Date().toISOString(),
          product_link: productLink,
          store_name: storeName,
          notification_type: 'inventory_low_stock',
          resource_type: 'inventory',
          resource_id: item.inventory_id,
        };

        // Use 'email' channel like order notifications - this creates notification records in admin UI
        await notificationModuleService.createNotifications({
          to: adminEmail,
          template: 'inventory-low-stock',
          channel: 'email', // Same channel as order notifications
          data: notificationData,
        });

        notificationsCreated++;
      } catch (error) {
        console.error(`[sync-low-stock-notifications-job] Error creating notification for ${item.product_name}:`, error);
        notificationsSkipped++;
      }
    }

   
  } catch (error) {
    console.error('[sync-low-stock-notifications-job] Error:', error);
  }
}

export const config = {
  name: 'sync-low-stock-notifications',
  schedule: '0 * * * *', // Every hour at minute 0 (e.g., 1:00, 2:00, 3:00)
  // Alternative schedules:
  // '0 0 * * *' - Every day at midnight
  // '0 */6 * * *' - Every 6 hours
  // '*/30 * * * *' - Every 30 minutes
};

