import { ShopenupRequest, ShopenupResponse } from "@shopenup/framework";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);

// Parse date range ensuring full day coverage (start of day to end of day)
const parseDateRange = (from?: string, to?: string) => {
  const fromDate = from ? dayjs(from).startOf("day") : dayjs().startOf("day");
  const toDate = to ? dayjs(to).endOf("day") : dayjs().endOf("day");
  return { from: fromDate, to: toDate };
};

// Calculate previous date range based on current range (same duration, previous period)
const calculatePreviousDateRange = (currentFrom: dayjs.Dayjs, currentTo: dayjs.Dayjs) => {
  // Calculate the duration of the current range (inclusive, so add 1)
  const duration = currentTo.diff(currentFrom, "day") + 1;
  
  // Previous range ends at the end of the day before currentFrom
  const prevTo = currentFrom.subtract(1, "day").endOf("day");
  
  // Previous range starts at the start of the day, same duration back from prevTo
  const prevFrom = prevTo.subtract(duration - 1, "day").startOf("day");
  
  return { from: prevFrom, to: prevTo };
};

const toNumberAmount = (val: any) => {
  if (!val && val !== 0) return 0;
  if (typeof val === "object" && val.numeric_ !== undefined) return Number(val.numeric_);
  return Number(val || 0);
};

