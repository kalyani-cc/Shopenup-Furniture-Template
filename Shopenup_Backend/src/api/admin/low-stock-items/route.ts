import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from '@shopenup/framework';
import { Modules } from '@shopenup/framework/utils';
import type { INotificationModuleService } from '@shopenup/framework/types';

/**
 * Helper function to check if a notification already exists for an inventory item
 * within the specified time period to prevent duplicate notifications
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

    // Check by resource_type and resource_id
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
      return true;
    }

    // Check by template and data field
    const { data: notificationsByTemplate } = await query.graph({
      entity: 'notification',
      fields: ['id', 'data', 'created_at'],
      filters: {
        deleted_at: null,
        template: 'admin-ui',
        created_at: { $gte: cutoffISO },
      },
      pagination: { take: 200 },
    });

    if (notificationsByTemplate && notificationsByTemplate.length > 0) {
      const hasMatch = notificationsByTemplate.some((notif: any) => {
        try {
          const notifData = typeof notif.data === 'string' ? JSON.parse(notif.data) : (notif.data || {});
          return (
            notifData.inventory_id === inventoryId ||
            notifData.inventory_item_id === inventoryId ||
            notifData.resource_id === inventoryId
          );
        } catch (e) {
          return false;
        }
      });
      return hasMatch;
    }

    return false;
  } catch (error) {
    console.error('[low-stock-items] Error checking existing notifications:', error);
    return false;
  }
}

export async function GET(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse,
) {
  try {
    const query = req.scope.resolve('query');

    // Parse query parameters from URL (for GET) or body (for POST)
    const url = new URL(req.url || '', 'http://localhost');
    const searchParams = url.searchParams;
    
    // Support both GET (query params) and POST (body)
    let dateFrom: string | null = null;
    let dateTo: string | null = null;
    let region: string | null = null;
    let state: string | null = null;
    let threshold: number = 90; // Default threshold
    let createNotifications: boolean = false; // Option to create notifications

    if (req.method === 'GET') {
      dateFrom = searchParams.get('dateFrom');
      dateTo = searchParams.get('dateTo');
      region = searchParams.get('region');
      state = searchParams.get('state');
      const thresholdParam = searchParams.get('threshold');
      if (thresholdParam) {
        threshold = parseInt(thresholdParam, 10) || 90;
      }
      createNotifications = searchParams.get('createNotifications') === 'true';
    } else if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const dateFromRaw = body.dateFrom || body.dateRange?.from;
      const dateToRaw = body.dateTo || body.dateRange?.to;
      region = body.region || null;
      state = body.state || null;
      threshold = body.threshold || 90;
      createNotifications = body.createNotifications === true;
      
      // Convert Date objects to ISO strings
      dateFrom = dateFromRaw instanceof Date ? dateFromRaw.toISOString() : (dateFromRaw || null);
      dateTo = dateToRaw instanceof Date ? dateToRaw.toISOString() : (dateToRaw || null);
    }

    // Query all products with their variants and inventory information
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
        'variants.inventory.location_levels.stock_locations.address.*',
      ],
    });

    if (!products || products.length === 0) {
      res.json({
        items: [],
        count: 0,
      });
      return;
    }

    // Collect low stock items with inventory_id
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
        // Skip variants that don't manage inventory
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
            
            // Calculate available quantity (stocked - reserved + incoming)
            const availableQty = stockedQty - reservedQty + incomingQty;

            // Check if stock is below threshold
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

    // Apply filters if needed (region/state filters might not be directly applicable to stock,
    // but we can filter based on location address if needed)
    let filteredItems = lowStockItems;

    if (region || state) {
      // Filter by location address if region/state filters are provided
      // This would require checking location addresses, but for now we'll keep all items
      // You can enhance this later to filter by location address region/state
    }

    // Sort by available_quantity ascending (lowest stock first)
    filteredItems.sort((a, b) => a.available_quantity - b.available_quantity);

    // Create notifications if requested
    let notificationsCreated = 0;
    let notificationsSkipped = 0;
    
    if (createNotifications && filteredItems.length > 0) {
      const notificationModuleService: INotificationModuleService = req.scope.resolve(Modules.NOTIFICATION);
      const adminEmail = process.env.DEFAULT_REPLY_TO || 'admin@localhost';
      const storeName = process.env.STORE_NAME || 'Store';
      const storefrontUrl = process.env.STOREFRONT_URL || '';


      for (const item of filteredItems) {
        try {
          // Check if notification already exists (prevent duplicates)
          const hasExisting = await hasExistingNotification(query, item.inventory_id, 24);
          
          if (hasExisting) {
            notificationsSkipped++;
            continue;
          }

          // Calculate alert level
          const alertLevel = item.available_quantity <= threshold / 2 ? 'CRITICAL' : 'WARNING';
          const productLink = `${storefrontUrl}/admin/products/${item.product_id}`;

          // Build notification data
          const notificationData = {
            title: `Low Stock Alert · ${item.product_name}`,
            description: `${item.product_name} (${item.sku || 'SKU N/A'}) is below the safety threshold. Current quantity: ${item.available_quantity}, Threshold: ${threshold}`,
            subject: `Low Stock Alert · ${item.product_name}`,
            heading: 'Inventory Alert',
            message: `${item.product_name} (${item.sku || 'SKU N/A'}) is below the safety threshold.`,
            product_id: item.product_id,
            product_title: item.product_name,
            variant_id: item.variant_id,
            variant_title: item.variant_title,
            variant_sku: item.sku,
            inventory_id: item.inventory_id,
            inventory_item_id: item.inventory_id,
            location_id: item.location_id,
            location_name: item.location_name,
            current_quantity: item.available_quantity,
            stocked_quantity: item.stocked_quantity,
            reserved_quantity: item.reserved_quantity,
            available_quantity: item.available_quantity,
            threshold,
            alert_level: alertLevel,
            status: 'LOW_STOCK',
            triggered_at: new Date().toISOString(),
            product_link: productLink,
            store_name: storeName,
            notification_type: 'inventory_low_stock',
            resource_type: 'inventory',
            resource_id: item.inventory_id,
          };

          // Create admin notification using 'feed' channel (as per Medusa/Shopenup pattern)
          await notificationModuleService.createNotifications({
            to: '', // Empty string for admin notifications using feed channel
            channel: 'feed', // Feed channel for admin panel notifications
            template: 'admin-ui', // Must be 'admin-ui' for admin panel notifications
            data: notificationData,
          });

          notificationsCreated++;
        } catch (error) {
          console.error(`[low-stock-items] ❌ Error creating notification for ${item.product_name}:`, error);
          notificationsSkipped++;
        }
      }

    }

    // Format response
    const formattedItems = filteredItems.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      variant_id: item.variant_id,
      variant_title: item.variant_title,
      sku: item.sku,
      location_id: item.location_id,
      location_name: item.location_name,
      stocked_quantity: item.stocked_quantity,
      reserved_quantity: item.reserved_quantity,
      available_quantity: item.available_quantity,
    }));

    res.json({
      items: formattedItems,
      count: formattedItems.length,
      threshold,
      ...(createNotifications && {
        notifications_created: notificationsCreated,
        notifications_skipped: notificationsSkipped,
      }),
    });
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({
      code: 'internal_error',
      message:
        (error as Error)?.message ||
        'Failed to fetch low stock items',
    });
  }
}

// Also support POST for sending filters in body
export async function POST(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse,
) {
  // Reuse the same logic as GET
  return GET(req, res);
}


