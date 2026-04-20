// src/api/store/filters/products/route.ts
import { ShopenupRequest, ShopenupResponse } from "@shopenup/framework";
import { z } from "zod";

// Query type - using graph method which returns { data: any[] }

const querySchema = z.object({
  limit: z.coerce.number().optional().default(50),
  offset: z.coerce.number().optional().default(0),
  category_id: z.string().optional().transform((val) => {
    if (!val || val.trim() === '') return undefined;
    return val.trim();
  }),
  collection_id: z.string().optional().transform((val) => {
    if (!val || val.trim() === '') return undefined;
    return val.trim();
  }),
  price_min: z.coerce.number().optional(),
  price_max: z.coerce.number().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional().transform((val) => {
    if (!val) return undefined;
    if (Array.isArray(val)) return val;
    // Handle comma-separated string
    return val.split(',').map(t => t.trim()).filter(t => t.length > 0);
  }),
  ratings: z.union([z.string(), z.array(z.coerce.number())]).optional().transform((val) => {
    if (!val) return undefined;
    if (Array.isArray(val)) return val.map(r => Math.round(Number(r)));
    // Handle comma-separated string
    return val.split(',').map(r => Math.round(Number(r.trim()))).filter(r => r >= 1 && r <= 5);
  }),
  q: z.string().optional(),
  subcategory: z.union([z.string(), z.array(z.string())]).optional().transform((val) => {
    if (!val) return undefined;
    if (Array.isArray(val)) return val;
    // Handle comma-separated string
    return val.split(',').map(t => t.trim()).filter(t => t.length > 0);
  }),
  // Variant options filter: JSON string like '{"Size":["M","L"],"Color":["Red"]}'
  variant_options: z.union([z.string(), z.record(z.array(z.string()))]).optional().transform((val) => {
    if (!val) return undefined;
    if (typeof val === 'object' && !Array.isArray(val)) return val;
    // Parse JSON string
    try {
      const parsed = typeof val === 'string' ? JSON.parse(val) : val;
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as Record<string, string[]>;
      }
    } catch {
      // Invalid JSON, return undefined
    }
    return undefined;
  }),
});

