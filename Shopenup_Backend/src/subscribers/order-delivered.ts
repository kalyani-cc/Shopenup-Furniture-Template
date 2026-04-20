// // src/subscribers/order-delivered.ts
// import type { SubscriberArgs, SubscriberConfig } from "@shopenup/framework"

// export default async function orderDeliveredHandler({
//   event: { data },
//   container,
// }: SubscriberArgs<{ id: string }>) {
//   const query = container.resolve("query")
//   const notificationModuleService = container.resolve("notification")

//   // Fetch fulfillment details using the fulfillment id from the event payload
//   const { data: [fulfillment] } = await query.graph({
//     entity: "fulfillment",
//     fields: [
//         "*", "labels.*", "order.*", "order.shipping_address.*"
//       // Add any other fulfillment fields you need
//     ],
//     filters: { id: data.id },
//   })


// //   Fetch order details using the order_id from the fulfillment
// //   const { data: [order] } = await query.graph({
// //     entity: "order",
// //     fields: [
// //       "id",
// //       "email",
// //       "shipping_address.*",
// //       "billing_address.*",
// //       "items.*",
// //       "shipping_methods.*",
// //       // Add any other order fields you need for the email template
// //     ],
// //     filters: { id: fulfillment.order_id },
// //   })
// //   Send the notification email to the customer
//   await notificationModuleService.createNotifications({
//     to: fulfillment?.order?.email || "",
//     channel: "email",
//     template: process.env.SENDGRID_CUSTOM_DELIVERY_COMPLETE_TEMP_ID, // Replace with your actual template ID
//     data: {
//       order_id: fulfillment?.order?.id,
//       first_name: fulfillment?.order?.shipping_address?.first_name,
//       tracking_id: fulfillment?.labels[0]?.tracking_number,
//       // Add any other dynamic data for your template
//     },
//   })
// }

// export const config: SubscriberConfig = {
//   event: "delivery.created",
// }

// src/subscribers/order-delivered.ts
import type { SubscriberArgs, SubscriberConfig } from "@shopenup/framework"
import { sendOrderDeliveredSMS, smsService, type SMSData } from '../modules/sms-service'

