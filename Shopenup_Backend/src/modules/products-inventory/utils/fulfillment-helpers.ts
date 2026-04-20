/**
 * Aggregate sold quantities by variant from fulfillments
 */
export function aggregateSoldQuantities(
  fulfillments: any[]
): Record<string, number> {
  const soldQuantityMap: Record<string, number> = {};
  const processedOrderIds = new Set<string>();

  for (const fulfillment of fulfillments) {
    if (!fulfillment.order || !fulfillment.order.id) continue;

    const orderId = fulfillment.order.id;

    // Skip if we've already processed this order
    if (processedOrderIds.has(orderId)) continue;
    processedOrderIds.add(orderId);

    if (!fulfillment.order.items || !Array.isArray(fulfillment.order.items))
      continue;

    for (const item of fulfillment.order.items) {
      const variantId = item.variant_id;
      if (!variantId) continue;

      const quantity = item.quantity || 0;
      soldQuantityMap[variantId] = (soldQuantityMap[variantId] || 0) + quantity;
    }
  }

  return soldQuantityMap;
}

/**
 * Aggregate sold quantities by product from fulfillments
 */
export function aggregateSoldQuantitiesByProduct(
  fulfillments: any[]
): Record<
  string,
  { product_id: string; product_name: string; sold_number: number }
> {
  const productSalesMap: Record<
    string,
    { product_id: string; product_name: string; sold_number: number }
  > = {};
  const processedOrderIds = new Set<string>();

  for (const fulfillment of fulfillments) {
    if (!fulfillment.order || !fulfillment.order.id) continue;

    const orderId = fulfillment.order.id;

    // Skip if we've already processed this order
    if (processedOrderIds.has(orderId)) continue;
    processedOrderIds.add(orderId);

    if (!fulfillment.order.items || !Array.isArray(fulfillment.order.items))
      continue;

    for (const item of fulfillment.order.items) {
      // Get product ID from item
      const productId = item.product_id || item.variant?.product?.id;
      const productName =
        item.variant?.product?.title || item.title || 'Unknown Product';

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

  return productSalesMap;
}

/**
 * Aggregate revenue by product from fulfillments
 */
export function aggregateRevenueByProduct(
  fulfillments: any[]
): Record<
  string,
  { product_id: string; product_name: string; revenue: number }
> {
  const productRevenueMap: Record<
    string,
    { product_id: string; product_name: string; revenue: number }
  > = {};
  const processedOrderIds = new Set<string>();

  for (const fulfillment of fulfillments) {
    if (!fulfillment.order || !fulfillment.order.id) continue;

    const orderId = fulfillment.order.id;

    // Skip if we've already processed this order
    if (processedOrderIds.has(orderId)) continue;
    processedOrderIds.add(orderId);

    if (!fulfillment.order.items || !Array.isArray(fulfillment.order.items))
      continue;

    for (const item of fulfillment.order.items) {
      // Get product ID from item
      const productId = item.product_id || item.variant?.product?.id;
      const productName =
        item.variant?.product?.title || item.title || 'Unknown Product';

      if (!productId) continue;

      // Initialize product in map if not exists
      if (!productRevenueMap[productId]) {
        productRevenueMap[productId] = {
          product_id: productId,
          product_name: productName,
          revenue: 0,
        };
      }

      // Calculate revenue: use subtotal if available, otherwise unit_price * quantity
      const quantity = item.quantity || 0;
      const unitPrice = item.unit_price || 0;
      const subtotal = item.subtotal || 0;

      // Prefer subtotal (which may include discounts/adjustments) over calculated value
      const itemRevenue = subtotal > 0 ? subtotal : unitPrice * quantity;

      productRevenueMap[productId].revenue += itemRevenue;
    }
  }

  return productRevenueMap;
}

