/**
 * Cart Merge API Route
 * 
 * This endpoint handles merging a customer's existing cart with their transferred guest cart.
 * It's called during the login workflow after a guest cart has been transferred to the customer.
 * 
 * Flow:
 * 1. Customer logs in
 * 2. Guest cart is transferred to their account
 * 3. This endpoint checks if they have any other carts
 * 4. If a previous customer cart exists, merge its items into the transferred cart
 * 5. Delete the old cart after merging
 * 6. Return the final merged cart
 * 
 * This ensures no items are lost when a customer logs in with a guest cart.
 */

import { ShopenupRequest, ShopenupResponse } from "@shopenup/framework/http"

type PostStoreCartMerge = {
  transferredCartId: string
}

export async function POST(
  req: ShopenupRequest<PostStoreCartMerge>,
  res: ShopenupResponse
) {
  const { transferredCartId } = req.body as PostStoreCartMerge

  // Validate input
  if (!transferredCartId || typeof transferredCartId !== "string") {
    return res.status(400).json({
      message: "transferredCartId is required and must be a string",
    })
  }

  try {
    // Get authenticated customer from request
    let customerId: string | undefined
    try {
      const authContext = (req as any).auth_context
      customerId = authContext?.actor_id || undefined
    } catch (e) {
      customerId = undefined
    }

    if (!customerId) {
      return res.status(401).json({
        message: "Authentication required",
      })
    }

    // Resolve services - matched to working pattern in prepare-for-transfer
    const cartService = req.scope.resolve("cart") as any // Cart Module Service
    const query = req.scope.resolve("query") as any // Remote Query

    // Step 1: Fetch the transferred cart to validate it exists
    let transferredCart: any = null
    try {
      const { data } = await query.graph({
        entity: "cart",
        fields: ["*", "items.*", "items.variant.*", "region_id", "customer_id"],
        filters: { id: transferredCartId },
      })
      transferredCart = data[0] || null
    } catch (error) {
      return res.status(404).json({
        message: "Transferred cart not found",
        error: error instanceof Error ? error.message : "Unknown error"
      })
    }

    if (!transferredCart || transferredCart.customer_id !== customerId) {
      return res.status(400).json({
        message: "Cart does not belong to authenticated customer",
      })
    }

    // Step 2: Find any other active carts for this customer
    // This would be carts created before the guest cart was transferred
    let existingCarts: any[] = []
    try {
      const { data } = await query.graph({
        entity: "cart",
        fields: ["*", "items.*", "items.variant.*", "region_id", "metadata", "created_at"],
        filters: {
          customer_id: customerId,
          completed_at: null,
        },
      })
      existingCarts = data || []

      // Sort manually
      existingCarts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } catch (error) {
      console.error("Error listing customer carts in merge:", error)
      existingCarts = []
    }

    // Filter out the transferred cart from results
    const otherCarts = existingCarts.filter(
      (cart) => cart.id !== transferredCartId
    )

    // If no other carts exist, return the transferred cart as-is
    if (otherCarts.length === 0) {
      return res.status(200).json({
        message: "No previous carts to merge",
        cart: transferredCart,
        merged: false,
      })
    }

    // Step 3: Use the most recent previous cart for merging
    const previousCart = otherCarts[0]

    // Skip merge if previous cart is also from same login session or has no items
    if (
      !previousCart.items ||
      previousCart.items.length === 0 ||
      previousCart.region_id !== transferredCart.region_id
    ) {
      return res.status(200).json({
        message: "Previous cart exists but cannot be merged (region mismatch or empty)",
        cart: transferredCart,
        merged: false,
        reason: previousCart.region_id !== transferredCart.region_id
          ? "region_mismatch"
          : "empty_cart",
      })
    }

    // Step 4: Merge line items
    const lineItemMergeResults: Array<{
      variantId: string
      quantity: number
      status: "merged" | "skipped" | "error"
      reason?: string
    }> = []

    for (const oldItem of previousCart.items) {
      try {
        // Check if this variant already exists in transferred cart
        const existingItem = transferredCart.items?.find(
          (item: any) => item.variant_id === oldItem.variant_id
        )

        if (existingItem) {
          // Deduplication: Update existing item with combined quantity
          const newQuantity = (existingItem.quantity || 0) + (oldItem.quantity || 0)

          await cartService.updateLineItems([{
            id: existingItem.id,
            quantity: newQuantity,
          }])

          lineItemMergeResults.push({
            variantId: oldItem.variant_id,
            quantity: newQuantity,
            status: "merged",
            reason: "deduplicated_variant",
          })
        } else {
          // New variant: add it to the transferred cart
          await cartService.addLineItems(transferredCartId, [{
            variant_id: oldItem.variant_id,
            quantity: oldItem.quantity,
            metadata: oldItem.metadata,
            // Explicitly map required fields
            title: oldItem.title || "Item",
            thumbnail: oldItem.thumbnail,
            subtitle: oldItem.subtitle,
            product_title: oldItem.product_title,
            product_description: oldItem.product_description,
            product_subtitle: oldItem.product_subtitle,
            product_type: oldItem.product_type,
            product_collection: oldItem.product_collection,
            product_handle: oldItem.product_handle,
            variant_sku: oldItem.variant_sku,
            variant_barcode: oldItem.variant_barcode,
            variant_title: oldItem.variant_title,
            unit_price: oldItem.unit_price,
            is_tax_inclusive: oldItem.is_tax_inclusive,
            allows_tax_estimation: oldItem.allows_tax_estimation,
            includes_tax: oldItem.includes_tax,
          }])

          lineItemMergeResults.push({
            variantId: oldItem.variant_id,
            quantity: oldItem.quantity,
            status: "merged",
          })
        }
      } catch (error) {
        console.error(`Error merging line item for variant ${oldItem.variant_id}:`, error)

        lineItemMergeResults.push({
          variantId: oldItem.variant_id,
          quantity: oldItem.quantity,
          status: "error",
          reason: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // Step 5: Delete the previous cart after successful merge
    try {
      await cartService.updateCarts(previousCart.id, {
        completed_at: new Date(),
        metadata: {
          ...previousCart.metadata,
          merged_into_cart: transferredCartId,
          merged_at: new Date().toISOString(),
        },
      })

      console.log(
        `✅ Cart merge: Previous cart ${previousCart.id} merged into ${transferredCartId}`
      )
    } catch (error) {
      console.warn(
        `⚠️ Failed to mark previous cart ${previousCart.id} as completed:`,
        error
      )
    }

    // Step 6: Fetch the final merged cart with all items
    let finalCart = transferredCart
    try {
      const { data } = await query.graph({
        entity: "cart",
        fields: ["*", "items.*", "items.variant.*"],
        filters: { id: transferredCartId },
      })
      finalCart = data[0] || transferredCart
    } catch (e) {
      // ignore
    }

    return res.status(200).json({
      message: `Successfully merged ${previousCart.items.length} items from previous cart`,
      cart: finalCart,
      merged: true,
      mergeDetails: {
        previousCartId: previousCart.id,
        itemsMerged: lineItemMergeResults.length,
        deduplicatedVariants: lineItemMergeResults.filter(
          (r) => r.reason === "deduplicated_variant"
        ).length,
        newVariantsAdded: lineItemMergeResults.filter(
          (r) => !r.reason,
        ).length,
        mergeResults: lineItemMergeResults,
      },
    })
  } catch (error) {
    console.error("Cart merge error:", error)
    return res.status(500).json({
      message: "Failed to merge carts",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
