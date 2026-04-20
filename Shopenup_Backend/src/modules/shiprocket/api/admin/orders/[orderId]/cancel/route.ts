import { ShopenupRequest, ShopenupResponse } from "@shopenup/framework/http";
import { getAuthenticatedClient } from "src/modules/shiprocket/utils/shiprocket-client";
import { isMockModeEnabled, generateMockCancelOrder } from "src/modules/shiprocket/utils/mock-mode";

export const POST = async (
  req: ShopenupRequest,
  res: ShopenupResponse
) => {
  try {
    const { orderId } = req.params;
    const reason: string | undefined = (req.body && typeof req.body === "object" && "reason" in req.body)
      ? (req.body as any).reason
      : undefined;
    const orderService = req.scope.resolve("orderService") as any;
    const logger = req.scope.resolve("logger") as any;

    // Get order
    const order = await orderService.retrieve(orderId, {
      relations: ["fulfillments"],
    });

    // Get Shiprocket order ID from metadata
    const shiprocketOrderId = order.metadata?.shiprocket_order_id;
    if (!shiprocketOrderId) {
      return res.status(400).json({
        error: "No Shiprocket order ID found for this order",
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
    let cancelResult: any;

    if (isMockModeEnabled()) {
      console.log('[Admin Shiprocket Cancel] ⚠️ USING MOCK DATA (USE_SHIPROCKET_MOCK=true)');
      cancelResult = generateMockCancelOrder(shiprocketOrderId);
    } else {
      // Get authenticated Shiprocket client (uses shared instance to avoid duplicate auth calls)
      const shiprocket = await getAuthenticatedClient({
        email: shiprocketConfig.email,
        password: shiprocketConfig.password,
        baseUrl: shiprocketConfig.baseUrl,
      });

      // Cancel order in Shiprocket
      cancelResult = await shiprocket.orders.cancelOrder(
        shiprocketOrderId.toString(),
        reason || "Cancelled by admin"
      );

      if (!cancelResult.success) {
        return res.status(400).json({
          error: cancelResult.error?.message || "Failed to cancel order",
        });
      }
    }

    logger.info(`Successfully cancelled Shiprocket order ${shiprocketOrderId}`);

    return res.json({
      success: true,
      message: "Order cancelled successfully in Shiprocket",
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || "Failed to cancel order",
    });
  }
};

