import { ShopenupRequest, ShopenupResponse } from '@shopenup/framework';
import { z } from 'zod';

// Type for custom promotion filters
type CustomPromotionFilters = {
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
const promotionsFilterSchema = z.object({
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
  
  // Apply date range filter to orders if provided
  if (dateRange?.from && dateRange?.to) {
    orderFilters.created_at = {
      $gte: dateRange.from,
      $lte: dateRange.to,
    };
  }

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

// Type for promo code performance data
type PromoCodePerformance = {
  code: string;
  orders: number;
  revenue: number;
  avgDiscount: number;
  totalDiscount: number;
  promotionId?: string;
};

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

// Helper function to process orders and calculate metrics
async function processOrdersData(
  orders: any[]
): Promise<{
  discountUsageImpact: {
    percentage: number;
    totalRevenue: number;
    revenueWithDiscounts: number;
    totalDiscountAmount: number;
  };
  topPerformingPromoCodes: PromoCodePerformance[];
}> {
  // Calculate metrics
  let totalRevenue = 0;
  let revenueWithDiscounts = 0;
  let totalDiscountAmount = 0;
  
  // Map to track promo code performance
  const promoCodeMap = new Map<string, {
    code: string;
    orders: Set<string>;
    totalRevenue: number;
    totalDiscount: number;
    promotionId?: string;
  }>();

  orders.forEach((order: any) => {
    // Calculate order total (revenue)
    const orderTotal = order.total || order.original_total || 0;
    const orderDiscount = order.discount_total || 0;
    
    // Calculate discount from item adjustments if discount_total is not available
    let calculatedDiscount = orderDiscount;
    if (!calculatedDiscount && order.items) {
      calculatedDiscount = order.items.reduce((sum: number, item: any) => {
        const itemDiscount = item.adjustments?.reduce((adjSum: number, adj: any) => {
          return adjSum + (Math.abs(adj.amount) || 0);
        }, 0) || 0;
        return sum + itemDiscount;
      }, 0);
    }

    totalRevenue += orderTotal;
    totalDiscountAmount += calculatedDiscount;

    // Check if order has discounts
    if (calculatedDiscount > 0) {
      revenueWithDiscounts += orderTotal;
    }

    // Process discounts/promotions
    // Extract promotion code from adjustments (promotions are stored in adjustments)
    if (calculatedDiscount > 0) {
      // Get all adjustments from order items
      const adjustments = order.items?.flatMap((item: any) => item.adjustments || []) || [];
      
      // Group adjustments by their promo code
      const adjustmentsByCode = new Map<string, {
        adjustments: any[];
        promotionId?: string;
      }>();
      
      adjustments.forEach((adj: any) => {
        // Only process adjustments with valid non-empty codes
        if (adj.code && adj.code.trim() !== '' && adj.code !== 'null') {
          const code = adj.code.trim();
          if (!adjustmentsByCode.has(code)) {
            adjustmentsByCode.set(code, {
              adjustments: [],
              promotionId: adj.promotion_id,
            });
          }
          const codeData = adjustmentsByCode.get(code)!;
          codeData.adjustments.push(adj);
          // Update promotion ID if we have one and it's not set yet
          if (adj.promotion_id && !codeData.promotionId) {
            codeData.promotionId = adj.promotion_id;
          }
        }
      });

      // Process each promo code separately with its own discount amount
      adjustmentsByCode.forEach((codeData, code) => {
        // Calculate discount for this specific promo code only
        // This works for both fixed discounts (e.g., FIX100 = 100 rupees) 
        // and percentage discounts (e.g., new123 = 10% of order value)
        // The adjustment amount already contains the calculated discount value
        const codeDiscount = codeData.adjustments.reduce((sum: number, adj: any) => {
          // Use absolute value since discount amounts are typically stored as negative
          // This ensures we get the positive discount value regardless of how it's stored
          const adjAmount = adj.amount || 0;
          return sum + Math.abs(adjAmount);
        }, 0);

        if (codeDiscount > 0) {
          if (!promoCodeMap.has(code)) {
            promoCodeMap.set(code, {
              code,
              orders: new Set(),
              totalRevenue: 0,
              totalDiscount: 0,
              promotionId: codeData.promotionId,
            });
          }

          const promoData = promoCodeMap.get(code)!;
          // Use Set to ensure order ID is only added once per code
          promoData.orders.add(order.id);
          promoData.totalRevenue += orderTotal;
          // Add only the discount amount for this specific code
          promoData.totalDiscount += codeDiscount;
          
          // Update promotion ID if we have one and it's not set yet
          if (codeData.promotionId && !promoData.promotionId) {
            promoData.promotionId = codeData.promotionId;
          }
        }
      });
    }
  });

  // Calculate Discount Usage Impact percentage
  const discountUsageImpactPercentage = totalRevenue > 0 
    ? (revenueWithDiscounts / totalRevenue) * 100 
    : 0;

  // Convert promo code map to array and calculate metrics
  const topPerformingPromoCodes: PromoCodePerformance[] = Array.from(promoCodeMap.values())
    .map((data) => ({
      code: data.code,
      orders: data.orders.size,
      revenue: data.totalRevenue,
      avgDiscount: data.orders.size > 0 ? data.totalDiscount / data.orders.size : 0,
      totalDiscount: data.totalDiscount,
      promotionId: data.promotionId,
    }))
    .sort((a, b) => b.revenue - a.revenue); // Sort by revenue descending

  return {
    discountUsageImpact: {
      percentage: Math.round(discountUsageImpactPercentage * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      revenueWithDiscounts: Math.round(revenueWithDiscounts * 100) / 100,
      totalDiscountAmount: Math.round(totalDiscountAmount * 100) / 100,
    },
    topPerformingPromoCodes,
  };
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
  } = promotionsFilterSchema.parse(processedQuery) as CustomPromotionFilters;

  // Resolve the query service for dynamic filtering
  const query = req.scope.resolve('query');

  // Helper function to fetch orders and process data
  const fetchOrdersData = async (dateRangeToUse?: { from: string; to: string }) => {
    try {
      // Build filters for orders
      const orderFilters: Record<string, any> = {};
      
      // Apply date range filter to orders if provided
      if (dateRangeToUse?.from && dateRangeToUse?.to) {
        orderFilters.created_at = {
          $gte: dateRangeToUse.from,
          $lte: dateRangeToUse.to,
        };
      } else if (dateRange?.from && dateRange?.to) {
        orderFilters.created_at = {
          $gte: dateRange.from,
          $lte: dateRange.to,
        };
      }

      // Get filtered order IDs if region/state filters are provided
      // Skip state filtering if state is "all"
      const effectiveState = state && state.toLowerCase().trim() !== 'all' ? state : undefined;
      let filteredOrderIds: string[] | undefined;
      
      if (region || effectiveState) {
        const dateRangeForFilter = dateRangeToUse || dateRange;
        filteredOrderIds = await getFilteredOrderIds(query, region, effectiveState, dateRangeForFilter);
        
        if (filteredOrderIds.length === 0) {
          // Return zero data instead of null
          return {
            discountUsageImpact: {
              percentage: 0,
              totalRevenue: 0,
              revenueWithDiscounts: 0,
              totalDiscountAmount: 0,
            },
            topPerformingPromoCodes: [],
          };
        }
        
        orderFilters.id = { $in: filteredOrderIds };
      }

      // Query orders with discount and revenue information
      const { data: orders } = await query.graph({
        entity: 'order',
        filters: orderFilters,
        fields: [
          'id',
          'total',
          'subtotal',
          'discount_total',
          'original_total',
          'original_item_subtotal',
          'created_at',
          'currency_code',
          'items',
          'items.*',
          'items.adjustments',
          'items.adjustments.*',
          'items.adjustments.amount',
          'items.adjustments.code',
        ],
        pagination: {
          take: Number.MAX_SAFE_INTEGER,
          skip: 0,
        },
      });

      return processOrdersData(orders || []);
    } catch (error) {
      console.error('Error in fetchOrdersData:', error);
      // Return zero data on error
      return {
        discountUsageImpact: {
          percentage: 0,
          totalRevenue: 0,
          revenueWithDiscounts: 0,
          totalDiscountAmount: 0,
        },
        topPerformingPromoCodes: [],
      };
    }
  };

  try {
    // If comparison mode is enabled and dateRange is provided, fetch both current and previous period data
    if (comparisonMode && dateRange?.from && dateRange?.to) {
      // Calculate previous period date range
      const previousDateRange = calculatePreviousDateRange(dateRange, selectedDateRange);
      
      // Fetch data for both periods in parallel
      const [currentData, previousData] = await Promise.all([
        fetchOrdersData(dateRange),
        fetchOrdersData(previousDateRange),
      ]);

      // Apply pagination to current period data
      const paginatedPromoCodes = limit 
        ? currentData.topPerformingPromoCodes.slice(offset || 0, (offset || 0) + limit)
        : currentData.topPerformingPromoCodes;

      res.json({
        discountUsageImpact: currentData.discountUsageImpact,
        topPerformingPromoCodes: paginatedPromoCodes,
        count: currentData.topPerformingPromoCodes.length,
        offset: offset || 0,
        limit: limit || currentData.topPerformingPromoCodes.length,
        comparison: {
          previousPeriod: previousData,
        },
      });
    } else {
      // Normal mode - fetch only current period data
      const currentData = await fetchOrdersData();

      // Apply pagination if needed
      const paginatedPromoCodes = limit 
        ? currentData.topPerformingPromoCodes.slice(offset || 0, (offset || 0) + limit)
        : currentData.topPerformingPromoCodes;

      res.json({
        discountUsageImpact: currentData.discountUsageImpact,
        topPerformingPromoCodes: paginatedPromoCodes,
        count: currentData.topPerformingPromoCodes.length,
        offset: offset || 0,
        limit: limit || currentData.topPerformingPromoCodes.length,
      });
    }
  } catch (error: any) {
    console.error('Error querying promotions data:', error);
    res.status(500).json({
      error: 'Failed to fetch promotions data',
      message: error instanceof Error ? error.message : 'Unknown error',
      discountUsageImpact: {
        percentage: 0,
        totalRevenue: 0,
        revenueWithDiscounts: 0,
        totalDiscountAmount: 0,
      },
      topPerformingPromoCodes: [],
      ...(comparisonMode && dateRange?.from && dateRange?.to ? {
        comparison: {
          previousPeriod: {
            discountUsageImpact: {
              percentage: 0,
              totalRevenue: 0,
              revenueWithDiscounts: 0,
              totalDiscountAmount: 0,
            },
            topPerformingPromoCodes: [],
          },
        },
      } : {}),
    });
  }
}
