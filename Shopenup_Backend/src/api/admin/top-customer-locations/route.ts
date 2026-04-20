import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from '@shopenup/framework';
export async function GET(req: AuthenticatedShopenupRequest, res: ShopenupResponse) {
  try {
    const query = req.scope.resolve('query');
    // Parse filters from query or body
    const url = new URL(req.url || '', 'http://localhost');
    const searchParams = url.searchParams;
    let dateFrom: string | null = null;
    let dateTo: string | null = null;
    let region: string | null = null;
    let state: string | null = null;
    if (req.method === 'GET') {
      dateFrom = searchParams.get('dateFrom');
      dateTo = searchParams.get('dateTo');
      region = searchParams.get('region');
      state = searchParams.get('state');
    } else if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const dateFromRaw = body.dateFrom || body.dateRange?.from;
      const dateToRaw = body.dateTo || body.dateRange?.to;
      region = body.region || null;
      state = body.state || null;
      dateFrom = dateFromRaw instanceof Date ? dateFromRaw.toISOString() : (dateFromRaw || null);
      dateTo = dateToRaw instanceof Date ? dateToRaw.toISOString() : (dateToRaw || null);
    }
    // Fetch orders with shipping address information
    const { data: orders } = await query.graph({
      entity: 'order',
      fields: [
        'id',
        'created_at',
        'shipping_address.country_code',
        'shipping_address.province',
        'shipping_address.city',
      ],
    });
    if (!orders || orders.length === 0) {
      return res.json({
        success: true,
        filters: { dateFrom, dateTo, region, state },
        data: {
          topLocations: [],
          totalOrders: 0,
        },
      });
    }
    // Apply filters
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    const filteredOrders = orders.filter((o: any) => {
      // Check date range
      if (from || to) {
        const orderDate = new Date(o.created_at);
        if (from && orderDate < from) return false;
        if (to && orderDate > to) return false;
      }
      // Check region
      if (region && o.shipping_address?.country_code !== region) {
        return false;
      }
      // Check state
      if (state && o.shipping_address?.province !== state) {
        return false;
      }
      // Only include orders with valid state/province
      if (!o.shipping_address?.province) {
        return false;
      }
      return true;
    });
    if (filteredOrders.length === 0) {
      return res.json({
        success: true,
        filters: { dateFrom, dateTo, region, state },
        data: {
          topLocations: [],
          totalOrders: 0,
        },
      });
    }
    // Aggregate orders by state
    const stateMap = new Map<string, {
      state: string;
      countryCode: string;
      orderCount: number;
      cities: Map<string, number>; // city -> order count
    }>();
    for (const order of filteredOrders) {
      const province = order.shipping_address?.province || 'Unknown';
      const countryCode = order.shipping_address?.country_code || 'Unknown';
      const city = order.shipping_address?.city || 'Unknown';
      if (!stateMap.has(province)) {
        stateMap.set(province, {
          state: province,
          countryCode,
          orderCount: 0,
          cities: new Map(),
        });
      }
      const stateData = stateMap.get(province)!;
      stateData.orderCount++;
      // Track city distribution within state
      if (!stateData.cities.has(city)) {
        stateData.cities.set(city, 0);
      }
      stateData.cities.set(city, stateData.cities.get(city)! + 1);
    }
    // Convert to array and sort by order count (descending)
    const locationsArray = Array.from(stateMap.values())
      .map((stateData) => ({
        state: stateData.state,
        countryCode: stateData.countryCode,
        orderCount: stateData.orderCount,
        cities: Array.from(stateData.cities.entries())
          .map(([city, count]) => ({ city, orderCount: count }))
          .sort((a, b) => b.orderCount - a.orderCount), // Sort cities by order count
      }))
      .sort((a, b) => b.orderCount - a.orderCount); // Sort states by order count
    // Get top 10 states
    const topLocations = locationsArray.slice(0, 10);
    const totalOrders = filteredOrders.length;
    return res.json({
      success: true,
      filters: { dateFrom, dateTo, region, state },
      data: {
        topLocations,
        totalOrders,
      },
    });
  } catch (error) {
    console.error('Error in Top Customer Locations API:', error);
    res.status(500).json({
      success: false,
      message:
        (error as Error)?.message || 'Failed to fetch top customer locations',
    });
  }
}
// POST version supports filters in body (for dashboard global filter sync)
export async function POST(req: AuthenticatedShopenupRequest, res: ShopenupResponse) {
  return GET(req, res);
}