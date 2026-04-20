import { defineMiddlewares } from '@shopenup/shopenup';
import type { ShopenupRequest, ShopenupResponse, ShopenupNextFunction } from '@shopenup/framework/http';
import { adminProductTypeRoutesMiddlewares } from './store/custom/product-types/middlewares';
import { authenticate, validateAndTransformQuery } from '@shopenup/framework';
import { Modules } from '@shopenup/framework/utils';


// import {  validateAndTransformQuery } from "@medusajs/framework/http"
import { GetProductsFilterSchema } from "./store/filters/products/validators"


/**
 * Middleware to emit inventory events when inventory is updated
 * This ensures inventory notification subscribers are triggered
 */
async function emitInventoryUpdateEvents(
  req: ShopenupRequest,
  res: ShopenupResponse,
  next: ShopenupNextFunction
) {
  // Only apply to POST/PUT/PATCH methods (updates)
  if (!['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
    return next();
  }


  // Store original res.json to intercept the response
  const originalJson = res.json.bind(res);
  
  res.json = function (body: any) {
    // Emit event after successful response (non-blocking)
    setImmediate(async () => {
      try {
        // Use the correct Medusa v2 / ShopEnup pattern for event bus
        const eventBusModuleService = req.scope.resolve(Modules.EVENT_BUS);
        const url = req.url || '';
        
        // Extract inventory item ID from URL patterns:
        // /admin/inventory-items/:id
        // /admin/inventory-items/:id/location-levels/:location_id
        const inventoryItemMatch = url.match(/\/admin\/inventory-items\/([^\/\?]+)/);
        const locationLevelMatch = url.match(/\/admin\/inventory-items\/([^\/\?]+)\/location-levels\/([^\/\?]+)/);
        
        if (inventoryItemMatch) {
          const inventoryItemId = inventoryItemMatch[1];
          
          
          // Emit inventory_item.updated event using Medusa v2 pattern
          await eventBusModuleService.emit({
            name: 'inventory_item.updated',
            data: {
              id: inventoryItemId,
              inventory_item_id: inventoryItemId,
            },
          });
          
                    // If this is a location level update, also emit that event
          if (locationLevelMatch) {
            const locationId = locationLevelMatch[2];
            
            await eventBusModuleService.emit({
              name: 'inventory_level.updated',
              data: {
                inventory_item_id: inventoryItemId,
                location_id: locationId,
              },
            });
            
            
          }
        }
      } catch (error) {
        console.error('[Inventory Middleware] ❌ Error emitting inventory events:', error);
        if (error instanceof Error) {
          console.error('[Inventory Middleware] Error message:', error.message);
          console.error('[Inventory Middleware] Error stack:', error.stack);
        }
      }
    });
    
    return originalJson(body);
  };
  
  next();
}

export default defineMiddlewares([
  ...adminProductTypeRoutesMiddlewares,
  {
    method: 'ALL',
    matcher: '/store/custom/customer/*',
    middlewares: [authenticate('customer', ['session', 'bearer'])],
  },
  // Emit inventory events when inventory is updated
  {
    method: ['POST', 'PUT', 'PATCH'],
    matcher: '/admin/inventory-items/*',
    middlewares: [emitInventoryUpdateEvents],
  },
     {
      matcher: "/store/products/filter",
      method: "GET",
      middlewares: [
        validateAndTransformQuery(GetProductsFilterSchema, {})]
      }
]);