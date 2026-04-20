import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from '@shopenup/framework';
import { Modules } from "@shopenup/framework/utils";
import type { IFulfillmentModuleService } from "@shopenup/framework/types";
import { getAuthenticatedClient } from 'src/modules/shiprocket/utils/shiprocket-client';
import { isMockModeEnabled, generateMockDownloadLabel } from 'src/modules/shiprocket/utils/mock-mode';

/**
 * Admin API endpoint to download shipping label from Shiprocket
 * 
 * GET /admin/fulfillments/:id/shiprocket/download-label
 * 
 * This endpoint:
 * 1. Gets the shipment_id from fulfillment data
 * 2. Calls Shiprocket API to get label PDF
 * 3. Returns the label URL or PDF data
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
    
    // Check if AWB exists
    const awbCode = fulfillmentData.awb_code;
    if (!awbCode) {
      return res.status(400).json({
        success: false,
        error: 'AWB not assigned',
        message: 'Cannot download label - fulfillment does not have an AWB assigned',
      });
    }

    // Get shipment_id from fulfillment data
    const shipmentId = fulfillmentData.shiprocket_shipment_id || fulfillmentData.shipment_id;
    
    if (!shipmentId) {
      return res.status(400).json({
        success: false,
        error: 'No shipment ID',
        message: 'Cannot download label - no Shiprocket shipment ID found',
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
    let labelResponse: any;

    if (isMockModeEnabled()) {
      console.log('[Shiprocket Download Label] ⚠️ USING MOCK DATA (USE_SHIPROCKET_MOCK=true)');
      console.log('[Shiprocket Download Label] Shipment ID:', shipmentId);
      labelResponse = generateMockDownloadLabel(shipmentId);
    } else {
      // Get authenticated Shiprocket client
      const shiprocket = await getAuthenticatedClient({
        email: shiprocketConfig.email,
        password: shiprocketConfig.password,
        baseUrl: shiprocketConfig.baseUrl,
      });

      // Generate label from Shiprocket
      
      // Call Shiprocket label generation API using raw client
      // POST /v1/external/courier/generate/label
      labelResponse = await shiprocket.getClient().post<any>('/courier/generate/label', {
        shipment_id: [shipmentId],
      });

      if (!labelResponse.success) {
        throw new Error(labelResponse.error?.message || 'Failed to generate label');
      }
    }

    const labelData = labelResponse.data as any;
    const labelUrl = labelData?.label_url || labelData?.response?.label_url || labelData?.label_created?.label_url;

    if (!labelUrl) {
      throw new Error('No label URL in response');
    }

    // Store the label URL in fulfillment data for future use
    await fulfillmentModuleService.updateFulfillment(fulfillmentId, {
      data: {
        ...fulfillmentData,
        label_url: labelUrl,
        shiprocket_label_url: labelUrl,
      },
    });

    console.log('[Shiprocket Download Label] ✅ Label URL retrieved:', labelUrl);

    return res.json({
      success: true,
      fulfillment_id: fulfillmentId,
      label_url: labelUrl,
      awb_code: awbCode,
      shipment_id: shipmentId,
      message: 'Label URL retrieved successfully',
    });
  } catch (error) {
    console.error('[Shiprocket Download Label] ❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to download label',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
