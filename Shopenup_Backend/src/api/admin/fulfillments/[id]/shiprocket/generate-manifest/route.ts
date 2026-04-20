import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from '@shopenup/framework';
import { Modules } from "@shopenup/framework/utils";
import type { IFulfillmentModuleService } from "@shopenup/framework/types";
import { getAuthenticatedClient } from 'src/modules/shiprocket/utils/shiprocket-client';
import { isMockModeEnabled, generateMockManifest } from 'src/modules/shiprocket/utils/mock-mode';

/**
 * Admin API endpoint to generate manifest for Shiprocket shipment
 * 
 * POST /admin/fulfillments/:id/shiprocket/generate-manifest
 * 
 * This endpoint:
 * 1. Validates pickup has been requested
 * 2. Validates manifest not already generated
 * 3. Calls Shiprocket API POST /v1/external/manifests/generate
 * 4. Updates fulfillment.data with manifest_id and manifest_url
 * 
 * Shiprocket auto-splits manifest by courier
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
    
    // Check if pickup has been requested
    if (!fulfillmentData.pickup_requested_at) {
      return res.status(400).json({
        success: false,
        error: 'Pickup not requested',
        message: 'Cannot generate manifest - pickup must be requested first',
      });
    }

    // Check if manifest already generated
    if (fulfillmentData.manifest_id || fulfillmentData.manifest_generated_at) {
      return res.status(400).json({
        success: false,
        error: 'Manifest already generated',
        message: 'Manifest has already been generated for this fulfillment',
        manifest_id: fulfillmentData.manifest_id,
        manifest_url: fulfillmentData.manifest_url,
      });
    }

    // Get shipment_id from fulfillment data
    const shipmentId = fulfillmentData.shiprocket_shipment_id || fulfillmentData.shipment_id;
    
    if (!shipmentId) {
      return res.status(400).json({
        success: false,
        error: 'No shipment ID',
        message: 'Cannot generate manifest - no Shiprocket shipment ID found',
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
    let manifestResponse: any;

    if (isMockModeEnabled()) {
      console.log('[Shiprocket Generate Manifest] ⚠️ USING MOCK DATA (USE_SHIPROCKET_MOCK=true)');
      console.log('[Shiprocket Generate Manifest] Shipment ID:', shipmentId);
      manifestResponse = generateMockManifest(shipmentId);
    } else {
      // Get authenticated Shiprocket client
      const shiprocket = await getAuthenticatedClient({
        email: shiprocketConfig.email,
        password: shiprocketConfig.password,
        baseUrl: shiprocketConfig.baseUrl,
      });

      // Generate manifest from Shiprocket
      // Call Shiprocket manifest generation API using raw client
      // POST /v1/external/manifests/generate
      manifestResponse = await shiprocket.getClient().post<any>('/manifests/generate', {
        shipment_id: [shipmentId],
      });

      if (!manifestResponse.success) {
        throw new Error(manifestResponse.error?.message || 'Failed to generate manifest');
      }
    }

    // Handle different response structures from Shiprocket API
    // Response can be: { success: true, data: {...} } or direct data
    const manifestData = (manifestResponse as any).data || manifestResponse;
    const manifestGeneratedAt = new Date().toISOString();

    // Extract manifest info - handle multiple possible response structures
    // Structure 1: data.manifest_id, data.manifest_url
    // Structure 2: data.data.manifest_id (nested)
    // Structure 3: response.manifest_id (direct)
    const manifestId = manifestData?.manifest_id 
      || manifestData?.data?.manifest_id 
      || manifestData?.manifest_url?.split('/').pop()?.split('.')[0];
    const manifestUrl = manifestData?.manifest_url 
      || manifestData?.data?.manifest_url 
      || manifestData?.label_url;

    // Update fulfillment data with manifest info
    await fulfillmentModuleService.updateFulfillment(fulfillmentId, {
      data: {
        ...fulfillmentData,
        manifest_id: manifestId,
        manifest_url: manifestUrl,
        manifest_generated_at: manifestGeneratedAt,
      },
    });


    return res.json({
      success: true,
      fulfillment_id: fulfillmentId,
      manifest_id: manifestId,
      manifest_url: manifestUrl,
      manifest_generated_at: manifestGeneratedAt,
      message: 'Manifest generated successfully',
    });
  } catch (error) {
    console.error('[Shiprocket Generate Manifest] ❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate manifest',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
