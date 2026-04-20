/**
 * Cart Preparation for Transfer API Route
 * 
 * This endpoint prepares a guest cart for customer transfer by:
 * 1. Finding any existing active customer carts
 * 2. Merging their line items into the guest cart BEFORE transfer
 * 3. Marking old carts as completed to prevent session conflicts
 * 
 * This must happen BEFORE transferCartCustomerWorkflow is called, because:
 * - Shopenup allows only one active session cart per customer
 * - transferCartCustomerWorkflow replaces the session cart
 * - Any items in old carts would be lost if not merged first
 * 
 * The proper flow is:
 * 1. Guest adds items (stored in guest cart)
 * 2. Customer logs in
 * 3. Call this endpoint: merge old customer cart items → guest cart
 * 4. Call transferCartCustomerWorkflow: transfer ownership
 * 5. Shopenup updates session cookie with the merged guest cart
 * Result: Session cart contains items from both guest and previous customer carts
 */

import { ShopenupRequest, ShopenupResponse } from "@shopenup/framework/http"

type PostStorePrepareCartForTransfer = {
  guestCartId: string
}

export async function POST(
  req: ShopenupRequest<PostStorePrepareCartForTransfer>,
  res: ShopenupResponse
) {
  const { guestCartId } = req.body as PostStorePrepareCartForTransfer

  // Validate input
  if (!guestCartId || typeof guestCartId !== "string") {
    return res.status(400).json({
      message: "guestCartId is required and must be a string",
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

    // Resolve services
    const cartService = req.scope.resolve("cart") as any
    const query = req.scope.resolve("query") as any

    // Step 1: Validate guest cart exists using Query Graph
    let guestCart: any = null
    try {
      const { data } = await query.graph({
        entity: "cart",
        fields: ["*", "items.*", "items.variant.*", "region_id", "customer_id", "metadata"],
        filters: { id: guestCartId },
      })
      guestCart = data[0] || null
    } catch (error: any) {
      console.error(`Error retrieving guest cart ${guestCartId}:`, error)
      return res.status(404).json({
        message: "Guest cart not found",
        details: error.message
      })
    }

    if (!guestCart) {
      return res.status(404).json({
        message: "Guest cart not found",
      })
    }

    // Guest cart should NOT have a customer at this point
    if (guestCart.customer_id) {
      console.warn(`Guest cart ${guestCartId} already has customer_id: ${guestCart.customer_id}`)
      return res.status(200).json({
        message: "Guest cart already has customer - no merge needed",
        cart: guestCart,
        merged: false,
      })
    }

    // Step 2: Find existing active carts for this customer
    // These would be carts from previous sessions before logging in
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

      // Sort manually since query sort syntax can vary
      existingCarts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } catch (error) {
      console.error("Error listing customer carts:", error)
      // Continue with empty list - merge is optional enhancement
      existingCarts = []
    }

    // Filter to get carts other than the guest cart
    const previousCarts = existingCarts.filter(
      (cart: any) => cart.id !== guestCartId
    )

    // If no previous carts, nothing to merge - prepare for direct transfer
    if (previousCarts.length === 0) {
      return res.status(200).json({
        message: "No existing customer carts to merge",
        cart: guestCart,
        merged: false,
        reason: "no_previous_carts",
      })
    }

    // Step 3: Use most recent previous cart for merging
    const previousCart = previousCarts[0]

    // Skip merge if carts have incompatible regions or previous cart is empty
    if (
      !previousCart.items ||
      previousCart.items.length === 0 ||
      previousCart.region_id !== guestCart.region_id
    ) {
      // Mark incompatible cart as completed to prevent Shopenup session conflicts
      if (previousCart.region_id !== guestCart.region_id) {
        try {
          await cartService.updateCarts(previousCart.id, {
            completed_at: new Date(),
            metadata: {
              ...previousCart.metadata,
              completion_reason: "region_mismatch_with_guest_cart",
              completed_at: new Date().toISOString(),
            },
          })
        } catch (error) {
          console.warn(`Failed to mark incompatible cart ${previousCart.id} as completed:`, error)
          // Non-blocking
        }
      }

      return res.status(200).json({
        message: "Previous cart exists but cannot be merged",
        cart: guestCart,
        merged: false,
        reason: previousCart.region_id !== guestCart.region_id
          ? "region_mismatch"
          : "empty_cart",
      })
    }

    // Step 4: Merge line items from previous cart into guest cart
    // This happens BEFORE transfer, so guest cart becomes the single unified cart
    const lineItemMergeResults: Array<{
      variantId: string
      quantity: number
      status: "merged" | "skipped" | "error"
      reason?: string
    }> = []

    // Ensure guest cart has items array
    if (!guestCart.items) {
      guestCart.items = []
    }

    for (const oldItem of previousCart.items) {
      try {
        // Check for existing variant in guest cart
        const existingItem = guestCart.items.find(
          (item: any) => item.variant_id === oldItem.variant_id
        )

        if (existingItem) {
          // Deduplication: Combine quantities for same variant
          const newQuantity = (existingItem.quantity || 0) + (oldItem.quantity || 0)

          // Use cartService.updateLineItems to ensure totals are recalculated
          // Correcting call based on error: first arg was treated as line item ID, so we should pass updates array directly
          const updatePayload = [{
            id: existingItem.id,
            quantity: newQuantity,
          }]

          await cartService.updateLineItems(updatePayload)

          lineItemMergeResults.push({
            variantId: oldItem.variant_id,
            quantity: newQuantity,
            status: "merged",
            reason: "deduplicated_variant",
          })
        } else {
          // New variant: add line item to guest cart
          await cartService.addLineItems(guestCartId, [{
            variant_id: oldItem.variant_id,
            quantity: oldItem.quantity,
            metadata: oldItem.metadata,
            // Manually populate required fields since Module Service might not auto-enrich
            title: oldItem.title || "Item", // Fallback just in case
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
            // Price fields required by MikroORM
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
      } catch (error: any) {
        console.error(`Error merging variant ${oldItem.variant_id}:`, error)
        console.error(`Full error details:`, JSON.stringify(error, null, 2))
        lineItemMergeResults.push({
          variantId: oldItem.variant_id,
          quantity: oldItem.quantity,
          status: "error",
          reason: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // Step 5: Mark previous cart as completed
    // This ensures Shopenup won't use it as the session cart after transfer
    try {
      await cartService.updateCarts(previousCart.id, {
        completed_at: new Date(),
        metadata: {
          ...previousCart.metadata,
          merged_into_guest_cart: guestCartId,
          merged_at: new Date().toISOString(),
          merge_reason: "pre_transfer_consolidation",
        },
      })

    } catch (error) {
      console.warn(`⚠️ Failed to mark previous cart as completed:`, error)
      // Non-blocking: Cart is still functional for transfer
    }

    // Step 6: Fetch final merged guest cart (using Query for consistency)
    let mergedCart = guestCart
    try {
      const { data } = await query.graph({
        entity: "cart",
        fields: ["*", "items.*", "items.variant.*"],
        filters: { id: guestCartId },
      })
      mergedCart = data[0] || guestCart
    } catch (e) {
      // Fallback to the object we have if query fails
    }

    return res.status(200).json({
      message: `Successfully merged ${previousCart.items.length} items into guest cart`,
      cart: mergedCart,
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
  } catch (err: any) {
    console.error("Critical error in prepare-for-transfer:", err)
    return res.status(500).json({
      message: "Internal server error during cart preparation",
      details: err.message
    })
  }
}
