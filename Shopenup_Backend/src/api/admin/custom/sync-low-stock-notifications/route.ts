import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from '@shopenup/framework';
import emitLowStockEvent from '../../../../workflows/emit-low-stock-event';

/**
 * Sync low stock items from /admin/low-stock-items API to notifications
 * This endpoint fetches low stock items and creates notifications for them
 * Usage: POST /admin/custom/sync-low-stock-notifications
 * Body: { threshold?: number, force?: boolean } (optional)
 */
export async function POST(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse,
) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const threshold = body.threshold || 90;
    const force = body.force || false; // If true, create notifications even if they already exist


    const query = req.scope.resolve('query');
    const notificationModuleService = req.scope.resolve('notification');
    const adminEmail = process.env.DEFAULT_REPLY_TO || 'admin@localhost';
    const storeName = process.env.STORE_NAME || 'Store';
    const storefrontUrl = process.env.STOREFRONT_URL || '';

    // Fetch inventory items directly (matching the API response structure)
    const { data: inventoryItems } = await query.graph({
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
        'variants.id',
        'variants.title',
        'variants.sku',
        'variants.product.*',
        'variants.product.id',
        'variants.product.title',
        'variants.product.handle',
      ],
    });

    if (!inventoryItems || inventoryItems.length === 0) {
      return res.json({
        success: true,
        message: 'No inventory items found',
        notifications_created: 0,
        items_checked: 0,
      });
    }

    // Collect low stock items matching the API response structure
    const lowStockItems: Array<{
      id: string; // inventory_item_id
      title: string; // product title
      sku: string | null;
      product_id?: string;
      variant_id?: string;
      inventory_id: string;
      available_quantity: number;
      threshold: number;
    }> = [];

    for (const inventoryItem of inventoryItems) {
      // Calculate available quantity from location levels
      let availableQty = 0;
      
      if (inventoryItem.location_levels && Array.isArray(inventoryItem.location_levels)) {
        availableQty = inventoryItem.location_levels.reduce((sum: number, level: any) => {
          return sum + (level.available_quantity || 0);
        }, 0);
      } else {
        // Fallback to item-level quantities
        const inventoryRecord = inventoryItem as any;
        const stocked = inventoryRecord.stocked_quantity || 0;
        const reserved = inventoryRecord.reserved_quantity || 0;
        availableQty = stocked - reserved;
      }

      // Check if below threshold
      if (availableQty <= threshold) {
        // Get product and variant info
        const variant = inventoryItem.variants?.[0];
        const product = variant?.product;

        if (product && variant) {
          lowStockItems.push({
            id: inventoryItem.id, // inventory_item_id
            title: product.title, // product title
            sku: variant.sku || null,
            product_id: product.id,
            variant_id: variant.id,
            inventory_id: inventoryItem.id,
            available_quantity: availableQty,
            threshold,
          });
        }
      }
    }

    console.log(`[sync-low-stock-notifications] Found ${lowStockItems.length} low stock items`);

    /**
     * Helper function to check if a notification already exists for an inventory item
     * within the last 24 hours to prevent duplicate notifications
     */
    const hasExistingNotification = async (inventoryId: string, hoursAgo: number = 24): Promise<boolean> => {
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
        console.error('[sync-low-stock-notifications] Error checking existing notifications:', error);
        // If check fails, allow notification creation (fail open)
        return false;
      }
    };

    // Check existing notifications to avoid duplicates
    let notificationsCreated = 0;
    let notificationsSkipped = 0;
    let notificationsDuplicated = 0;

    for (const item of lowStockItems) {
      try {
        // Check if notification already exists (unless force=true)
        if (!force) {
          const hasExisting = await hasExistingNotification(item.inventory_id, 24);
          
          if (hasExisting) {
            notificationsDuplicated++;
            continue;
          }
        }

        // 🔥 STEP 1: Trigger the workflow first (this emits the event and triggers subscriber)
        try {
          await emitLowStockEvent(req.scope).run({
            input: {
              inventory_id: item.inventory_id,
              quantity: item.available_quantity,
            },
          });
        } catch (workflowError) {
          console.error(`[sync-low-stock-notifications] ⚠️ Workflow trigger failed for ${item.title}:`, workflowError);
          // Continue to create notification directly even if workflow fails
        }

        // STEP 2: Also create notification directly (backup method)
        const alertLevel = item.available_quantity <= threshold / 2 ? 'critical' : 'warning';
        const productLink = item.product_id 
          ? `${storefrontUrl}/admin/products/${item.product_id}`
          : `${storefrontUrl}/admin/inventory`;

        const notificationData = {
          subject: `Low Stock Alert · ${item.title}`,
          heading: 'Inventory Alert',
          message: `${item.title} (${item.sku || 'SKU N/A'}) is below the safety threshold.`,
          product_id: item.product_id,
          product_title: item.title, // Using title from API response
          variant_id: item.variant_id,
          variant_sku: item.sku,
          inventory_id: item.inventory_id,
          inventory_item_id: item.id, // Frontend expects this field (matches API response 'id')
          current_quantity: item.available_quantity,
          available_quantity: item.available_quantity,
          threshold: item.threshold,
          alert_level: alertLevel.toUpperCase(),
          status: 'LOW_STOCK',
          triggered_at: new Date().toISOString(),
          product_link: productLink,
          store_name: storeName,
          notification_type: 'inventory_low_stock',
          resource_type: 'inventory',
          resource_id: item.inventory_id,
        };

        // Create notification - try email channel first (like order notifications)
        // Email channel creates notification records that appear in admin UI
        try {
          await notificationModuleService.createNotifications({
            to: adminEmail,
            template: 'inventory-low-stock',
            channel: 'email', // Using email channel like order notifications
            data: notificationData,
          });
          notificationsCreated++;
        } catch (emailError) {
          // Fallback to feed channel if email fails
          console.warn(`[sync-low-stock-notifications] Email channel failed for ${item.title}, trying feed:`, emailError);
          await notificationModuleService.createNotifications({
            to: adminEmail,
            template: 'inventory-low-stock',
            channel: 'feed',
            data: notificationData,
          });
          notificationsCreated++;
        }
      } catch (error) {
        console.error(`[sync-low-stock-notifications] ❌ Error processing ${item.title}:`, error);
        notificationsSkipped++;
      }
    }

    return res.json({
      success: true,
      message: `Sync completed. Created ${notificationsCreated} notifications, skipped ${notificationsSkipped} errors, avoided ${notificationsDuplicated} duplicates`,
      notifications_created: notificationsCreated,
      notifications_skipped: notificationsSkipped,
      notifications_duplicated: notificationsDuplicated,
      items_checked: lowStockItems.length,
      threshold,
    });
  } catch (error) {
    console.error('[sync-low-stock-notifications] Error:', error);
    return res.status(500).json({
      error: 'Failed to sync low stock notifications',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

// Also support GET for easy testing
export async function GET(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse,
) {
  try {
    const url = new URL(req.url || '', 'http://localhost');
    const searchParams = url.searchParams;
    const threshold = searchParams.get('threshold') ? parseInt(searchParams.get('threshold')!, 10) : 90;
    const force = searchParams.get('force') === 'true';

    // Convert to POST format
    const body = { threshold, force };
    const mockReq = { ...req, body, method: 'POST' } as AuthenticatedShopenupRequest;
    return POST(mockReq, res);
  } catch (error) {
    console.error('Error in GET sync-low-stock-notifications:', error);
    res.status(500).json({
      code: 'internal_error',
      message: (error as Error)?.message || 'Failed to sync low stock notifications',
    });
  }
}

