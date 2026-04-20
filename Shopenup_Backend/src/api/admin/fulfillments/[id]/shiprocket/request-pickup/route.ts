import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from '@shopenup/framework';
import { Modules } from "@shopenup/framework/utils";
import type { IFulfillmentModuleService } from "@shopenup/framework/types";
import { getAuthenticatedClient } from 'src/modules/shiprocket/utils/shiprocket-client';
import { isMockModeEnabled, generateMockPickupRequest } from 'src/modules/shiprocket/utils/mock-mode';

/**
 * Admin API endpoint to request pickup from Shiprocket
 * 
 * POST /admin/fulfillments/:id/shiprocket/request-pickup
 * 
 * This endpoint:
 * 1. Validates the fulfillment is packed
 * 2. Validates pickup not already requested
 * 3. Calls Shiprocket API POST /v1/external/courier/generate/pickup
 * 4. Updates fulfillment.data with pickup_requested_at
 * 
 * Shiprocket pickup request requires: shipment_id
 */

export async function POST(
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
    
    // Check if packed
    if (!fulfillmentData.packed) {
      return res.status(400).json({
        success: false,
        error: 'Not packed',
        message: 'Cannot request pickup - fulfillment must be marked as packed first',
      });
    }

    // Check if pickup already requested
    if (fulfillmentData.pickup_requested_at) {
      return res.status(400).json({
        success: false,
        error: 'Pickup already requested',
        message: 'Pickup has already been requested for this fulfillment',
        pickup_requested_at: fulfillmentData.pickup_requested_at,
      });
    }

    // Get shipment_id from fulfillment data
    const shipmentId = fulfillmentData.shiprocket_shipment_id || fulfillmentData.shipment_id;
    
    if (!shipmentId) {
      return res.status(400).json({
        success: false,
        error: 'No shipment ID',
        message: 'Cannot request pickup - no Shiprocket shipment ID found',
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
      return res.status(500).json({
        success: false,
        error: 'Shiprocket configuration not found',
        message: 'Please set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD environment variables',
      });
    }

    // Check if mock mode is enabled
    let pickupResponse: any;

    if (isMockModeEnabled()) {
      console.log('[Shiprocket Request Pickup] ⚠️ USING MOCK DATA (USE_SHIPROCKET_MOCK=true)');
      console.log('[Shiprocket Request Pickup] Shipment ID:', shipmentId);
      pickupResponse = generateMockPickupRequest(shipmentId);
    } else {
      // Get authenticated Shiprocket client
      const shiprocket = await getAuthenticatedClient({
        email: shiprocketConfig.email,
        password: shiprocketConfig.password,
        baseUrl: shiprocketConfig.baseUrl,
      });

      // Request pickup from Shiprocket
      
      // Call Shiprocket pickup generation API using raw client
      // POST /v1/external/courier/generate/pickup
      pickupResponse = await shiprocket.getClient().post<any>('/courier/generate/pickup', {
        shipment_id: [shipmentId],
      });

      if (!pickupResponse.success) {
        throw new Error(pickupResponse.error?.message || 'Failed to generate pickup');
      }
    }

    // Handle different response structures from Shiprocket API
    // Response can be: { success: true, data: {...} } or { success: true, data: { response: {...} } }
    const pickupData = (pickupResponse as any).data || pickupResponse;
    const pickupRequestedAt = new Date().toISOString();

    // Extract pickup info - handle multiple possible response structures
    // Structure 1: data.pickup_token_number, data.pickup_scheduled_date
    // Structure 2: data.response.pickup_scheduled_date (nested)
    // Structure 3: data.data.pickup_token_number (double nested)
    const pickupTokenNumber = pickupData?.pickup_token_number 
      || pickupData?.data?.pickup_token_number 
      || pickupData?.response?.pickup_token_number;
    const pickupScheduledDate = pickupData?.pickup_scheduled_date 
      || pickupData?.data?.pickup_scheduled_date 
      || pickupData?.response?.pickup_scheduled_date;
    const pickupStatus = pickupData?.pickup_status 
      || pickupData?.data?.pickup_status 
      || pickupData?.response?.pickup_status 
      || 'Requested';

    // Update fulfillment data with pickup info
    await fulfillmentModuleService.updateFulfillment(fulfillmentId, {
      data: {
        ...fulfillmentData,
        pickup_requested_at: pickupRequestedAt,
        pickup_token_number: pickupTokenNumber,
        pickup_scheduled_date: pickupScheduledDate,
        pickup_status: pickupStatus,
      },
    });


    return res.json({
      success: true,
      fulfillment_id: fulfillmentId,
      pickup_requested_at: pickupRequestedAt,
      pickup_token_number: pickupTokenNumber,
      pickup_scheduled_date: pickupScheduledDate,
      pickup_status: pickupStatus,
      message: 'Pickup requested successfully',
    });
  } catch (error) {
    console.error('[Shiprocket Request Pickup] ❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to request pickup',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
