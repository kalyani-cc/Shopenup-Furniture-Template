// import { SubscriberArgs, SubscriberConfig } from "@shopenup/framework";
// import { getAuthenticatedClient } from "../utils/shiprocket-client";
// import { mapCountryCode } from "../utils/order-mapper";

// type StockLocationCreatedEvent = {
//   id: string;
// };

// type StockLocationUpdatedEvent = {
//   id: string;
// };

// /**
//  * Handle stock location creation - create Shiprocket pickup address if "Use for Shiprocket" is checked
//  */
// export default async function stockLocationCreatedHandler({
//   event: { data },
//   container,
// }: SubscriberArgs<StockLocationCreatedEvent>) {
//   const stockLocationService = container.resolve("stockLocationService") as any;
//   const logger = container.resolve("logger") as any;
//   const shiprocketConfig = container.resolve("shiprocketConfig") as any;

//   try {
//     console.log("[Shiprocket] 📬 stock_location.created event received");
//     console.log("[Shiprocket] Stock Location ID:", data.id);

//     // Get the stock location
//     const stockLocation = await stockLocationService.retrieve(data.id, {
//       relations: ["address"],
//     });

//     console.log("[Shiprocket] Stock Location Name:", stockLocation.name);
//     console.log("[Shiprocket] Metadata:", stockLocation.metadata);

//     // Check if "Use for Shiprocket" is enabled
//     const useForShiprocket = stockLocation.metadata?.use_for_shiprocket === true || 
//                              stockLocation.metadata?.use_for_shiprocket === "true";

//     console.log("[Shiprocket] Use for Shiprocket:", useForShiprocket);

//     if (!useForShiprocket) {
//       console.log("[Shiprocket] Stock location not configured for Shiprocket, skipping");
//       return;
//     }

//     // Check if already has Shiprocket pickup data
//     if (stockLocation.metadata?.shiprocket_pickup_id) {
//       console.log("[Shiprocket] Stock location already has Shiprocket pickup ID:", 
//         stockLocation.metadata.shiprocket_pickup_id);
//       return;
//     }

//     // Validate required fields
//     if (!stockLocation.address) {
//       console.warn("[Shiprocket] ⚠️  Stock location missing address, cannot create Shiprocket pickup");
//       return;
//     }

//     const address = stockLocation.address;
//     if (!address.address_1 || !address.city || !address.postal_code) {
//       console.warn("[Shiprocket] ⚠️  Stock location address incomplete, cannot create Shiprocket pickup");
//       return;
//     }

//     // Get Shiprocket configuration
//     if (!shiprocketConfig) {
//       console.warn("[Shiprocket] ⚠️  Shiprocket configuration not found");
//       return;
//     }

//     // Get authenticated Shiprocket client
//     console.log("[Shiprocket] Authenticating with Shiprocket...");
//     // const shiprocket = await getAuthenticatedClient({
//     //   email: shiprocketConfig.email,
//     //   password: shiprocketConfig.password,
//     //   baseUrl: shiprocketConfig.baseUrl,
//     // });
//     // console.log("[Shiprocket] ✅ Authenticated");

//     // Map stock location to Shiprocket pickup location format
//     const pickupLocationData = {
//       pickup_location: stockLocation.name || "Warehouse",
//       name: stockLocation.name || "Store Owner",
//       email: address.email || shiprocketConfig.email || "store@example.com",
//       phone: address.phone || "9876543210",
//       address: address.address_1 || "",
//       address_2: address.address_2 || undefined,
//       city: address.city || "",
//       state: address.province || address.state || "",
//       country: mapCountryCode(address.country_code || "IN"),
//       pin_code: address.postal_code || address.postcode || "",
//     };


//     console.log("[Shiprocket] Pickup Location Data:", pickupLocationData);

//     console.log("[Shiprocket] Creating Shiprocket pickup location...");
//     console.log("[Shiprocket] 📡 API Call: POST /pickup/location");
//     console.log("[Shiprocket] Pickup Location Data:", {
//       pickup_location: pickupLocationData.pickup_location,
//       name: pickupLocationData.name,
//       city: pickupLocationData.city,
//       pin_code: pickupLocationData.pin_code,
//     });

//     // Create pickup location in Shiprocket
//     // const result = await shiprocket.pickups.createPickupLocation(pickupLocationData);

//     // if (!result.success) {
//     //   console.error("[Shiprocket] ❌ Failed to create Shiprocket pickup location:", result.error);
//     //   logger.error(
//     //     `Failed to create Shiprocket pickup location for stock location ${stockLocation.id}:`,
//     //     result.error
//     //   );
//     //   return;
//     // }

//     // const pickupData = result.data;
//     // console.log("[Shiprocket] ✅ Pickup location created successfully!");
//     // console.log("[Shiprocket] Pickup Location ID:", pickupData.pickup_location_id);
//     // console.log("[Shiprocket] Pickup Location Name:", pickupData.pickup_location);

