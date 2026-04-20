import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from '@shopenup/framework';

export async function GET(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse,
) {
  try {
    const query = req.scope.resolve('query');

    // Parse query parameters
    const url = new URL(req.url || '', 'http://localhost');
    const searchParams = url.searchParams;

    let dateFrom: string | null = null;
    let dateTo: string | null = null;
    let region: string | null = null;
    let state: string | null = null;
    let comparisonMode = false;

    if (req.method === 'GET') {
      dateFrom = searchParams.get('dateFrom');
      dateTo = searchParams.get('dateTo');
      region = searchParams.get('region');
      state = searchParams.get('state');
      comparisonMode = searchParams.get('comparisonMode') === 'true';
    } else if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const dateFromRaw = body.dateFrom || body.dateRange?.from;
      const dateToRaw = body.dateTo || body.dateRange?.to;
      region = body.region || null;
      state = body.state || null;
      comparisonMode = !!body.comparisonMode;
      dateFrom = dateFromRaw instanceof Date ? dateFromRaw.toISOString() : (dateFromRaw || null);
      dateTo = dateToRaw instanceof Date ? dateToRaw.toISOString() : (dateToRaw || null);
    }

    // Default range: last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const rangeStart = dateFrom ? new Date(dateFrom) : thirtyDaysAgo;
    const rangeEnd = dateTo ? new Date(dateTo) : now;

    // Calculate previous period if comparisonMode is enabled
    let prevRangeStart: Date | null = null;
    let prevRangeEnd: Date | null = null;

    if (comparisonMode) {
      const diffDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
      prevRangeEnd = new Date(rangeStart);
      prevRangeEnd.setDate(prevRangeEnd.getDate() - 1);
      prevRangeStart = new Date(prevRangeEnd);
      prevRangeStart.setDate(prevRangeStart.getDate() - diffDays);
    }

    // Common function to calculate success rate for a given range
    const calculateMetrics = (orders: any[], start: Date, end: Date) => {
      const filtered = orders.filter((order: any) => {
        if (!order.created_at) return false;
        const orderDate = new Date(order.created_at);
        if (orderDate < start || orderDate > end) return false;
        if (region) {
          const countryCode = order.shipping_address?.country_code;
          if (countryCode !== region) return false;
        }
        if (state) {
          const province = order.shipping_address?.province;
          if (province !== state) return false;
        }
        return true;
      });

      let attempted = 0;
      let authorized = 0;

      for (const order of filtered) {
        const hasPaymentCollection =
          order.payment_collections &&
          Array.isArray(order.payment_collections) &&
          order.payment_collections.length > 0;
        if (!hasPaymentCollection) continue;

        attempted++;

        let isAuthorized = false;
        const paymentStatus = order.payment_status;
        if (
          ['authorized', 'partially_authorized', 'captured', 'partially_captured'].includes(paymentStatus)
        ) {
          isAuthorized = true;
        }

        for (const collection of order.payment_collections) {
          if (
            collection.status === 'authorized' ||
            collection.status === 'partially_authorized' ||
            (collection.authorized_amount && collection.authorized_amount > 0)
          ) {
            isAuthorized = true;
          }

          if (collection.payment_sessions) {
            for (const session of collection.payment_sessions) {
              if (
                session.status === 'authorized' ||
                session.status === 'captured' ||
                session.authorized_at
              ) {
                isAuthorized = true;
              }
            }
          }

          if (collection.payments) {
            for (const p of collection.payments) {
              if ((p.authorized_amount && p.authorized_amount > 0) || (p.captured_amount && p.captured_amount > 0)) {
                isAuthorized = true;
              }
            }
          }
        }

        if (isAuthorized) authorized++;
      }

      const successRate = attempted > 0 ? (authorized / attempted) * 100 : 0;
      return {
        attempted,
        authorized,
        success_rate: Number(successRate.toFixed(2)),
      };
    };

    // Fetch all orders (one query)
    const { data: orders } = await query.graph({
      entity: 'order',
      fields: [
        'id',
        'created_at',
        'payment_status',
        'payment_collections.*',
        'payment_collections.id',
        'payment_collections.status',
        'payment_collections.amount',
        'payment_collections.authorized_amount',
        'payment_collections.payment_sessions.*',
        'payment_collections.payment_sessions.id',
        'payment_collections.payment_sessions.status',
        'payment_collections.payment_sessions.authorized_at',
        'payment_collections.payments.*',
        'payment_collections.payments.id',
        'payment_collections.payments.authorized_amount',
        'payment_collections.payments.captured_amount',
        'shipping_address.*',
        'shipping_address.country_code',
        'shipping_address.province',
      ],
    });

    if (!orders || orders.length === 0) {
      res.json({
        success_rate: 0,
        authorized: 0,
        attempted: 0,
        percentage: 0,
        comparison: null,
      });
      return;
    }

    // Calculate for current range
    const currentMetrics = calculateMetrics(orders, rangeStart, rangeEnd);

    let responseData: any = {
      ...currentMetrics,
      percentage: currentMetrics.success_rate,
    };

    // If comparison mode, calculate previous period metrics
    if (comparisonMode && prevRangeStart && prevRangeEnd) {
      const prevMetrics = calculateMetrics(orders, prevRangeStart, prevRangeEnd);

      const calcChange = (current: number, prev: number) => {
        if (prev === 0) return current > 0 ? 100 : 0;
        return ((current - prev) / prev) * 100;
      };

      responseData = {
        ...responseData,
        comparison: {
          previous_period: {
            ...prevMetrics,
          },
          changes: {
            success_rate_change: Number(calcChange(currentMetrics.success_rate, prevMetrics.success_rate).toFixed(2)),
            authorized_change: Number(calcChange(currentMetrics.authorized, prevMetrics.authorized).toFixed(2)),
            attempted_change: Number(calcChange(currentMetrics.attempted, prevMetrics.attempted).toFixed(2)),
          },
        },
      };
    }

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching payment success rate:', error);
    res.status(500).json({
      code: 'internal_error',
      message: (error as Error)?.message || 'Failed to fetch payment success rate',
    });
  }
}

// Reuse for POST as well
export async function POST(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse,
) {
  return GET(req, res);
}
