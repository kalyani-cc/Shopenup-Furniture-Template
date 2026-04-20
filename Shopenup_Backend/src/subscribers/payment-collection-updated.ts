import { SubscriberArgs, SubscriberConfig } from '@shopenup/framework';
import emitPaymentCollectionStatusChangedEvent from '../workflows/emit-payment-collection-status-changed-event';

// Log on module load to confirm subscriber is registered
console.log('✅ [payment-collection-updated] Subscriber module loaded and registered for events: payment_collection.created, payment_collection.updated');

/**
 * Subscriber that listens to payment collection updates and triggers
 * payment collection status change notifications
 * 
 * Listens to framework events:
 * - payment_collection.created/updated: When payment collections are created or updated
 */
export default async function paymentCollectionUpdatedHandler({
  event: { data, name },
  container,
}: SubscriberArgs<any>) {
  console.log(`🔔 [payment-collection-updated] Event received: ${name}`, JSON.stringify(data, null, 2));

  try {
    const query = container.resolve('query');

    // Extract payment_collection_id from different possible data structures
    const paymentCollectionId = data.id || data.payment_collection_id;
    
    if (!paymentCollectionId) {
      console.warn(`[payment-collection-updated] No payment collection ID found in event data:`, data);
      return;
    }

    // Fetch the payment collection to check its status
    const { data: paymentCollections } = await query.graph({
      entity: 'payment_collection',
      fields: [
        'id',
        'status',
        'order_id',
      ],
      filters: { id: paymentCollectionId },
    });

    const paymentCollection = paymentCollections?.[0] as any;
    if (!paymentCollection) {
      console.warn(`[payment-collection-updated] Payment collection not found: ${paymentCollectionId}`);
      return;
    }

    // Only trigger for important statuses
    const importantStatuses = ['awaiting', 'authorized', 'canceled'];
    if (importantStatuses.includes(paymentCollection.status)) {
      console.log(`[payment-collection-updated] ⚠️ Payment collection status change detected! Triggering workflow for ${paymentCollection.id}`);
      
      try {
        await emitPaymentCollectionStatusChangedEvent(container).run({
          input: {
            payment_collection_id: paymentCollection.id,
            status: paymentCollection.status,
            order_id: paymentCollection.order_id,
          },
        });
        console.log(`[payment-collection-updated] ✅ Payment collection status change workflow triggered successfully`);
      } catch (error) {
        console.error(`[payment-collection-updated] ⚠️ Payment collection status change workflow trigger failed:`, error);
      }
    }
  } catch (error) {
    console.error(`[payment-collection-updated] Error processing payment collection update:`, error);
  }
}

export const config: SubscriberConfig = {
  event: [
    'payment_collection.created',
    'payment_collection.updated',
  ],
};

