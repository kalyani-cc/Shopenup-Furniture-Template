import { createStep, StepResponse } from "@shopenup/framework/workflows-sdk"
import RestockModuleService from "../../../modules/restock/service"
import { RESTOCK_MODULE } from "../../../modules/restock"

type Subscription = {
  variant_id: string
  sales_channel_id?: string
  email: string
  customer_id?: string
}

type DeleteRestockSubscriptionsStepInput = Subscription[]

export const deleteRestockSubscriptionStep = createStep(
  "delete-restock-subscription",
  async (
    restockSubscriptions: DeleteRestockSubscriptionsStepInput,
    { container }
  ) => {
    if (!restockSubscriptions || restockSubscriptions.length === 0) {
      return new StepResponse(undefined, [])
    }

    const restockModuleService: RestockModuleService = container.resolve(
      RESTOCK_MODULE
    )

    // Get subscription IDs using service methods
    const subscriptionIds: string[] = []

    // Get all subscriptions matching the criteria using service
    for (const subscription of restockSubscriptions) {
      const subscriptions = await restockModuleService.listRestockSubscriptions({
        variant_id: subscription.variant_id,
        email: subscription.email,
        sales_channel_id: subscription.sales_channel_id,
      })

      if (subscriptions && subscriptions.length > 0) {
        subscriptionIds.push(...subscriptions.map((s) => s.id))
      }
    }

    if (subscriptionIds.length > 0) {
      await restockModuleService.deleteRestockSubscriptions(subscriptionIds)
    }

    return new StepResponse(undefined, restockSubscriptions)
  },
  async (restockSubscriptions: DeleteRestockSubscriptionsStepInput, { container }) => {
    if (!restockSubscriptions || restockSubscriptions.length === 0) {
      return
    }

    const restockModuleService: RestockModuleService = container.resolve(
      RESTOCK_MODULE
    )

    // Recreate subscriptions if needed (compensation)
    // createRestockSubscriptions expects a single object, so we need to loop
    for (const subscription of restockSubscriptions) {
      try {
        await restockModuleService.createRestockSubscriptions(subscription)
      } catch (error) {
        console.error('Error recreating restock subscription in compensation:', error)
      }
    }
  }
)

