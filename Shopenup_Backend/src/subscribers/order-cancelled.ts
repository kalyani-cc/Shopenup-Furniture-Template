import type { SubscriberArgs, SubscriberConfig } from "@shopenup/framework"
import { sendOrderCancelledSMS, smsService, type SMSData } from '../modules/sms-service'

export default async function orderCanceledHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    const query = container.resolve("query")
    const notificationModuleService = container.resolve("notification")
    const currencyModuleService = container.resolve("currency")

  // Get order details
  const { data: [order] } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "email",
      "total",
      "subtotal",
      "original_item_subtotal",
      "discount_total",
      "tax_total",
      "shipping_total",
      "currency_code",
      "billing_address.*",
      "shipping_address.*",
      "items.*",
      "items.variant.*",
      "items.variant.product.*",
      "shipping_methods.*"
    ],
    filters: { id: data.id },
  })

  if (!order) {
    return
  }

  if (!order.email) {
    return
  }

  // Get currency details
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
  
  // Calculate totals with number validation
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

  // Send email notification
  try {
    await notificationModuleService.createNotifications({
      to: order.email,
      channel: "email",
      template: "order-cancelled",
      data: {
        subject: `Your order has been cancelled ❌`,
        order_id: order.id,
        first_name: order.shipping_address.first_name || order.billing_address.first_name,
        last_name: order.shipping_address.last_name || order.billing_address.last_name,
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
        shipping_method: order.shipping_methods?.[0]?.name || "Standard Shipping",
        total: order_total || calculated_total,
        refund_amount: order_total || calculated_total,
        cancellation_reason: "Order cancelled by customer or system", // You can customize this based on your cancellation logic
        items
      },
    })
  } catch (error) {
    // Silently fail email sending
  }

  // Send SMS notification for order cancellation
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
        customerName: order.billing_address?.first_name || order.shipping_address?.first_name
      }

      await sendOrderCancelledSMS(phone, smsData)
    }
  } catch (error) {
    // Silently fail SMS sending
  }
  } catch (error) {
    console.error("❌ [order-cancelled] Error in order cancelled subscriber:", error);
    console.error("❌ [order-cancelled] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

export const config: SubscriberConfig = {
  event: "order.canceled",
}
