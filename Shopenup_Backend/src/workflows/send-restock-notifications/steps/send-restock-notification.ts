import { createStep } from "@shopenup/framework/workflows-sdk"

type SubscriptionWithVariant = {
  id: string
  variant_id: string
  sales_channel_id?: string
  email: string
  customer_id?: string
  product_variant?: any
}

type SendRestockNotificationStepInput = SubscriptionWithVariant[]

export const sendRestockNotificationStep = createStep(
  "send-restock-notification",
  async (input: SendRestockNotificationStepInput, { container }) => {
    if (!input || input.length === 0) {
      return
    }

    const notificationModuleService = container.resolve("notification")
    const query = container.resolve("query")

    // Get variant details for all subscriptions
    const variantIds = [...new Set(input.map(s => s.variant_id))]
    const { data: variants } = await query.graph({
      entity: "product_variant",
      filters: { id: variantIds },
      fields: [
        "id",
        "title",
        "sku",
        "product.*",
        "product.id",
        "product.title",
        "product.handle",
      ],
    })

    const variantMap = new Map(variants?.map((v: any) => [v.id, v]) || [])

    // Prepare notification data
    const notificationData = input.map((subscription) => {
      const variant = variantMap.get(subscription.variant_id)
      const product = variant?.product

      return {
        to: subscription.email,
        channel: "email",
        template: "variant-restock",
        data: {
          variant_title: variant?.title || "Product",
          product_title: product?.title || "Product",
          product_handle: product?.handle || "",
          variant_sku: variant?.sku || "",
          product_url: product?.handle 
            ? `${process.env.STOREFRONT_URL || ""}/products/${product.handle}`
            : "",
          store_name: process.env.STORE_NAME || "Store",
        },
      }
    })

    await notificationModuleService.createNotifications(notificationData)
  }
)