export async function GET(req: ShopenupRequest, res: ShopenupResponse) {
  try {
    const { limit, offset, category_id, collection_id, price_min, price_max, tags, ratings, q, subcategory, variant_options } =
      querySchema.parse(req.query);

    // ✅ Properly type query
    const query = req.scope.resolve("query") as any;

    // Fetch products with all necessary fields using graph query
    // Note: We don't query calculated_price to avoid currency_code context requirement
    // Instead, we'll use variant prices directly for filtering
    const { data: productsData } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "description",
        "collection_id",
        "type_id",
        "categories.id",
        "variants.id",
        "variants.prices.*",
        "variants.prices.amount",
        "variants.prices.currency_code",
        "variants.options.*",
        "variants.options.option_id",
        "variants.options.value",
        "options.*",
        "options.id",
        "options.title",
        "images.*",
        "tags.*",
        "type.*",
      ],
      pagination: {
        skip: offset,
        take: limit * 2, // Fetch more to account for filtering
      },
      // Don't filter at query level - we'll filter by categories relationship after fetching
    });

    // Ensure products is an array
    let products: any[] = Array.isArray(productsData) ? productsData : [];

    // Filter by collection_id if provided
    if (collection_id) {
      products = products.filter((product: any) => {
        return product.collection_id && String(product.collection_id) === String(collection_id);
      });
    }

    // Filter by category if provided (category is on product level via categories relationship)
    if (category_id) {
      products = products.filter((product: any) => {
        // Check if product has categories array and if any category matches
        if (product.categories && Array.isArray(product.categories)) {
          return product.categories.some((cat: any) => {
            const catId = typeof cat === 'string' ? cat : (cat?.id || cat);
            return String(catId) === String(category_id);
          });
        }
        return false;
      });
    }

    // Fetch reviews to get product ratings (only if ratings filter is active)
    // Optimized: Only fetch reviews for products that exist in our dataset
    let productRatings: Record<string, { average: number; count: number }> = {};
    if (ratings && ratings.length > 0 && products.length > 0) {
      try {
        const productIds = new Set(products.map((p: any) => p.id));
        
        const { data: reviews } = await query.graph({
          entity: "review",
          fields: ["id", "rating", "product_id"],
        });

        // Aggregate ratings per product (only for products we have)
        const ratingMap: Record<string, { total: number; count: number }> = {};
        for (const review of reviews || []) {
          const productId = review.product_id;
          if (!productId || !productIds.has(productId)) continue; // Skip if product not in our set

          if (!ratingMap[productId]) {
            ratingMap[productId] = { total: 0, count: 0 };
          }

          const rating = Number(review.rating) || 0;
          if (rating > 0) {
            ratingMap[productId].total += rating;
            ratingMap[productId].count += 1;
          }
        }

        // Compute averages
        for (const [productId, { total, count }] of Object.entries(ratingMap)) {
          if (count > 0) {
            productRatings[productId] = {
              average: total / count,
              count: count,
            };
          }
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
        // Continue without ratings filtering if reviews fail
      }
    }

    // Apply filters
    let filteredProducts = products.filter((product) => {
      // Price filter - use variant prices instead of calculated_price
      // Optimized: Early exit if no price filters
      if (price_min != null || price_max != null) {
        const priceMatch = product.variants?.some((variant: any) => {
          // Get price from variant.prices array (use first price)
          const price = variant.prices?.[0]?.amount;
          
          // If no price found, skip this variant
          if (price == null) return false;
          
          // Check price range
          if (price_min != null && price < price_min) return false;
          if (price_max != null && price > price_max) return false;
          return true;
        });

        if (!priceMatch) return false;
      }

      // Search query filter
      if (q && q.trim()) {
        const searchTerm = q.toLowerCase().trim();
        const titleMatch = product.title?.toLowerCase().includes(searchTerm);
        const descriptionMatch = product.description?.toLowerCase().includes(searchTerm);
        if (!titleMatch && !descriptionMatch) return false;
      }

      // Tags/Brands filter (check both tags and type.label)
      // Optimized: Combine tags and subcategory into single filter check
      const filterTags = tags && tags.length > 0 ? tags : (subcategory && subcategory.length > 0 ? subcategory : null);
      if (filterTags && filterTags.length > 0) {
        // Pre-compute product tags and type label once
        const productTags = Array.isArray(product.tags)
          ? product.tags.map((tag: any) => {
              const tagValue = typeof tag === 'string' ? tag : (tag?.value || String(tag || ''));
              return tagValue.toLowerCase();
            })
          : [];
        
        const productType = product.type?.label || product.type?.value || '';
        const typeLabel = String(productType).toLowerCase();

        const matchesTag = filterTags.some((filterTag: string) => {
          const filterTagLower = filterTag.toLowerCase();
          return (
            productTags.some((pt: string) => pt.includes(filterTagLower) || filterTagLower.includes(pt)) ||
            typeLabel.includes(filterTagLower) ||
            filterTagLower.includes(typeLabel)
          );
        });

        if (!matchesTag) return false;
      }

      // Variant options filter (dynamic - supports any option type: Size, Color, Age, Style, etc.)
      if (variant_options && Object.keys(variant_options).length > 0) {
        let matchesVariantOptions = false;

        if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
          // Build a map of option_id -> option title (case-insensitive) for this product (once per product)
          const optionIdToTitleLower: Record<string, string> = {};
          if (product.options && Array.isArray(product.options)) {
            product.options.forEach((opt: any) => {
              if (opt.id && opt.title) {
                const titleLower = String(opt.title).toLowerCase().trim();
                optionIdToTitleLower[opt.id] = titleLower;
              }
            });
          }

          // Check each variant to see if it matches all of the filter criteria
          for (const variant of product.variants) {
            if (!variant.options || !Array.isArray(variant.options)) continue;

            // Check if this variant matches all required option filters
            let variantMatches = true;
            for (const [optionTitle, filterValues] of Object.entries(variant_options)) {
              if (!filterValues || filterValues.length === 0) continue;
              
              const optionTitleLower = String(optionTitle).toLowerCase().trim();
              
              // Find the option ID for this option title (case-insensitive)
              const matchingOptionId = Object.keys(optionIdToTitleLower).find(
                optId => optionIdToTitleLower[optId] === optionTitleLower
              );

              if (!matchingOptionId) {
                // Option doesn't exist for this product, exclude this variant
                variantMatches = false;
                break;
              }

              // Check if variant has a matching option value
              const variantOption = variant.options.find((opt: any) => {
                const matchesOptionId = 
                  (opt.option_id && String(opt.option_id) === String(matchingOptionId)) ||
                  (opt.id && String(opt.id) === String(matchingOptionId));
                return matchesOptionId;
              });

              if (!variantOption || !variantOption.value) {
                variantMatches = false;
                break;
              }

              const variantValue = String(variantOption.value).trim();
              const variantValueLower = variantValue.toLowerCase();
              
              // Only ignore completely empty values
              if (!variantValue || variantValue === '') {
                variantMatches = false;
                break;
              }

              // Case-insensitive exact match
              const matchesValue = filterValues.some((filterValue: string) => {
                const filterValueLower = String(filterValue).toLowerCase().trim();
                return variantValueLower === filterValueLower;
              });

              if (!matchesValue) {
                variantMatches = false;
                break;
              }
            }

            if (variantMatches) {
              matchesVariantOptions = true;
              break;
            }
          }
        }

        if (!matchesVariantOptions) return false;
      }

      // Ratings filter
      if (ratings && ratings.length > 0) {
        const productRating = productRatings[product.id];
        if (!productRating || productRating.count === 0) {
          // Product has no reviews, exclude if ratings filter is active
          return false;
        }

        const roundedRating = Math.round(productRating.average);
        if (!ratings.includes(roundedRating)) {
          return false;
        }
      }

      return true;
    });

    // Apply pagination after filtering
    const paginatedProducts = filteredProducts.slice(0, limit);

    // Transform products to include calculated_price format for frontend compatibility
    const transformedProducts = paginatedProducts.map((product: any) => {
      // Add calculated_price to variants if not present, using variant prices
      if (product.variants && Array.isArray(product.variants)) {
        product.variants = product.variants.map((variant: any) => {
          // If calculated_price doesn't exist, create it from prices
          if (!variant.calculated_price && variant.prices && Array.isArray(variant.prices) && variant.prices.length > 0) {
            const firstPrice = variant.prices[0];
            variant.calculated_price = {
              calculated_amount: firstPrice.amount || 0,
              currency_code: firstPrice.currency_code || 'INR',
            };
          }
          return variant;
        });
      }
      return product;
    });

    return res.status(200).json({ 
      products: transformedProducts,
      count: filteredProducts.length
    });
  } catch (error: any) {
    console.error("Error in products filter:", error);
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      type: error?.type,
    });
    return res.status(400).json({
      type: error?.type || "internal_error",
      message: error?.message || "Something went wrong",
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });
  }
}

