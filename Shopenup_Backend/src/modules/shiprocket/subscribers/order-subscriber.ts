// import { SubscriberArgs, SubscriberConfig } from "@shopenup/framework";
// import { mapOrderToShiprocket } from "../utils/order-mapper";
// import { getAuthenticatedClient } from "../utils/shiprocket-client";

// type OrderPlacedEvent = {
//   id: string;
//   no_notification: boolean;
// };

// export default async function orderPlacedHandler({
//   event: { data },
//   container,
// }: SubscriberArgs<OrderPlacedEvent>) {
//   const orderService = container.resolve("orderService") as any;
//   const fulfillmentService = container.resolve("fulfillmentService") as any;
//   const logger = container.resolve("logger") as any;

//   try {
//     // Get the full order with relations including shipping methods
//     const order = await orderService.retrieve(data.id, {
//       relations: [
//         "items",
//         "items.variant",
//         "items.variant.product",
//         "shipping_address",
//         "billing_address",
//         "shipping_methods",
//         "payment_collections",
//         "payment_collections.payment_methods",
//       ],
//     });

//     // Check if order already has Shiprocket fulfillment
//     const existingFulfillment = order.fulfillments?.find(
//       (f: any) => f.provider_id === "shiprocket"
//     );

//     if (existingFulfillment) {
//       logger.info(`Order ${order.id} already has Shiprocket fulfillment`);
//       return;
//     }

//     // Check if order uses Shiprocket shipping method
//     // Check by provider_id instead of hardcoded option_id since we now use actual Shopenup shipping option IDs
//     const shippingMethod = order.shipping_methods?.[0];
//     if (!shippingMethod) {
//       logger.info(`Order ${order.id} has no shipping method, skipping`);
//       return;
//     }

//     // Get shipping option to check provider
//     const shippingOptionService = container.resolve("shippingOptionService") as any;
//     let shippingOption;
//     try {
//       shippingOption = await shippingOptionService.retrieve(shippingMethod.shipping_option_id, {
//         relations: ["provider"],
//       });
//     } catch (error) {
//       logger.warn(`Could not retrieve shipping option ${shippingMethod.shipping_option_id} for order ${order.id}`);
//       return;
//     }

//     // Check if the shipping option uses Shiprocket provider
//     if (!shippingOption?.provider || shippingOption.provider.id !== "shiprocket") {
//       logger.info(`Order ${order.id} does not use Shiprocket provider, skipping`);
//       return;
//     }

//     // Get courier details from shipping_method.data
//     // Data format: { courier_id, courier_name, rate, est_delivery }
//     const courierData = shippingMethod.data as any;
//     // Support both courier_id (new format) and courier_company_id (old format) for backward compatibility
//     const courierId = courierData?.courier_id || courierData?.courier_company_id;
//     const courierName = courierData?.courier_name;

//     if (!courierId) {
//       logger.warn(`Order ${order.id} has Shiprocket shipping but no courier_id in data, skipping`);
//       return;
//     }

//     logger.info(
//       `Processing Shiprocket order for ${order.id} with courier: ${courierName} (ID: ${courierId})`
//     );

//     // Get Shiprocket configuration
//     const shiprocketConfig = container.resolve("shiprocketConfig") as any;
//     if (!shiprocketConfig) {
//       logger.warn("Shiprocket configuration not found, skipping fulfillment creation");
//       return;
//     }

//     // Get authenticated Shiprocket client (uses shared instance to avoid duplicate auth calls)
//     const shiprocket = await getAuthenticatedClient({
//       email: shiprocketConfig.email,
//       password: shiprocketConfig.password,
//       baseUrl: shiprocketConfig.baseUrl,
//     });

//     // Get default pickup location
//     const pickupLocation = shiprocketConfig.defaultPickupLocation || {
//       pickup_location: "Main Warehouse",
//       name: "Store Owner",
//       email: shiprocketConfig.email,
//       phone: "9876543210",
//       address: "123 Main Street",
//       city: "Mumbai",
//       state: "Maharashtra",
//       country: "India",
//       pin_code: "400001",
//     };

//     // Map order to Shiprocket format with courier ID
//     const shiprocketOrder = mapOrderToShiprocket(order, pickupLocation, {
//       courierId: courierId,
//     });

//     // Create order in Shiprocket
//     const orderResult = await shiprocket.orders.createOrder(shiprocketOrder);

//     if (!orderResult.success) {
//       logger.error(
//         `Failed to create Shiprocket order for ${order.id}:`,
//         orderResult.error
//       );
//       return;
//     }

//     const shiprocketOrderData = orderResult.data;
//     logger.info(
//       `Created Shiprocket order ${shiprocketOrderData.order_id} (shipment_id: ${shiprocketOrderData.shipment_id}) for Shopenup order ${order.id}`
//     );

//     // Create shipment with the selected courier
//     const shipmentResult = await shiprocket.orders.createShipment({
//       shipment_id: shiprocketOrderData.shipment_id,
//       courier_id: courierId,
//     });

//     if (!shipmentResult.success) {
//       logger.error(
//         `Failed to create shipment for order ${order.id}:`,
//         shipmentResult.error
//       );
//       // Still store order info even if shipment creation fails
//     } else {
//       const shipmentData = shipmentResult.data;
//       logger.info(
//         `Created shipment with AWB ${shipmentData.awb_code} for order ${order.id}`
//       );

//       // Store Shiprocket data in order metadata
//       // Note: tracking_data doesn't have tracking_url, so we construct it from AWB code
//       // label_url may not be in the type but could exist in the actual response
//       const shipmentDataAny = shipmentData as any;
//       await orderService.update(order.id, {
//         metadata: {
//           ...order.metadata,
//           shiprocket_order_id: shiprocketOrderData.order_id,
//           shiprocket_shipment_id: shiprocketOrderData.shipment_id,
//           shiprocket_awb_code: shipmentData.awb_code,
//           shiprocket_courier_id: courierId,
//           shiprocket_courier_name: courierName,
//           shiprocket_tracking_url: 
//             `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${shipmentData.awb_code}`,
//           ...(shipmentDataAny.label_url && {
//             shiprocket_label_url: shipmentDataAny.label_url,
//           }),
//         },
//       });

//       logger.info(
//         `Successfully created Shiprocket shipment for order ${order.id} with AWB ${shipmentData.awb_code}`
//       );
//     }
//   } catch (error) {
//     logger.error(`Error processing order placed event for ${data.id}:`, error);
//   }
// }

// // DISABLED: No Shiprocket calls at checkout - only when fulfillment is created
// // Customer checks out → Medusa order created; Medusa creates reservations only. (No Shiprocket calls.)
// // export const config: SubscriberConfig = {
// //   event: "order.placed",
// // };

