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

    // Parse query parameters from URL
    const url = new URL(req.url || '', 'http://localhost');
    const searchParams = url.searchParams;

    // Extract filter parameters
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const region = searchParams.get('region'); // Country ISO2 code
    const state = searchParams.get('state'); // State/Province code
    const comparisonMode = searchParams.get('comparisonMode') === 'true'; // Reserved for future use

    // Query fulfillments to get delivered orders
    // We'll filter by delivered_at to find delivered fulfillments
    const { data: fulfillments } = await query.graph({
      entity: 'fulfillment',
      fields: [
        'id',
        'delivered_at',
        'order.id',
        'order.items.*',
        'order.items.product_id',
        'order.items.quantity',
        'order.items.title',
        'order.items.variant.*',
        'order.items.variant.product.*',
        'order.items.variant.product.id',
        'order.items.variant.product.title',
        'order.shipping_address.*',
        'order.shipping_address.country_code',
        'order.shipping_address.province',
      ],
    });

    // Filter fulfillments that have delivered_at (meaning they are delivered)
    let deliveredFulfillments = fulfillments?.filter(
      (fulfillment: any) => fulfillment.delivered_at
    ) || [];

    // Apply date range filter
    if (dateFrom || dateTo) {
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo) : null;

      deliveredFulfillments = deliveredFulfillments.filter(
        (fulfillment: any) => {
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
        }
      );
    }

    // Apply region (country) filter
    if (region) {
      deliveredFulfillments = deliveredFulfillments.filter(
        (fulfillment: any) => {
          const countryCode =
            fulfillment.order?.shipping_address?.country_code;
          return countryCode === region;
        }
      );
    }

    // Apply state/province filter
    if (state) {
      deliveredFulfillments = deliveredFulfillments.filter(
        (fulfillment: any) => {
          const province = fulfillment.order?.shipping_address?.province;
          return province === state;
        }
      );
    }

    if (deliveredFulfillments.length === 0) {
      res.json({
        products: [],
        count: 0,
      });
      return;
    }

    // Track unique orders to avoid counting same order multiple times
    const processedOrderIds = new Set<string>();
    const productSalesMap: Record<
      string,
      { product_id: string; product_name: string; sold_number: number }
    > = {};

    for (const fulfillment of deliveredFulfillments) {
      if (!fulfillment.order || !fulfillment.order.id) continue;
      
      const orderId = fulfillment.order.id;
      
      // Skip if we've already processed this order
      if (processedOrderIds.has(orderId)) continue;
      processedOrderIds.add(orderId);

      if (!fulfillment.order.items || !Array.isArray(fulfillment.order.items)) continue;

      for (const item of fulfillment.order.items) {
        // Get product ID from item
        const productId = item.product_id || item.variant?.product?.id;
        const productName =
          item.variant?.product?.title ||
          item.title ||
          'Unknown Product';

        if (!productId) continue;

        // Initialize product in map if not exists
        if (!productSalesMap[productId]) {
          productSalesMap[productId] = {
            product_id: productId,
            product_name: productName,
            sold_number: 0,
          };
        }

        // Add quantity sold
        const quantity = item.quantity || 0;
        productSalesMap[productId].sold_number += quantity;
      }
    }

    // Sort by sold_number descending and take top 10
    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.sold_number - a.sold_number)
      .slice(0, 10)
      .map((product) => ({
        name: product.product_name,
        sold_number: product.sold_number,
      }));

    res.json({
      products: topProducts,
      count: topProducts.length,
    });
  } catch (error) {
    console.error('Error fetching filtered best-selling products:', error);
    res.status(500).json({
      code: 'internal_error',
      message:
        (error as Error)?.message ||
        'Failed to fetch filtered best-selling products',
    });
  }
}

