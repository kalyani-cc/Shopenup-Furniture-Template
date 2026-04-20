import {
  createWorkflow,
  WorkflowResponse,
} from '@shopenup/framework/workflows-sdk';
import { emitEventStep } from '@shopenup/shopenup/core-flows';

/**
 * Workflow to emit payment_collection.status_changed event
 * This event is then caught by the payment-collection-status-changed subscriber
 */
const emitPaymentCollectionStatusChangedEvent = createWorkflow(
  'emit-payment-collection-status-changed-event',
  function (input: {
    payment_collection_id: string;
    status: string;
    previous_status?: string;
    order_id?: string;
  }) {
    emitEventStep({
      eventName: 'payment_collection.status_changed',
      data: {
        payment_collection_id: input.payment_collection_id,
        status: input.status,
        previous_status: input.previous_status,
        order_id: input.order_id,
      },
    });

    return new WorkflowResponse({
      payment_collection_id: input.payment_collection_id,
      status: input.status,
      triggered: true,
    });
  },
);

export default emitPaymentCollectionStatusChangedEvent;

