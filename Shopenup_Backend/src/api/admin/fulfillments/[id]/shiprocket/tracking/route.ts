import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from '@shopenup/framework';
import { Modules } from "@shopenup/framework/utils";
import type { IFulfillmentModuleService } from "@shopenup/framework/types";
import { getAuthenticatedClient } from 'src/modules/shiprocket/utils/shiprocket-client';
import { isMockModeEnabled, generateMockTracking } from 'src/modules/shiprocket/utils/mock-mode';

/**
 * Generate mock tracking data for testing
 */
/**
 * Generate mock tracking data for testing
 * Creates realistic tracking timeline with multiple status updates
 */
function generateMockTrackingData(awbCode: string) {
  const now = new Date();
  
  // Generate realistic tracking timeline (oldest to newest)
  const scans = [
    {
      date: new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString(), // 36 hours ago
      activity: 'AWB ASSIGNED',
      location: 'Delhi, NCR',
    },
    {
      date: new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString(), // 30 hours ago
      activity: 'PICKUP SCHEDULED',
      location: 'Delhi, NCR',
    },
    {
      date: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
      activity: 'SHIPMENT PICKED UP',
      location: 'Delhi, NCR',
    },
    {
      date: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(), // 20 hours ago
      activity: 'SHIPMENT ARRIVED AT ORIGIN HUB',
      location: 'Delhi, NCR',
    },
    {
      date: new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString(), // 18 hours ago
      activity: 'SHIPMENT IN TRANSIT',
      location: 'Delhi, NCR',
    },
    {
      date: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
      activity: 'SHIPMENT ARRIVED AT TRANSIT HUB',
      location: 'Pune, Maharashtra',
    },
    {
      date: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
      activity: 'SHIPMENT IN TRANSIT',
      location: 'Pune, Maharashtra',
    },
    {
      date: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      activity: 'SHIPMENT ARRIVED AT DESTINATION HUB',
      location: 'Mumbai, Maharashtra',
    },
    {
      date: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      activity: 'OUT FOR DELIVERY',
      location: 'Mumbai, Maharashtra',
    },
    {
      date: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      activity: 'SHIPMENT DELIVERED',
      location: 'Mumbai, Maharashtra',
    },
  ];

  // Get latest scan (most recent - last in array)
  const latestScan = scans[scans.length - 1];
  const pickedUpScan = scans[2]; // 3rd item (index 2) is "SHIPMENT PICKED UP"
  const pickupScheduledScan = scans[1]; // 2nd item (index 1) is "PICKUP SCHEDULED"

  // Reverse scans array to show newest first (UI expects newest at index 0)
  const reversedScans = [...scans].reverse();

  return {
    awb_code: awbCode || 'MOCK123456789',
    courier_name: 'Mock Courier Service',
    current_status: latestScan.activity.replace('SHIPMENT ', ''),
    last_status_at: latestScan.date,
    tracking_url: `https://shiprocket.co/tracking/${awbCode || 'MOCK123456789'}`,
    scans: reversedScans, // Newest first (index 0 is latest)
    shipped_at: pickedUpScan?.date,
    delivered_at: latestScan.date,
    pickup_scheduled_date: pickupScheduledScan?.date,
    source: 'mock',
  };
}

/**
 * Admin API endpoint to get live tracking information from Shiprocket
 * 
 * GET /admin/fulfillments/:id/shiprocket/tracking
 * 
 * This endpoint:
 * 1. Gets the AWB code from fulfillment data
 * 2. Calls Shiprocket API to get tracking information
 * 3. Returns tracking scans with location and status
 */

