import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from "@shopenup/framework";

export async function GET(req: AuthenticatedShopenupRequest, res: ShopenupResponse) {
  try {
    console.log("⭐ [Top Rated Products] Request method:", req.method);
    const query = req.scope.resolve("query");

    // ✅ Unified filter parsing for GET + POST
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

    console.log("🧭 [Top Rated Products] Parsed Filters:", {
      dateFrom,
      dateTo,
      region,
      state,
    });

    // ✅ Fetch all reviews
    const { data: reviews } = await query.graph({
      entity: "review",
      fields: ["id", "rating", "created_at", "product_id"],
    });

    if (!reviews?.length) {
      return res.json({
        success: true,
        filters: { dateFrom, dateTo, region, state },
        data: [],
        count: 0,
      });
    }

    // ✅ Filter by date
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;

    const filteredReviews = reviews.filter((review: any) => {
      const createdAt = new Date(review.created_at);
      if (fromDate && createdAt < fromDate) return false;
      if (toDate && createdAt > toDate) return false;
      return true;
    });

    // ✅ Aggregate ratings per product
    const productRatings: Record<string, { total: number; count: number }> = {};

    for (const review of filteredReviews) {
      const productId = review.product_id;
      if (!productId) continue;

      if (!productRatings[productId]) {
        productRatings[productId] = { total: 0, count: 0 };
      }

      const rating = Number(review.rating) || 0;
      productRatings[productId].total += rating;
      productRatings[productId].count += 1;
    }

    // ✅ Compute averages
    const topRatedProducts = Object.entries(productRatings)
      .map(([product_id, { total, count }]) => ({
        product_id,
        average_rating: total / count,
        review_count: count,
      }))
      .sort((a, b) => b.average_rating - a.average_rating)
      .slice(0, 10);

    return res.json({
      success: true,
      filters: { dateFrom, dateTo, region, state },
      data: topRatedProducts,
      count: topRatedProducts.length,
    });
  } catch (error) {
    console.error("❌ Error in Top Rated Products API:", error);
    return res.status(500).json({
      success: false,
      message:
        (error as Error)?.message || "Failed to fetch top-rated products",
    });
  }
}

export async function POST(req: AuthenticatedShopenupRequest, res: ShopenupResponse) {
  return GET(req, res);
}