//     // Update stock location metadata with Shiprocket pickup data
//     await stockLocationService.update(data.id, {
//     //   metadata: {
//     //     ...stockLocation.metadata,
//     //     shiprocket_pickup_id: pickupData.pickup_location_id,
//     //     shiprocket_pickup_location: pickupData.pickup_location,
//     //     shiprocket_pickup_created_at: new Date().toISOString(),
//     //   },
//     });

//     console.log("[Shiprocket] ✅ Stock location metadata updated with Shiprocket pickup data");
//     // logger.info(
//     //   `Successfully created Shiprocket pickup location ${pickupData.pickup_location_id} for stock location ${stockLocation.id}`
//     // );
//   } catch (error) {
//     console.error("[Shiprocket] ❌ Error processing stock location created event:", error);
//     logger.error(
//       `Error processing stock location created event for ${data.id}:`,
//       error
//     );
//   }
// }

// /**
//  * Handle stock location updates - update or create Shiprocket pickup address if needed
//  */
// export async function stockLocationUpdatedHandler({
//   event: { data },
//   container,
// }: SubscriberArgs<StockLocationUpdatedEvent>) {
//   const stockLocationService = container.resolve("stockLocationService") as any;
//   const logger = container.resolve("logger") as any;
//   const shiprocketConfig = container.resolve("shiprocketConfig") as any;

//   try {
//     console.log("[Shiprocket] 📬 stock_location.updated event received");
//     console.log("[Shiprocket] Stock Location ID:", data.id);

//     // Get the stock location
//     const stockLocation = await stockLocationService.retrieve(data.id, {
//       relations: ["address"],
//     });

//     const useForShiprocket = stockLocation.metadata?.use_for_shiprocket === true || 
//                              stockLocation.metadata?.use_for_shiprocket === "true";
//     const existingPickupId = stockLocation.metadata?.shiprocket_pickup_id;

//     // If "Use for Shiprocket" is unchecked and pickup exists, we could delete it
//     // But for safety, we'll just log a warning
//     if (!useForShiprocket && existingPickupId) {
//       console.log("[Shiprocket] ⚠️  Stock location has Shiprocket pickup but 'Use for Shiprocket' is unchecked");
//       console.log("[Shiprocket] Pickup ID:", existingPickupId, "- Not deleting for safety");
//       return;
//     }

//     // If "Use for Shiprocket" is checked but no pickup exists, create it
//     if (useForShiprocket && !existingPickupId) {
//       console.log("[Shiprocket] 'Use for Shiprocket' is checked but no pickup exists, creating...");
//       // Reuse the creation logic
//       await stockLocationCreatedHandler({ event: { data }, container } as any);
//       return;
//     }

//     // If "Use for Shiprocket" is checked and pickup exists, update it
//     if (useForShiprocket && existingPickupId) {
//       if (!shiprocketConfig) {
//         console.warn("[Shiprocket] ⚠️  Shiprocket configuration not found");
//         return;
//       }

//       const shiprocket = await getAuthenticatedClient({
//         email: shiprocketConfig.email,
//         password: shiprocketConfig.password,
//         baseUrl: shiprocketConfig.baseUrl,
//       });

//       const address = stockLocation.address;
//       if (!address || !address.address_1 || !address.city || !address.postal_code) {
//         console.warn("[Shiprocket] ⚠️  Stock location address incomplete, cannot update Shiprocket pickup");
//         return;
//       }

//       const pickupLocationData = {
//         pickup_location: stockLocation.name || "Warehouse",
//         name: stockLocation.name || "Store Owner",
//         email: address.email || shiprocketConfig.email || "store@example.com",
//         phone: address.phone || "9876543210",
//         address: address.address_1 || "",
//         address_2: address.address_2 || undefined,
//         city: address.city || "",
//         state: address.province || address.state || "",
//         country: mapCountryCode(address.country_code || "IN"),
//         pin_code: address.postal_code || address.postcode || "",
//       };

//       console.log("[Shiprocket] Updating Shiprocket pickup location...");
//       console.log("[Shiprocket] 📡 API Call: PUT /pickup/location/:id");
//       const result = await shiprocket.pickups.updatePickupLocation(
//         existingPickupId,
//         pickupLocationData
//       );

//       if (!result.success) {
//         console.error("[Shiprocket] ❌ Failed to update Shiprocket pickup location:", result.error);
//         logger.error(
//           `Failed to update Shiprocket pickup location ${existingPickupId} for stock location ${stockLocation.id}:`,
//           result.error
//         );
//         return;
//       }

//       console.log("[Shiprocket] ✅ Pickup location updated successfully!");
//       logger.info(
//         `Successfully updated Shiprocket pickup location ${existingPickupId} for stock location ${stockLocation.id}`
//       );
//     }
//   } catch (error) {
//     console.error("[Shiprocket] ❌ Error processing stock location updated event:", error);
//     logger.error(
//       `Error processing stock location updated event for ${data.id}:`,
//       error
//     );
//   }
// }

// export const config: SubscriberConfig = {
//   event: "stock_location.created",
// };

// export const updateConfig: SubscriberConfig = {
//   event: "stock_location.updated",
// };

