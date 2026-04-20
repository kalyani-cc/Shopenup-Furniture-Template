import { ShopenupRequest, ShopenupResponse } from '@shopenup/framework';
import { Modules } from '@shopenup/framework/utils';
import { z } from 'zod';

// Type for custom return filters
type CustomReturnFilters = {
  dateRange?: {
    from: string;
    to: string;
  };
  selectedDateRange?: string;
  region?: string;
  state?: string;
  comparisonMode?: boolean;
  limit?: number;
  offset?: number;
};

// Schema for validating filter query parameters
const returnsFilterSchema = z.object({
  dateRange: z
    .object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    })
    .optional(),
  selectedDateRange: z.string().optional(),
  region: z.string().optional(),
  state: z.string().optional(),
  comparisonMode: z.coerce.boolean().optional(),
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
});

// Helper function to resolve region code to region_id
async function getRegionIdByCode(query: any, regionCode: string): Promise<string | null> {
  try {
    let regions: any[] = [];
    const regionCodeLower = regionCode.toLowerCase();
    
    // First try to find by code field
    try {
      const result = await query.graph({
        entity: 'region',
        filters: { code: regionCode },
        fields: ['id', 'code', 'name'],
        pagination: { take: 10, skip: 0 },
      });
      regions = result.data || [];
    } catch (error1) {
      try {
        const result = await query.graph({
          entity: 'regions',
          filters: { code: regionCode },
          fields: ['id', 'code', 'name'],
          pagination: { take: 10, skip: 0 },
        });
        regions = result.data || [];
      } catch (error2) {
        // Both failed, try searching by name
      }
    }

    // If found by code, return the id
    if (regions && regions.length > 0) {
      return regions[0].id;
    }

    // If not found by code, try searching by name (case-insensitive contains)
    try {
      const result = await query.graph({
        entity: 'region',
        filters: {},
        fields: ['id', 'code', 'name'],
        pagination: { take: 100, skip: 0 },
      });
      const allRegions = result.data || [];
      
      // Find region where name contains the search term (case-insensitive)
      const matchingRegion = allRegions.find((r: any) => {
        const name = r.name ? String(r.name).toLowerCase() : '';
        const code = r.code ? String(r.code).toLowerCase() : '';
        return name.includes(regionCodeLower) || code === regionCodeLower;
      });
      
      if (matchingRegion) {
        return matchingRegion.id;
      }
    } catch (error3) {
      // Search by name failed
    }

    return regionCode;
  } catch (error) {
    return regionCode;
  }
}

