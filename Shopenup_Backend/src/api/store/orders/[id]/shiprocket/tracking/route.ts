import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from '@shopenup/framework';
import { getAuthenticatedClient } from 'src/modules/shiprocket/utils/shiprocket-client';
import { isMockModeEnabled, generateMockTracking } from 'src/modules/shiprocket/utils/mock-mode';

/**
 * Storefront API endpoint to get Shiprocket tracking information for an order
 * 
 * GET /store/orders/:id/shiprocket/tracking
 * 
 * This endpoint:
 * 1. Gets the order and finds Shiprocket fulfillment
 * 2. Gets the AWB code from fulfillment data
 * 3. Returns tracking scans with location and status
 */

export async function GET(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse,
) {
  const { id: orderId } = req.params;

  try {
    console.log('[Store Shiprocket Tracking] 📍 Getting tracking info for order:', orderId);

    // Resolve query service
    const query = req.scope.resolve('query') as any;
    
    // Get order with fulfillments using query service
    const { data: orders } = await query.graph({
      entity: 'order',
      filters: { id: orderId },
      fields: [
        'id',
        'fulfillments.id',
        'fulfillments.provider_id',
        'fulfillments.data',
        'fulfillments.tracking_numbers',
        'fulfillments.shipped_at',
        'fulfillments.delivered_at',
      ],
    });
    
    const order = orders && orders.length > 0 ? (orders[0] as any) : null;
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: `Order with ID ${orderId} not found`,
      });
    }

    // Find Shiprocket fulfillment
    const fulfillments = (order.fulfillments || []) as any[];
    const shiprocketFulfillment = fulfillments.find((f: any) => {
      const providerId = f.provider_id?.toLowerCase() || '';
      return providerId.includes('shiprocket') || 
             (f.data as any)?.shiprocket?.awb_code ||
             (f.data as any)?.awb_code;
    });

    if (!shiprocketFulfillment) {
      return res.status(404).json({
        success: false,
        error: 'Shiprocket fulfillment not found',
        message: 'This order does not have a Shiprocket fulfillment',
      });
    }

    const fulfillmentData = shiprocketFulfillment.data as any || {};
    
    // Get AWB code
    const awbCode = fulfillmentData.awb_code || 
                   fulfillmentData.shiprocket?.awb_code ||
                   fulfillmentData.shiprocket?.awb ||
                   shiprocketFulfillment.tracking_numbers?.[0];

    // Get tracking URL
    const trackingUrl = fulfillmentData.tracking_url || 
                       fulfillmentData.shiprocket?.tracking_url ||
                       fulfillmentData.shiprocket_tracking_url ||
                       (awbCode ? `https://shiprocket.co/tracking/${awbCode}` : null);

    // Get courier name
    const courierName = fulfillmentData.courier_name ||
                       fulfillmentData.shiprocket?.courier_name ||
                       'Unknown Courier';

    // Get current status
    const currentStatus = fulfillmentData.last_status ||
                         fulfillmentData.shiprocket?.last_status ||
                         shiprocketFulfillment.shipped_at ? 'Shipped' :
                         shiprocketFulfillment.delivered_at ? 'Delivered' :
                         'Processing';

    // Try to get real-time tracking data from Shiprocket API
    let realTimeTrackingData: any = null;
    
    if (awbCode) {
      try {
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

        if (shiprocketConfig?.email && shiprocketConfig?.password) {
          let trackingResult: any;

          if (isMockModeEnabled()) {
            console.log('[Store Shiprocket Tracking] ⚠️ USING MOCK DATA (USE_SHIPROCKET_MOCK=true)');
            trackingResult = generateMockTracking(awbCode);
          } else {
            console.log('[Store Shiprocket Tracking] 📞 Calling Shiprocket API for real-time tracking...');
            const shiprocket = await getAuthenticatedClient({
              email: shiprocketConfig.email,
              password: shiprocketConfig.password,
              baseUrl: shiprocketConfig.baseUrl,
            });

            console.log('[Store Shiprocket Tracking] 🔄 About to call trackByAwb with AWB:', awbCode);
            
            trackingResult = await shiprocket.tracking.trackByAwb(awbCode);

            console.log('[Store Shiprocket Tracking] 📞 Tracking result received');
            console.log('[Store Shiprocket Tracking] 📞 Tracking result type:', typeof trackingResult);
            console.log('[Store Shiprocket Tracking] 📞 Tracking result:', JSON.stringify(trackingResult, null, 2));
          }
          
          if (trackingResult.success && trackingResult.data) {
            // Handle both cases: trackingResult.data might be the tracking_data object directly,
            // or it might be wrapped in { tracking_data: {...} }
            realTimeTrackingData = trackingResult.data.tracking_data || trackingResult.data;
            console.log('[Store Shiprocket Tracking] 📞 Real-time tracking data structure:', {
              has_tracking_data: !!trackingResult.data.tracking_data,
              is_direct: !trackingResult.data.tracking_data,
              keys: Object.keys(trackingResult.data),
            });
            console.log('[Store Shiprocket Tracking] ✅ Got real-time tracking data from Shiprocket API');
          } else {
            console.warn('[Store Shiprocket Tracking] ⚠️ Shiprocket API returned error:', trackingResult.error?.message);
          }
        }
      } catch (apiError) {
        console.error('[Store Shiprocket Tracking] ❌ Exception caught in API call block');
        console.error('[Store Shiprocket Tracking] ❌ Error type:', typeof apiError);
        console.error('[Store Shiprocket Tracking] ❌ Error message:', apiError instanceof Error ? apiError.message : String(apiError));
        console.error('[Store Shiprocket Tracking] ❌ Error stack:', apiError instanceof Error ? apiError.stack : 'No stack trace');
        console.warn('[Store Shiprocket Tracking] ⚠️ Failed to fetch from Shiprocket API:', apiError);
      }
    }

    // If we have real-time data from API, use it
    // Handle both cases: data might be { tracking_data: {...} } or directly tracking_data
    const trackingData = realTimeTrackingData?.tracking_data || realTimeTrackingData;
    
    if (trackingData && (trackingData.shipment_track || trackingData.shipment_track_activities)) {
      
      // Get shipment details from shipment_track array (first item contains current status)
      const shipmentDetails = trackingData.shipment_track?.[0] || {};
      
      // Get tracking activities from shipment_track_activities array
      const trackingActivities = trackingData.shipment_track_activities || [];

      console.log('[Store Shiprocket Tracking] 📞 Tracking data structure:', {
        has_tracking_data: !!trackingData,
        shipment_track_length: trackingData.shipment_track?.length || 0,
        shipment_track_activities_length: trackingActivities.length,
        current_status: shipmentDetails.current_status,
        courier_name: shipmentDetails.courier_name,
        shipment_status: trackingData.shipment_status,
        first_activity: trackingActivities[0],
        all_activities: trackingActivities,
      });
      
      // Format scans from shipment_track_activities (these are the actual tracking events)
      if (trackingActivities.length === 0) {
        console.warn('[Store Shiprocket Tracking] ⚠️ No tracking activities found in shipment_track_activities');
        console.log('[Store Shiprocket Tracking] 📋 Available keys in trackingData:', Object.keys(trackingData));
      }
      
      // Shiprocket API returns activities in reverse chronological order (newest first)
      // So we don't need to reverse - index 0 is already the latest
      const formattedScans = trackingActivities.length > 0
        ? trackingActivities.map((activity: any) => {
            const scan = {
              date: activity.date || new Date().toISOString(),
              activity: activity.activity || activity.status || 'Status Update',
              location: activity.location || 'Unknown',
              status: activity.status || '',
              'sr-status': activity['sr-status'] || '',
              'sr-status-label': activity['sr-status-label'] || activity.activity || '',
            };
            console.log('[Store Shiprocket Tracking] 🔍 Formatted scan:', scan);
            return scan;
          }) // No reverse needed - Shiprocket already returns newest first
        : [];

      // Get current status from shipment details or latest activity
      // shipmentDetails.current_status is a string like "PICKED UP"
      // trackingData.shipment_status is a number like 42
      // trackingActivities[0] is already the latest (newest first from Shiprocket)
      const apiCurrentStatus = shipmentDetails.current_status || 
                              trackingActivities[0]?.['sr-status-label'] || 
                              (trackingData.shipment_status ? `Status ${trackingData.shipment_status}` : currentStatus);

      // Ensure we have scans - if empty, log warning
      if (formattedScans.length === 0) {
        console.warn('[Store Shiprocket Tracking] ⚠️ No scans formatted from tracking activities');
        console.log('[Store Shiprocket Tracking] 📋 Raw trackingActivities:', JSON.stringify(trackingActivities, null, 2));
      }

      console.log('[Store Shiprocket Tracking] ✅ Returning API response with:', {
        scans_count: formattedScans.length,
        current_status: apiCurrentStatus,
        courier_name: shipmentDetails.courier_name || courierName,
      });

      return res.json({
        success: true,
        data: {
          awb_code: awbCode || shipmentDetails.awb_code,
          courier_name: shipmentDetails.courier_name || courierName || 'Unknown Courier',
          current_status: apiCurrentStatus,
          current_status_id: trackingData.shipment_status || shipmentDetails.shipment_status,
          shipment_status: apiCurrentStatus,
          shipment_status_id: trackingData.shipment_status,
          last_status_at: formattedScans[0]?.date || shipmentDetails.updated_time_stamp || new Date().toISOString(),
          tracking_url: trackingData.track_url || trackingUrl || `https://shiprocket.co/tracking/${awbCode}`,
          scans: formattedScans.length > 0 ? formattedScans : [], // Ensure empty array if no scans
          awb_assigned_date: shipmentDetails.pickup_date || fulfillmentData.awb_assigned_date,
          pickup_scheduled_date: shipmentDetails.pickup_date || fulfillmentData.pickup_scheduled_date,
          etd: trackingData.etd || shipmentDetails.edd,
          pod_status: shipmentDetails.pod_status || trackingData.pod_status || fulfillmentData.pod_status,
          pod: shipmentDetails.pod || trackingData.pod || fulfillmentData.pod,
          source: 'api',
        },
      });
    }

    // Fallback to stored metadata from fulfillment
    console.log('[Store Shiprocket Tracking] 📦 Using stored metadata from fulfillment');
    
    // Get scans from metadata (stored from webhook)
      const storedScans = fulfillmentData.scans || 
                         fulfillmentData.shiprocket?.scans || 
                         [];

      // Format scans
      const formattedScans = storedScans.map((scan: any) => ({
        date: scan.date || scan.timestamp || new Date().toISOString(),
        activity: scan.activity || scan.status || 'Status Update',
        location: scan.location || scan.city || scan.hub || 'Unknown',
        status: scan.status,
        'sr-status': scan['sr-status'],
        'sr-status-label': scan['sr-status-label'],
      })).reverse(); // Reverse to show newest first

      return res.json({
        success: true,
        data: {
          awb_code: awbCode,
          courier_name: courierName,
          current_status: currentStatus,
          last_status_at: formattedScans[0]?.date || fulfillmentData.last_status_at || shiprocketFulfillment.shipped_at || new Date().toISOString(),
          tracking_url: trackingUrl,
          scans: formattedScans,
          shipped_at: shiprocketFulfillment.shipped_at,
          delivered_at: shiprocketFulfillment.delivered_at,
          pickup_scheduled_date: fulfillmentData.pickup_scheduled_date || fulfillmentData.shiprocket?.pickup_scheduled_date,
          source: 'metadata',
        },
      });
  } catch (error) {
    console.error('[Store Shiprocket Tracking] ❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get tracking information',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

