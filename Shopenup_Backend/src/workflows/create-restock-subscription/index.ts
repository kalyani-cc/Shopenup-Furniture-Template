import {
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
} from "@shopenup/framework/workflows-sdk"
import { validateVariantOutOfStockStep } from "./steps/validate-variant-out-of-stock"
import { createRestockSubscriptionStep } from "./steps/create-restock-subscription"
import { updateRestockSubscriptionStep } from "./steps/update-restock-subscription"

type CreateRestockSubscriptionWorkflowInput = {
  variant_id: string
  sales_channel_id?: string
  customer: {
    email?: string
    customer_id?: string
  }
}

export const createRestockSubscriptionWorkflow = createWorkflow(
  "create-restock-subscription",
  ({
    variant_id,
    sales_channel_id,
    customer,
  }: CreateRestockSubscriptionWorkflowInput) => {
    // Validate variant is out of stock
    validateVariantOutOfStockStep({
      variant_id,
      sales_channel_id,
    })

    const customerId = transform(
      { customer },
      (data) => {
        return data.customer.customer_id || ""
      }
    )

    // Get email - either from input or retrieve from customer
    const email = transform(
      { customer },
      (data) => {
        return data.customer?.email || ""
      }
    )

    // Check if subscription already exists by querying
    // For now, we'll create it and let the unique constraint handle duplicates
    // In a real implementation, you'd query first

    // Create the subscription
    const subscription = createRestockSubscriptionStep({
      variant_id,
      sales_channel_id,
      email,
      customer_id: customer.customer_id,
    })

    return new WorkflowResponse(subscription)
  }
)

export default createRestockSubscriptionWorkflow

