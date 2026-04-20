import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from "@shopenup/framework";

/**
 * GET /admin/products/:productId/wishlist-count
 * Returns the count of wishlist items for a specific product
 * This counts all wishlist items (from both registered users and guests if stored in DB)
 */
export async function GET(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse,
) {
  try {
    const { productId } = req.params;
    const query = req.scope.resolve("query");

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
        count: 0,
      });
    }

    // First, get all variants for this product
    const { data: product } = await query.graph({
      entity: "product",
      filters: { id: productId },
      fields: ["id", "variants.id"],
    });

    if (!product || !Array.isArray(product) || product.length === 0) {
      return res.json({
        success: true,
        product_id: productId,
        count: 0,
      });
    }

    const productData = Array.isArray(product) ? product[0] : product;
    const variantIds = productData.variants?.map((v: any) => v.id) || [];

    if (variantIds.length === 0) {
      return res.json({
        success: true,
        product_id: productId,
        count: 0,
      });
    }

    // Query wishlist items that have variants belonging to this product
    // Try different entity names and query patterns
    let count = 0;

    // Strategy 1: Try to query wishlist_item entity with variant relationship
    try {
      const { data: items } = await query.graph({
        entity: "wishlist_item",
        fields: [
          "id",
          "product_variant_id",
          "product_variant.id",
          "product_variant.product_id",
        ],
        pagination: { take: Number.MAX_SAFE_INTEGER, skip: 0 },
      });

      if (items && Array.isArray(items)) {
        count = items.filter((item: any) => {
          const variantId = item.product_variant_id || item.product_variant?.id;
          const itemProductId = 
            item.product_variant?.product_id || 
            item.product_id;

          return variantIds.includes(variantId) || itemProductId === productId;
        }).length;

        // If we got results, return early
        if (count >= 0) {
          return res.json({
            success: true,
            product_id: productId,
            count: count,
          });
        }
      }
    } catch (err) {
      console.warn("Failed to query 'wishlist_item', trying alternatives:", err);
    }

    // Strategy 2: Try querying through wishlists
    try {
      const { data: wishlists } = await query.graph({
        entity: "wishlist",
        fields: [
          "id",
          "items.id",
          "items.product_variant_id",
          "items.product_variant.id",
          "items.product_variant.product_id",
        ],
        pagination: { take: Number.MAX_SAFE_INTEGER, skip: 0 },
      });

      if (wishlists && Array.isArray(wishlists)) {
        // Flatten all items from all wishlists
        const allItems = wishlists.flatMap((w: any) => w.items || []);
        
        count = allItems.filter((item: any) => {
          const variantId = item.product_variant_id || item.product_variant?.id;
          const itemProductId = 
            item.product_variant?.product_id || 
            item.product_id;

          return variantIds.includes(variantId) || itemProductId === productId;
        }).length;

        // If we got results, return
        if (count >= 0) {
          return res.json({
            success: true,
            product_id: productId,
            count: count,
          });
        }
      }
    } catch (err) {
      console.warn("Failed to query 'wishlist' entity:", err);
    }

    // Strategy 3: Try filtering by variant_id directly
    try {
      const { data: items } = await query.graph({
        entity: "wishlist_item",
        filters: {
          product_variant_id: variantIds.length === 1 ? variantIds[0] : { $in: variantIds },
        },
        fields: ["id"],
        pagination: { take: Number.MAX_SAFE_INTEGER, skip: 0 },
      });

      if (items && Array.isArray(items)) {
        count = items.length;
        return res.json({
          success: true,
          product_id: productId,
          count: count,
        });
      }
    } catch (err) {
      console.warn("Failed to query with variant filter:", err);
    }

    return res.json({
      success: true,
      product_id: productId,
      count: count,
    });
  } catch (error) {
    console.error("❌ Error in Wishlist Count API:", error);
    return res.status(500).json({
      success: false,
      message:
        (error as Error)?.message || "Failed to fetch wishlist count",
      count: 0,
    });
  }
}

export async function POST(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse,
) {
  return GET(req, res);
}