// Helper function to get order IDs filtered by region, state, and dateRange
async function getFilteredOrderIds(
  query: any,
  region?: string,
  state?: string,
  dateRange?: { from: string; to: string },
): Promise<string[]> {
  // Resolve region to region_id FIRST before fetching orders
  let targetRegionId: string | null = null;
  let regionWasResolved = false;
  if (region) {
    const regionLower = region.toLowerCase();
    const regionUpper = region.toUpperCase();
    
    // Try to find region by code (try lowercase first, then uppercase, then original)
    const codesToTry = [regionLower, regionUpper, region];
    for (const codeToTry of codesToTry) {
      targetRegionId = await getRegionIdByCode(query, codeToTry);
      // Check if we successfully resolved it (returned value is different from input)
      if (targetRegionId && targetRegionId !== codeToTry) {
        regionWasResolved = true;
        break;
      }
    }
    
    // If all lookups failed, assume region might be a region_id itself
    if (!regionWasResolved) {
      targetRegionId = region;
    }
  }

  const fieldsToFetch: string[] = ['id', 'region_id', 'created_at'];
  
  // Always fetch region relationship when region filter is provided
  if (region) {
    fieldsToFetch.push('region.id', 'region.code', 'region');
  }
  
  if (state && state.toLowerCase().trim() !== 'all') {
    fieldsToFetch.push('shipping_address.province', 'shipping_address');
  }

  // Build filters for orders
  const orderFilters: Record<string, any> = {};
  
  // NOTE: Do NOT filter orders by dateRange here!
  // Returns should be filtered by return.created_at, not order.created_at
  // An order created in period A might have returns created in period B
  // We only filter orders by region/state, then filter returns by their own created_at

  // If we resolved region_id successfully, filter by it in the query (more efficient)
  // But DON'T filter in query if lookup failed - we'll filter in memory by code
  if (regionWasResolved && targetRegionId) {
    orderFilters.region_id = targetRegionId;
  }

  const { data: orders } = await query.graph({
    entity: 'order',
    filters: orderFilters,
    fields: fieldsToFetch,
    pagination: {
      take: Number.MAX_SAFE_INTEGER,
      skip: 0,
    },
  });

  // Ensure orders is an array
  if (!orders || !Array.isArray(orders)) {
    return [];
  }

  // Filter orders in memory by region code/ID and state
  let filteredOrders = orders;
  
  // Always filter by region if region is provided
  if (region) {
    const regionLower = region.toLowerCase();
    const regionUpper = region.toUpperCase();
    
    // Since region.code is not loaded in the relationship, we need to query regions separately
    // Get all unique region_ids from orders
    const uniqueRegionIds = Array.from(new Set(
      orders.map((o: any) => o.region?.id || o.region_id).filter(Boolean)
    ));
    
    // Create a map of region_id -> region_code by querying regions (only needed if region lookup failed)
    const regionIdToCodeMap = new Map<string, string>();
    if (uniqueRegionIds.length > 0 && !regionWasResolved) {
      try {
        // Try to fetch all regions at once - request multiple possible code fields
        const { data: allRegions } = await query.graph({
          entity: 'region',
          filters: { id: { $in: uniqueRegionIds } },
          fields: ['id', 'code', 'country_code', 'iso_2', 'iso_3', 'name'],
          pagination: { take: 100, skip: 0 },
        });
        
        if (allRegions && Array.isArray(allRegions)) {
          allRegions.forEach((r: any) => {
            // Try different possible field names for region code
            const regionCode = r.code || r.country_code || r.iso_2 || r.iso_3 || r.name;
            
            if (r.id && regionCode) {
              regionIdToCodeMap.set(r.id, String(regionCode).toLowerCase());
            }
          });
        }
      } catch (error) {
        // Try alternative entity name
        try {
          const { data: allRegions } = await query.graph({
            entity: 'regions',
            filters: { id: { $in: uniqueRegionIds } },
            fields: ['id', 'code', 'country_code', 'iso_2', 'iso_3', 'name'],
            pagination: { take: 100, skip: 0 },
          });
          
          if (allRegions && Array.isArray(allRegions)) {
            allRegions.forEach((r: any) => {
              const regionCode = r.code || r.country_code || r.iso_2 || r.iso_3 || r.name;
              
              if (r.id && regionCode) {
                regionIdToCodeMap.set(r.id, String(regionCode).toLowerCase());
              }
            });
          }
        } catch (error2) {
          // Fallback: Try fetching all regions and filter in memory
          try {
            const { data: allRegions } = await query.graph({
              entity: 'region',
              filters: {},
              fields: ['id', 'code', 'country_code', 'iso_2', 'iso_3', 'name'],
              pagination: { take: 1000, skip: 0 },
            });
            
            if (allRegions && Array.isArray(allRegions)) {
              allRegions.forEach((r: any) => {
                const regionCode = r.code || r.country_code || r.iso_2 || r.iso_3 || r.name;
                
                if (r.id && regionCode && uniqueRegionIds.includes(r.id)) {
                  regionIdToCodeMap.set(r.id, String(regionCode).toLowerCase());
                }
              });
            }
          } catch (error3) {
            // Error fetching regions - will fall back to other matching methods
          }
        }
      }
    }
    
    filteredOrders = filteredOrders.filter((order: any) => {
      // Get region_id from various possible locations
      const orderRegionId = order.region?.id || order.region_id;
      
      // Match by region_id (if we resolved it)
      if (regionWasResolved && targetRegionId) {
        // We have a resolved region_id, match by it
        return orderRegionId === targetRegionId || orderRegionId === String(targetRegionId);
      } else {
        // Region lookup failed - region is likely a code, so we need to match by region code
        // Get region code from the map we created
        const orderRegionCode = orderRegionId ? regionIdToCodeMap.get(orderRegionId) : null;
        
        // Also try to get from order.region.code if available (fallback)
        const orderRegionCodeFromOrder = order.region?.code 
          ? String(order.region.code).toLowerCase() 
          : null;
        
        const finalRegionCode = orderRegionCode || orderRegionCodeFromOrder;
        
        if (finalRegionCode) {
          // Match by region code or name (exact or contains)
          const finalRegionCodeLower = finalRegionCode.toLowerCase();
          return (
            finalRegionCodeLower === regionLower ||
            finalRegionCodeLower === regionUpper ||
            finalRegionCodeLower === region ||
            finalRegionCode === regionLower ||
            finalRegionCode === regionUpper ||
            finalRegionCode === region ||
            // Also check if region name/code contains the search term (for "in" matching "India Region")
            finalRegionCodeLower.includes(regionLower) ||
            regionLower.includes(finalRegionCodeLower)
          );
        }
        
        // Fallback: if we don't have region code, try matching by region_id
        // (in case region parameter is actually a region_id)
        return (
          orderRegionId === region ||
          orderRegionId === regionLower ||
          orderRegionId === regionUpper
        );
      }
    });
  }

  // Only filter by state if state is provided and not "all"
  if (state && state.toLowerCase().trim() !== 'all') {
    const stateTrimmed = state.trim();
    filteredOrders = filteredOrders.filter((order: any) => {
      const province = order.shipping_address?.province || 
                       order?.shipping_address?.province ||
                       order?.shipping_address?.shipping_address?.province ||
                       order.shipping_address?.state ||
                       order?.shipping_address?.state;
      
      return province && (
        province === stateTrimmed || 
        province.trim() === stateTrimmed ||
        province.toLowerCase().trim() === stateTrimmed.toLowerCase()
      );
    });
  }

  return filteredOrders.map((order: any) => order.id);
}

