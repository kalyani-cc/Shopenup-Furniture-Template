// import { SubscriberArgs, SubscriberConfig } from "@shopenup/framework";

// type FulfillmentCreatedEvent = {
//   id: string;
//   no_notification: boolean;
// };

// /**
//  * Fulfillment Created Subscriber
//  * 
//  * NOTE: This subscriber is kept for potential future use but is currently not needed
//  * because the createFulfillment method in ShiprocketFulfillmentService handles all
//  * Shiprocket order and shipment creation when a fulfillment is created.
//  * 
//  * The flow is:
//  * 1. Admin/automation creates a Medusa fulfillment
//  * 2. Fulfillment provider code (createFulfillment) runs automatically
//  * 3. createFulfillment creates Shiprocket order, shipment, and persists all data
//  * 4. Medusa workflow marks fulfillment as fulfilled
//  * 
//  * This subscriber can be used for additional post-processing if needed in the future.
//  */
// export default async function fulfillmentCreatedHandler({
//   event: { data },
//   container,
// }: SubscriberArgs<FulfillmentCreatedEvent>) {
//   const fulfillmentService = container.resolve("fulfillmentService") as any;
//   const logger = container.resolve("logger") as any;

//   console.log("[Shiprocket] 📬 fulfillment.created event received");
//   console.log("[Shiprocket] Fulfillment ID:", data.id);

//   try {
//     // Get the fulfillment
//     const fulfillment = await fulfillmentService.retrieve(data.id, {
//       relations: ["order", "items"],
//     });

//     console.log("[Shiprocket] Fulfillment Provider ID:", fulfillment.provider_id);
//     console.log("[Shiprocket] Order ID:", fulfillment.order?.id);

//     // Only process Shiprocket fulfillments
//     if (fulfillment.provider_id !== "shiprocket") {
//       console.log("[Shiprocket] Not a Shiprocket fulfillment, skipping");
//       return;
//     }

//     // Check if shipment already created (should be created by createFulfillment)
//     if (fulfillment.data?.shipment_id && fulfillment.metadata?.shiprocket_shipment_id) {
//       console.log("[Shiprocket] ✅ Fulfillment already has Shiprocket shipment data");
//       console.log("[Shiprocket] Shipment ID:", fulfillment.data.shipment_id);
//       console.log("[Shiprocket] AWB Code:", fulfillment.data.awb_code);
//       console.log("[Shiprocket] This was created by createFulfillment method");
//       logger.info(
//         `Fulfillment ${fulfillment.id} already has Shiprocket shipment (created by fulfillment provider)`
//       );
//       return;
//     }

//     // If we reach here, it means createFulfillment didn't create the shipment
//     // This could happen if there was an error or if fulfillment was created differently
//     // Log a warning but don't try to create shipment here (let createFulfillment handle it)
//     console.warn("[Shiprocket] ⚠️  Fulfillment is marked as Shiprocket but doesn't have shipment data");
//     console.warn("[Shiprocket] This might indicate createFulfillment wasn't called or failed");
//     logger.warn(
//       `Fulfillment ${fulfillment.id} is marked as Shiprocket but doesn't have shipment data. ` +
//       `This might indicate createFulfillment wasn't called or failed.`
//     );
//   } catch (error) {
//     console.error("[Shiprocket] ❌ Error processing fulfillment created event:", error);
//     logger.error(
//       `Error processing fulfillment created event for ${data.id}:`,
//       error
//     );
//   }
// }

// // Keep subscriber registered but it's essentially a no-op since createFulfillment handles everything
// export const config: SubscriberConfig = {
//   event: "fulfillment.created",
// };

