import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from "@shopenup/framework";

export async function GET(req: AuthenticatedShopenupRequest, res: ShopenupResponse) {
  try {
    console.log("📊 [Category Ratings] Request method:", req.method);
    const query = req.scope.resolve("query");

    // ✅ Unified filter parsing for GET and POST
    let dateFrom: string | null = null;
    let dateTo: string | null = null;
    let region: string | null = null;
    let state: string | null = null;

    const url = new URL(req.url || "", "http://localhost");
    const searchParams = url.searchParams;

    if (req.method === "GET") {
      dateFrom = searchParams.get("dateFrom");
      dateTo = searchParams.get("dateTo");
      region = searchParams.get("region");
      state = searchParams.get("state");
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      dateFrom = body.dateFrom || body.dateRange?.from || null;
      dateTo = body.dateTo || body.dateRange?.to || null;
      region = body.region || null;
      state = body.state || null;
    }

    console.log("🧭 [Category Ratings] Parsed Filters:", {
      dateFrom,
      dateTo,
      region,
      state,
    });

    // ✅ STEP 1: Fetch ALL categories first
    const { data: allCategories } = await query.graph({
      entity: "product_category",
      fields: ["id", "name"],
    });

    console.log("📦 [All Categories]:", allCategories);

    // ✅ STEP 2: Initialize all categories with zero values and product name arrays
    const categoryRatings: Record<string, { 
      total: number; 
      count: number;
      rating_1: number;
      rating_2: number;
      rating_3: number;
      rating_4: number;
      rating_5: number;
      rating_1_products: string[];
      rating_2_products: string[];
      rating_3_products: string[];
      rating_4_products: string[];
      rating_5_products: string[];
    }> = {};

    // Pre-populate all categories with zero ratings
    for (const category of allCategories || []) {
      if (category.name) {
        categoryRatings[category.name] = {
          total: 0,
          count: 0,
          rating_1: 0,
          rating_2: 0,
          rating_3: 0,
          rating_4: 0,
          rating_5: 0,
          rating_1_products: [],
          rating_2_products: [],
          rating_3_products: [],
          rating_4_products: [],
          rating_5_products: [],
        };
      }
    }

    // ✅ STEP 3: Fetch all reviews
    const { data: reviews } = await query.graph({
      entity: "review",
      fields: ["id", "rating", "created_at", "product_id"],
    });

    // ✅ STEP 4: Filter by date (if reviews exist)
    let filteredReviews: any[] = [];
    if (reviews?.length) {
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo) : null;

      filteredReviews = reviews.filter((r: any) => {
        const createdAt = new Date(r.created_at);
        if (fromDate && createdAt < fromDate) return false;
        if (toDate && createdAt > toDate) return false;
        return true;
      });
    }

    // ✅ STEP 5: Fetch products with category info
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "title", "categories.id", "categories.name"],
    });

    // ✅ STEP 6: Map product → category and product → title
    const productCategoryMap: Record<string, string> = {};
    const productTitleMap: Record<string, string> = {};
    for (const product of products) {
      if (product.id && product.categories?.length) {
        productCategoryMap[product.id] = product.categories[0].name;
        productTitleMap[product.id] = product.title || "Unknown Product";
      }
    }

    // ✅ STEP 7: Populate ratings from reviews into pre-initialized categories
    for (const review of filteredReviews) {
      const categoryName = productCategoryMap[review.product_id];
      if (!categoryName || !categoryRatings[categoryName]) continue;

      const rating = Number(review.rating) || 0;
      const productTitle = productTitleMap[review.product_id];
      
      categoryRatings[categoryName].total += rating;
      categoryRatings[categoryName].count += 1;

      // Count rating distribution and track product names (avoid duplicates)
      if (rating === 1) {
        categoryRatings[categoryName].rating_1 += 1;
        if (productTitle && !categoryRatings[categoryName].rating_1_products.includes(productTitle)) {
          categoryRatings[categoryName].rating_1_products.push(productTitle);
        }
      } else if (rating === 2) {
        categoryRatings[categoryName].rating_2 += 1;
        if (productTitle && !categoryRatings[categoryName].rating_2_products.includes(productTitle)) {
          categoryRatings[categoryName].rating_2_products.push(productTitle);
        }
      } else if (rating === 3) {
        categoryRatings[categoryName].rating_3 += 1;
        if (productTitle && !categoryRatings[categoryName].rating_3_products.includes(productTitle)) {
          categoryRatings[categoryName].rating_3_products.push(productTitle);
        }
      } else if (rating === 4) {
        categoryRatings[categoryName].rating_4 += 1;
        if (productTitle && !categoryRatings[categoryName].rating_4_products.includes(productTitle)) {
          categoryRatings[categoryName].rating_4_products.push(productTitle);
        }
      } else if (rating === 5) {
        categoryRatings[categoryName].rating_5 += 1;
        if (productTitle && !categoryRatings[categoryName].rating_5_products.includes(productTitle)) {
          categoryRatings[categoryName].rating_5_products.push(productTitle);
        }
      }
    }

    // ✅ STEP 8: Convert to results array (all categories will be included)
    const results = Object.entries(categoryRatings).map(([category, data]) => ({
      category,
      average_rating: data.count > 0 ? data.total / data.count : 0,
      review_count: data.count,
      rating_1: data.rating_1,
      rating_2: data.rating_2,
      rating_3: data.rating_3,
      rating_4: data.rating_4,
      rating_5: data.rating_5,
      rating_1_products: data.rating_1_products,
      rating_2_products: data.rating_2_products,
      rating_3_products: data.rating_3_products,
      rating_4_products: data.rating_4_products,
      rating_5_products: data.rating_5_products,
    }));

    console.log("📊 [Category Ratings Results]:", results);

    return res.json({
      success: true,
      filters: { dateFrom, dateTo, region, state },
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error("❌ Error in Category Ratings API:", error);
    return res.status(500).json({
      success: false,
      message: (error as Error)?.message || "Failed to fetch category ratings",
    });
  }
}

export async function POST(req: AuthenticatedShopenupRequest, res: ShopenupResponse) {
  return GET(req, res);
}
