import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from '@shopenup/framework';
import { Modules } from '@shopenup/framework/utils';

/**
 * Test endpoint to manually trigger inventory notifications
 * This helps verify that the notification system is working correctly
 * 
 * Usage: POST /admin/custom/test-inventory-notification
 * Body: { inventory_item_id: "inv_xxxxx" } (optional)
 */
export async function POST(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse,
) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const inventoryItemId = body.inventory_item_id;


    const eventBusModuleService = req.scope.resolve(Modules.EVENT_BUS);
    const query = req.scope.resolve('query');

    // If no inventory_item_id provided, find one with low stock
    let targetInventoryItemId = inventoryItemId;

    if (!targetInventoryItemId) {
      
      const { data: inventoryItems } = await query.graph({
        entity: 'inventory_item',
        fields: [
          'id',
          'stocked_quantity',
          'reserved_quantity',
          'location_levels.*',
          'location_levels.available_quantity',
        ],
        pagination: { take: 100 },
      });

      // Find item with low stock (quantity <= 90)
      for (const item of inventoryItems || []) {
        const itemRecord = item as any;
        let availableQty = 0;
        
        if (itemRecord.location_levels && Array.isArray(itemRecord.location_levels)) {
          availableQty = itemRecord.location_levels.reduce((sum: number, level: any) => {
            return sum + (level.available_quantity || 0);
          }, 0);
        } else {
          const stocked = itemRecord.stocked_quantity || 0;
          const reserved = itemRecord.reserved_quantity || 0;
          availableQty = stocked - reserved;
        }

        if (availableQty <= 90) {
          targetInventoryItemId = itemRecord.id;
          break;
        }
      }
    }

    if (!targetInventoryItemId) {
      return res.status(404).json({
        success: false,
        message: 'No inventory item found. Please provide an inventory_item_id or ensure you have items with low stock (quantity <= 90).',
      });
    }

    // Emit inventory_item.updated event using correct Medusa v2 / ShopEnup pattern
    
    await eventBusModuleService.emit({
      name: 'inventory_item.updated',
      data: {
        id: targetInventoryItemId,
        inventory_item_id: targetInventoryItemId,
      },
    });

    console.log('[test-inventory-notification] ✅ Event emitted successfully');

    // Wait a bit for the event to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if notification was created
    const { data: notifications } = await query.graph({
      entity: 'notification',
      fields: ['id', 'template', 'resource_type', 'data', 'created_at'],
      filters: {
        deleted_at: null,
        created_at: { $gte: new Date(Date.now() - 10000).toISOString() }, // Last 10 seconds
      },
      pagination: { take: 10 },
    });

    const inventoryNotifications = (notifications || []).filter((n: any) => {
      const data = typeof n.data === 'string' ? JSON.parse(n.data) : (n.data || {});
      return (
        n.template === 'inventory-low-stock' ||
        n.template === 'admin-ui' ||
        n.resource_type === 'inventory' ||
        data.notification_type === 'inventory_low_stock' ||
        data.inventory_id === targetInventoryItemId ||
        data.inventory_item_id === targetInventoryItemId
      );
    });

    return res.json({
      success: true,
      message: 'Test completed',
      inventory_item_id: targetInventoryItemId,
      event_emitted: true,
      notifications_found: inventoryNotifications.length,
      notifications: inventoryNotifications.map((n: any) => ({
        id: n.id,
        template: n.template,
        resource_type: n.resource_type,
        created_at: n.created_at,
        data: typeof n.data === 'string' ? JSON.parse(n.data) : n.data,
      })),
    });
  } catch (error) {
    console.error('[test-inventory-notification] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

// Also support GET for easy browser testing
export async function GET(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse,
) {
  try {
    const url = new URL(req.url || '', 'http://localhost');
    const inventoryItemId = url.searchParams.get('inventory_item_id');
    
    const body = inventoryItemId ? { inventory_item_id: inventoryItemId } : {};
    const mockReq = { ...req, body, method: 'POST' } as AuthenticatedShopenupRequest;
    return POST(mockReq, res);
  } catch (error) {
    console.error('Error in GET test-inventory-notification:', error);
    res.status(500).json({
      code: 'internal_error',
      message: (error as Error)?.message || 'Failed to test inventory notification',
    });
  }
}

