// src/api/store/filters/variant-options/route.ts
import { ShopenupRequest, ShopenupResponse } from "@shopenup/framework";
import { z } from "zod";

const querySchema = z.object({
  category_id: z.string().optional().transform((val) => {
    if (!val || val.trim() === '') return undefined;
    return val.trim();
  }),
  collection_id: z.string().optional().transform((val) => {
    if (!val || val.trim() === '') return undefined;
    return val.trim();
  }),
});

export async function GET(req: ShopenupRequest, res: ShopenupResponse) {
  try {
    const { category_id, collection_id } = querySchema.parse(req.query);

    const query = req.scope.resolve("query") as any;

    // Fetch all products in the category (or all products if no category) to extract variant options
    // We don't need to fetch all fields, just what's needed for variant options
    const { data: productsData } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "collection_id",
        "variants.id",
        "variants.options.*",
        "variants.options.option_id",
        "variants.options.value",
        "options.*",
        "options.id",
        "options.title",
        "categories.id",
      ],
      pagination: { skip: 0, take: 1000 }, // Fetch enough products to get all variant options
      // Don't filter at query level - we'll filter by categories relationship after fetching
    });

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

    // Extract available variant options and their values from all products
    // Use case-insensitive deduplication: key by lowercase, store original case
    const availableVariantOptions: Record<string, Map<string, string>> = {}; // Map<lowercaseValue, originalValue>
    const optionTitleLowerToOriginal: Record<string, string> = {}; // Map lowercase option title to original
    
    products.forEach((product: any) => {
      if (!product.options || !Array.isArray(product.options)) return;
      if (!product.variants || !Array.isArray(product.variants)) return;

      // Build option ID to title map (case-insensitive for option titles)
      const optionIdToTitle: Record<string, string> = {};
      
      product.options.forEach((opt: any) => {
        if (opt.id && opt.title) {
          const optionTitle = opt.title.trim();
          const optionTitleLower = optionTitle.toLowerCase();
          optionIdToTitle[opt.id] = optionTitle;
          
          // Store original title (first occurrence wins for case)
          if (!optionTitleLowerToOriginal[optionTitleLower]) {
            optionTitleLowerToOriginal[optionTitleLower] = optionTitle;
            
            // Initialize map for this option if not exists
            if (!availableVariantOptions[optionTitleLower]) {
              availableVariantOptions[optionTitleLower] = new Map<string, string>();
            }
          }
        }
      });

      // Extract values from all variants
      product.variants.forEach((variant: any) => {
        if (!variant.options || !Array.isArray(variant.options)) return;

        variant.options.forEach((varOpt: any) => {
          const optionId = varOpt.option_id || varOpt.id;
          if (!optionId || !varOpt.value) return;

          const optionTitle = optionIdToTitle[optionId];
          if (!optionTitle) return;

          const optionTitleLower = optionTitle.toLowerCase();
          const value = String(varOpt.value).trim();
          const valueLower = value.toLowerCase();
          
          // Only ignore completely empty values
          if (!value || value === '') {
            return;
          }

          // Case-insensitive deduplication: store original case (first occurrence wins)
          if (!availableVariantOptions[optionTitleLower].has(valueLower)) {
            availableVariantOptions[optionTitleLower].set(valueLower, value);
          }
        });
      });
    });

    // Convert Maps to Arrays, use original case, and sort
    // Filter out "default option" and "default option value" option titles
    const variantOptionsMap: Record<string, string[]> = {};
    Object.entries(availableVariantOptions).forEach(([optionTitleLower, valuesMap]) => {
      const originalOptionTitle = optionTitleLowerToOriginal[optionTitleLower] || optionTitleLower;
      const titleLower = originalOptionTitle.toLowerCase().trim();
      
      // Skip option titles that are "default option" or "default option value"
      if (titleLower === 'default option' || titleLower === 'default option value') {
        return;
      }
      
      variantOptionsMap[originalOptionTitle] = Array.from(valuesMap.values()).sort();
    });

    return res.status(200).json({ 
      variant_options: variantOptionsMap
    });
  } catch (error: any) {
    console.error("Error in variant options fetch:", error);
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

