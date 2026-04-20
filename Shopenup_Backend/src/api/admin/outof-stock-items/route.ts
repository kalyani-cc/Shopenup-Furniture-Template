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

    // Parse filters (date range, region, state)
    const url = new URL(req.url || '', 'http://localhost');
    const searchParams = url.searchParams;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const region = searchParams.get('region');
    const state = searchParams.get('state');

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const rangeStart = dateFrom ? new Date(dateFrom) : thirtyDaysAgo;
    const rangeEnd = dateTo ? new Date(dateTo) : now;

    // Query all products with their variants and inventory information
    const { data: products } = await query.graph({
      entity: 'product',
      fields: [
        'id',
        'title',
        'handle',
        'variants.*',
        'variants.id',
        'variants.title',
        'variants.sku',
        'variants.manage_inventory',
        'variants.inventory.*',
        'variants.inventory.id',
        'variants.inventory.location_levels.*',
        'variants.inventory.location_levels.stocked_quantity',
        'variants.inventory.location_levels.reserved_quantity',
        'variants.inventory.location_levels.incoming_quantity',
        'variants.inventory.location_levels.location_id',
        'variants.inventory.location_levels.stock_locations.*',
        'variants.inventory.location_levels.stock_locations.name',
      ],
    });

    // Query recent sales history to calculate revenue impact
    const { data: fulfillments } = await query.graph({
      entity: 'fulfillment',
      fields: [
        'id',
        'delivered_at',
        'order.id',
        'order.items.*',
        'order.items.variant_id',
        'order.items.product_id',
        'order.items.quantity',
        'order.items.unit_price',
        'order.items.subtotal',
        'order.shipping_address.*',
        'order.shipping_address.country_code',
        'order.shipping_address.province',
      ],
    });

    // Filter fulfillments by date range and region/state
    let deliveredFulfillments = fulfillments?.filter(
      (fulfillment: any) => {
        if (!fulfillment.delivered_at) return false;
        
        const deliveredAt = new Date(fulfillment.delivered_at);
        
        // Date filter
        if (deliveredAt < rangeStart || deliveredAt > rangeEnd) {
          return false;
        }
        
        // Region filter
        if (region) {
          const countryCode = fulfillment.order?.shipping_address?.country_code;
          if (countryCode !== region) return false;
        }
        
        // State filter
        if (state) {
          const province = fulfillment.order?.shipping_address?.province;
          if (province !== state) return false;
        }
        
        return true;
      }
    ) || [];

    // Calculate average revenue per variant from sales history
    const variantRevenueMap: Record<
      string,
      { total_revenue: number; total_quantity: number; avg_price: number }
    > = {};

    for (const fulfillment of deliveredFulfillments) {
      if (!fulfillment.order?.items || !Array.isArray(fulfillment.order.items)) continue;

      for (const item of fulfillment.order.items) {
        const variantId = item.variant_id;
        if (!variantId) continue;

        const quantity = item.quantity || 0;
        const unitPrice = item.unit_price || 0;
        const subtotal = item.subtotal || 0;
        
        const itemRevenue = subtotal > 0 ? subtotal : unitPrice * quantity;

        if (!variantRevenueMap[variantId]) {
          variantRevenueMap[variantId] = {
            total_revenue: 0,
            total_quantity: 0,
            avg_price: 0,
          };
        }

        variantRevenueMap[variantId].total_revenue += itemRevenue;
        variantRevenueMap[variantId].total_quantity += quantity;
      }
    }

    // Calculate average price per variant
    for (const variantId in variantRevenueMap) {
      const variant = variantRevenueMap[variantId];
      variant.avg_price = variant.total_quantity > 0 
        ? variant.total_revenue / variant.total_quantity 
        : 0;
    }

    // Calculate days in sales history period
    const daysInPeriod = Math.max(
      1,
      Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Collect out-of-stock items
    const outOfStockItems: Array<{
      product_id: string;
      product_name: string;
      variant_id: string;
      variant_title: string;
      sku: string | null;
      location_id: string;
      location_name: string;
      available_quantity: number;
      estimated_revenue_impact: number;
    }> = [];

    let totalEstimatedRevenueImpact = 0;

    for (const product of products || []) {
      if (!product.variants || !Array.isArray(product.variants)) continue;

      for (const variant of product.variants) {
        // Skip variants that don't manage inventory
        if (!variant.manage_inventory) continue;

        if (!variant.inventory || !Array.isArray(variant.inventory)) continue;

        for (const inventoryItem of variant.inventory) {
          if (!inventoryItem.location_levels || !Array.isArray(inventoryItem.location_levels)) {
            continue;
          }

          for (const locationLevel of inventoryItem.location_levels) {
            const stockedQty = locationLevel.stocked_quantity || 0;
            const reservedQty = locationLevel.reserved_quantity || 0;
            const incomingQty = locationLevel.incoming_quantity || 0;
            
            // Calculate available quantity (stocked - reserved + incoming)
            const availableQty = stockedQty - reservedQty + incomingQty;

            // Check if out of stock (available quantity <= 0)
            if (availableQty <= 0) {
              const locationName = locationLevel.stock_locations?.[0]?.name || 'Unknown Location';
              
              // Calculate estimated revenue impact
              const variantSalesData = variantRevenueMap[variant.id] || {
                total_revenue: 0,
                total_quantity: 0,
                avg_price: 0,
              };

              // Estimate daily sales rate
              const dailySalesRate = variantSalesData.total_quantity / daysInPeriod;
              
              // Estimate monthly revenue impact (30 days * daily sales rate * avg price)
              const estimatedMonthlyRevenueImpact = dailySalesRate * 30 * variantSalesData.avg_price;
              
              totalEstimatedRevenueImpact += estimatedMonthlyRevenueImpact;

              outOfStockItems.push({
                product_id: product.id,
                product_name: product.title,
                variant_id: variant.id,
                variant_title: variant.title,
                sku: variant.sku,
                location_id: locationLevel.location_id,
                location_name: locationName,
                available_quantity: availableQty,
                estimated_revenue_impact: Number(estimatedMonthlyRevenueImpact.toFixed(2)),
              });
            }
          }
        }
      }
    }

    // Sort by estimated revenue impact descending (highest impact first)
    outOfStockItems.sort((a, b) => b.estimated_revenue_impact - a.estimated_revenue_impact);

    res.json({
      items: outOfStockItems,
      total_count: outOfStockItems.length,
      estimated_revenue_impact: Number(totalEstimatedRevenueImpact.toFixed(2)),
    });
  } catch (error) {
    console.error('Error fetching inventory movement:', error);
    res.status(500).json({
      code: 'internal_error',
      message:
        (error as Error)?.message || 'Failed to fetch inventory movement data',
    });
  }
}

export async function POST(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse,
) {
  return GET(req, res);
}
