import { ShopenupRequest, ShopenupResponse } from "@shopenup/framework/http";
import { getAuthenticatedClient } from "src/modules/shiprocket/utils/shiprocket-client";
import { isMockModeEnabled, generateMockCreateShipment } from "src/modules/shiprocket/utils/mock-mode";

export const POST = async (
  req: ShopenupRequest,
  res: ShopenupResponse
) => {  
  try {
    const { orderId } = req.params ?? {};
    const courier_id: string | undefined = (req.body && typeof req.body === "object") ? (req.body as any).courier_id : undefined;
    const orderService = req.scope.resolve("orderService") as any;
    const fulfillmentService = req.scope.resolve("fulfillmentService") as any;
    const logger = req.scope.resolve("logger") as any;

    // Get order
    const order = await orderService.retrieve(orderId, {
      relations: ["fulfillments"],
    });

    // Get Shiprocket shipment ID from metadata
    const shipmentId = order.metadata?.shiprocket_shipment_id;
    if (!shipmentId) {
      return res.status(400).json({
        error: "No Shiprocket shipment ID found for this order. Please create order in Shiprocket first.",
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
    let shipmentResult: any;

    if (isMockModeEnabled()) {
      console.log('[Admin Shiprocket Create Shipment] ⚠️ USING MOCK DATA (USE_SHIPROCKET_MOCK=true)');
      shipmentResult = generateMockCreateShipment({
        shipmentId: shipmentId,
        courierId: courier_id,
      });
    } else {
      // Get authenticated Shiprocket client (uses shared instance to avoid duplicate auth calls)
      const shiprocket = await getAuthenticatedClient({
        email: shiprocketConfig.email,
        password: shiprocketConfig.password,
        baseUrl: shiprocketConfig.baseUrl,
      });

      // Create shipment
      shipmentResult = await shiprocket.orders.createShipment({
        shipment_id: shipmentId,
        courier_id: courier_id ? parseInt(courier_id) : undefined,
      });

      if (!shipmentResult.success) {
        return res.status(400).json({
          error: shipmentResult.error?.message || "Failed to create shipment",
        });
      }
    }

    // Update or create fulfillment
    let fulfillment = order.fulfillments?.find(
      (f: any) => f.provider_id === "shiprocket"
    );

    if (fulfillment) {
      await fulfillmentService.update(fulfillment.id, {
        data: {
          ...fulfillment.data,
          shipment_id: shipmentResult.data.shipment_id,
          awb_code: shipmentResult.data.awb_code,
          courier_name: shipmentResult.data.courier_name,
          courier_company_id: shipmentResult.data.courier_company_id,
          tracking_data: shipmentResult.data.tracking_data,
        },
        tracking_numbers: [shipmentResult.data.awb_code],
        tracking_links: [
          {
            url: `https://shiprocket.co/tracking/${shipmentResult.data.awb_code}`,
            tracking_number: shipmentResult.data.awb_code,
          },
        ],
      });
    }

    logger.info(
      `Successfully created shipment for order ${orderId} with AWB ${shipmentResult.data.awb_code}`
    );

    return res.json({
      success: true,
      shipment: shipmentResult.data,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || "Failed to create shipment",
    });
  }
};

