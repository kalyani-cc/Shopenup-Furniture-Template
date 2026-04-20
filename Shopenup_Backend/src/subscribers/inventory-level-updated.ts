import { SubscriberArgs, SubscriberConfig } from '@shopenup/framework';
import emitLowStockEvent from '../workflows/emit-low-stock-event';

/**
 * Subscriber that listens to inventory level updates and triggers
 * low stock alerts when quantity falls below threshold
 * 
 * Based on Medusa/Shopenup event patterns:
 * - inventory_item.created/updated: When inventory items are created/updated
 * - inventory_level.created/updated: When location-level inventory is updated
 * 
 * Note: This subscriber includes debouncing to prevent duplicate workflow triggers
 * when multiple events fire for the same inventory item in quick succession.
 */

// In-memory cache to track recent workflow triggers (prevents duplicates within 5 seconds)
const recentTriggers = new Map<string, number>();
const DEBOUNCE_MS = 5000; // 5 seconds debounce window

export default async function inventoryLevelUpdatedHandler({
  event: { data, name },
  container,
}: SubscriberArgs<any>) {
  console.log(`[inventory-level-updated] Event: ${name}`, JSON.stringify(data, null, 2));

  const query = container.resolve('query');
  const THRESHOLD = 90;

  try {
    // Extract inventory_item_id from different possible data structures
    // For inventory_level events: data.inventory_item_id
    // For inventory_item events: data.id
    const inventoryItemId = data.inventory_item_id || data.id;
    
    if (!inventoryItemId) {
      console.warn(`[inventory-level-updated] No inventory item ID found in event data:`, data);
      return;
    }

    // Fetch the inventory item with location levels to get current quantity
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
      ],
      filters: { id: inventoryItemId },
    });

    const inventoryItem = inventoryItems?.[0];
    if (!inventoryItem) {
      console.warn(`[inventory-level-updated] Inventory item not found: ${inventoryItemId}`);
      return;
    }

    // Type assertion for inventory item record
    type InventoryItemRecord = typeof inventoryItem & {
      stocked_quantity?: number;
      reserved_quantity?: number;
      location_levels?: Array<{
        available_quantity?: number;
        stocked_quantity?: number;
        reserved_quantity?: number;
        location_id?: string;
      }>;
    };

    const inventoryRecord = inventoryItem as InventoryItemRecord;

    // Calculate current quantity:
    // 1. If location_levels exist, sum available_quantity across all locations
    // 2. Otherwise, use item-level stocked_quantity - reserved_quantity
    let currentQuantity = 0;

    if (inventoryRecord.location_levels && inventoryRecord.location_levels.length > 0) {
      // Sum available_quantity from all location levels
      currentQuantity = inventoryRecord.location_levels.reduce((sum, level) => {
        const locationLevel = level as {
          available_quantity?: number;
          stocked_quantity?: number;
          reserved_quantity?: number;
        };
        return sum + (locationLevel.available_quantity ?? 0);
      }, 0);
    } else {
      // Fallback to item-level quantities
      const stocked = inventoryRecord.stocked_quantity ?? 0;
      const reserved = inventoryRecord.reserved_quantity ?? 0;
      currentQuantity = stocked - reserved;
    }

    console.log(
      `[inventory-level-updated] Inventory Item ${inventoryRecord.id} - Quantity: ${currentQuantity}, Threshold: ${THRESHOLD}`,
    );

    // Only trigger if quantity is at or below threshold
    if (currentQuantity <= THRESHOLD) {
      const inventoryId = inventoryRecord.id;
      const now = Date.now();
      
      // Check if we recently triggered a workflow for this inventory item (debounce)
      const lastTriggerTime = recentTriggers.get(inventoryId);
      if (lastTriggerTime && (now - lastTriggerTime) < DEBOUNCE_MS) {
        console.log(
          `[inventory-level-updated] ⏭️ Skipping duplicate trigger for inventory item ${inventoryId} (triggered ${Math.round((now - lastTriggerTime) / 1000)}s ago, debounce: ${DEBOUNCE_MS / 1000}s)`,
        );
        return;
      }

      console.log(
        `[inventory-level-updated] ⚠️ Low stock detected! Triggering workflow for inventory item ${inventoryId}`,
      );

      // Mark this inventory item as recently triggered
      recentTriggers.set(inventoryId, now);
      
      // Clean up old entries (older than debounce window * 2)
      const cleanupThreshold = now - (DEBOUNCE_MS * 2);
      for (const [id, timestamp] of recentTriggers.entries()) {
        if (timestamp < cleanupThreshold) {
          recentTriggers.delete(id);
        }
      }

      try {
        // Trigger the low stock workflow
        const workflowResult = await emitLowStockEvent(container).run({
          input: {
            inventory_id: inventoryId,
            quantity: currentQuantity,
          },
        });
        console.log(
          `[inventory-level-updated] ✅ Workflow executed successfully for inventory item ${inventoryId}:`,
          JSON.stringify(workflowResult, null, 2),
        );
      } catch (workflowError) {
        console.error(
          `[inventory-level-updated] ❌ Workflow execution failed for inventory item ${inventoryId}:`,
          workflowError,
        );
        console.error(
          `[inventory-level-updated] Error stack:`,
          workflowError instanceof Error ? workflowError.stack : 'No stack trace',
        );
        // Remove from cache on error so it can be retried
        recentTriggers.delete(inventoryId);
        // Don't throw - log the error but continue
      }
    } else {
      console.log(
        `[inventory-level-updated] ✅ Inventory Item ${inventoryRecord.id} - Quantity (${currentQuantity}) is above threshold (${THRESHOLD}), no action needed`,
      );
    }
  } catch (error) {
    console.error(
      `[inventory-level-updated] Error processing inventory update:`,
      error,
    );
  }
}

export const config: SubscriberConfig = {
  event: [
    'inventory_item.created',
    'inventory_item.updated',
    'inventory_level.created',
    'inventory_level.updated',
    'reservation.created',
    'reservation.updated',
  ],
};

