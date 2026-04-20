import { ShopenupRequest, ShopenupResponse } from "@shopenup/framework/http";
import { getAuthenticatedClient } from "src/modules/shiprocket/utils/shiprocket-client";
import { isMockModeEnabled, generateMockTracking } from "src/modules/shiprocket/utils/mock-mode";

export const GET = async (
  req: ShopenupRequest,
  res: ShopenupResponse
) => {
  try {
    const { awbCode } = req.params;

    if (!awbCode) {
      return res.status(400).json({
        error: "AWB code is required",
      });
    }

    // Get Shiprocket configuration from container
    const shiprocketConfig = req.scope.resolve("shiprocketConfig") as any;
    if (!shiprocketConfig) {
      return res.status(500).json({
        error: "Shiprocket configuration not found",
      });
    }

    // Check if mock mode is enabled
    let trackingResult: any;

    if (isMockModeEnabled()) {
      console.log('[Store Shiprocket Tracking] ⚠️ USING MOCK DATA (USE_SHIPROCKET_MOCK=true)');
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
      awbCode,
      tracking: trackingResult.data,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || "Failed to fetch tracking information",
    });
  }
};

