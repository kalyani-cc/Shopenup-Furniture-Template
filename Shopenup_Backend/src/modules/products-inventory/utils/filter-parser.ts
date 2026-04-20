import { AuthenticatedShopenupRequest } from '@shopenup/framework';

export interface FilterParams {
  dateFrom: string | null;
  dateTo: string | null;
  region: string | null;
  state: string | null;
  threshold?: number;
}

export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Parse filter parameters from request (supports both GET and POST)
 */
export function parseFilters(
  req: AuthenticatedShopenupRequest,
  options?: { defaultThreshold?: number }
): FilterParams {
  const url = new URL(req.url || '', 'http://localhost');
  const searchParams = url.searchParams;

  let dateFrom: string | null = null;
  let dateTo: string | null = null;
  let region: string | null = null;
  let state: string | null = null;
  let threshold: number | undefined = options?.defaultThreshold;

  if (req.method === 'GET') {
    dateFrom = searchParams.get('dateFrom');
    dateTo = searchParams.get('dateTo');
    region = searchParams.get('region');
    state = searchParams.get('state');
    const thresholdParam = searchParams.get('threshold');
    if (thresholdParam && threshold !== undefined) {
      threshold = parseInt(thresholdParam, 10) || threshold;
    }
  } else if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const dateFromRaw = body.dateFrom || body.dateRange?.from;
    const dateToRaw = body.dateTo || body.dateRange?.to;
    region = body.region || null;
    state = body.state || null;
    threshold = body.threshold || options?.defaultThreshold;

    // Convert Date objects to ISO strings
    dateFrom =
      dateFromRaw instanceof Date
        ? dateFromRaw.toISOString()
        : dateFromRaw || null;
    dateTo =
      dateToRaw instanceof Date ? dateToRaw.toISOString() : dateToRaw || null;
  }

  return {
    dateFrom,
    dateTo,
    region,
    state,
    ...(threshold !== undefined && { threshold }),
  };
}

/**
 * Get date range from filter params with optional defaults
 */
export function getDateRange(
  filters: FilterParams,
  defaultDays: number = 30
): DateRange {
  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setDate(defaultStart.getDate() - defaultDays);

  const from = filters.dateFrom ? new Date(filters.dateFrom) : defaultStart;
  const to = filters.dateTo ? new Date(filters.dateTo) : now;

  return { from, to };
}

/**
 * Filter fulfillments by date range, region, and state
 */
export function filterFulfillments(
  fulfillments: any[],
  filters: FilterParams,
  dateRange: DateRange
): any[] {
  let filtered = fulfillments.filter(
    (fulfillment: any) => fulfillment.delivered_at
  );

  // Apply date range filter
  if (filters.dateFrom || filters.dateTo) {
    const fromDate = dateRange.from;
    const toDate = dateRange.to;

    filtered = filtered.filter((fulfillment: any) => {
      const deliveredAt = fulfillment.delivered_at
        ? new Date(fulfillment.delivered_at)
        : null;
      if (!deliveredAt) return false;

      if (fromDate && deliveredAt < fromDate) return false;
      if (toDate) {
        // Include the entire day (up to 23:59:59.999)
        const toDateEndOfDay = new Date(toDate);
        toDateEndOfDay.setHours(23, 59, 59, 999);
        if (deliveredAt > toDateEndOfDay) return false;
      }
      return true;
    });
  }

  // Apply region (country) filter
  if (filters.region) {
    filtered = filtered.filter((fulfillment: any) => {
      const countryCode =
        fulfillment.order?.shipping_address?.country_code;
      return countryCode === filters.region;
    });
  }

  // Apply state/province filter
  if (filters.state) {
    filtered = filtered.filter((fulfillment: any) => {
      const province = fulfillment.order?.shipping_address?.province;
      return province === filters.state;
    });
  }

  return filtered;
}

