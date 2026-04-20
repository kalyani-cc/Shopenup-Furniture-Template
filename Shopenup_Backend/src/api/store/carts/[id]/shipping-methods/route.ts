import { ShopenupRequest, ShopenupResponse } from "@shopenup/framework/http";

export async function DELETE(req: ShopenupRequest, res: ShopenupResponse) {
  try {
    const { id: cart_id } = req.params;

    if (!cart_id) {
      return res.status(400).json({
        success: false,
        error: "Cart ID is required",
      });
    }

    // Fetch the cart to get shipping method IDs
    const query = req.scope.resolve("query");
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: [
        "id",
        "shipping_methods.id",
      ],
      filters: { id: cart_id },
    });

    const cart = carts?.[0];
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: "Cart not found",
      });
    }

    // Get shipping method IDs
    const shipping_method_ids =
      cart.shipping_methods?.map((method: any) => method.id) || [];

    if (shipping_method_ids.length === 0) {
      return res.status(200).json({
        success: true,
        cart_id,
        removed: [],
        message: "No shipping methods to remove",
      });
    }

    console.log("[Remove Shipping Methods] Removing shipping methods:", {
      cart_id,
      shipping_method_ids,
    });

    // Use cart module service to remove shipping methods
    const cartModuleService = req.scope.resolve("cart");
    
    // Remove all shipping methods at once using deleteShippingMethods
    // This method expects an array of shipping method IDs
    try {
      await cartModuleService.deleteShippingMethods(shipping_method_ids);
    } catch (error: any) {
      console.error("[Remove Shipping Methods] Error removing shipping methods:", error);
      throw error;
    }

    console.log("[Remove Shipping Methods] ✅ Successfully removed shipping methods");

    // Return success response
    return res.status(200).json({
      success: true,
      cart_id,
      removed: shipping_method_ids,
    });
  } catch (error: any) {
    console.error("[Remove Shipping Methods] ❌ Error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to remove shipping methods",
    });
  }
}

