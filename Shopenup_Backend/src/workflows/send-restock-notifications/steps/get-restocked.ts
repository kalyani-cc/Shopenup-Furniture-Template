import { createStep, StepResponse } from "@shopenup/framework/workflows-sdk"

type GetRestockedStepInput = {
  variant_id: string
  sales_channel_id?: string
}[]

export const getRestockedStep = createStep(
  "get-restocked",
  async (input: GetRestockedStepInput, { container }) => {
    const restocked: GetRestockedStepInput = []
    const query = container.resolve("query")

    if (!input || input.length === 0) {
      return new StepResponse([])
    }

    // Get all unique variant IDs
    const variantIds = [...new Set(input.map(s => s.variant_id))]

    // Query variants with inventory information
    const { data: variants } = await query.graph({
      entity: "product_variant",
      filters: { id: variantIds },
      fields: [
        "id",
        "inventory.*",
        "inventory.location_levels.*",
        "inventory.location_levels.stocked_quantity",
        "inventory.location_levels.reserved_quantity",
        "inventory.location_levels.incoming_quantity",
      ],
    })

    if (!variants || variants.length === 0) {
      return new StepResponse([])
    }

    // Check which variants are now in stock
    for (const variant of variants) {
      if (!variant.inventory || !Array.isArray(variant.inventory)) {
        continue
      }

      // Calculate total available quantity
      let totalAvailable = 0
      for (const inventoryItem of variant.inventory) {
        if (inventoryItem.location_levels && Array.isArray(inventoryItem.location_levels)) {
          for (const locationLevel of inventoryItem.location_levels) {
            const stockedQty = locationLevel.stocked_quantity || 0
            const reservedQty = locationLevel.reserved_quantity || 0
            const incomingQty = locationLevel.incoming_quantity || 0
            const availableQty = stockedQty - reservedQty + incomingQty
            totalAvailable += availableQty
          }
        }
      }

      // If variant is now in stock, find matching subscriptions
      if (totalAvailable > 0) {
        const matchingSubscriptions = input.filter(s => s.variant_id === variant.id)
        restocked.push(...matchingSubscriptions)
      }
    }

    return new StepResponse(restocked)
  }
)

