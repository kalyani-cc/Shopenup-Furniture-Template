import type { SubscriberArgs, SubscriberConfig } from "@shopenup/framework"
import { sendOrderConfirmationSMS, smsService, type SMSData } from '../modules/sms-service'

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string;}>) {
  try {
    const query = container.resolve("query")

    // Get order details
    const { data: [order] } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "total",
        "currency_code",
        "billing_address.*",
        "shipping_address.*",
        "items.*",
        "items.variant.*",
        "items.variant.product.*"
      ],
      filters: { id: data.id },
    })

    if (!order) {
      console.log('Order not found for SMS notification:', data.id)
      return
    }

    // Check if SMS service is configured
    if (!smsService.isServiceConfigured()) {
      console.log('SMS service not configured - skipping order confirmation SMS for order:', order.id)
      return
    }

    // Get phone number
    const phone = smsService.getPhoneFromOrder(order)

    if (!phone) {
      console.log('No phone number found for order:', order.id)
      return
    }

    // Get currency symbol for amount formatting
    const currencyModuleService = container.resolve("currency")
    const currency = await currencyModuleService.retrieveCurrency(order.currency_code)
    
    // Prepare SMS data
    const smsData: SMSData = {
      orderId: smsService.getOrderDisplayId(order),
      orderAmount: smsService.formatOrderAmount(order.total, currency.symbol_native),
      storeName: 'Shopenup',
      customerName: order.billing_address?.first_name || order.shipping_address?.first_name
    }

    // Send order confirmation SMS
    const result = await sendOrderConfirmationSMS(phone, smsData)

    if (result.success) {
      console.log('Order confirmation SMS sent successfully for order:', order.id)
    } else {
      console.error('Failed to send order confirmation SMS:', result.error)
    }
  } catch (error) {
    console.error('Error in order SMS subscriber:', error);
    // Don't throw - subscribers should fail gracefully
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}