// Helper function to calculate previous period date range based on current date range
function calculatePreviousDateRange(
  dateRange: { from: string; to: string },
  selectedDateRange?: string
): { from: string; to: string } {
  const fromDate = new Date(dateRange.from);
  const toDate = new Date(dateRange.to);
  
  // Calculate the duration of the current period
  const duration = toDate.getTime() - fromDate.getTime();
  
  // Calculate previous period by subtracting duration from both dates
  const previousToDate = new Date(fromDate.getTime() - 1); // End of previous period (1ms before current start)
  const previousFromDate = new Date(previousToDate.getTime() - duration); // Start of previous period
  
  return {
    from: previousFromDate.toISOString(),
    to: previousToDate.toISOString(),
  };
}

// Helper function to fetch returns data and process it
async function fetchReturnsData(
  query: any,
  region?: string,
  state?: string,
  dateRangeToUse?: { from: string; to: string },
): Promise<{
  returns: any[];
  count: number;
  topReturnReasons: Array<{ reason: string; count: number }>;
  shippedOrdersCount: number;
}> {
  try {
    // Build dynamic filters object for returns
    const filters: Record<string, any> = {};

    // Apply date range filter if provided
    if (dateRangeToUse?.from && dateRangeToUse?.to) {
      (filters as any).created_at = {
        $gte: dateRangeToUse.from,
        $lte: dateRangeToUse.to,
      };
    }

    // If region or state filters are provided, query orders first to get order IDs
    // Skip state filtering if state is "all"
    let orderIds: string[] | undefined;
    const effectiveState = state && state.toLowerCase().trim() !== 'all' ? state : undefined;
    if (region || effectiveState) {
      // NOTE: Do NOT pass dateRangeToUse to getFilteredOrderIds
      // We only want to filter orders by region/state, not by order creation date
      // Returns will be filtered by their own created_at date
      orderIds = await getFilteredOrderIds(query, region, effectiveState);
      
      // If no orders match, return empty result
      if (orderIds.length === 0) {
        return {
          returns: [],
          count: 0,
          topReturnReasons: [],
          shippedOrdersCount: 0,
        };
      }

      // Apply order_id filter if we have filtered order IDs
      filters.order_id = { $in: orderIds };
    }

    // Query returns with filters - include return items to get reasons
    const { data: returns, metadata } = await query.graph({
      entity: 'return',
      filters,
      fields: [
        'id',
        'status',
        'order_id',
        'created_at',
        'updated_at',
        'items',
        'items.*',
        'items.reason',
        'items.reason.id',
        'items.reason.label',
        'items.reason.value',
        'items.reason.name',
        'items.reason_id',
        'items.item_id',
        'items.quantity',
        'refund_amount',
        'shipping_method',
        'shipping_data',
        'metadata',
        'order.display_id',
        'order.currency_code',
        'order.shipping_address.province',
        'order.region.id',
        'order.region.code',
        'order.region.name',
      ],
      pagination: {
        take: Number.MAX_SAFE_INTEGER, // Fetch all returns, no limit
        skip: 0,
      },
    });

    // Calculate return reasons with counts
    const returnReasonsMap = new Map<string, number>();
    
    // First, collect all reason_id values from return items to look them up
    const reasonIds = new Set<string>();
    (returns || []).forEach((returnItem: any) => {
      const items = returnItem.items || [];
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          // Get reason_id from either reason_id field or reason.id
          const reasonId = item.reason_id || (item.reason?.id);
          if (reasonId) {
            const id = typeof reasonId === 'string' ? reasonId : reasonId.id || reasonId;
            if (id && id !== 'null') reasonIds.add(id);
          }
        });
      }
    });

    // Fetch return_reason entities to get labels/values
    let reasonIdMap = new Map<string, string>();
    if (reasonIds.size > 0) {
      try {
        // Try different entity names for return reasons
        let returnReasons: any[] = [];
        try {
          const result = await query.graph({
            entity: 'return_reason',
            filters: { id: { $in: Array.from(reasonIds) } },
            fields: ['id', 'label', 'value', 'name'],
            pagination: { take: 100, skip: 0 },
          });
          returnReasons = result.data || [];
        } catch (error1) {
          try {
            const result = await query.graph({
              entity: 'return_reasons',
              filters: { id: { $in: Array.from(reasonIds) } },
              fields: ['id', 'label', 'value', 'name'],
              pagination: { take: 100, skip: 0 },
            });
            returnReasons = result.data || [];
          } catch (error2) {
            // Both entity names failed, continue without lookup
          }
        }
        
        returnReasons.forEach((reason: any) => {
          const label = reason.label || reason.value || reason.name || reason.id;
          reasonIdMap.set(reason.id, label);
        });
      } catch (error) {
        // Error looking up return reasons, continue without lookup
      }
    }
    
    (returns || []).forEach((returnItem: any) => {
      const items = returnItem.items || returnItem.return_items || returnItem.line_items || [];
      
      if (Array.isArray(items) && items.length > 0) {
        items.forEach((item: any) => {
          let reason = 'No reason provided';
          
          // Check if reason is an object (with id, label, value, etc.)
          if (item.reason && typeof item.reason === 'object' && item.reason !== null) {
            // If reason object has label/value/name, use it
            if (item.reason.label || item.reason.value || item.reason.name) {
              reason = item.reason.label || item.reason.value || item.reason.name;
            } else if (item.reason.id) {
              // If reason only has id, lookup from our map
              reason = reasonIdMap.get(item.reason.id) || item.reason.id || 'No reason provided';
            } else {
              reason = 'No reason provided';
            }
          } else if (item.reason && typeof item.reason === 'string') {
            // Reason is a string directly
            reason = item.reason;
          } else if (item.return_reason) {
            reason = item.return_reason;
          } else if (item.reason_code) {
            reason = item.reason_code;
          } else if (item.reason_id) {
            // If reason_id exists, try to get the reason label
            if (typeof item.reason_id === 'object' && item.reason_id !== null) {
              reason = item.reason_id.label || item.reason_id.value || item.reason_id.name || 'No reason provided';
            } else if (typeof item.reason_id === 'string') {
              // Lookup reason from map we created earlier
              reason = reasonIdMap.get(item.reason_id) || item.reason_id || 'No reason provided';
            }
          }
          
          // Normalize reason string for counting
          const reasonStr = typeof reason === 'string' ? reason : 'No reason provided';
          returnReasonsMap.set(reasonStr, (returnReasonsMap.get(reasonStr) || 0) + 1);
        });
      } else if (returnItem.reason) {
        let reason = 'No reason provided';
        if (typeof returnItem.reason === 'object') {
          reason = returnItem.reason.label || returnItem.reason.value || returnItem.reason.name || 'No reason provided';
        } else {
          reason = returnItem.reason || 'No reason provided';
        }
        returnReasonsMap.set(reason, (returnReasonsMap.get(reason) || 0) + 1);
      } else {
        returnReasonsMap.set('No reason provided', (returnReasonsMap.get('No reason provided') || 0) + 1);
      }
    });

    // Convert to array and sort by count (descending) - Top Return Reasons
    const topReturnReasons = Array.from(returnReasonsMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    // Count shipped orders with same filters
    const shippedOrderFilters: Record<string, any> = {};
    
    // Apply same date range filter
    if (dateRangeToUse?.from && dateRangeToUse?.to) {
      shippedOrderFilters.created_at = {
        $gte: dateRangeToUse.from,
        $lte: dateRangeToUse.to,
      };
    }

    // Apply same region/state filters using order IDs if available
    // Skip state filtering if state is "all"
    const effectiveStateForShipped = state && state.toLowerCase().trim() !== 'all' ? state : undefined;
    if (orderIds && orderIds.length > 0) {
      // Use the filtered order IDs from region/state filters
      shippedOrderFilters.id = { $in: orderIds };
    } else if (region || effectiveStateForShipped) {
      // If filters exist but no orders matched, return 0
      shippedOrderFilters.id = { $in: [] };
    }

    // Query orders to count shipped orders with all filters applied
    let shippedOrdersCount = 0;
    try {
      // First, get all orders matching the filters
      const { data: allOrders } = await query.graph({
        entity: 'order',
        filters: shippedOrderFilters,
        fields: [
          'id', 
          'fulfillment_status', 
          'status',
          'fulfillments',
          'fulfillments.id',
          'fulfillments.status',
          'fulfillments.shipped_at',
        ],
        pagination: {
          take: Number.MAX_SAFE_INTEGER,
          skip: 0,
        },
      });

      if (allOrders && allOrders.length > 0) {
        // Try to get fulfillments via separate query if not included in order
        let fulfillmentsMap = new Map<string, any[]>();
        
        // Get order IDs
        const orderIdsForFulfillment = allOrders.map((o: any) => o.id);
        
        // Query fulfillments separately
        try {
          let fulfillmentResult: any;
          
          // Try with order_id field first
          try {
            fulfillmentResult = await query.graph({
              entity: 'fulfillment',
              filters: {
                order_id: { $in: orderIdsForFulfillment },
              } as any,
              fields: ['id', 'order_id', 'status', 'shipped_at'],
              pagination: {
                take: Number.MAX_SAFE_INTEGER,
                skip: 0,
              },
            });
          } catch (error1) {
            // Try with 'order' field instead
            try {
              fulfillmentResult = await query.graph({
                entity: 'fulfillment',
                filters: {
                  order: { $in: orderIdsForFulfillment },
                } as any,
                fields: ['id', 'order', 'order.id', 'status', 'shipped_at'],
                pagination: {
                  take: Number.MAX_SAFE_INTEGER,
                  skip: 0,
                },
              });
            } catch (error2) {
              // If both fail, try fetching all fulfillments and filter in memory
              fulfillmentResult = await query.graph({
                entity: 'fulfillment',
                filters: {},
                fields: ['id', 'order_id', 'order', 'order.id', 'status', 'shipped_at'],
                pagination: {
                  take: Number.MAX_SAFE_INTEGER,
                  skip: 0,
                },
              });
              // Filter fulfillments by order IDs
              fulfillmentResult.data = (fulfillmentResult.data || []).filter((f: any) => {
                const orderId = f.order_id || f.order?.id || f.order;
                return orderId && orderIdsForFulfillment.includes(orderId);
              });
            }
          }
          
          // Map fulfillments by order_id
          (fulfillmentResult.data || []).forEach((fulfillment: any) => {
            const orderId = fulfillment.order_id || fulfillment.order?.id || fulfillment.order;
            if (orderId) {
              if (!fulfillmentsMap.has(orderId)) {
                fulfillmentsMap.set(orderId, []);
              }
              fulfillmentsMap.get(orderId)!.push(fulfillment);
            }
          });
        } catch (fulfillmentError) {
          // If fulfillment query fails, continue with order fulfillments if available
        }

        // Define shipped statuses
        const shippedStatuses = [
          'shipped',
          'delivered',
          'fulfilled',
          'partially_fulfilled',
          'partially_shipped',
          'shipped_partially',
          'fulfillment_shipped',
          'complete',
        ];

        // Count orders that have shipped fulfillments or shipped status
        shippedOrdersCount = allOrders.filter((order: any) => {
          // Check order's fulfillment_status field
          const fulfillmentStatus = order.fulfillment_status?.toLowerCase()?.trim();
          const orderStatus = order.status?.toLowerCase()?.trim();

          // Check if order status matches shipped statuses
          const orderIsShipped =
            (fulfillmentStatus && shippedStatuses.includes(fulfillmentStatus)) ||
            (orderStatus && shippedStatuses.includes(orderStatus));

          if (orderIsShipped) {
            return true;
          }

          // Check fulfillments from separate query
          const orderFulfillments = fulfillmentsMap.get(order.id) || [];
          
          // Also check fulfillments from order object if available
          const orderFulfillmentsFromOrder = order.fulfillments || [];
          const allFulfillments = [...orderFulfillments, ...orderFulfillmentsFromOrder];

          if (allFulfillments.length > 0) {
            // Check if any fulfillment has shipped status or shipped_at date
            const hasShippedFulfillment = allFulfillments.some((fulfillment: any) => {
              const fulfillmentStatus = fulfillment.status?.toLowerCase()?.trim();
              return (
                (fulfillmentStatus && shippedStatuses.includes(fulfillmentStatus)) ||
                fulfillment.shipped_at !== null ||
                fulfillment.shipped_at !== undefined
              );
            });
            return hasShippedFulfillment;
          }

          return false;
        }).length;
      }
    } catch (error) {
      // Error counting shipped orders, default to 0
      console.error('Error counting shipped orders:', error);
      shippedOrdersCount = 0;
    }

    return {
      returns: returns || [],
      count: metadata?.count || (returns || []).length,
      topReturnReasons,
      shippedOrdersCount,
    };
  } catch (error) {
    console.error('Error in fetchReturnsData:', error);
    // Return zero data on error
    return {
      returns: [],
      count: 0,
      topReturnReasons: [],
      shippedOrdersCount: 0,
    };
  }
}

