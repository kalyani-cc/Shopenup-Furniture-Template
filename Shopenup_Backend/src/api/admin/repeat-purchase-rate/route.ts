import { AuthenticatedShopenupRequest, ShopenupResponse } from "@shopenup/framework"

export async function GET(req: AuthenticatedShopenupRequest, res: ShopenupResponse) {
  try {
    const query = req.scope.resolve("query")

    // ---------- Parse query or body ----------
    const url = new URL(req.url || "", "http://localhost")
    const searchParams = url.searchParams

    let dateFrom: string | null = null
    let dateTo: string | null = null
    let previousDateFrom: string | null = null
    let previousDateTo: string | null = null
    let comparisonMode = false
    let region: string | null = null
    let state: string | null = null

    if (req.method === "GET") {
      dateFrom = searchParams.get("dateFrom")
      dateTo = searchParams.get("dateTo")
      previousDateFrom = searchParams.get("previousDateFrom")
      previousDateTo = searchParams.get("previousDateTo")
      comparisonMode = searchParams.get("comparisonMode") === "true"
      region = searchParams.get("region")
      state = searchParams.get("state")
    } else if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body
      dateFrom = body.dateFrom || body.dateRange?.from || null
      dateTo = body.dateTo || body.dateRange?.to || null
      previousDateFrom = body.previousDateFrom || body.previousDateRange?.from || null
      previousDateTo = body.previousDateTo || body.previousDateRange?.to || null
      comparisonMode = body.comparisonMode === true
      region = body.region || null
      state = body.state || null
    }

    // ---------- Fetch customers ----------
    const { data: customers } = await query.graph({
      entity: "customer",
      fields: [
        "id",
        "email",
        "created_at",
        "orders.id",
        "orders.created_at",
        "orders.shipping_address.country_code",
        "orders.shipping_address.province",
      ],
    })

    if (!customers || customers.length === 0) {
      return res.json({
        success: true,
        filters: { dateFrom, dateTo, region, state },
        data: comparisonMode
          ? {
              repeatPurchaseRate: { current: 0, previous: 0, growth: 0 },
              returningCustomers: { current: 0, previous: 0, growth: 0 },
              totalCustomers: { current: 0, previous: 0, growth: 0 },
            }
          : {
              repeatPurchaseRate: 0,
              returningCustomers: 0,
              totalCustomers: 0,
            },
      })
    }

    // ---------- Helper: filter customers by date and region/state ----------
    const filterCustomers = (
      from: string | null,
      to: string | null,
      region?: string | null,
      state?: string | null
    ) => {
      const fromDate = from ? new Date(from) : null
      const toDate = to ? new Date(to) : null

      const filtered = customers
        .map((c: any) => {
          const filteredOrders = (c.orders || []).filter((o: any) => {
            if (fromDate || toDate) {
              const orderDate = new Date(o.created_at)
              if (fromDate && orderDate < fromDate) return false
              if (toDate && orderDate > toDate) return false
            }
            if (region && o.shipping_address?.country_code !== region) return false
            if (state && o.shipping_address?.province !== state) return false
            return true
          })

          return filteredOrders.length > 0 ? { ...c, filteredOrders } : null
        })
        .filter(Boolean)

      let returning = 0
      let total = 0

      for (const c of filtered) {
        const orderCount = c.filteredOrders?.length || 0
        if (orderCount > 0) {
          total++
          if (orderCount > 1) returning++
        }
      }

      const rate = total > 0 ? (returning / total) * 100 : 0
      return { repeatPurchaseRate: rate, returningCustomers: returning, totalCustomers: total }
    }

    // ---------- Calculate for current ----------
    const current = filterCustomers(dateFrom, dateTo, region, state)

    // ---------- Comparison Mode ----------
    if (comparisonMode && previousDateFrom && previousDateTo) {
      const previous = filterCustomers(previousDateFrom, previousDateTo, region, state)

      const calcGrowth = (curr: number, prev: number) =>
        prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100

      return res.json({
        success: true,
        filters: {
          dateFrom,
          dateTo,
          previousDateFrom,
          previousDateTo,
          comparisonMode,
          region,
          state,
        },
        data: {
          repeatPurchaseRate: {
            current: Math.round(current.repeatPurchaseRate * 100) / 100,
            previous: Math.round(previous.repeatPurchaseRate * 100) / 100,
            growth: Math.round(calcGrowth(current.repeatPurchaseRate, previous.repeatPurchaseRate) * 10) / 10,
          },
          returningCustomers: {
            current: current.returningCustomers,
            previous: previous.returningCustomers,
            growth: Math.round(calcGrowth(current.returningCustomers, previous.returningCustomers) * 10) / 10,
          },
          totalCustomers: {
            current: current.totalCustomers,
            previous: previous.totalCustomers,
            growth: Math.round(calcGrowth(current.totalCustomers, previous.totalCustomers) * 10) / 10,
          },
        },
      })
    }

    // ---------- Normal Mode ----------
    return res.json({
      success: true,
      filters: { dateFrom, dateTo, region, state },
      data: {
        repeatPurchaseRate: Math.round(current.repeatPurchaseRate * 100) / 100,
        returningCustomers: current.returningCustomers,
        totalCustomers: current.totalCustomers,
      },
    })
  } catch (error) {
    console.error("Error in Repeat Purchase Rate API:", error)
    res.status(500).json({
      success: false,
      message: (error as Error)?.message || "Failed to calculate repeat purchase rate",
    })
  }
}

export async function POST(req: AuthenticatedShopenupRequest, res: ShopenupResponse) {
  return GET(req, res)
}
