import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from '@shopenup/framework';
import { Shiprocket } from '@shopenup/logistic';
import { getAuthenticatedClient } from 'src/modules/shiprocket/utils/shiprocket-client';
import { mapCountryCode } from 'src/modules/shiprocket/utils/order-mapper';

/**
 * Map state/province code to full state name
 * Handles Indian state codes (IN-GJ -> Gujarat) and other formats
 */
function mapStateCode(stateCode: string): string {
  if (!stateCode) return '';
  
  // If already a state name (doesn't start with country code), return as is
  if (!stateCode.includes('-')) {
    return stateCode;
  }
  
  // Handle Indian state codes (IN-GJ format)
  if (stateCode.startsWith('IN-')) {
    const stateMap: Record<string, string> = {
      'IN-AN': 'Andaman and Nicobar Islands',
      'IN-AP': 'Andhra Pradesh',
      'IN-AR': 'Arunachal Pradesh',
      'IN-AS': 'Assam',
      'IN-BR': 'Bihar',
      'IN-CH': 'Chandigarh',
      'IN-CT': 'Chhattisgarh',
      'IN-DN': 'Dadra and Nagar Haveli and Daman and Diu',
      'IN-DL': 'Delhi',
      'IN-GA': 'Goa',
      'IN-GJ': 'Gujarat',
      'IN-HR': 'Haryana',
      'IN-HP': 'Himachal Pradesh',
      'IN-JH': 'Jharkhand',
      'IN-KA': 'Karnataka',
      'IN-KL': 'Kerala',
      'IN-LD': 'Lakshadweep',
      'IN-MP': 'Madhya Pradesh',
      'IN-MH': 'Maharashtra',
      'IN-MN': 'Manipur',
      'IN-ML': 'Meghalaya',
      'IN-MZ': 'Mizoram',
      'IN-NL': 'Nagaland',
      'IN-OR': 'Odisha',
      'IN-PY': 'Puducherry',
      'IN-PB': 'Punjab',
      'IN-RJ': 'Rajasthan',
      'IN-SK': 'Sikkim',
      'IN-TN': 'Tamil Nadu',
      'IN-TG': 'Telangana',
      'IN-TR': 'Tripura',
      'IN-UP': 'Uttar Pradesh',
      'IN-UT': 'Uttarakhand',
      'IN-WB': 'West Bengal',
    };
    return stateMap[stateCode.toUpperCase()] || stateCode;
  }
  
  // For other country-state formats, try to extract state code or return as is
  const parts = stateCode.split('-');
  if (parts.length > 1) {
    // Return the state part (after the country code)
    return parts.slice(1).join('-');
  }
  
  return stateCode;
}

/**
 * Admin API endpoint to create/update Shiprocket pickup location from stock location
 * 
 * POST /admin/stock-locations/:id/shiprocket-pickup
 * 
 * This endpoint:
 * 1. Retrieves the stock location by ID
 * 2. Extracts address information
 * 3. Creates a pickup location in Shiprocket
 * 4. Stores the pickup location ID in stock location metadata
 * 
 * Called automatically by stock-location-created/updated subscribers
 * Can also be called manually by admin
 */