export const GET = async (
  req: ShopenupRequest,
  res: ShopenupResponse,
): Promise<void> => {
  // Extract dynamic filters from query parameters
  let processedQuery: any = { ...req.query };
  
  // Handle dateRange if it comes as a JSON string in query params
  if (typeof processedQuery.dateRange === 'string') {
    try {
      processedQuery.dateRange = JSON.parse(processedQuery.dateRange);
    } catch {
      // If parsing fails, keep as is
    }
  }

  // Handle comparisonMode string to boolean conversion (query params come as strings)
  if (processedQuery.comparisonMode !== undefined && processedQuery.comparisonMode !== null) {
    if (typeof processedQuery.comparisonMode === 'string') {
      processedQuery.comparisonMode = processedQuery.comparisonMode === 'true';
    }
  }

  // Validate and extract dynamic filters
  const {
    dateRange,
    selectedDateRange,
    region,
    state,
    comparisonMode,
    limit,
    offset,
  } = returnsFilterSchema.parse(processedQuery) as CustomReturnFilters;


  // Resolve the query service for dynamic filtering
  const query = req.scope.resolve('query');

  try {
    // If comparison mode is enabled and dateRange is provided, fetch both current and previous period data
    if (comparisonMode && dateRange?.from && dateRange?.to) {
      // Calculate previous period date range
      const previousDateRange = calculatePreviousDateRange(dateRange, selectedDateRange);
      
      // Fetch data for both periods in parallel
      const [currentData, previousData] = await Promise.all([
        fetchReturnsData(query, region, state, dateRange),
        fetchReturnsData(query, region, state, previousDateRange),
      ]);

      res.json({
        returns: currentData.returns,
        count: currentData.count,
        topReturnReasons: currentData.topReturnReasons,
        shippedOrdersCount: currentData.shippedOrdersCount,
        comparison: {
          previousPeriod: previousData,
        },
      });
    } else {
      // Normal mode - fetch only current period data
      const currentData = await fetchReturnsData(query, region, state, dateRange);

      res.json({
        returns: currentData.returns,
        count: currentData.count,
        topReturnReasons: currentData.topReturnReasons,
        shippedOrdersCount: currentData.shippedOrdersCount,
      });
    }
  } catch (error: any) {
    console.error('Error querying returns data:', error);
    res.status(500).json({
      error: 'Failed to fetch returns data',
      message: error instanceof Error ? error.message : 'Unknown error',
      returns: [],
      count: 0,
      topReturnReasons: [],
      shippedOrdersCount: 0,
      ...(comparisonMode && dateRange?.from && dateRange?.to ? {
        comparison: {
          previousPeriod: {
            returns: [],
            count: 0,
            topReturnReasons: [],
            shippedOrdersCount: 0,
          },
        },
      } : {}),
    });
  }
};

