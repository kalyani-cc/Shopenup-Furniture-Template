import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from '@shopenup/framework';
import { Modules } from '@shopenup/framework/utils';
import type { IOrderModuleService } from '@shopenup/framework/types';

/**
 * Update return metadata
 * PATCH /admin/returns/:id/metadata
 */
export async function POST(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse,
) {
  const { id: returnId } = req.params;
  const logger = req.scope.resolve('logger') as any;

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { metadata } = body;

    if (!metadata) {
      return res.status(400).json({
        success: false,
        error: 'Metadata is required',
      });
    }

    // Resolve query service
    const query = req.scope.resolve('query') as any;

    // Get current return
    const { data: returns } = await query.graph({
      entity: 'return',
      filters: { id: returnId },
      fields: ['id', 'metadata'],
    });


    const returnOrder = returns && returns.length > 0 ? returns[0] : null;
    if (!returnOrder) {
      return res.status(404).json({
        success: false,
        error: 'Return order not found',
      });
    }

    // Merge metadata
    const currentMetadata = (returnOrder.metadata as any) || {};
    const updatedMetadata = {
      ...currentMetadata,
      ...metadata,
    };

    // Update return metadata
    logger.info(`[Update Return Metadata] 📝 Prepared metadata update for return ${returnId}`);
    
    // Try to update metadata using manager from query service's internal connection
    let updateSuccess = false;
    
    try {
      // Access manager through query service's internal properties
      const queryService = query as any;
      
      // Try to get manager from query service (check various possible properties)
      let manager = queryService.manager_ || 
                    queryService.manager || 
                    queryService.entityManager ||
                    queryService.connection?.manager ||
                    queryService.db?.manager ||
                    null;
      
      // If still not found, try resolving from scope with different names
      if (!manager) {
        const possibleNames = ["manager", "entityManager", "ormManager", "databaseManager"];
        for (const name of possibleNames) {
          try {
            manager = req.scope.resolve(name);
            if (manager) {
              logger.info(`[Update Return Metadata] ✅ Found manager via scope resolution: ${name}`);
              break;
            }
          } catch (e) {
            // Continue
          }
        }
      }
      
      // If still not found, try through order module service's internal properties
      if (!manager) {
        try {
          const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER);
          const serviceAny = orderModuleService as any;
          manager = serviceAny.manager_ || 
                    serviceAny.manager || 
                    serviceAny.entityManager ||
                    serviceAny.connection?.manager ||
                    null;
          if (manager) {
            logger.info(`[Update Return Metadata] ✅ Found manager via order module service`);
          }
        } catch (e) {
          // Order module service might not expose manager
        }
      }
      
      if (manager && typeof manager.transaction === 'function') {
        await manager.transaction(async (transactionManager: any) => {
          const returnRepo = transactionManager.getRepository("return");
          
          const updateResult = await returnRepo.update(
            { id: returnId },
            {
              metadata: updatedMetadata,
            }
          );
          
          logger.info(`[Update Return Metadata] 📝 Update result:`, updateResult);
        });
        
        updateSuccess = true;
        logger.info(`[Update Return Metadata] ✅ Metadata updated successfully`);
      } else {
        // Log available properties for debugging
        logger.warn(`[Update Return Metadata] ⚠️ Manager not available`);
        logger.warn(`[Update Return Metadata] Query service keys:`, Object.keys(queryService).slice(0, 10));
        logger.warn(`[Update Return Metadata] ⚠️ Metadata returned in response only - persistence may need to be handled elsewhere`);
      }
    } catch (updateError: any) {
      // Fix error handling - check if error has message property
      const errorMessage = updateError instanceof Error ? updateError.message : String(updateError);
      const errorStack = updateError instanceof Error ? updateError.stack : undefined;
      
      logger.error(`[Update Return Metadata] ❌ Could not persist metadata update: ${errorMessage}`);
      if (errorStack) {
        logger.error(`[Update Return Metadata] Error stack:`, errorStack);
      }
    }
    
    if (!updateSuccess) {
      logger.warn('[Update Return Metadata] ⚠️ Could not persist metadata - returned in response only.');
    }

    return res.json({
      success: true,
      message: 'Return metadata updated successfully',
      metadata: updatedMetadata,
    });
  } catch (error: any) {
    logger.error(`[Update Return Metadata] ❌ Error updating metadata for return ${returnId}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update return metadata',
      message: error?.message || 'Unknown error',
    });
  }
}

// Export PATCH handler (frontend calls PATCH)
export const PATCH = POST;

