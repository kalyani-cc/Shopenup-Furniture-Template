import {
  createWorkflow,
  WorkflowResponse,
} from '@shopenup/framework/workflows-sdk';
import { emitEventStep } from '@shopenup/shopenup/core-flows';

const THRESHOLD = 90;

/**
 * Workflow to emit inventory.low_stock event
 * This event is then caught by the inventory-low-stocks subscriber
 * 
 * Note: The threshold check is already done in the inventory-level-updated subscriber
 * before calling this workflow, so we always emit the event here.
 */
const emitLowStockEvent = createWorkflow(
  'emit-low-stock-event',
  function (input: { inventory_id: string; quantity: number }) {
    // Emit the low stock event
    emitEventStep({
      eventName: 'inventory.low_stock',
      data: {
        inventory_id: input.inventory_id,
        quantity: input.quantity,
        threshold: THRESHOLD,
        status: 'LOW_STOCK',
      },
    });

    return new WorkflowResponse({
      inventory_id: input.inventory_id,
      quantity: input.quantity,
      triggered: true,
    });
  },
);

export default emitLowStockEvent;