export async function GET(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse,
) {
  const { id: fulfillmentId } = req.params;

  try {

    // Resolve fulfillment module service
    const fulfillmentModuleService: IFulfillmentModuleService = req.scope.resolve(Modules.FULFILLMENT);
    
    // Get fulfillment details
    const fulfillment = await fulfillmentModuleService.retrieveFulfillment(fulfillmentId);
    
    if (!fulfillment) {
      return res.status(404).json({
        success: false,
        error: 'Fulfillment not found',
        message: `Fulfillment with ID ${fulfillmentId} not found`,
      });
    }

    const fulfillmentData = fulfillment.data as any || {};
    
    // Get AWB code
    const awbCode = fulfillmentData.awb_code;
    
    // Check for mock mode via query parameter, environment variable, or global flag
    const url = new URL(req.url || '', 'http://localhost');
    const forceMock = url.searchParams.get('mock') === 'true';
    const useMockTracking = forceMock || isMockModeEnabled() || process.env.USE_MOCK_TRACKING === 'true' || !awbCode;
    
    if (useMockTracking) {
      console.log('[Shiprocket Tracking] ⚠️ USING MOCK DATA (USE_SHIPROCKET_MOCK=true or mock query param)');
      
      // Use the centralized mock tracking generator
      const mockTracking = generateMockTracking(awbCode || `MOCK${fulfillmentId.slice(-8)}`);
      const mockData = generateMockTrackingData(awbCode || `MOCK${fulfillmentId.slice(-8)}`);
      
      // Merge both mock data sources for compatibility
      const responseData = {
        success: true,
        data: {
          ...mockData,
          ...mockTracking.data.tracking_data,
          shipped_at: fulfillment.shipped_at || mockData.shipped_at,
          delivered_at: fulfillment.delivered_at || mockData.delivered_at,
        },
      };
      
      return res.json(responseData);
    }
    
    if (!awbCode) {
      return res.status(400).json({
        success: false,
        error: 'AWB not assigned',
        message: 'Cannot get tracking - fulfillment does not have an AWB assigned',
      });
    }

    // Get Shiprocket configuration
    let shiprocketConfig: any;
    try {
      shiprocketConfig = req.scope.resolve('shiprocketConfig') as any;
    } catch (error) {
      shiprocketConfig = {
        email: process.env.SHIPROCKET_EMAIL || '',
        password: process.env.SHIPROCKET_PASSWORD || '',
        baseUrl: process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external',
      };
    }

    if (!shiprocketConfig?.email || !shiprocketConfig?.password) {
      console.warn('[Shiprocket Tracking] ⚠️ Shiprocket config not found, falling back to stored metadata or mock data');
      
      // Fallback to stored metadata if API is not available
      const shiprocketData = fulfillmentData;
      const storedScans = shiprocketData.scans || [];
      
      // If no stored scans, use mock data
      if (storedScans.length === 0) {
        const mockData = generateMockTrackingData(awbCode || `MOCK${fulfillmentId.slice(-8)}`);
        return res.json({
          success: true,
          data: {
            ...mockData,
            shipped_at: fulfillment.shipped_at || mockData.shipped_at,
            delivered_at: fulfillment.delivered_at || mockData.delivered_at,
          },
        });
      }
      
      const lastStatus = shiprocketData.last_status || 'Unknown';
      const lastStatusAt = shiprocketData.last_status_at;
      const courierName = shiprocketData.courier_name;
      const trackingUrl = shiprocketData.tracking_url || shiprocketData.shiprocket_tracking_url;

      return res.json({
        success: true,
        data: {
          awb_code: awbCode,
          courier_name: courierName,
          current_status: lastStatus,
          last_status_at: lastStatusAt,
          tracking_url: trackingUrl,
          scans: storedScans.map((scan: any) => ({
            date: scan.date,
            activity: scan.activity,
            location: scan.location,
          })),
          shipped_at: fulfillment.shipped_at,
          delivered_at: fulfillment.delivered_at,
          pickup_scheduled_date: shiprocketData.pickup_scheduled_date,
          source: 'metadata', // Indicate this is from stored data, not API
        },
      });
    }

    // Check if mock mode is enabled (even if we got here, check again)
    let trackingResult: any;

    if (isMockModeEnabled()) {
      console.log('[Shiprocket Tracking] ⚠️ USING MOCK DATA (USE_SHIPROCKET_MOCK=true)');
      trackingResult = generateMockTracking(awbCode);
    } else {
      // Get authenticated Shiprocket client
      const shiprocket = await getAuthenticatedClient({
        email: shiprocketConfig.email,
        password: shiprocketConfig.password,
        baseUrl: shiprocketConfig.baseUrl,
      });

      // Call Shiprocket tracking API for real-time data
      trackingResult = await shiprocket.tracking.trackByAwb(awbCode);
    }

    if (!trackingResult.success) {
      console.warn('[Shiprocket Tracking] ⚠️ Shiprocket API returned error, falling back to stored metadata or mock data');
      
      // Fallback to stored metadata if API call fails
      const shiprocketData = fulfillmentData;
      const storedScans = shiprocketData.scans || [];
      
      // If no stored scans, use mock data
      if (storedScans.length === 0) {
        const mockData = generateMockTrackingData(awbCode || `MOCK${fulfillmentId.slice(-8)}`);
        
        return res.json({
          success: true,
          data: {
            ...mockData,
            shipped_at: fulfillment.shipped_at || mockData.shipped_at,
            delivered_at: fulfillment.delivered_at || mockData.delivered_at,
            api_error: trackingResult.error?.message,
          },
        });
      }
      
      const lastStatus = shiprocketData.last_status || 'Unknown';
      const lastStatusAt = shiprocketData.last_status_at;
      const courierName = shiprocketData.courier_name;
      const trackingUrl = shiprocketData.tracking_url || shiprocketData.shiprocket_tracking_url;

      return res.json({
        success: true,
        data: {
          awb_code: awbCode,
          courier_name: courierName,
          current_status: lastStatus,
          last_status_at: lastStatusAt,
          tracking_url: trackingUrl,
          scans: storedScans.map((scan: any) => ({
            date: scan.date,
            activity: scan.activity,
            location: scan.location,
          })),
          shipped_at: fulfillment.shipped_at,
          delivered_at: fulfillment.delivered_at,
          pickup_scheduled_date: shiprocketData.pickup_scheduled_date,
          source: 'metadata',
          api_error: trackingResult.error?.message,
        },
      });
    }

    // Process Shiprocket API response
    const trackingData = trackingResult.data;

    // Extract tracking information from Shiprocket API response
    // Shiprocket API structure: tracking_data.shipment_track contains array of tracking events
    const trackingEvents = trackingData.tracking_data?.shipment_track || 
                           trackingData.tracking_data?.tracking || 
                           trackingData.track_data || 
                           trackingData.scans || 
                           trackingData.shipment_track_activities || 
                           [];

    // Get current status from Shiprocket API
    const currentStatus = trackingData.tracking_data?.shipment_status ||
                         trackingData.tracking_data?.current_status || 
                         trackingData.current_status || 
                         trackingData.shipment_status ||
                         trackingData.status ||
                         fulfillmentData.last_status || 
                         'Unknown';

    // Get courier information
    const courierName = trackingData.courier_name || 
                       trackingData.tracking_data?.courier_name ||
                       trackingData.courier?.name ||
                       fulfillmentData.courier_name;

    // Get tracking URL
    const trackingUrl = trackingData.tracking_url || 
                       trackingData.tracking_data?.tracking_url ||
                       `https://shiprocket.co/tracking/${awbCode}`;

    // Format scans to match our expected structure
    // Shiprocket API format: { date, status, location, ... }
    const formattedScans = Array.isArray(trackingEvents) ? trackingEvents.map((event: any) => {
      // Handle different scan formats from Shiprocket API
      // Common fields: date, status, location, city, hub, etc.
      return {
        date: event.date || 
              event.scan_date || 
              event.timestamp || 
              event.time || 
              event.created_at ||
              new Date().toISOString(),
        activity: event.status || 
                 event.activity || 
                 event.status_description || 
                 event.message || 
                 event.event ||
                 'Status Update',
        location: event.location || 
                 event.city || 
                 event.hub || 
                 event.origin || 
                 event.destination ||
                 event.warehouse ||
                 'Unknown',
      };
    }).reverse() : []; // Reverse to show latest first

    // Return real-time tracking information from Shiprocket API
    return res.json({
      success: true,
      data: {
        awb_code: awbCode,
        courier_name: courierName,
        current_status: currentStatus,
        last_status_at: formattedScans[0]?.date || trackingData.last_status_at || new Date().toISOString(),
        tracking_url: trackingUrl,
        scans: formattedScans,
        // Additional metadata from fulfillment
        shipped_at: fulfillment.shipped_at,
        delivered_at: fulfillment.delivered_at,
        pickup_scheduled_date: fulfillmentData.pickup_scheduled_date,
        source: 'api', // Indicate this is from real-time API
        // Additional Shiprocket API data
        ...(trackingData.etd && { etd: trackingData.etd }),
        ...(trackingData.estimated_delivery_date && { estimated_delivery_date: trackingData.estimated_delivery_date }),
      },
    });

    // ========== MOCK MODE: Skip Shiprocket API call ==========
    // console.log('[Shiprocket Tracking] ⚠️ USING MOCK DATA (Shiprocket API commented out)');
    // console.log('[Shiprocket Tracking] AWB Code:', awbCode);
    
    // // Use mock tracking data
    // const mockData = generateMockTrackingData(awbCode || `MOCK${fulfillmentId.slice(-8)}`);
    // return res.json({
    //   success: true,
    //   data: {
    //     ...mockData,
    //     shipped_at: fulfillment.shipped_at || mockData.shipped_at,
    //     delivered_at: fulfillment.delivered_at || mockData.delivered_at,
    //   },
    // });
    // ========== END MOCK MODE ==========
  } catch (error) {
    console.error('[Shiprocket Tracking] ❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get tracking information',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

