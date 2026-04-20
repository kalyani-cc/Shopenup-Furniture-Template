import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from "@shopenup/framework";

export async function GET(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse
) {
  try {
    const query = req.scope.resolve("query");

    // -----------------------
    // ✅ Parse Filters (GET/POST)
    // -----------------------
    const url = new URL(req.url || "", "http://localhost");
    const params = url.searchParams;

    let dateFrom: string | null = null;
    let dateTo: string | null = null;
    let region: string | null = null;
    let state: string | null = null;

    if (req.method === "GET") {
      dateFrom = params.get("dateFrom");
      dateTo = params.get("dateTo");
      region = params.get("region");
      state = params.get("state");
    } else if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const dateFromRaw = body.dateFrom || body.dateRange?.from;
      const dateToRaw = body.dateTo || body.dateRange?.to;

      dateFrom = dateFromRaw instanceof Date ? dateFromRaw.toISOString() : dateFromRaw;
      dateTo = dateToRaw instanceof Date ? dateToRaw.toISOString() : dateToRaw;
      region = body.region || null;
      state = body.state || null;
    }

    // -----------------------
    // ✅ Date range defaults
    // -----------------------
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    //  const now = new Date(); // current system date: 2025-12-04 13:23

// If user did not provide a dateFrom/dateTo, default to today
const rangeStart = dateFrom
  ? new Date(new Date(dateFrom).setHours(0, 0, 0, 0))
  : new Date(new Date().setHours(0, 0, 0, 0));

const rangeEnd = dateTo
  ? new Date(new Date(dateTo).setHours(23, 59, 59, 999))
  : new Date(new Date().setHours(23, 59, 59, 999));

    // -----------------------
    // ✅ Fetch order payment info
    // -----------------------
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "created_at",
        "shipping_address.country_code",
        "shipping_address.province",
        "payment_collections.payment_sessions.provider_id",
        "payment_collections.payments.provider_id",
      ],
    });

    if (!orders || orders.length === 0) {
      return res.json({
        total_orders: 0,
        payment_methods: [],
      });
    }

    // -----------------------
    // ✅ Apply Filters
    // -----------------------
    const filtered = orders.filter((order: any) => {
      // date filter
      if (!order.created_at) return false;

      const createdAt = new Date(order.created_at);
      if (createdAt < rangeStart || createdAt > rangeEnd) return false;

      // region filter
      if (region) {
        const country = order.shipping_address?.country_code;
        if (country !== region) return false;
      }

      // state filter
      if (state) {
        const province = order.shipping_address?.province;
        if (province !== state) return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      return res.json({
        total_orders: 0,
        payment_methods: [],
      });
    }

    // -----------------------
    // ✅ Count payment methods
    // -----------------------
    const methodCount: Record<string, number> = {};

    for (const order of filtered) {
      let method: string | null = null;

      order.payment_collections?.forEach((collection: any) => {
        // sessions → actual payment selection
        collection.payment_sessions?.forEach((session: any) => {
          if (session.provider_id) method = session.provider_id;
        });

        // fallback: payments → completed payment
        collection.payments?.forEach((payment: any) => {
          if (payment.provider_id) method = payment.provider_id;
        });
      });

      if (!method) method = "";

      methodCount[method] = (methodCount[method] || 0) + 1;
    }

   
// ✅ Rename payment methods
// -----------------------
const METHOD_LABELS: Record<string, string> = {
  pp_razorpay_razorpay: "Razorpay",
  pp_system_default: "COD",
 
};


function renameMethod(id: string) {
  return METHOD_LABELS[id] || id;
}

// -----------------------
// ✅ Convert to percentage
// -----------------------
const total = filtered.length;

const paymentMethods = Object.entries(methodCount).map(
  ([method, count]) => ({
    method: renameMethod(method),
    count,
    percentage: Number(((count / total) * 100).toFixed(2)),
  })
);


    return res.json({
      total_orders: total,
      payment_methods: paymentMethods,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      code: "internal_error",
      message:
        (error as Error)?.message ||
        "Failed to fetch payment method percentage",
    });
  }
}

export async function POST(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse
) {
  return GET(req, res);
}
