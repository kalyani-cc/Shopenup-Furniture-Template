// import { SubscriberArgs, SubscriberConfig } from "@shopenup/framework"
// // import { Modules } from "@shopenup/framework/utils"

// export default async function orderPlacedEmailHandler({
//   event: { data },
//   container,
// }: SubscriberArgs<{ id: string }>) {

// //   const notificationModuleService = container.resolve(Modules.NOTIFICATION)
//   const query = container.resolve("query")
//   const notificationModuleService = container.resolve("notification")
//   const currencyModuleService = container.resolve("currency")


//   // Retrieve order details
//   const { data: [order] } = await query.graph({
//     entity: "order",
//     fields: [
//       "id",
//       "display_id",
//       "created_at",
//       "currency_code",
//       "total",
//       "original_total",
//       "original_subtotal",
//       "original_item_subtotal",
//       "email",
//       "items.*",
//       "items.variant.*",
//       "items.variant.product.*",
//       "shipping_address.*",
//       "billing_address.*",
//       "shipping_methods.*",
//       "tax_total",
//       "subtotal",
//       "discount_total",
//       // add any other fields you need for the email template...
//     ],
//     filters: { id: data.id },
//   })
  
//   const currency = await currencyModuleService.retrieveCurrency(order.currency_code)



//   await notificationModuleService.createNotifications({
//     to: order.email || "",
//     template: "order-placed", // Back to original template name
//     channel: "email",
//     data: {
//         order_id: order.id,
//             first_name: order.shipping_address.first_name,
//             last_name: order.shipping_address.last_name,
//             address_1: order.shipping_address.address_1,
//             address_2: order.shipping_address.address_2,
//             phone: order.shipping_address.phone,
//             billing_first_name: order.billing_address.first_name,
//             billing_last_name: order.billing_address.last_name,
//             billing_address_1: order.billing_address.address_1,
//             billing_address_2: order.billing_address.address_2,
//             billing_phone: order.billing_address.phone,
//             currency_symbol: currency.symbol_native,
//             subtotal: order.original_item_subtotal,
//             discount_total: order.discount_total,
//             shipping_method: order.shipping_methods[0].name,
//             shipping_amount: order.shipping_methods[0].amount,
//             tax_total: order.tax_total,
//             total: order.total,
//     }
//   })
// }           

// export const config: SubscriberConfig = {
//   event: "order.placed",        
// }


import { SubscriberArgs, SubscriberConfig } from "@shopenup/framework"

export default async function orderPlacedEmailHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    const query = container.resolve("query")
    const notificationModuleService = container.resolve("notification")
    const currencyModuleService = container.resolve("currency")

  // Retrieve order details
  const { data: [order] } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "created_at",
      "currency_code",
      "total",
      "original_total",
      "original_subtotal",
      "original_item_subtotal",
      "email",
      "items.*",
      "items.variant.*",
      "items.variant.product.*",
      "shipping_address.*",
      "billing_address.*",
      "shipping_methods.*",
      "tax_total",
      "subtotal",
      "discount_total",
      "item_tax_total",
      "shipping_tax_total",
      "shipping_subtotal",
    ],
    filters: { id: data.id },
  })

  const currency = await currencyModuleService.retrieveCurrency(order.currency_code)

  // Calculate discount using the same logic as UI
  // Calculate total discount from all item adjustments
  const itemDiscountTotal = order.items.reduce((total, item) => {
    const itemDiscount = item.adjustments?.reduce((sum, adj) => sum + (adj.amount || 0), 0) || 0;
    return total + itemDiscount;
  }, 0);

  // Use the calculated discount instead of order.discount_total
  const actualDiscountTotal = itemDiscountTotal;

  // Map items into structured format
  const items = order.items.map(item => ({
    name: item.title || item.variant?.product?.title,
    quantity: item.quantity,
    unit_price: item.unit_price, // price per unit
    line_total: item.subtotal, // total for that line
  }))
  console.log("items", items)
  console.log("calculated discount:", actualDiscountTotal)
  console.log("order.discount_total:", order.discount_total)

  const adminEmail = process.env.DEFAULT_REPLY_TO || 'admin@localhost'
  const storeName = process.env.STORE_NAME || 'Store'
  const storefrontUrl = process.env.STOREFRONT_URL || ''
  const orderDisplayId = (order as any).display_id || order.id

  const notificationData = {
    subject: "Order Confirmation",
    order_id: order.id,
    order_display_id: orderDisplayId,
    first_name: order.shipping_address.first_name,
    last_name: order.shipping_address.last_name,
    address_1: order.shipping_address.address_1,
    address_2: order.shipping_address.address_2,
    phone: order.shipping_address.phone,
    billing_first_name: order.billing_address.first_name,
    billing_last_name: order.billing_address.last_name,
    billing_address_1: order.billing_address.address_1,
    billing_address_2: order.billing_address.address_2,
    billing_phone: order.billing_address.phone,
    currency_symbol: currency.symbol_native,
    subtotal: order.original_item_subtotal || order.subtotal,
    discount_total: actualDiscountTotal,
    shipping_method: order.shipping_methods[0]?.name || "Standard Shipping",
    shipping_amount: order.shipping_methods[0]?.amount || 0,
    tax_total: order.tax_total || 0,
    total: order.total,
    item_names: order.items.map(item => item.variant?.product?.title || item.title),
    items,
    notification_type: 'order_placed',
    resource_type: 'order',
    resource_id: order.id,
    order_link: `${storefrontUrl}/order-details/${order.id}`,
    store_name: storeName,
  }

  // Send notification to customer
  await notificationModuleService.createNotifications({
    to: order.email || "",
    template: "order-placed",
    channel: "email",
    data: notificationData
  })

  // Also send notification to admin so it appears in admin notifications panel
  await notificationModuleService.createNotifications({
    to: adminEmail,
    template: "order-placed",
    channel: "email", // Same channel as order/inventory notifications - creates notification records in admin UI
    data: {
      ...notificationData,
      subject: `New Order Placed · Order #${orderDisplayId}`,
    }
  })
  } catch (error) {
    console.error("Error in order placed handler:", error);
    // Don't throw - subscribers should fail gracefully
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}