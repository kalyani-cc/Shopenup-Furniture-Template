import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from "@shopenup/framework";

interface Refund {
  refundId: string;
  refundAmount: number;
  refundTimeMs: number;
  refundDate: string; // YYYY-MM-DD
}

export async function GET(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse
) {
  try {
    const query = req.scope.resolve("query");

    // -----------------------------
    // Parse query params
    // -----------------------------
    const { dateRange, previousDateRange, comparisonMode, region, state } =
      req.query as any;

    // DATE DEFAULTS
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const currentFrom = dateRange?.from
      ? new Date(dateRange.from)
      : thirtyDaysAgo;

    const currentTo = dateRange?.to ? new Date(dateRange.to) : now;

    // 🟢 ALWAYS VALID PREVIOUS RANGE
    const prevFrom = previousDateRange?.from
      ? new Date(previousDateRange.from)
      : new Date(0); // fallback: start of time

    const prevTo = previousDateRange?.to
      ? new Date(previousDateRange.to)
      : now; // fallback: now

    // -----------------------------
    // Helper: Fetch refunds within a range
    // -----------------------------
    const getRefundsInRange = async (from: Date, to: Date) => {
      const { data: orders } = await query.graph({
        entity: "order",
        fields: [
          "id",
          "shipping_address.country_code",
          "shipping_address.province",

          "payment_collections.payments.id",
          "payment_collections.payments.amount",
          "payment_collections.payments.captured_at",

          "payment_collections.payments.refunds.id",
          "payment_collections.payments.refunds.amount",
          "payment_collections.payments.refunds.created_at",
        ],
      });

      if (!orders?.length) return [];

      const refunds: Refund[] = [];

      for (const order of orders) {
        // region filters
        const country = order.shipping_address?.country_code;
        const province = order.shipping_address?.province;

        if (region && country !== region) continue;
        if (state && province !== state) continue;

        order.payment_collections?.forEach((col: any) => {
          col.payments?.forEach((payment: any) => {
            const capturedAt = payment.captured_at
              ? new Date(payment.captured_at)
              : null;

            payment.refunds?.forEach((refund: any) => {
              const refundAt = refund.created_at
                ? new Date(refund.created_at)
                : null;

              if (!refundAt) return;

              // date filtering
              if (refundAt < from || refundAt > to) return;

              // REFUND TIME = refundAt - capturedAt
              let refundTimeMs = 0;
              if (capturedAt && refundAt && refundAt >= capturedAt) {
                refundTimeMs = refundAt.getTime() - capturedAt.getTime();
              }

              refunds.push({
                refundId: refund.id,
                refundAmount: refund.amount || 0,
                refundTimeMs,
                refundDate: refundAt.toISOString().split("T")[0],
              });
            });
          });
        });
      }

      return refunds;
    };

    // -----------------------------
    // Fetch current refunds
    // -----------------------------
    const currentRefunds = await getRefundsInRange(currentFrom, currentTo);

    // -----------------------------
    // Metrics calculation
    // -----------------------------
    const calcMetrics = (refunds: Refund[]) => {
      const count = refunds.length;
      const total = refunds.reduce((s, r) => s + r.refundAmount, 0);

      const avgTime =
        count === 0
          ? 0
          : Number(
              (
                refunds.reduce((s, r) => s + r.refundTimeMs, 0) /
                count /
                (1000 * 60 * 60)
              ).toFixed(2)
            );

      return { count, total, avgTime };
    };

    const currentMetrics = calcMetrics(currentRefunds);

    // -----------------------------
    // Timeline
    // -----------------------------
    const timelineMap: Record<string, { count: number; amount: number }> = {};

    currentRefunds.forEach((r) => {
      if (!timelineMap[r.refundDate]) {
        timelineMap[r.refundDate] = { count: 0, amount: 0 };
      }
      timelineMap[r.refundDate].count += 1;
      timelineMap[r.refundDate].amount += r.refundAmount;
    });

    const currentTimeline = Object.entries(timelineMap).map(
      ([date, obj]) => ({
        date,
        count: obj.count,
        amount: obj.amount,
      })
    );

    // -----------------------------
    // Comparison mode (ALWAYS RETURN PREVIOUS DATA)
    // -----------------------------
    if (comparisonMode === "true" && previousDateRange) {
      const prevRefunds = await getRefundsInRange(prevFrom, prevTo);
      const prevMetrics = calcMetrics(prevRefunds);

      const ratio = (curr: number, prev: number) =>
        prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

      return res.json({
        comparisonMode: true,
        summary: {
          refunds: {
            current: currentMetrics.count,
            previous: prevMetrics.count, // ⬅ ALWAYS RETURN 0 if empty
            growth: Number(
              ratio(currentMetrics.count, prevMetrics.count).toFixed(1)
            ),
          },
          refunded_amount: {
            current: currentMetrics.total,
            previous: prevMetrics.total,
            growth: Number(
              ratio(currentMetrics.total, prevMetrics.total).toFixed(1)
            ),
          },
          avg_refund_time_hours: {
            current: currentMetrics.avgTime,
            previous: prevMetrics.avgTime,
            growth: Number(
              ratio(currentMetrics.avgTime, prevMetrics.avgTime).toFixed(1)
            ),
          },
        },
        timeline: currentTimeline,
      });
    }

    // -----------------------------
    // Standard non-comparison response
    // -----------------------------
    return res.json({
      count: currentMetrics.count,
      total_refunded_amount: Number(currentMetrics.total.toFixed(2)),
      avg_refund_time_hours: currentMetrics.avgTime,
      timeline: currentTimeline,
    });
  } catch (err) {
    console.error("Refund Volume Error:", err);
    return res.status(500).json({
      code: "internal_error",
      message: "Failed to fetch refund volume",
    });
  }
}

export async function POST(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse
) {
  return GET(req, res);
}
