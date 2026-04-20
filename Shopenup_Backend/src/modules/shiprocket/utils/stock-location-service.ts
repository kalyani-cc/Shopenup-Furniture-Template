import { Pool } from 'pg';
import { ContainerRegistrationKeys } from '@shopenup/framework/utils';

// Create a connection pool (reuse connections)
// Use DATABASE_URL if available, otherwise use individual env vars
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  : new Pool({
      host: process.env.SHOPENUP_DB_HOST || 'localhost',
      port: parseInt(process.env.SHOPENUP_DB_PORT || '5432'),
      database: process.env.SHOPENUP_DB_NAME || 'shopenup_dev',
      user: process.env.SHOPENUP_DB_USER || 'postgres',
      password: process.env.SHOPENUP_DB_PASSWORD || 'postgres',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

export interface AvailabilityResult {
  variant_id: string;
  location_id: string;
  location_name: string;
  stock_pincode: string;
  available_quantity: number;
  is_available: boolean;
  shipping_option_id?: string;
  shipping_option_name?: string;
  shipping_provider_id?: string;
}

export interface NearestStockLocation {
  location_id: string;
  location_name: string;
  stock_pincode: string;
  distance_km: number;
}

/**
 * Helper: Get Shiprocket shipping option for a given stock location (Medusa v2)
 * Uses Query.graph to follow:
 * stock_location -> fulfillment_sets -> shipping_options
 */
async function getShiprocketShippingOptionForLocation(
  stockLocationId: string,
  scope: any // expects Medusa request scope or similar dependency injection context
) {
  try {
    // Try multiple ways to resolve the query service
    let query: any;
    
    if (!scope) {
      console.error('[Stock Location Service] Scope is undefined');
      return null;
    }

    // Try ContainerRegistrationKeys.QUERY first
    try {
      query = scope.resolve(ContainerRegistrationKeys.QUERY);
    } catch (e) {
      // Fallback to string 'query'
      try {
        query = scope.resolve('query');
      } catch (e2) {
        console.error('[Stock Location Service] Could not resolve query service:', e2);
        return null;
      }
    }

    if (!query || typeof query.graph !== 'function') {
      console.error('[Stock Location Service] Query service resolved but graph method not available');
      return null;
    }

    // Step 1: Get fulfillment sets with service zones for this stock location
    const { data: locations } = await query.graph({
      entity: 'stock_location',
      fields: [
        'id',
        'fulfillment_sets.*',
        'fulfillment_sets.service_zones.*',
      ],
      filters: {
        id: stockLocationId,
      },
    });

    const location = locations?.[0];

    if (!location || !location.fulfillment_sets || location.fulfillment_sets.length === 0) {
      console.warn('[Stock Location Service] Stock location not found or has no fulfillment sets:', stockLocationId);
      return null;
    }

    // Step 2: Get service zone IDs from all fulfillment sets
    const serviceZoneIds: string[] = [];
    location.fulfillment_sets.forEach((fs: any) => {
      if (fs.service_zones && Array.isArray(fs.service_zones)) {
        fs.service_zones.forEach((sz: any) => {
          if (sz.id) {
            serviceZoneIds.push(sz.id);
          }
        });
      }
    });

    if (serviceZoneIds.length === 0) {
      console.warn('[Stock Location Service] No service zones found for fulfillment sets');
      return null;
    }

    // Step 3: Query shipping options for these service zones
    const { data: shippingOptions } = await query.graph({
      entity: 'shipping_option',
      fields: [
        'id',
        'name',
        'provider_id',
        'service_zone_id',
      ],
      filters: {
        service_zone_id: { $in: serviceZoneIds },
        provider_id: { $in: ['shiprocket_shiprocket', 'shiprocket'] },
      },
    });

    // Get the first Shiprocket option found
    const shiprocketOption = shippingOptions?.[0] || null;

    return shiprocketOption;
  } catch (e: any) {
    console.error(
      '[Stock Location Service] Error loading shipping options for location',
      stockLocationId,
      e?.message,
      e?.stack,
    );
    
    // Fallback: Try SQL query if Medusa query service fails
    // Note: The link table is a remote link service, not a database table
    // So we'll query shipping_options directly by fulfillment_set_id
    // First, we need to get fulfillment_set_ids for this stock location
    try {
      // Fallback: Query all Shiprocket shipping options
      // Since we can't easily join through the remote link service in SQL,
      // we'll just get any Shiprocket option as a fallback
      const sqlQuery = `
        SELECT 
          so.id AS shipping_option_id,
          so.name AS shipping_option_name,
          so.provider_id AS shipping_provider_id
        FROM shipping_option so
        WHERE so.deleted_at IS NULL
          AND (so.provider_id = 'shiprocket_shiprocket' OR so.provider_id = 'shiprocket')
        ORDER BY so.created_at ASC
        LIMIT 1
      `;
      
      const sqlResult = await pool.query(sqlQuery);
      if (sqlResult.rows.length > 0) {
        // Return the first Shiprocket option found as fallback
        const option = sqlResult.rows[0];
        return {
          id: option.shipping_option_id,
          name: option.shipping_option_name,
          provider_id: option.shipping_provider_id,
        };
      }
    } catch (sqlError: any) {
      console.error('[Stock Location Service] SQL fallback also failed:', sqlError?.message);
    }
    
    return null;
  }
}

/**
 * Check product availability and get nearest stock location
 * Uses the same query logic as product-availability endpoint
 */
export async function checkProductAvailability(params: {
  user_pincode: string;
  variant_ids: string[];
  min_qty?: number;
  scope: any;
}): Promise<AvailabilityResult[]> {
  const { user_pincode, variant_ids, min_qty = 1 } = params;

  if (!user_pincode || !variant_ids || !Array.isArray(variant_ids) || variant_ids.length === 0) {
    throw new Error('user_pincode and variant_ids (array) are required');
  }

  // Validate pincode format (6 digits for India)
  if (!/^\d{6}$/.test(user_pincode)) {
    throw new Error('Invalid pincode format. Please enter a 6-digit pincode.');
  }

  // --- SQL: ONLY nearest location + inventory (no shipping tables!) ---
  const queryText = `
    -- === set parameters here (edit only inside this CTE) ===
    WITH params AS (
      SELECT
        $1::text AS user_pincode,
        $2::text[] AS variant_ids,
        $3::int AS min_qty
    ),

    user_pin AS (
      SELECT latitude::double precision AS u_lat,
             longitude::double precision AS u_lon
      FROM pincode_locations
      WHERE pincode = (SELECT user_pincode FROM params)
      LIMIT 1
    ),

    stock_pins AS (
      SELECT sl.id AS location_id,
             trim(sla.postal_code) AS stock_pincode
      FROM stock_location sl
      JOIN stock_location_address sla ON sla.id = sl.address_id
      WHERE sl.deleted_at IS NULL
        AND sla.deleted_at IS NULL
        AND sla.postal_code IS NOT NULL
    ),

    stock_coords AS (
      SELECT sp.location_id,
             sp.stock_pincode,
             plc.latitude::double precision AS s_lat,
             plc.longitude::double precision AS s_lon
      FROM stock_pins sp
      JOIN pincode_locations plc ON plc.pincode = sp.stock_pincode
    ),

    distances AS (
      SELECT sc.location_id,
             sc.stock_pincode,
             sc.s_lat,
             sc.s_lon,
             ( 6371 * acos(
                 cos(radians((SELECT u_lat FROM user_pin))) *
                 cos(radians(sc.s_lat)) *
                 cos(radians(sc.s_lon) - radians((SELECT u_lon FROM user_pin))) +
                 sin(radians((SELECT u_lat FROM user_pin))) *
                 sin(radians(sc.s_lat))
               )
             ) AS distance_km
      FROM stock_coords sc
    ),

    nearest AS (
      SELECT * FROM distances ORDER BY distance_km ASC LIMIT 1
    ),

    variants AS (
      SELECT trim(v) AS variant_id
      FROM unnest((SELECT variant_ids FROM params)) AS v
    )

    SELECT
      v.variant_id,
      sl.id AS location_id,
      sl.name AS location_name,
      n.stock_pincode,
      COALESCE(
        SUM(
          GREATEST(COALESCE(il.stocked_quantity,0) - COALESCE(il.reserved_quantity,0), 0)
        ), 0
      ) AS available_quantity,
      CASE
        WHEN COALESCE(
          SUM(
            GREATEST(COALESCE(il.stocked_quantity,0) - COALESCE(il.reserved_quantity,0), 0)
          ), 0
        ) >= (SELECT min_qty FROM params) THEN true
          ELSE false
      END AS is_available
    FROM variants v
    CROSS JOIN nearest n
    JOIN stock_location sl ON sl.id = n.location_id AND sl.deleted_at IS NULL
    LEFT JOIN product_variant_inventory_item pvii
      ON pvii.variant_id = v.variant_id
      AND pvii.deleted_at IS NULL
    LEFT JOIN inventory_item ii
      ON ii.id = pvii.inventory_item_id
      AND ii.deleted_at IS NULL
    LEFT JOIN inventory_level il
      ON il.inventory_item_id = ii.id
      AND il.location_id = sl.id
      AND il.deleted_at IS NULL
    GROUP BY v.variant_id, sl.id, sl.name, n.stock_pincode, n.s_lat, n.s_lon, n.distance_km
    ORDER BY v.variant_id;
  `;

  // Check if user pincode exists
  const pincodeCheck = await pool.query(
    'SELECT latitude, longitude FROM pincode_locations WHERE pincode = $1 LIMIT 1',
    [user_pincode]
  );

  if (pincodeCheck.rows.length === 0) {
    throw new Error('Pincode not found in our database. Please enter a valid pincode.');
  }

  // Execute the main query (nearest stock location + availability)
  const result = await pool.query(queryText, [user_pincode, variant_ids, min_qty]);

  if (result.rows.length === 0) {
    return [];
  }

  // Nearest stock location ID (same for all rows because of CROSS JOIN nearest)
  const nearestLocationId: string = result.rows[0].location_id;

  // 🔍 Load Shiprocket shipping option for this location using Medusa v2 Query
  const shiprocketOption = await getShiprocketShippingOptionForLocation(
    nearestLocationId,
    params.scope
  );

  // Transform results + inject shipping option
  const availability: AvailabilityResult[] = result.rows.map((row) => ({
    variant_id: row.variant_id,
    location_id: row.location_id,
    location_name: row.location_name,
    stock_pincode: row.stock_pincode,
    available_quantity: parseInt(row.available_quantity) || 0,
    is_available: row.is_available || false,
    shipping_option_id: shiprocketOption?.id,
    shipping_option_name: shiprocketOption?.name,
    shipping_provider_id: shiprocketOption?.provider_id,
  }));

  // Log for debugging
  if (shiprocketOption) {
    // Shipping option found
  } else {
    console.warn('[Stock Location Service] ⚠️ No Shiprocket shipping option found for stock location:', {
      location_id: availability[0].location_id,
      location_name: availability[0].location_name,
    });
  }

  return availability;
}

/**
 * Get nearest stock location postal code based on delivery postal code
 * Returns just the postal code (simpler version for fulfillment options)
 */
export async function getNearestStockLocationPincode(
  deliveryPincode: string
): Promise<string> {
  if (!deliveryPincode || !/^\d{6}$/.test(deliveryPincode)) {
    return process.env.DEFAULT_PICKUP_PIN || '400001';
  }

  try {
    const stockLocationQuery = `
      WITH user_pin AS (
        SELECT latitude::double precision AS u_lat,
               longitude::double precision AS u_lon
        FROM pincode_locations
        WHERE pincode = $1
        LIMIT 1
      ),
      stock_pins AS (
        SELECT sl.id AS location_id,
               trim(sla.postal_code) AS stock_pincode
        FROM stock_location sl
        JOIN stock_location_address sla ON sla.id = sl.address_id
        WHERE sl.deleted_at IS NULL
          AND sla.deleted_at IS NULL
          AND sla.postal_code IS NOT NULL
      ),
      stock_coords AS (
        SELECT sp.location_id,
               sp.stock_pincode,
               plc.latitude::double precision AS s_lat,
               plc.longitude::double precision AS s_lon
        FROM stock_pins sp
        JOIN pincode_locations plc ON plc.pincode = sp.stock_pincode
      ),
      distances AS (
        SELECT sc.location_id,
               sc.stock_pincode,
               sc.s_lat,
               sc.s_lon,
               ( 6371 * acos(
                   cos(radians((SELECT u_lat FROM user_pin))) *
                   cos(radians(sc.s_lat)) *
                   cos(radians(sc.s_lon) - radians((SELECT u_lon FROM user_pin))) +
                   sin(radians((SELECT u_lat FROM user_pin))) *
                   sin(radians(sc.s_lat))
                 )
               ) AS distance_km
        FROM stock_coords sc
      ),
      nearest AS (
        SELECT stock_pincode FROM distances ORDER BY distance_km ASC LIMIT 1
      )
      SELECT stock_pincode FROM nearest;
    `;

    const result = await pool.query(stockLocationQuery, [deliveryPincode]);

    if (result.rows.length > 0 && result.rows[0].stock_pincode) {
      return result.rows[0].stock_pincode.trim();
    }

    // Fallback to default
    return process.env.DEFAULT_PICKUP_PIN || '400001';
  } catch (error: any) {
    console.error('[Stock Location Service] Error finding nearest stock location:', error.message);
    return process.env.DEFAULT_PICKUP_PIN || '400001';
  }
}

/**
 * Get nearest stock location with full details
 * Returns location_id, location_name, stock_pincode, and distance_km
 */
export async function getNearestStockLocation(
  deliveryPincode: string
): Promise<NearestStockLocation | null> {
  if (!deliveryPincode || !/^\d{6}$/.test(deliveryPincode)) {
    return null;
  }

  try {
    const stockLocationQuery = `
      WITH user_pin AS (
        SELECT latitude::double precision AS u_lat,
               longitude::double precision AS u_lon
        FROM pincode_locations
        WHERE pincode = $1
        LIMIT 1
      ),
      stock_pins AS (
        SELECT sl.id AS location_id,
               sl.name AS location_name,
               trim(sla.postal_code) AS stock_pincode
        FROM stock_location sl
        JOIN stock_location_address sla ON sla.id = sl.address_id
        WHERE sl.deleted_at IS NULL
          AND sla.deleted_at IS NULL
          AND sla.postal_code IS NOT NULL
      ),
      stock_coords AS (
        SELECT sp.location_id,
               sp.location_name,
               sp.stock_pincode,
               plc.latitude::double precision AS s_lat,
               plc.longitude::double precision AS s_lon
        FROM stock_pins sp
        JOIN pincode_locations plc ON plc.pincode = sp.stock_pincode
      ),
      distances AS (
        SELECT sc.location_id,
               sc.location_name,
               sc.stock_pincode,
               sc.s_lat,
               sc.s_lon,
               ( 6371 * acos(
                   cos(radians((SELECT u_lat FROM user_pin))) *
                   cos(radians(sc.s_lat)) *
                   cos(radians(sc.s_lon) - radians((SELECT u_lon FROM user_pin))) +
                   sin(radians((SELECT u_lat FROM user_pin))) *
                   sin(radians(sc.s_lat))
                 )
               ) AS distance_km
        FROM stock_coords sc
      ),
      nearest AS (
        SELECT * FROM distances ORDER BY distance_km ASC LIMIT 1
      )
      SELECT location_id, location_name, stock_pincode, distance_km FROM nearest;
    `;

    const result = await pool.query(stockLocationQuery, [deliveryPincode]);

    if (result.rows.length > 0) {
      return {
        location_id: result.rows[0].location_id,
        location_name: result.rows[0].location_name,
        stock_pincode: result.rows[0].stock_pincode.trim(),
        distance_km: parseFloat(result.rows[0].distance_km) || 0,
      };
    }

    return null;
  } catch (error: any) {
    console.error('[Stock Location Service] Error finding nearest stock location:', error.message);
    return null;
  }
}