export async function POST(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse,
) {
  const { id: stockLocationId } = req.params;

  try {

    // Get query service to fetch stock location
    const query = req.scope.resolve('query');
    
    // Fetch stock location with address
    const { data: stockLocations } = await query.graph({
      entity: 'stock_location',
      fields: [
        'id',
        'name',
        'address.*',
        'address.address_1',
        'address.address_2',
        'address.city',
        'address.country_code',
        'address.province',
        'address.postal_code',
        'address.phone',
        'metadata.*',
      ],
      filters: {
        id: stockLocationId,
      },
    });

    if (!stockLocations || stockLocations.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Stock location not found',
        message: `Stock location with ID ${stockLocationId} not found`,
      });
    }

    const stockLocation = stockLocations[0] as any;

    // Validate address exists
    if (!stockLocation.address) {
      return res.status(400).json({
        success: false,
        error: 'Missing address',
        message: 'Stock location must have an address to create Shiprocket pickup location',
      });
    }

    const address = stockLocation.address;

    // Validate required address fields
    const requiredFields = ['address_1', 'city', 'country_code', 'province', 'postal_code', 'phone'];
    const missingFields = requiredFields.filter(field => !address[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Incomplete address',
        message: `Missing required address fields: ${missingFields.join(', ')}`,
        missing_fields: missingFields,
      });
    }

    // Get Shiprocket configuration
    let shiprocketConfig: any;
    try {
      shiprocketConfig = req.scope.resolve('shiprocketConfig') as any;
    } catch (error) {
      // Fallback to environment variables
      shiprocketConfig = {
        email: process.env.SHIPROCKET_EMAIL || '',
        password: process.env.SHIPROCKET_PASSWORD || '',
        baseUrl: process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external',
      };
    }

    if (!shiprocketConfig?.email || !shiprocketConfig?.password) {
      return res.status(500).json({
        success: false,
        error: 'Shiprocket configuration not found',
        message: 'Please set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD environment variables',
      });
    }

    // Get authenticated Shiprocket client
    console.log('[Shiprocket Pickup API] 🔗 Authenticating Shiprocket client...');
    const shiprocket = await getAuthenticatedClient({
      email: shiprocketConfig.email,
      password: shiprocketConfig.password,
      baseUrl: shiprocketConfig.baseUrl,
    });
    console.log('[Shiprocket Pickup API] ✅ Shiprocket client authenticated');

    // Get pickup_location from request body if provided, otherwise use stock location name
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    // Use stock location name as pickup location name
    const pickupLocationName = body.pickup_location || stockLocation.name || `Stock Location ${stockLocation.id}`;

    // Map country code and province code to full names
    const countryName = mapCountryCode(address.country_code || 'IN');
    const stateName = mapStateCode(address.province || '');

    // Map stock location address to Shiprocket pickup location format
    // Shiprocket expects: pickup_location, name, email, phone, address, address_2, city, state, country, pin_code
    const pickupLocationData = {
      pickup_location: pickupLocationName, // Use stock location name as pickup location name
      name: stockLocation.name || 'Warehouse Manager', // Use stock location name
      email: process.env.SHIPROCKET_PICKUP_EMAIL || shiprocketConfig.email || 'warehouse@example.com',
      phone: address.phone,
      address: address.address_1,
      address_2: address.address_2 || '',
      city: address.city,
      state: stateName || address.province || '', // Use full state name, fallback to province code
      country: countryName, // Use full country name instead of code
      pin_code: address.postal_code,
    };

    console.log('[Shiprocket Pickup API] 📋 Pickup location data:', JSON.stringify(pickupLocationData, null, 2));

    // Check if pickup location already exists in metadata
    const existingPickupLocationId = stockLocation.metadata?.shiprocket_pickup_location_id;
    let action = 'created';
    let pickupLocationId: number;

    if (existingPickupLocationId) {
      // Shiprocket does not allow updating pickup addresses
      // Return existing pickup location ID without attempting update
      console.log('[Shiprocket Pickup API] ℹ️  Pickup location already exists:', existingPickupLocationId);
      console.log('[Shiprocket Pickup API] ℹ️  Shiprocket does not allow updating pickup addresses. Skipping update.');
      pickupLocationId = Number(existingPickupLocationId);
      action = 'skipped';
      
      return res.json({
        success: true,
        action,
        pickup_location: pickupLocationId,
        stock_location_id: stockLocationId,
        message: `Pickup location ${pickupLocationId} already exists for stock location ${stockLocationId}. Shiprocket does not allow updating pickup addresses.`,
      });
    }

    // Create new pickup location
    console.log('[Shiprocket Pickup API] ➕ Creating new pickup location...');
    const createResponse = await shiprocket.pickups.createPickupLocation(pickupLocationData);

    if (!createResponse.success || !createResponse.data) {
      throw new Error(createResponse.error?.message || 'Failed to create pickup location');
    }

    // Extract pickup_id from response (Shiprocket returns pickup_id, not pickup_location_id)
    // TypeScript workaround: cast to any to access response properties
    const responseData = createResponse.data as any;
    
    // Log the full response for debugging
    console.log('[Shiprocket Pickup API] 📋 Full response data:', JSON.stringify(responseData, null, 2));
    
    // Extract pickup_id - check multiple possible locations in the response
    const extractedId = responseData?.pickup_id || 
                        (responseData?.address && typeof responseData.address === 'object' ? responseData.address.id : null) ||
                        responseData?.pickup_location_id ||
                        responseData?.address?.id;
    
    console.log('[Shiprocket Pickup API] 🔍 Extracted ID:', extractedId);
    
    if (!extractedId) {
      console.error('[Shiprocket Pickup API] ❌ Response data structure:', JSON.stringify(responseData, null, 2));
      throw new Error('Failed to extract pickup location ID from Shiprocket response');
    }
    
    pickupLocationId = Number(extractedId);
    console.log('[Shiprocket Pickup API] ✅ Pickup location created with ID:', pickupLocationId);

    // Update stock location metadata with pickup location ID and stock location name
    // Use manager service to update directly
    try {
      const manager = req.scope.resolve("manager") as any;
      
      // Prepare metadata with stock location name
      const updatedMetadata = {
        ...(stockLocation.metadata || {}),
        shiprocket_pickup_location_id: pickupLocationId,
        shiprocket_pickup_location_name: pickupLocationData.pickup_location,
        shiprocket_stock_location_name: stockLocation.name, // Store stock location name in metadata
        shiprocket_pickup_synced_at: new Date().toISOString(),
      };
      
      console.log('[Shiprocket Pickup API] 📝 Updating metadata:', JSON.stringify(updatedMetadata, null, 2));
      
      await manager.transaction(async (transactionManager: any) => {
        const stockLocationRepo = transactionManager.getRepository("stock_location");
        
        const updateResult = await stockLocationRepo.update(
          { id: stockLocationId },
          {
            metadata: updatedMetadata,
          }
        );
        
        console.log('[Shiprocket Pickup API] 📝 Update result:', updateResult);
      });

      console.log('[Shiprocket Pickup API] ✅ Stock location metadata updated with pickup location ID and stock location name');
    } catch (updateError: any) {
      console.error('[Shiprocket Pickup API] ❌ Error updating stock location metadata:', updateError);
      // Don't throw - pickup was created successfully, metadata update failure is not critical
      // But log it for debugging
    }

    return res.json({
      success: true,
      action,
      pickup_location: pickupLocationId,
      stock_location_id: stockLocationId,
      message: `Successfully ${action} Shiprocket pickup location ${pickupLocationId} for stock location ${stockLocationId}`,
    });
  } catch (error) {
    console.error('[Shiprocket Pickup API] ❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create/update pickup location',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
    });
  }
}

// Also support GET for easy testing
export async function GET(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse,
) {
  const { id: stockLocationId } = req.params;

  try {
    // Get query service to fetch stock location
    const query = req.scope.resolve('query');
    
    // Fetch stock location with address and metadata
    const { data: stockLocations } = await query.graph({
      entity: 'stock_location',
      fields: [
        'id',
        'name',
        'address.*',
        'metadata.*',
      ],
      filters: {
        id: stockLocationId,
      },
    });

    if (!stockLocations || stockLocations.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Stock location not found',
      });
    }

    const stockLocation = stockLocations[0] as any;
    const pickupLocationId = stockLocation.metadata?.shiprocket_pickup_location_id;

    return res.json({
      success: true,
      stock_location: {
        id: stockLocation.id,
        name: stockLocation.name,
        has_address: !!stockLocation.address,
        address: stockLocation.address,
      },
      shiprocket_pickup: {
        pickup_location_id: pickupLocationId || null,
        synced_at: stockLocation.metadata?.shiprocket_pickup_synced_at || null,
        is_configured: !!pickupLocationId,
      },
    });
  } catch (error) {
    console.error('[Shiprocket Pickup API] ❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch stock location',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

