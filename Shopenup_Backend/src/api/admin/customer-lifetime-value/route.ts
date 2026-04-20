import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from '@shopenup/framework'

export async function GET(req: AuthenticatedShopenupRequest, res: ShopenupResponse) {
  try {
    const query = req.scope.resolve('query')
    const url = new URL(req.url || '', 'http://localhost')
    const searchParams = url.searchParams

    let dateFrom: string | null = null
    let dateTo: string | null = null
    let region: string | null = null
    let state: string | null = null
    let comparisonMode = false

    // 🟢 Handle GET or POST payloads
    if (req.method === 'GET') {
      dateFrom = searchParams.get('dateFrom')
      dateTo = searchParams.get('dateTo')
      region = searchParams.get('region')
      state = searchParams.get('state')
      comparisonMode = searchParams.get('comparisonMode') === 'true'
    } else if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const dateFromRaw = body.dateFrom || body.dateRange?.from
      const dateToRaw = body.dateTo || body.dateRange?.to
      region = body.region || null
      state = body.state || null
      comparisonMode = !!body.comparisonMode
      dateFrom = dateFromRaw ? new Date(dateFromRaw).toISOString() : null
      dateTo = dateToRaw ? new Date(dateToRaw).toISOString() : null
    }

    // 🧾 Fetch orders
    const { data: orders } = await query.graph({
      entity: 'order',
      fields: [
        'id',
        'customer_id',
        'total',
        'created_at',
        'shipping_address.country_code',
        'shipping_address.province',
      ],
    })

    if (!orders || orders.length === 0) {
      return res.json({
        success: true,
        filters: { dateFrom, dateTo, region, state, comparisonMode },
        data: {
          totalRevenue: 0,
          totalCustomers: 0,
          averageCLV: 0,
          previousCLV: 0,
          growth: 0,
        },
      })
    }

    // 🗓️ Current range filtering
    const from = dateFrom ? new Date(dateFrom) : null
    const to = dateTo ? new Date(dateTo) : null

    const filteredOrders = orders.filter((o: any) => {
      const orderDate = new Date(o.created_at)
      if (from && orderDate < from) return false
      if (to && orderDate > to) return false
      if (region && o.shipping_address?.country_code !== region) return false
      if (state && o.shipping_address?.province !== state) return false
      return true
    })

    const revenueByCustomer = new Map<string, number>()
    for (const order of filteredOrders) {
      const cid = order.customer_id
      const current = revenueByCustomer.get(cid) || 0
      revenueByCustomer.set(cid, current + order.total)
    }

    const totalRevenue = Array.from(revenueByCustomer.values()).reduce((a, b) => a + b, 0)
    const totalCustomers = revenueByCustomer.size
    const averageCLV = totalCustomers > 0 ? totalRevenue / totalCustomers : 0

    // 🧮 Comparison Mode logic
    let previousCLV = 0
    let growth = 0

    if (comparisonMode && dateFrom && dateTo) {
      const currentFrom = new Date(dateFrom)
      const currentTo = new Date(dateTo)
      const duration = currentTo.getTime() - currentFrom.getTime()

      const prevFrom = new Date(currentFrom.getTime() - duration)
      const prevTo = new Date(currentFrom.getTime() - 1)

      const prevOrders = orders.filter((o: any) => {
        const orderDate = new Date(o.created_at)
        return orderDate >= prevFrom && orderDate <= prevTo
      })

      const prevRevenueByCustomer = new Map<string, number>()
      for (const order of prevOrders) {
        const cid = order.customer_id
        const current = prevRevenueByCustomer.get(cid) || 0
        prevRevenueByCustomer.set(cid, current + order.total)
      }

      const prevTotalRevenue = Array.from(prevRevenueByCustomer.values()).reduce((a, b) => a + b, 0)
      const prevTotalCustomers = prevRevenueByCustomer.size
      previousCLV = prevTotalCustomers > 0 ? prevTotalRevenue / prevTotalCustomers : 0

      growth =
        previousCLV > 0 ? ((averageCLV - previousCLV) / previousCLV) * 100 : 0
    }

    return res.json({
      success: true,
      filters: { dateFrom, dateTo, region, state, comparisonMode },
      data: {
        totalRevenue: Number(totalRevenue),
        totalCustomers: Number(totalCustomers),
        averageCLV: Number(averageCLV),
        previousCLV: Number(previousCLV),
        growth: Number(growth),
      },
    })
  } catch (error) {
    console.error('Error in Customer Lifetime Value API:', error)
    res.status(500).json({
      success: false,
      message: (error as Error)?.message || 'Failed to fetch CLV',
    })
  }
}

export async function POST(req: AuthenticatedShopenupRequest, res: ShopenupResponse) {
  return GET(req, res)
}