export const GET = async (req: ShopenupRequest, res: ShopenupResponse) => {
  try {
    const query = req.scope.resolve("query");
  const { dateRange, previousDateRange, comparisonMode, region, state, grouping: selectedGrouping } = req.query as any;

  // Parse current date range with full day coverage
  const currentRange = parseDateRange(dateRange?.from, dateRange?.to);
  const currentFrom = currentRange.from;
  const currentTo = currentRange.to;

  // Parse or calculate previous date range
  let prevFrom: dayjs.Dayjs;
  let prevTo: dayjs.Dayjs;
  
  if (comparisonMode === "true" && previousDateRange?.from && previousDateRange?.to) {
    // Use provided previous date range with full day coverage
    const prevRange = parseDateRange(previousDateRange.from, previousDateRange.to);
    prevFrom = prevRange.from;
    prevTo = prevRange.to;
  } else if (comparisonMode === "true") {
    // Auto-calculate previous date range based on current range
    const calculatedPrev = calculatePreviousDateRange(currentFrom, currentTo);
    prevFrom = calculatedPrev.from;
    prevTo = calculatedPrev.to;
  } else {
    // Not in comparison mode, set defaults (won't be used)
    prevFrom = dayjs().startOf("day");
    prevTo = dayjs().endOf("day");
  }

  // ---------- Determine chart grouping based on selected grouping ----------
  const determineChartGrouping = (selectedGrouping?: string): "hour" | "day" | "week" | "month" | "quarter" | "year" => {
    // If grouping is provided, determine chart grouping based on it
    if (selectedGrouping) {
      switch (selectedGrouping.toLowerCase()) {
        case "year":
          return "quarter"; // Year → show by Quarter
        case "quarter":
          return "month"; // Quarter → show by Month
        case "month":
          return "week"; // Month → show by Week
        case "week":
          return "day"; // Week → show by Day
        case "day":
          return "hour"; // Day → show by Hour
        case "custom":
          return "day"; // Custom → show each day in the selected date range
        default:
          return selectedGrouping as any;
      }
    }

    // Fallback: auto-detect based on date range
    const daysDiff = currentTo.diff(currentFrom, "day");
    if (currentFrom.isSame(currentTo, "day")) return "hour";
    if (currentFrom.isSame(currentTo, "week") && daysDiff <= 7) return "day";
    if (currentFrom.isSame(currentTo, "month") && daysDiff <= 31) return "day";
    if (currentFrom.isSame(currentTo, "quarter") && daysDiff <= 90) return "week";
    if (currentFrom.isSame(currentTo, "year")) return "month";
    if (daysDiff <= 31) return "day";
    if (daysDiff <= 90) return "week";
    if (daysDiff <= 365) return "month";
    if (daysDiff <= 730) return "quarter";
    return "year";
  };

  const chartGrouping: "hour" | "day" | "week" | "month" | "quarter" | "year" = determineChartGrouping(selectedGrouping);

  // Shared order fields to avoid duplication
  const orderFields = [
    "id",
    "status",
    "fulfillments.shipped_at",
    "fulfillments.delivered_at",
    "fulfillments.canceled_at",
    "payment_collections.status",
    "total",
    "created_at",
    "customer_id",
    "shipping_address.province",
    "shipping_address.country_code",
    "items.*",
    "items.variant.product.categories.id",
    "items.variant.product.categories.name",
  ];

  // Helper to filter orders by region/state
  const filterByRegionState = (orders: any[]) => {
    if (!region && !state) return orders;
    return orders.filter((o: any) => {
      const addr = o.shipping_address || {};
      const regionMatch = region ? addr.country_code === region : true;
      const stateMatch = state ? addr.province === state : true;
      return regionMatch && stateMatch;
    });
  };

  // ---------- Fetch Orders by Status Transition Dates ----------
  // Fetch orders independently based on when status transitions occurred
  const fetchOrdersByStatus = async (from: dayjs.Dayjs, to: dayjs.Dayjs) => {
    const fromISO = from.toISOString();
    const toISO = to.toISOString();

    // Fetch all data in parallel: orders created + fulfillments with status transitions
    const [createdOrdersResult, shippedFulfillmentsResult, deliveredFulfillmentsResult, canceledFulfillmentsResult] = await Promise.all([
      query.graph({
        entity: "order",
        fields: orderFields,
        filters: { created_at: { $gte: fromISO, $lte: toISO } },
      }),
      query.graph({
        entity: "fulfillment",
        fields: [
          "order_id",
          "shipped_at",
          "order.id",
          "order.status",
          "order.fulfillments.shipped_at",
          "order.fulfillments.delivered_at",
          "order.fulfillments.canceled_at",
          "order.payment_collections.status",
          "order.total",
          "order.created_at",
          "order.customer_id",
          "order.shipping_address.province",
          "order.shipping_address.country_code",
          "order.items.*",
          "order.items.variant.product.categories.id",
          "order.items.variant.product.categories.name",
        ],
        filters: { shipped_at: { $gte: fromISO, $lte: toISO } },
      }),
      query.graph({
        entity: "fulfillment",
        fields: [
          "order_id",
          "delivered_at",
          "order.id",
          "order.status",
          "order.fulfillments.shipped_at",
          "order.fulfillments.delivered_at",
          "order.fulfillments.canceled_at",
          "order.payment_collections.status",
          "order.total",
          "order.created_at",
          "order.customer_id",
          "order.shipping_address.province",
          "order.shipping_address.country_code",
          "order.items.*",
          "order.items.variant.product.categories.id",
          "order.items.variant.product.categories.name",
        ],
        filters: { delivered_at: { $gte: fromISO, $lte: toISO } },
      }),
      query.graph({
        entity: "fulfillment",
        fields: [
          "order_id",
          "canceled_at",
          "order.id",
          "order.status",
          "order.fulfillments.shipped_at",
          "order.fulfillments.delivered_at",
          "order.fulfillments.canceled_at",
          "order.payment_collections.status",
          "order.total",
          "order.created_at",
          "order.customer_id",
          "order.shipping_address.province",
          "order.shipping_address.country_code",
          "order.items.*",
          "order.items.variant.product.categories.id",
          "order.items.variant.product.categories.name",
        ],
        filters: { canceled_at: { $gte: fromISO, $lte: toISO } },
      }),
    ]);

    const createdOrders = createdOrdersResult.data || [];
    const shippedFulfillments = shippedFulfillmentsResult.data || [];
    const deliveredFulfillments = deliveredFulfillmentsResult.data || [];
    const canceledFulfillments = canceledFulfillmentsResult.data || [];


    // Collect unique order IDs
    const orderIds = new Set<string>();
    createdOrders.forEach((o: any) => o.id && orderIds.add(o.id));
    // Note: fulfillments have order nested as f.order.id, not f.order_id
    shippedFulfillments.forEach((f: any) => f.order?.id && orderIds.add(f.order.id));
    deliveredFulfillments.forEach((f: any) => f.order?.id && orderIds.add(f.order.id));
    canceledFulfillments.forEach((f: any) => f.order?.id && orderIds.add(f.order.id));

    if (orderIds.size === 0) {
      return [];
    }

    // Merge orders: prefer created orders (already have full data), then from fulfillments
    const ordersMap = new Map<string, any>();
    createdOrders.forEach((o: any) => o.id && ordersMap.set(o.id, o));
    
    // Track fulfillment data to merge into orders
    const fulfillmentDataMap = new Map<string, Array<{ shipped_at?: string; delivered_at?: string; canceled_at?: string; id: string }>>();
    
    // Collect fulfillment data from all fulfillment sources
    [shippedFulfillments, deliveredFulfillments, canceledFulfillments].forEach((fulfillments, index) => {
      const type = ['shipped', 'delivered', 'canceled'][index];
      fulfillments.forEach((f: any) => {
        if (f.order?.id) {
          const orderId = f.order.id;
          
          // Add order to map if not already present
          if (!ordersMap.has(orderId)) {
            ordersMap.set(orderId, f.order);
          } else {
          }
          
          // Track fulfillment data with timestamps
          if (!fulfillmentDataMap.has(orderId)) {
            fulfillmentDataMap.set(orderId, []);
          }
          
          const fulfillmentData = fulfillmentDataMap.get(orderId)!;
          
          // Find or create fulfillment entry
          let fulfillmentEntry = fulfillmentData.find(entry => entry.id === f.id);
          if (!fulfillmentEntry) {
            fulfillmentEntry = { id: f.id };
            fulfillmentData.push(fulfillmentEntry);
          }
          
          // Update with timestamps from the fetched fulfillment
          if (f.shipped_at) {
            fulfillmentEntry.shipped_at = f.shipped_at;
          }
          if (f.delivered_at) {
            fulfillmentEntry.delivered_at = f.delivered_at;
          }
          if (f.canceled_at) {
            fulfillmentEntry.canceled_at = f.canceled_at;
          }
        } else {
        }
      });
    });
    
    
    // Merge fulfillment data into orders' fulfillments arrays
    fulfillmentDataMap.forEach((fulfillmentData, orderId) => {
      const order = ordersMap.get(orderId);
      if (!order) return;
      
      if (!order.fulfillments) {
        order.fulfillments = [];
      }
      
      // Update existing fulfillments or add new ones
      fulfillmentData.forEach((fd) => {
        let fulfillment = order.fulfillments.find((f: any) => f.id === fd.id);
        if (!fulfillment) {
          fulfillment = { id: fd.id };
          order.fulfillments.push(fulfillment);
        }
        
        // Update timestamps from our tracked data
        if (fd.shipped_at) fulfillment.shipped_at = fd.shipped_at;
        if (fd.delivered_at) fulfillment.delivered_at = fd.delivered_at;
        if (fd.canceled_at) fulfillment.canceled_at = fd.canceled_at;
      });
      
    });

    // If we have order IDs not in map, fetch them (shouldn't happen but safety check)
    const missingIds = Array.from(orderIds).filter(id => !ordersMap.has(id));
    if (missingIds.length > 0) {
      const { data: missingOrders } = await query.graph({
        entity: "order",
        fields: orderFields,
        filters: { id: { $in: missingIds } },
      });
      (missingOrders || []).forEach((o: any) => {
        if (o.id) {
          ordersMap.set(o.id, o);
          // Also merge fulfillment data if we have it for this order
          const fulfillmentData = fulfillmentDataMap.get(o.id);
          if (fulfillmentData) {
            if (!o.fulfillments) o.fulfillments = [];
            fulfillmentData.forEach((fd) => {
              let fulfillment = o.fulfillments.find((f: any) => f.id === fd.id);
              if (!fulfillment) {
                fulfillment = { id: fd.id };
                o.fulfillments.push(fulfillment);
              }
              if (fd.shipped_at) fulfillment.shipped_at = fd.shipped_at;
              if (fd.delivered_at) fulfillment.delivered_at = fd.delivered_at;
              if (fd.canceled_at) fulfillment.canceled_at = fd.canceled_at;
            });
          }
        }
      });
    }

    const ordersBeforeFilter = Array.from(ordersMap.values());
    if (ordersBeforeFilter.length > 0) {
      const firstOrder = ordersBeforeFilter[0];
    }
    
    const finalOrders = filterByRegionState(ordersBeforeFilter);
    return finalOrders;
  };

  // Fetch orders created in date range (for sales/AOV/categories/customers/chart)
  const fetchOrders = async (from: dayjs.Dayjs, to: dayjs.Dayjs) => {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: orderFields,
      filters: {
        created_at: { $gte: from.toISOString(), $lte: to.toISOString() },
      },
    });

    if (!orders?.length) return [];
    return filterByRegionState(orders);
  };

  // ---------- Fetch Returns ----------
  const fetchReturns = async (from: dayjs.Dayjs, to: dayjs.Dayjs) => {
    const filters: Record<string, any> = {
      created_at: { $gte: from.toISOString(), $lte: to.toISOString() },
    };

    const { data: returns } = await query.graph({
      entity: "return",
      fields: ["id", "order.shipping_address.province", "order.shipping_address.country_code"],
      filters,
    });

    if (!returns?.length) return 0;
    return returns.filter((r: any) => {
      const addr = r.order?.shipping_address || {};
      const regionMatch = region ? addr.country_code === region : true;
      const stateMatch = state ? addr.province === state : true;
      return regionMatch && stateMatch;
    }).length;
  };

  // Helper to check if date is in range (inclusive)
  const isInRange = (date: dayjs.Dayjs, from: dayjs.Dayjs, to: dayjs.Dayjs) => {
    return (date.isSame(from) || date.isAfter(from)) && (date.isSame(to) || date.isBefore(to));
  };

  // ---------- Status Counts ----------
  // Count orders based on when status transitions occurred within the date range
  const getStatusCounts = (orders: any[], from: dayjs.Dayjs, to: dayjs.Dayjs) => {
    
    const stats = {
      total_orders_placed: 0,
      total_pending: 0,
      total_shipping: 0,
      total_delivered: 0,
      total_returned: 0,
      total_canceled: 0,
    };

    for (const o of orders) {
      const orderCreatedAt = dayjs(o.created_at);
      const isCreatedInRange = isInRange(orderCreatedAt, from, to);

      // Count orders placed in this range
      if (isCreatedInRange) {
        stats.total_orders_placed++;
      }

      // Check fulfillments for status transitions in the date range
      const fulfillments = o.fulfillments || [];
      let hasShippedInRange = false;
      let hasDeliveredInRange = false;
      let hasCanceledInRange = false;
      
      // Check each fulfillment for status transitions in the date range
      for (const f of fulfillments) {
        // Skip canceled fulfillments when checking other statuses
        if (f.canceled_at) {
          const canceledAt = dayjs(f.canceled_at);
          if (isInRange(canceledAt, from, to)) {
            hasCanceledInRange = true;
            break; // If canceled in range, this is the status
          }
          continue; // Skip canceled fulfillments for other checks
        }

        // Check shipped_at
        if (f.shipped_at && !hasShippedInRange) {
          const shippedAt = dayjs(f.shipped_at);
          const inRange = isInRange(shippedAt, from, to);
          if (inRange) {
            hasShippedInRange = true;
          }
        }

        // Check delivered_at
        if (f.delivered_at && !hasDeliveredInRange) {
          const deliveredAt = dayjs(f.delivered_at);
          if (isInRange(deliveredAt, from, to)) {
            hasDeliveredInRange = true;
          }
        }
      }

      // Count status transitions that occurred in this range
      // Priority: canceled > delivered > shipped > pending
      // Each order should be counted in exactly one status category
      if (hasCanceledInRange) {
        stats.total_canceled++;
      } else if (hasDeliveredInRange) {
        stats.total_delivered++;
      } else if (hasShippedInRange) {
        stats.total_shipping++;
      } else if (isCreatedInRange && !["completed", "returned", "canceled"].includes(o.status)) {
        // Only count as pending if created in range and not in a terminal state
        stats.total_pending++;
      } else {
      }
      // Note: If order was not created in range and has no status transitions in range,
      // it's not counted (this shouldn't happen as we filter orders by status transitions)
    }
    

    return stats;
  };

  // ---------- Sales & AOV Calculation ----------
  // Calculate sales and AOV based ONLY on orders placed (created) in the date range
  const getSalesStats = (orders: any[]) => {
    return orders.reduce(
      (stats, o) => {
        const hasCompletedPayment =
          !["canceled", "returned"].includes(o.status) &&
          Array.isArray(o.payment_collections) &&
          o.payment_collections.some((pc: any) => pc.status === "completed");

        if (hasCompletedPayment) {
          const totalAmount = toNumberAmount(o.total);
          if (totalAmount > 0) {
            stats.total_net_sales += totalAmount;
            stats.total_AOV++;
          }
        }
        return stats;
      },
      {
        total_net_sales: 0,
        total_AOV: 0,
      }
    );
  };

  const calculateAOV = (stats: ReturnType<typeof getSalesStats>) =>
    stats.total_AOV === 0 ? 0 : stats.total_net_sales / stats.total_AOV;

  // ---------- Customer Stats ----------
  const getCustomerStats = async (orders: any[], periodStart: dayjs.Dayjs) => {
    if (!orders?.length) return { total_customers: 0, new_customers: 0 };

    const customerIds = [...new Set(orders.map((o: any) => o.customer_id).filter(Boolean))];
    if (customerIds.length === 0) return { total_customers: 0, new_customers: 0 };

    const { data: previousOrders } = await query.graph({
      entity: "order",
      fields: ["id", "customer_id"],
      filters: {
        customer_id: { $in: customerIds },
        created_at: { $lt: periodStart.toISOString() },
      },
    });

    const existingCustomerIds = new Set((previousOrders || []).map((o: any) => o.customer_id).filter(Boolean));
    const newCustomers = customerIds.filter((id) => !existingCustomerIds.has(id)).length;

    return { total_customers: customerIds.length, new_customers: newCustomers };
  };

  // ---------- Group Orders ----------
  const groupOrdersByPeriod = (
    orders: any[],
    groupingType: "hour" | "day" | "week" | "month" | "quarter" | "year",
    from: dayjs.Dayjs,
    to: dayjs.Dayjs,
    groupByCreatedAtOnly: boolean = false,
    originalGrouping?: string
  ) => {
    const grouped: Record<string, { sales: number; orders: number; date: dayjs.Dayjs }> = {};

    // Helper to get the relevant date for grouping
    const getGroupingDate = (order: any): dayjs.Dayjs | null => {
      const orderCreatedAt = dayjs(order.created_at);
      const isCreatedInRange = isInRange(orderCreatedAt, from, to);

      // For sales trend, only use created_at date
      if (groupByCreatedAtOnly) {
        if (isCreatedInRange) {
          return orderCreatedAt;
        }
        return null;
      }

      // For status-based grouping, check fulfillments for status transitions in range
      const fulfillments = order.fulfillments || [];
      
      // Priority: canceled > delivered > shipped > created
      for (const f of fulfillments) {
        if (f.canceled_at) {
          const canceledAt = dayjs(f.canceled_at);
          if (isInRange(canceledAt, from, to)) {
            return canceledAt;
          }
        }
      }
      
      for (const f of fulfillments) {
        if (f.delivered_at) {
          const deliveredAt = dayjs(f.delivered_at);
          if (isInRange(deliveredAt, from, to)) {
            return deliveredAt;
          }
        }
      }
      
      for (const f of fulfillments) {
        if (f.shipped_at) {
          const shippedAt = dayjs(f.shipped_at);
          if (isInRange(shippedAt, from, to)) {
            return shippedAt;
          }
        }
      }
      
      // If created in range, use created_at
      if (isCreatedInRange) {
        return orderCreatedAt;
      }
      
      // Order has no relevant date in range, return null (will be skipped)
      return null;
    };

    // First, process orders and group them
    for (const o of orders) {
      const date = getGroupingDate(o);
      if (!date) continue; // Skip orders with no relevant date in range
      
      let key = "";

      switch (groupingType) {
        case "hour":
          key = date.format("YYYY-MM-DD-HH");
          break;
        case "day":
          key = date.format("YYYY-MM-DD");
          break;
        case "week":
          key = `${date.year()}-W${date.isoWeek().toString().padStart(2, "0")}`;
          break;
        case "month":
          key = date.format("YYYY-MM");
          break;
        case "quarter":
          key = `${date.year()}-Q${date.quarter()}`;
          break;
        case "year":
          key = date.format("YYYY");
          break;
      }

      if (!grouped[key]) grouped[key] = { sales: 0, orders: 0, date };

      const hasCompletedPayment =
        !["canceled", "returned"].includes(o.status) &&
        Array.isArray(o.payment_collections) &&
        o.payment_collections.some((pc: any) => pc.status === "completed");

      if (hasCompletedPayment) grouped[key].sales += toNumberAmount(o.total);
      grouped[key].orders++;
    }

    // Generate all periods in the range and fill missing ones with 0
    const allPeriods: Record<string, { sales: number; orders: number; date: dayjs.Dayjs; sortKey: string; label: string }> = {};
    
    // Determine start point based on grouping type
    // If original grouping was "quarter" but chart grouping is "month", 
    // we need to constrain months to only those within the quarter(s)
    let actualFrom = from.clone();
    let actualTo = to.clone();
    let quarterStart: dayjs.Dayjs | null = null;
    let quarterEnd: dayjs.Dayjs | null = null;
    
    if (originalGrouping?.toLowerCase() === "quarter" && groupingType === "month") {
      // When showing months for a quarter selection, only show months within the quarter boundaries
      // Start from the start of the quarter that contains 'from'
      actualFrom = from.startOf("quarter");
      // End at the end of the quarter that contains 'to'
      actualTo = to.endOf("quarter");
    } else if (originalGrouping?.toLowerCase() === "quarter" && groupingType === "week") {
      // When showing weeks for a quarter selection, store quarter boundaries for filtering
      // Ensure we use the actual quarter boundaries, not just the from/to dates
      quarterStart = from.startOf("quarter").startOf("day");
      quarterEnd = to.endOf("quarter").endOf("day");
      // Start from the Monday of the week that contains the quarter start
      actualFrom = quarterStart.startOf("isoWeek");
      // End at the Sunday of the week that contains the quarter end
      actualTo = quarterEnd.endOf("isoWeek");
    }
    
    let current = actualFrom.clone();
    if (groupingType === "hour") current = current.startOf("hour");
    else if (groupingType === "day") current = current.startOf("day");
    else if (groupingType === "week") current = current.startOf("isoWeek");
    else if (groupingType === "month") current = current.startOf("month");
    else if (groupingType === "quarter") current = current.startOf("quarter");
    else if (groupingType === "year") current = current.startOf("year");

    const endDate = actualTo.clone();
    if (groupingType === "hour") endDate.endOf("hour");
    else if (groupingType === "day") endDate.endOf("day");
    else if (groupingType === "week") endDate.endOf("isoWeek");
    else if (groupingType === "month") endDate.endOf("month");
    else if (groupingType === "quarter") endDate.endOf("quarter");
    else if (groupingType === "year") endDate.endOf("year");

    // Helper to check if current is before or equal to endDate for the given grouping
    const isBeforeOrSame = (curr: dayjs.Dayjs, end: dayjs.Dayjs, type: typeof groupingType): boolean => {
      if (curr.isAfter(end)) return false;
      if (type === "hour") return curr.isSame(end, "hour") || curr.isBefore(end);
      if (type === "day") return curr.isSame(end, "day") || curr.isBefore(end);
      if (type === "week") return (curr.isoWeek() === end.isoWeek() && curr.year() === end.year()) || curr.isBefore(end);
      if (type === "month") return curr.isSame(end, "month") || curr.isBefore(end);
      if (type === "quarter") return (curr.quarter() === end.quarter() && curr.year() === end.year()) || curr.isBefore(end);
      if (type === "year") return curr.isSame(end, "year") || curr.isBefore(end);
      return curr.isBefore(end);
    };

    while (isBeforeOrSame(current, endDate, groupingType)) {
      let key = "";
      let sortKey = "";
      let label = "";
      let weekStart: dayjs.Dayjs | null = null;
      let weekEnd: dayjs.Dayjs | null = null;

      // For week grouping, calculate week boundaries once
      if (groupingType === "week") {
        weekStart = current.startOf("isoWeek").startOf("day");
        weekEnd = current.endOf("isoWeek").endOf("day");
        
        // For quarter grouping with weeks, filter out weeks that don't overlap with the quarter
        if (originalGrouping?.toLowerCase() === "quarter" && quarterStart && quarterEnd) {
          // Only include weeks that start on or after the quarter start
          // This ensures we don't show weeks like "29 Sep - 5 Oct" when Q4 starts on Oct 1
          // Exclude if:
          // 1. Week ends before quarter starts (no overlap)
          // 2. Week starts after quarter ends (no overlap)
          // 3. Week starts before quarter starts (even if it partially overlaps)
          if (weekEnd.isBefore(quarterStart, "day") || 
              weekStart.isAfter(quarterEnd, "day") || 
              weekStart.isBefore(quarterStart, "day")) {
            // Skip this week, move to next
            current = current.add(1, "week");
            continue;
          }
        }
      }

      switch (groupingType) {
        case "hour":
          key = current.format("YYYY-MM-DD-HH");
          sortKey = current.format("YYYY-MM-DD-HH");
          label = current.format("HH:00");
          break;
        case "day":
          key = current.format("YYYY-MM-DD");
          sortKey = current.format("YYYY-MM-DD");
          label = current.format("D MMM");
          break;
        case "week":
          key = `${current.year()}-W${current.isoWeek().toString().padStart(2, "0")}`;
          sortKey = `${current.year()}-W${current.isoWeek().toString().padStart(2, "0")}`;
          // Use pre-calculated week boundaries
          if (weekStart && weekEnd) {
            // Format as "7-13 Oct" or "Oct 7 - Oct 13" if different months
            if (weekStart.month() === weekEnd.month()) {
              label = `${weekStart.format("D")}-${weekEnd.format("D MMM")}`;
            } else {
              label = `${weekStart.format("D MMM")} - ${weekEnd.format("D MMM")}`;
            }
          }
          break;
        case "month":
          key = current.format("YYYY-MM");
          sortKey = current.format("YYYY-MM");
          label = current.format("MMM YYYY");
          break;
        case "quarter":
          key = `${current.year()}-Q${current.quarter()}`;
          sortKey = `${current.year()}-Q${current.quarter()}`;
          label = `Q${current.quarter()} ${current.year()}`;
          break;
        case "year":
          key = current.format("YYYY");
          sortKey = current.format("YYYY");
          label = current.format("YYYY");
          break;
      }

      // Use existing data if available, otherwise set to 0
      if (grouped[key]) {
        allPeriods[key] = {
          ...grouped[key],
          sortKey,
          label,
        };
      } else {
        allPeriods[key] = {
          sales: 0,
          orders: 0,
          date: current.clone(),
          sortKey,
          label,
        };
      }

      // Move to next period
      if (groupingType === "hour") current = current.add(1, "hour");
      else if (groupingType === "day") current = current.add(1, "day");
      else if (groupingType === "week") current = current.add(1, "week");
      else if (groupingType === "month") current = current.add(1, "month");
      else if (groupingType === "quarter") current = current.add(1, "quarter");
      else if (groupingType === "year") current = current.add(1, "year");
    }

    // Convert to array and sort
    return Object.values(allPeriods)
      .sort((a, b) => (a.sortKey > b.sortKey ? 1 : -1))
      .map(({ sortKey, date, ...rest }) => rest);
  };

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  };

  // ---------- Top Selling Categories ----------
  const getTopSellingCategories = (orders: any[], limit: number = 10) => {
    const categoryRevenue: Record<string, { id: string; name: string; revenue: number; quantity: number }> = {};

    for (const order of orders) {
      // Only count orders with completed payments (matching summary logic)
      const hasCompletedPayment =
        !["canceled", "returned"].includes(order.status) &&
        order.total &&
        Array.isArray(order.payment_collections) &&
        order.payment_collections.some((pc: any) => pc.status === "completed");

      if (!hasCompletedPayment) continue;

      const orderTotal =
        typeof order.total === "object" && order.total.numeric_ !== undefined
          ? order.total.numeric_
          : Number(order.total || 0);

      if (orderTotal === 0) continue;

      const items = order.items || [];
      if (!items.length) continue;

      // For each item, calculate revenue (quantity × price) and add to each category
      // If a product is in multiple categories, each category gets the full amount
      for (const item of items) {
        const categories = item.variant?.product?.categories || [];
        
        // Only process items that have categories
        if (!categories.length) continue;

        // Calculate item revenue: quantity × unit_price
        // Use subtotal if available, otherwise calculate from unit_price × quantity
        const itemRevenue =
          item.subtotal ||
          (typeof item.unit_price === "object" && item.unit_price?.numeric_ !== undefined
            ? item.unit_price.numeric_
            : Number(item.unit_price || 0)) * (item.quantity || 0);

        if (itemRevenue <= 0) continue;

        // Filter valid categories
        const validCategories = categories.filter((cat: any) => cat?.id && cat?.name);
        if (validCategories.length === 0) continue;

        // Get item quantity
        const itemQuantity = item.quantity || 0;

        // Add full item revenue and quantity to each category (don't split)
        // This represents the total sales value and quantity of products in each category
        for (const category of validCategories) {
          const categoryId = category.id;
          if (!categoryRevenue[categoryId]) {
            categoryRevenue[categoryId] = {
              id: categoryId,
              name: category.name,
              revenue: 0,
              quantity: 0,
            };
          }
          // Sum up total sales value: add full item revenue to each category
          categoryRevenue[categoryId].revenue += itemRevenue;
          // Sum up total quantity sold: add full item quantity to each category
          categoryRevenue[categoryId].quantity += itemQuantity;
        }
      }
    }

    // Convert to array, sort by revenue descending, and return top N
    return Object.values(categoryRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
        revenue: Number(cat.revenue.toFixed(2)),
        quantity: cat.quantity,
      }));
  };

  // ---------- Fetch & Compute ----------
  // Fetch current period data in parallel
  const [currentOrdersForStatus, currentOrdersForChart, currentReturns] = await Promise.all([
    fetchOrdersByStatus(currentFrom, currentTo),
    fetchOrders(currentFrom, currentTo),
    fetchReturns(currentFrom, currentTo),
  ]);

  // Process current period data in parallel
  // Use fetchOrders (created orders only) for sales trend chart to show only orders created in date range
  const [currentStatusStats, currentSalesStats, currentChartData, currentCustomerStats] = await Promise.all([
    Promise.resolve(getStatusCounts(currentOrdersForStatus, currentFrom, currentTo)),
    Promise.resolve(getSalesStats(currentOrdersForChart)),
    Promise.resolve(groupOrdersByPeriod(currentOrdersForChart, chartGrouping, currentFrom, currentTo, true, selectedGrouping)),
    getCustomerStats(currentOrdersForChart, currentFrom),
  ]);

  const topSellingCategories = getTopSellingCategories(currentOrdersForChart, 10);

  // If comparison mode, fetch and process previous period
  if (comparisonMode === "true") {
    const [prevOrdersForStatus, prevOrdersForChart, prevReturns] = await Promise.all([
      fetchOrdersByStatus(prevFrom, prevTo),
      fetchOrders(prevFrom, prevTo),
      fetchReturns(prevFrom, prevTo),
    ]);

    const [prevStatusStats, prevSalesStats, prevChartData, prevCustomerStats] = await Promise.all([
      Promise.resolve(getStatusCounts(prevOrdersForStatus, prevFrom, prevTo)),
      Promise.resolve(getSalesStats(prevOrdersForChart)),
      Promise.resolve(groupOrdersByPeriod(prevOrdersForChart, chartGrouping, prevFrom, prevTo, true, selectedGrouping)),
      getCustomerStats(prevOrdersForChart, prevFrom),
    ]);

    return res.json({
      range: { start: currentFrom.format("YYYY-MM-DD"), end: currentTo.format("YYYY-MM-DD") },
      grouping: chartGrouping,
      chart: currentChartData,
      summary: {
        sales: { current: currentSalesStats.total_net_sales, previous: prevSalesStats.total_net_sales, growth: calculateGrowth(currentSalesStats.total_net_sales, prevSalesStats.total_net_sales) },
        orders: { current: currentStatusStats.total_orders_placed, previous: prevStatusStats.total_orders_placed, growth: calculateGrowth(currentStatusStats.total_orders_placed, prevStatusStats.total_orders_placed) },
        total_pending: { current: currentStatusStats.total_pending, previous: prevStatusStats.total_pending },
        total_shipping: { current: currentStatusStats.total_shipping, previous: prevStatusStats.total_shipping },
        total_delivered: { current: currentStatusStats.total_delivered, previous: prevStatusStats.total_delivered },
        total_canceled: { current: currentStatusStats.total_canceled, previous: prevStatusStats.total_canceled },
        total_returned: { current: currentReturns, previous: prevReturns },
        average_order_value: { current: calculateAOV(currentSalesStats), previous: calculateAOV(prevSalesStats) },
        total_customers: { current: currentCustomerStats.total_customers, previous: prevCustomerStats.total_customers },
        new_customers: { current: currentCustomerStats.new_customers, previous: prevCustomerStats.new_customers },
      },
      top_selling_categories: topSellingCategories,
    });
  }

  // Normal mode
  return res.json({
    range: { start: currentFrom.format("YYYY-MM-DD"), end: currentTo.format("YYYY-MM-DD") },
    grouping: chartGrouping,
    chart: currentChartData,
    summary: {
      sales: currentSalesStats.total_net_sales,
      orders: currentStatusStats.total_orders_placed,
      total_pending: currentStatusStats.total_pending,
      total_shipping: currentStatusStats.total_shipping,
      total_delivered: currentStatusStats.total_delivered,
      total_canceled: currentStatusStats.total_canceled,
      total_returned: currentReturns,
      average_order_value: calculateAOV(currentSalesStats),
      total_customers: currentCustomerStats.total_customers,
      new_customers: currentCustomerStats.new_customers,
    },
    top_selling_categories: topSellingCategories,
  });
  } catch (error) {
    console.error('Error fetching order analytics:', error);
    res.status(500).json({
      code: 'internal_error',
      message: (error as Error)?.message || 'Failed to fetch order analytics',
    });
  }
};
