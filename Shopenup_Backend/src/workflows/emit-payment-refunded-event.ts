import {
  createWorkflow,
  WorkflowResponse,
} from '@shopenup/framework/workflows-sdk';
import { emitEventStep } from '@shopenup/shopenup/core-flows';

/**
 * Workflow to emit payment.refunded event
 * This event is then caught by the payment-refunded subscriber
 */
const emitPaymentRefundedEvent = createWorkflow(
  'emit-payment-refunded-event',
  function (input: {
    payment_id: string;
    refund_id?: string;
    payment_collection_id?: string;
    order_id?: string;
    amount?: number;
    currency_code?: string;
  }) {
    emitEventStep({
      eventName: 'payment.refunded',
      data: {
        payment_id: input.payment_id,
        refund_id: input.refund_id,
        payment_collection_id: input.payment_collection_id,
        order_id: input.order_id,
        amount: input.amount,
        currency_code: input.currency_code,
      },
    });

    return new WorkflowResponse({
      payment_id: input.payment_id,
      triggered: true,
    });
  },
);

export default emitPaymentRefundedEvent;

