import { AuthenticatedShopenupRequest, ShopenupResponse } from "@shopenup/framework";

export async function GET(req: AuthenticatedShopenupRequest, res: ShopenupResponse) {
  try {
    const query = req.scope.resolve("query");

    // ------------------------------------------------------
    // Parse filters
    // ------------------------------------------------------
    const url = new URL(req.url || "", "http://localhost");
    const params = url.searchParams;

    let dateFrom: string | null = params.get("dateFrom");
    let dateTo: string | null = params.get("dateTo");

    // 🔥 NEW: region filter from frontend
    let region: string | null = params.get("region");

    // existing
    let state: string | null = params.get("state");

    // ------------------------------------------------------
    // POST body support
    // ------------------------------------------------------
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      dateFrom = body.dateFrom || body.dateRange?.from || null;
      dateTo = body.dateTo || body.dateRange?.to || null;

      // 🔥 NEW region handling
      region = body.region || null;

      // state handling
      state = body.state || null;
    }

    // ------------------------------------------------------
    // Date range
    // ------------------------------------------------------
    const rangeStart = dateFrom
      ? new Date(new Date(dateFrom).setHours(0, 0, 0, 0))
      : new Date(new Date().setHours(0, 0, 0, 0));

    const rangeEnd = dateTo
      ? new Date(new Date(dateTo).setHours(23, 59, 59, 999))
      : new Date(new Date().setHours(23, 59, 59, 999));

    // ------------------------------------------------------
    // Fetch products + inventory + locations
    // ------------------------------------------------------
    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "variants.*",
        "variants.id",
        "variants.sku",
        "variants.manage_inventory",
        "variants.inventory.*",
        "variants.inventory.location_levels.*",
        "variants.inventory.location_levels.stocked_quantity",
        "variants.inventory.location_levels.reserved_quantity",
        "variants.inventory.location_levels.incoming_quantity",
        "variants.inventory.location_levels.location_id",
        "variants.inventory.location_levels.stock_locations.*",
        "variants.inventory.location_levels.stock_locations.name",
        "variants.inventory.location_levels.stock_locations.address.*",
        "variants.inventory.location_levels.stock_locations.address.country_code",
        "variants.inventory.location_levels.stock_locations.address.province",
        "variants.inventory.location_levels.stock_locations.address.city",
      ],
    });

    // ------------------------------------------------------
    // Fetch fulfillments (delivered)
    // ------------------------------------------------------
    const { data: fulfillments } = await query.graph({
      entity: "fulfillment",
      fields: [
        "id",
        "delivered_at",
        "order.id",
        "order.items.*",
        "order.items.variant_id",
        "order.items.quantity",
        "location_id",
      ],
    });

    // Filter by delivered date (IST)
    const delivered =
      fulfillments?.filter((f: any) => {
        if (!f.delivered_at) return false;
        const d = new Date(f.delivered_at);

        const local = new Date(d.getTime() + 5.5 * 60 * 60 * 1000); // UTC → IST

        return local >= rangeStart && local <= rangeEnd;
      }) || [];

    // ------------------------------------------------------
    // Calculate sold qty map
    // ------------------------------------------------------
    const soldQtyMap: Record<string, Record<string, number>> = {};

    for (const f of delivered) {
      const locId = f.location_id;

      for (const item of f.order?.items || []) {
        const vid = item.variant_id;
        if (!vid || !locId) continue;

        if (!soldQtyMap[vid]) soldQtyMap[vid] = {};
        soldQtyMap[vid][locId] = (soldQtyMap[vid][locId] || 0) + (item.quantity || 0);
      }
    }

    // ------------------------------------------------------
    // Build product response
    // ------------------------------------------------------
    const productMap: Record<string, any> = {};

    for (const product of products || []) {
      if (!productMap[product.id]) {
        productMap[product.id] = {
          product_id: product.id,
          product_name: product.title,
          total_inventory: 0,
          layers: [],
        };
      }

      const group = productMap[product.id];

      for (const variant of product.variants || []) {
        if (!variant.manage_inventory) continue;

        const variantSoldLocations = soldQtyMap[variant.id] || {};

        for (const inv of variant.inventory || []) {
          for (const level of inv.location_levels || []) {
            const loc = level.stock_locations?.[0];
            if (!loc) continue;

            const country = loc.address?.country_code;
            const province = loc.address?.province || "Unknown State";
            const city = loc.address?.city || "Unknown City";

            // ------------------------------------------------------
            // 🔥 Apply region (country) filter
            // ------------------------------------------------------
            if (region && country !== region) continue;

            // ------------------------------------------------------
            // 🔥 Apply state filter
            // ------------------------------------------------------
            if (state && province !== state) continue;

            // ------------------------------------------------------
            // Grouping
            // ------------------------------------------------------
            const groupingName = !state ? province : city;

            const stocked = level.stocked_quantity || 0;
            const reserved = level.reserved_quantity || 0;
            const incoming = level.incoming_quantity || 0;

            const remaining = stocked - reserved + incoming;
            const sold = variantSoldLocations[level.location_id] || 0;

            const total = remaining + sold;

            // find or create layer
            let layer = group.layers.find((l: any) => l.location_name === groupingName);

            if (!layer) {
              layer = {
                location_name: groupingName,
                country: country,
                state: province,
                city: city,
                sold_quantity: 0,
                remaining_to_sell: 0,
                total_inventory: 0,
                stock_location_count: 0,
              };
              group.layers.push(layer);
            }

            // accumulate
            layer.sold_quantity += sold;
            layer.remaining_to_sell += remaining;
            layer.total_inventory += total;
            layer.stock_location_count += 1;

            group.total_inventory += total;
          }
        }
      }
    }

    const final = Object.values(productMap);

    res.json({
      items: final,
      count: final.length,
      date_range: {
        from: rangeStart.toISOString(),
        to: rangeEnd.toISOString(),
      },
    });
  } catch (error) {
    console.error("ERR:", error);
    res.status(500).json({
      code: "internal_error",
      message: error?.message || "Failed to fetch inventory movement",
    });
  }
}

export async function POST(req: AuthenticatedShopenupRequest, res: ShopenupResponse) {
  return GET(req, res);
}
