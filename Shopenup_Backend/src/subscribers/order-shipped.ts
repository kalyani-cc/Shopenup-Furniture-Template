// // src/subscribers/order-shipped.ts
// import type { SubscriberArgs, SubscriberConfig } from "@shopenup/framework"

// export default async function orderShippedHandler({
//   event: { data },
//   container,
// }: SubscriberArgs<{ id: string }>) {
//   const query = container.resolve("query")
//   const notificationModuleService = container.resolve("notification")


//   const { data: [fulfillment] } = await query.graph({
//     entity: "fulfillment",
//     fields: [
//       "*", "labels.*", "order.*", "order.shipping_address.*"
//     ],
//     filters: { id: data.id },
//   })

//   // Send the notification email to the customer

//   await notificationModuleService.createNotifications({
//     to: fulfillment.order.email || "",
//     template: process.env.SENDGRID_CUSTOM_SHIPMENT_CREATED_TEMP_ID, // Replace with your actual template ID
//     channel: "email",
//     data: {
//         order_id: fulfillment?.order.id,
//         address_1: fulfillment?.order.shipping_address.address_1,
//         address_2: fulfillment?.order.shipping_address.address_2,
//         tracking_id: fulfillment.labels[0].tracking_number,
//         first_name: fulfillment?.order.shipping_address.first_name,
//         last_name: fulfillment?.order.shipping_address.last_name,
//         phone: fulfillment?.order.shipping_address.phone
//       // Add any other dynamic data for your template
//     },
//   })
// }

// export const config: SubscriberConfig = {
//   event: "shipment.created",
// }

// import type { SubscriberArgs, SubscriberConfig } from "@shopenup/framework"

// export default async function orderShippedHandler({
//   event: { data },
//   container,
// }: SubscriberArgs<{ id: string }>) {
//   const query = container.resolve("query")
//   const notificationModuleService = container.resolve("notification")

//   // Fetch fulfillment with order + shipping info
//   const { data: [fulfillment] } = await query.graph({
//     entity: "fulfillment",
//     fields: [
//       "id",
//       "labels.*",
//       "order.id",
//       "order.email",
//       "order.shipping_address.*",
//       "order.items.*",
//     ],
//     filters: { id: data.id },
//   })

//   if (!fulfillment?.order?.email) {
//     return
//   }

//   // Send shipment notification
//   await notificationModuleService.createNotifications({
//     to: fulfillment.order.email,
//     channel: "email",
//     template: "order-shipped", // <- use your Handlebars file: order-shipped.hbs
//     data: {
//       subject: `Your order has been shipped 🚚`,
//       order_id: fulfillment.order.id,
//       first_name: fulfillment.order.shipping_address?.first_name,
//       last_name: fulfillment.order.shipping_address?.last_name,
//       address_1: fulfillment.order.shipping_address?.address_1,
//       address_2: fulfillment.order.shipping_address?.address_2,
//       phone: fulfillment.order.shipping_address?.phone,
//       tracking_id: fulfillment.labels?.[0]?.tracking_number || "Not available",

//     },
//   })
// }

// export const config: SubscriberConfig = {
//   event: "shipment.created",
// }


import type { SubscriberArgs, SubscriberConfig } from "@shopenup/framework"
import { sendOrderShippedSMS, smsService, type SMSData } from '../modules/sms-service'

