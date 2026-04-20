import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from '@shopenup/framework';
import { Modules } from '@shopenup/framework/utils';

/**
 * Custom inventory location level update route
 * This overrides the default route to emit inventory events for notifications
 * 
 * POST /admin/inventory-items/:id/location-levels/:location_id
 */
export async function POST(
  req: AuthenticatedShopenupRequest<{ stocked_quantity?: number; incoming_quantity?: number }>,
  res: ShopenupResponse,
) {
  const { id: inventoryItemId, location_id: locationId } = req.params;


  try {
    const inventoryModuleService = req.scope.resolve(Modules.INVENTORY);

    // Build update payload - only include fields that are provided
    const updatePayload: any = {
      inventory_item_id: inventoryItemId,
      location_id: locationId,
    };

    // Only add stocked_quantity if it's provided
    if (req.body.stocked_quantity !== undefined) {
      updatePayload.stocked_quantity = req.body.stocked_quantity;
    }

    // Only add incoming_quantity if it's provided, otherwise default to 0
    if (req.body.incoming_quantity !== undefined) {
      updatePayload.incoming_quantity = req.body.incoming_quantity;
    } else {
      // Default to 0 if not provided to avoid undefined error
      updatePayload.incoming_quantity = 0;
    }


    // Update the inventory level using the standard service
    const updatedLevel = await inventoryModuleService.updateInventoryLevels(updatePayload);


    // Emit events for notification system
    // Use setImmediate to ensure this doesn't block the response
    setImmediate(async () => {
      try {
        // Get the event bus module for emitting events
        const eventBusModuleService = req.scope.resolve(Modules.EVENT_BUS);
        
        
        // Emit inventory_item.updated event
        await eventBusModuleService.emit({
          name: 'inventory_item.updated',
          data: {
            id: inventoryItemId,
            inventory_item_id: inventoryItemId,
          },
        });


        // Also emit inventory_level.updated event
        await eventBusModuleService.emit({
          name: 'inventory_level.updated',
          data: {
            inventory_item_id: inventoryItemId,
            location_id: locationId,
          },
        });

      } catch (eventError) {
        console.error('[Inventory Update] ❌ Error emitting events:', eventError);
        // Don't throw - the inventory update already succeeded
      }
    });

    return res.json({ inventory_level: updatedLevel });
  } catch (error) {
    console.error('[Inventory Update] ❌ Error updating inventory:', error);
    return res.status(500).json({
      error: 'Failed to update inventory',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

