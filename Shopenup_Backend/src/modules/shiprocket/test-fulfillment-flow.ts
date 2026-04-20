/**
 * Test Script for Shiprocket Fulfillment Flow
 * 
 * This script helps test the fulfillment flow programmatically.
 * 
 * Usage:
 *   npx ts-node src/modules/shiprocket/test-fulfillment-flow.ts <order_id>
 * 
 * Or import and use in your test files.
 */

import { createConnection } from "typeorm";

async function testFulfillmentFlow(orderId: string) {
  // Note: This is a template - you'll need to adapt it to your actual setup
  // You'll need access to your container/service locator

  try {
    // Step 1: Retrieve the order
    // const orderService = container.resolve("orderService");
    // const order = await orderService.retrieve(orderId, {
    //   relations: [
    //     "items",
    //     "items.variant",
    //     "items.variant.product",
    //     "shipping_address",
    //     "billing_address",
    //     "fulfillments",
    //   ],
    // });

    // console.log("✅ Order retrieved");
    // console.log(`   Display ID: ${order.display_id}`);
    // console.log(`   Status: ${order.status}`);
    // console.log(`   Items: ${order.items.length}`);
    // console.log(`   Existing Fulfillments: ${order.fulfillments?.length || 0}\n`);

    // // Step 2: Verify no Shiprocket data exists
    // console.log("Step 2: Verifying no Shiprocket data exists...");
    // if (order.metadata?.shiprocket_order_id) {
    //   console.log("⚠️  WARNING: Order already has Shiprocket data!");
    //   console.log(`   Shiprocket Order ID: ${order.metadata.shiprocket_order_id}`);
    // } else {
    //   console.log("✅ No Shiprocket data found (expected)\n");
    // }

    // // Step 3: Create fulfillment
    // console.log("Step 3: Creating fulfillment...");
    // const fulfillmentService = container.resolve("fulfillmentService");
    
    // // Get courier ID from shipping method (if available)
    // const shippingMethod = order.shipping_methods?.[0];
    // const courierId = shippingMethod?.data?.courier_company_id || shippingMethod?.data?.courier_id;

    // const fulfillment = await fulfillmentService.createFulfillment(
    //   {
    //     order: order,
    //     items: order.items.map((item) => ({
    //       title: item.title,
    //       sku: item.variant?.sku,
    //       quantity: item.quantity,
    //       unit_price: item.unit_price,
    //       variant_id: item.variant_id,
    //       weight: item.variant?.weight,
    //     })),
    //     shipping_address: order.shipping_address,
    //     metadata: {
    //       courier_company_id: courierId,
    //       shipping_option_id: shippingMethod?.shipping_option_id,
    //     },
    //   },
    //   order.items,
    //   order
    // );

    // console.log("✅ Fulfillment created");
    // console.log(`   Fulfillment ID: ${fulfillment.id}`);
    // console.log(`   Provider: ${fulfillment.provider_id}\n`);

    // // Step 4: Verify Shiprocket data
    // console.log("Step 4: Verifying Shiprocket data...");
    
    // // Retrieve fulfillment again to get persisted data
    // const persistedFulfillment = await fulfillmentService.retrieve(fulfillment.id, {
    //   relations: ["order"],
    // });

    // const checks = [
    //   {
    //     name: "Metadata: shiprocket_order_id",
    //     value: persistedFulfillment.metadata?.shiprocket_order_id,
    //   },
    //   {
    //     name: "Metadata: shiprocket_shipment_id",
    //     value: persistedFulfillment.metadata?.shiprocket_shipment_id,
    //   },
    //   {
    //     name: "Metadata: shiprocket_awb_code",
    //     value: persistedFulfillment.metadata?.shiprocket_awb_code,
    //   },
    //   {
    //     name: "Metadata: shiprocket_label_url",
    //     value: persistedFulfillment.metadata?.shiprocket_label_url,
    //   },
    //   {
    //     name: "Data: awb_code",
    //     value: persistedFulfillment.data?.awb_code,
    //   },
    //   {
    //     name: "Tracking Numbers",
    //     value: persistedFulfillment.tracking_numbers?.[0],
    //   },
    //   {
    //     name: "Tracking Links",
    //     value: persistedFulfillment.tracking_links?.[0]?.url,
    //   },
    // ];

    // let allPassed = true;
    // checks.forEach((check) => {
    //   if (check.value) {
    //     console.log(`   ✅ ${check.name}: ${check.value}`);
    //   } else {
    //     console.log(`   ❌ ${check.name}: MISSING`);
    //     allPassed = false;
    //   }
    // });

    // if (allPassed) {
    //   console.log("\n✅ All checks passed! Fulfillment flow is working correctly.\n");
    // } else {
    //   console.log("\n❌ Some checks failed. Please review the logs above.\n");
    // }

    // // Step 5: Display summary
    // console.log("Step 5: Summary");
    // console.log("=".repeat(80));
    // console.log("Order Information:");
    // console.log(`   Order ID: ${order.id}`);
    // console.log(`   Display ID: ${order.display_id}`);
    // console.log(`   Status: ${order.status}`);
    // console.log("\nFulfillment Information:");
    // console.log(`   Fulfillment ID: ${persistedFulfillment.id}`);
    // console.log(`   Provider: ${persistedFulfillment.provider_id}`);
    // console.log(`   Status: ${persistedFulfillment.status}`);
    // console.log("\nShiprocket Information:");
    // console.log(`   Order ID: ${persistedFulfillment.metadata?.shiprocket_order_id}`);
    // console.log(`   Shipment ID: ${persistedFulfillment.metadata?.shiprocket_shipment_id}`);
    // console.log(`   AWB Code: ${persistedFulfillment.metadata?.shiprocket_awb_code}`);
    // console.log(`   Courier: ${persistedFulfillment.metadata?.shiprocket_courier_name}`);
    // console.log(`   Label URL: ${persistedFulfillment.metadata?.shiprocket_label_url}`);
    // console.log(`   Tracking URL: ${persistedFulfillment.metadata?.shiprocket_tracking_url}`);
    // console.log("=".repeat(80));


  } catch (error: any) {
    console.error("\n❌ Error during testing:");
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const orderId = process.argv[2];
  
  if (!orderId) {
    console.error("Usage: npx ts-node test-fulfillment-flow.ts <order_id>");
    process.exit(1);
  }

  testFulfillmentFlow(orderId)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Test failed:", error);
      process.exit(1);
    });
}

export { testFulfillmentFlow };