export default async function orderShippedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    const query = container.resolve("query")
    const notificationModuleService = container.resolve("notification")
    const currencyModuleService = container.resolve("currency")

  // Fetch fulfillment with order + shipping info + Shiprocket data
  const { data: [fulfillment] } = await query.graph({
    entity: "fulfillment",
    fields: [
      "id",
      "data",
      "labels.*",
      "order.*",
      "order.id",
      "order.display_id",
      "order.items.*",
      "order.items.adjustments.*",
      "order.items.variant.*",
      "order.items.variant.product.*",
      "order.shipping_address.*",
      "order.billing_address.*",
      "order.shipping_methods.*",
      "order.currency_code",
      "order.total",
      "order.subtotal",
      "order.original_item_subtotal",
      "order.original_subtotal",
      "order.discount_total",
      "order.tax_total",
      "order.item_tax_total",
      "order.shipping_tax_total",
      "order.shipping_total",
      "order.item_total",
      "order.shipping_subtotal",
    ],
    filters: { id: data.id },
  })

  if (!fulfillment?.order?.email) return

  // Get the order ID from fulfillment
  const orderId = fulfillment.order.id
  
  // Query the order directly to get financial data
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
      "items.adjustments.*",
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
      "shipping_total",
    ],
    filters: { id: orderId },
  })

  const currency = await currencyModuleService.retrieveCurrency(order.currency_code)

  // Map items into structured format for email table
  const items = order.items.map(item => ({
    name: item.title || item.variant?.product?.title,
    quantity: item.quantity,
    unit_price: item.unit_price || 0, // price per unit
    line_total: item.subtotal || (item.unit_price * item.quantity) || 0, // total for that line
  }))

  // Get tracking information from Shiprocket data or labels
  const fulfillmentData = (fulfillment.data || {}) as any
  
  // Get AWB code and tracking info from fulfillment data (direct structure)
  const awbCode = fulfillmentData.awb_code || fulfillmentData.shiprocket_awb_code
  const courierName = fulfillmentData.courier_name || fulfillmentData.shiprocket_courier_name
  const shipmentId = fulfillmentData.shipment_id || fulfillmentData.shiprocket_shipment_id
  
  // Get Shiprocket tracking URL (already stored in fulfillment data)
  const shiprocketTrackingUrl = fulfillmentData.shiprocket_tracking_url || 
    (awbCode ? `https://shiprocket.co/tracking/${awbCode}` : null)
  
  // Fallback to labels tracking if Shiprocket data not available
  const trackingNumber = awbCode || fulfillment.labels?.[0]?.tracking_number
  const carrier = courierName || "Standard Shipping"
  const trackingUrl = shiprocketTrackingUrl || (trackingNumber ? `${trackingNumber}` : "")

  // Calculate subtotal as sum of all item line totals (this should match the sum of individual items)
  const calculatedSubtotal = items.reduce((sum, item) => sum + item.line_total, 0)
  const subtotal = calculatedSubtotal
  
  // Get shipping amount (excluding GST)
  const shipping_amount = order.shipping_subtotal || order.shipping_methods?.[0]?.amount || 0
  
  // Calculate discount using the same logic as order-placed
  // Calculate total discount from all item adjustments
  const itemDiscountTotal = order.items.reduce((total, item) => {
    const itemDiscount = item.adjustments?.reduce((sum, adj) => sum + (adj.amount || 0), 0) || 0;
    return total + itemDiscount;
  }, 0);

  // Use the calculated discount instead of order.discount_total
  const actualDiscountTotal = itemDiscountTotal;
  
  // Calculate total properly with number validation
  const discount_total = actualDiscountTotal
  const tax_total = Number(order.tax_total) || 0
  
  // Get the actual order total from the database
  const order_total = Number(order.total) || 0
  const calculated_subtotal = Number(subtotal) || 0
  const calculated_shipping = Number(shipping_amount) || 0
  const calculated_discount = Number(discount_total) || 0
  
  // Use the tax from order data, or calculate it if not available
  const final_tax_total = tax_total || Math.max(0, order_total - calculated_subtotal + calculated_discount - calculated_shipping)
  
  // Calculate total: subtotal - discount + shipping + tax
  const calculated_total = calculated_subtotal - calculated_discount + calculated_shipping + final_tax_total
  
  // Use the order total from database if available, otherwise use calculated total
  const final_total = order_total || calculated_total 

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

  // Calculate estimated delivery from Shiprocket pickup date or default to 3 days
  const pickupScheduledDate = fulfillmentData.pickup_scheduled_date as string | undefined
  const estimated_delivery = pickupScheduledDate 
    ? new Date(pickupScheduledDate).toLocaleDateString()
    : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString() // 3 days from now

  const adminEmail = process.env.DEFAULT_REPLY_TO || 'admin@localhost'
  const storeName = process.env.STORE_NAME || 'Store'
  const storefrontUrl = process.env.STOREFRONT_URL || ''
  const orderDisplayId = (order as any).display_id || order.id

  const notificationData = {
    subject: `Your order has been shipped 🚚`,
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
    tax_total: final_tax_total,
    shipping_amount: calculated_shipping,
    shipping_method: courierName || order.shipping_methods?.[0]?.name || "Standard Shipping",
    total: final_total,
    tracking_id: trackingNumber || "Not available",
    tracking_url: trackingUrl,
    carrier: carrier,
    estimated_delivery: estimated_delivery,
    awb_code: awbCode || null,
    shiprocket_tracking_url: shiprocketTrackingUrl || null,
    shipment_id: shipmentId || null,
    shiprocket_order_id: fulfillmentData.shiprocket_order_id || null,
    item_names: order.items.map(item => item.variant?.product?.title || item.title),
    items,
    notification_type: 'order_shipped',
    resource_type: 'order',
    resource_id: order.id,
    order_link: `${storefrontUrl}/order-details/${order.id}`,
    store_name: storeName,
  }

  // Send notification to customer
  await notificationModuleService.createNotifications({
    to: order.email,
    channel: "email",
    template: "order-shipped",
    data: notificationData
  })

  // Also send notification to admin so it appears in admin notifications panel
  await notificationModuleService.createNotifications({
    to: adminEmail,
    template: "order-shipped",
    channel: "email", // Same channel as order/inventory notifications - creates notification records in admin UI
    data: {
      ...notificationData,
      subject: `Order Shipped · Order #${orderDisplayId}`,
    }
  })

  // Send SMS notification for order shipped
  try {
    // Check if SMS service is configured
    if (!smsService.isServiceConfigured()) {
      return
    }

    const phone = smsService.getPhoneFromOrder(order)
    
    if (phone) {
      const smsData: SMSData = {
        orderId: smsService.getOrderDisplayId(order),
        orderAmount: smsService.formatOrderAmount(order_total || calculated_total, currency.symbol_native),
        storeName: 'Shopenup',
        customerName: order.shipping_address?.first_name || order.billing_address?.first_name,
        trackingNumber: trackingNumber || undefined,
        trackingUrl: trackingUrl || undefined
      }

      await sendOrderShippedSMS(phone, smsData)
    }
  } catch (error) {
    // Silently fail SMS sending
  }
  } catch (error) {
    console.error("❌ [order-shipped] Error in order shipped subscriber:", error);
    console.error("❌ [order-shipped] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

export const config: SubscriberConfig = {
  event: "shipment.created",
}
