import { createStep, StepResponse } from "@shopenup/framework/workflows-sdk"

type ValidateVariantOutOfStockStepInput = {
  variant_id: string
  sales_channel_id?: string
}

export const validateVariantOutOfStockStep = createStep(
  "validate-variant-out-of-stock",
  async ({ variant_id, sales_channel_id }: ValidateVariantOutOfStockStepInput, { container }) => {
    const query = container.resolve("query")
    
    // Query variant with inventory information
    const { data: variants } = await query.graph({
      entity: "product_variant",
      filters: { id: variant_id },
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
      const error: any = new Error(`Variant with id ${variant_id} not found.`)
      error.type = "NOT_FOUND"
      throw error
    }

    const variant = variants[0]
    
    if (!variant.inventory || !Array.isArray(variant.inventory)) {
      const error: any = new Error("Variant doesn't manage inventory.")
      error.type = "INVALID_DATA"
      throw error
    }

    // Calculate total available quantity across all locations
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

    if (totalAvailable > 0) {
      const error: any = new Error("Variant isn't out of stock.")
      error.type = "INVALID_DATA"
      throw error
    }

    return new StepResponse({ variant_id, available_quantity: totalAvailable })
  }
)