export default async function orderDeliveredHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    const query = container.resolve("query")
    const notificationModuleService = container.resolve("notification")
    const currencyModuleService = container.resolve("currency")

  // Fetch fulfillment details using the fulfillment id from the event payload
  const { data: [fulfillment] } = await query.graph({
    entity: "fulfillment",
    fields: [
      "id",
      "labels.*",
      "order.*",
      "order.id",
      "order.display_id",
      "order.items.*",
      "order.items.variant.*",
      "order.items.variant.product.*",
      "order.shipping_address.*",
      "order.billing_address.*",
      "order.shipping_methods.*",
      "order.currency_code",
      "order.total",
      "order.subtotal",
      "order.original_item_subtotal",
      "order.discount_total",
      "order.tax_total",
      "order.shipping_total",
    ],
    filters: { id: data.id },
  })

  if (!fulfillment?.order?.email) return

  const order = fulfillment.order
  const currency = await currencyModuleService.retrieveCurrency(order.currency_code)

  // Map items into structured format for email table
  const items = order.items.map(item => ({
    name: item.title || item.variant?.product?.title,
    quantity: item.quantity,
    unit_price: item.unit_price || 0,
    line_total: item.subtotal || (item.unit_price * item.quantity) || 0,
  }))

  // Calculate subtotal
  const subtotal = order.subtotal || order.original_item_subtotal || items.reduce((sum, item) => sum + item.line_total, 0)
  
  // Get shipping amount
  const shipping_amount = order.shipping_total || order.shipping_methods?.[0]?.amount || 0
  
  // Calculate total properly with number validation
  const discount_total = Number(order.discount_total) || 0
  const order_total = Number(order.total) || 0
  const calculated_subtotal = Number(subtotal) || 0
  const calculated_shipping = Number(shipping_amount) || 0
  const calculated_discount = Number(discount_total) || 0
  
  const tax_total = Number(order.tax_total) || 0
  const calculated_total = calculated_subtotal - calculated_discount + calculated_shipping + tax_total

  // Format addresses
  const shipping_address = [
    order.shipping_address.address_1,
    order.shipping_address.address_2,
    order.shipping_address.city,
    order.shipping_address.province,
    order.shipping_address.postal_code,
    order.shipping_address.country_code
  ].filter(Boolean).join(", ")

  const billing_address = [
    order.billing_address.address_1,
    order.billing_address.address_2,
    order.billing_address.city,
    order.billing_address.province,
    order.billing_address.postal_code,
    order.billing_address.country_code
  ].filter(Boolean).join(", ")

  const adminEmail = process.env.DEFAULT_REPLY_TO || 'admin@localhost'
  const storeName = process.env.STORE_NAME || 'Store'
  const storefrontUrl = process.env.STOREFRONT_URL || ''
  const orderDisplayId = (order as any).display_id || order.id

  const notificationData = {
    subject: `Your order has been delivered 🎉`,
    order_id: order.id,
    order_display_id: orderDisplayId,
    first_name: order.shipping_address.first_name,
    last_name: order.shipping_address.last_name,
    address_1: order.shipping_address.address_1,
    address_2: order.shipping_address.address_2,
    phone: order.shipping_address.phone,
    shipping_address: shipping_address,
    billing_first_name: order.billing_address.first_name,
    billing_last_name: order.billing_address.last_name,
    billing_address_1: order.billing_address.address_1,
    billing_address_2: order.billing_address.address_2,
    billing_phone: order.billing_address.phone,
    billing_address: billing_address,
    currency_symbol: currency.symbol_native,
    subtotal: subtotal,
    discount_total: discount_total,
    tax_total: tax_total,
    shipping_amount: calculated_shipping,
    total: order_total || calculated_total,
    tracking_id: fulfillment.labels?.[0]?.tracking_number || "Not available",
    item_names: order.items.map(item => item.variant?.product?.title || item.title),
    items,
    notification_type: 'order_delivered',
    resource_type: 'order',
    resource_id: order.id,
    order_link: `${storefrontUrl}/order-details/${order.id}`,
    store_name: storeName,
  }

  // Send notification to customer
  await notificationModuleService.createNotifications({
    to: order.email,
    channel: "email",
    template: "order-delivered",
    data: notificationData
  })

  // Also send notification to admin so it appears in admin notifications panel
  await notificationModuleService.createNotifications({
    to: adminEmail,
    template: "order-delivered",
    channel: "email", // Same channel as order/inventory notifications - creates notification records in admin UI
    data: {
      ...notificationData,
      subject: `Order Delivered · Order #${orderDisplayId}`,
    }
  })

  // Send SMS notification for order delivered
  try {
    // Check if SMS service is configured
    if (!smsService.isServiceConfigured()) {
      console.log('SMS service not configured - skipping order delivered SMS for order:', order.id)
      return
    }

    const phone = smsService.getPhoneFromOrder(order)
    
    if (phone) {
      const smsData: SMSData = {
        orderId: smsService.getOrderDisplayId(order),
        orderAmount: smsService.formatOrderAmount(order_total || calculated_total, currency.symbol_native),
        storeName: 'Shopenup',
        customerName: order.shipping_address?.first_name || order.billing_address?.first_name
      }

      const result = await sendOrderDeliveredSMS(phone, smsData)

      if (result.success) {
        console.log('Order delivered SMS sent successfully for order:', order.id)
      } else {
        console.error('Failed to send order delivered SMS:', result.error)
      }
    } else {
      console.log('No phone number found for order delivered notification:', order.id)
    }
  } catch (error) {
    console.error('Error sending order delivered SMS for order:', order.id, error.message)
  }
  } catch (error) {
    console.error("Error in order delivered handler:", error);
    // Don't throw - subscribers should fail gracefully
  }
}

export const config: SubscriberConfig = {
  event: "delivery.created",
}
