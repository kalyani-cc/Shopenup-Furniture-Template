import { ShopenupRequest, ShopenupResponse } from "@shopenup/framework/http";
import { getAuthenticatedClient } from "src/modules/shiprocket/utils/shiprocket-client";
import { isMockModeEnabled, generateMockTracking } from "src/modules/shiprocket/utils/mock-mode";

export const GET = async (
  req: ShopenupRequest,
  res: ShopenupResponse
) => {
  try {
    const { orderId } = req.params;
    const orderService = req.scope.resolve("orderService") as any;

    // Get order
    const order = await orderService.retrieve(orderId, {
      relations: ["fulfillments"],
    });

    // Find Shiprocket fulfillment
    const fulfillment = order.fulfillments?.find(
      (f: any) => f.provider_id === "shiprocket"
    );

    if (!fulfillment) {
      return res.status(404).json({
        error: "No Shiprocket fulfillment found for this order",
      });
    }

    const awbCode =
      fulfillment.tracking_numbers?.[0] || fulfillment.data?.awb_code;

    if (!awbCode) {
      return res.status(404).json({
        error: "AWB code not found for this fulfillment",
      });
    }

    // Get Shiprocket configuration
    const shiprocketConfig = req.scope.resolve("shiprocketConfig") as any;
    if (!shiprocketConfig) {
      return res.status(500).json({
        error: "Shiprocket configuration not found",
      });
    }

    // Check if mock mode is enabled
    let trackingResult: any;

    if (isMockModeEnabled()) {
      console.log('[Admin Shiprocket Tracking] ⚠️ USING MOCK DATA (USE_SHIPROCKET_MOCK=true)');
      trackingResult = generateMockTracking(awbCode);
    } else {
      // Get authenticated Shiprocket client (uses shared instance to avoid duplicate auth calls)
      const shiprocket = await getAuthenticatedClient({
        email: shiprocketConfig.email,
        password: shiprocketConfig.password,
        baseUrl: shiprocketConfig.baseUrl,
      });

      // Track shipment
      trackingResult = await shiprocket.tracking.trackByAwb(awbCode);

      if (!trackingResult.success) {
        return res.status(404).json({
          error: trackingResult.error?.message || "Tracking information not found",
        });
      }
    }

    return res.json({
      success: true,
      orderId,
      awbCode,
      tracking: trackingResult.data,
      fulfillment: {
        id: fulfillment.id,
        status: fulfillment.status,
        shipped_at: fulfillment.shipped_at,
        delivered_at: fulfillment.delivered_at,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || "Failed to fetch tracking information",
    });
  }
};

