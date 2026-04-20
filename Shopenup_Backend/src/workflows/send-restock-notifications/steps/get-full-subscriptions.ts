import { createStep, StepResponse } from "@shopenup/framework/workflows-sdk"
import RestockModuleService from "../../../modules/restock/service"
import { RESTOCK_MODULE } from "../../../modules/restock"

type DistinctSubscription = {
  variant_id: string
  sales_channel_id?: string
}

export const getFullSubscriptionsStep = createStep(
  "get-full-subscriptions",
  async (input: DistinctSubscription[], { container }) => {
    if (!input || input.length === 0) {
      return new StepResponse([])
    }

    const restockModuleService: RestockModuleService = container.resolve(
      RESTOCK_MODULE
    )

    // Get all full subscriptions for the restocked variant-channel pairs
    const allSubscriptions = []

    for (const distinctSub of input) {
      const subscriptions = await restockModuleService.listRestockSubscriptions({
        variant_id: distinctSub.variant_id,
        sales_channel_id: distinctSub.sales_channel_id,
      })
      allSubscriptions.push(...subscriptions)
    }

    return new StepResponse(allSubscriptions)
  }
)

