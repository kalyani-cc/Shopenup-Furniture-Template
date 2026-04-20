import { ShopenupRequest, ShopenupResponse } from "@shopenup/framework/http";

export const POST = async (
  req: ShopenupRequest,
  res: ShopenupResponse
) => {
  try {
    const webhookData = req.body;
    const orderService = req.scope.resolve("orderService") as any;
    const fulfillmentService = req.scope.resolve("fulfillmentService") as any;
    const logger = req.scope.resolve("logger") as any;

    logger.info("Received Shiprocket webhook:", webhookData);

    // Extract AWB code and status from webhook, with type-safety
    type ShiprocketWebhook = {
      awb_code?: string;
      tracking_data?: { awb_code?: string };
      status?: string;
      shipment_status?: string;
      shipment_id?: string;
      [key: string]: any;
    };

    const data = webhookData as ShiprocketWebhook;
    const awbCode = data.awb_code || data.tracking_data?.awb_code;
    const status = data.status || data.shipment_status;
    const shipmentId = data.shipment_id;

    if (!awbCode && !shipmentId) {
      return res.status(400).json({
        error: "AWB code or shipment ID is required",
      });
    }

    // Find order by AWB code or shipment ID from metadata
    let order;
    try {
      // First, try to find by AWB code in metadata
      if (awbCode) {
        const ordersByAwb = await orderService.list({
          relations: ["fulfillments"],
        });
        order = ordersByAwb.find((o: any) => 
          o.metadata?.shiprocket_awb_code === awbCode
        );
      }

      // If not found, try by shipment ID
      if (!order && shipmentId) {
        const ordersByShipment = await orderService.list({
          relations: ["fulfillments"],
        });
        order = ordersByShipment.find((o: any) => 
          o.metadata?.shiprocket_shipment_id === shipmentId.toString()
        );
      }

      // If still not found, try by fulfillment tracking number
      if (!order) {
        const allOrders = await orderService.list({
          relations: ["fulfillments"],
        });
        order = allOrders.find((o: any) =>
          o.fulfillments?.some(
            (f: any) =>
              f.provider_id === "shiprocket" &&
              (f.tracking_numbers?.includes(awbCode || "") ||
                f.data?.awb_code === awbCode)
          )
        );
      }
    } catch (error) {
      logger.error("Error finding order:", error);
    }

    if (!order) {
      logger.warn(`Order not found for AWB ${awbCode} or shipment ${shipmentId}`);
      return res.status(404).json({
        error: "Order not found",
      });
    }

    // Get fulfillment
    const fulfillment = order.fulfillments?.find(
      (f: any) => f.provider_id === "shiprocket"
    );

    if (!fulfillment) {
      return res.status(404).json({
        error: "Fulfillment not found",
      });
    }

    // Map Shiprocket status to Shopenup fulfillment status
    const fulfillmentStatus = mapShiprocketStatusToShopenup(status);

    // Update fulfillment with webhook data
    const updateData: any = {
      data: {
        ...fulfillment.data,
        ...(typeof webhookData === "object" && webhookData !== null ? webhookData : {}),
        last_webhook_update: new Date().toISOString(),
        webhook_status: status,
      },
    };

    // Update timestamps based on status
    if (fulfillmentStatus === "shipped" && !fulfillment.shipped_at) {
      updateData.shipped_at = new Date();
      updateData.status = "shipped";
    }

    if (fulfillmentStatus === "delivered" && !fulfillment.delivered_at) {
      updateData.delivered_at = new Date();
      updateData.status = "delivered";
    }

    if (fulfillmentStatus === "canceled" && !fulfillment.canceled_at) {
      updateData.canceled_at = new Date();
      updateData.status = "canceled";
    }

    if (fulfillmentStatus === "returned" && !fulfillment.canceled_at) {
      updateData.canceled_at = new Date();
      updateData.status = "returned";
    }

    await fulfillmentService.update(fulfillment.id, updateData);

    // Also update order metadata with latest tracking info
    if (awbCode || status) {
      const trackingData = data.tracking_data as any;
      await orderService.update(order.id, {
        metadata: {
          ...order.metadata,
          ...(awbCode && { shiprocket_awb_code: awbCode }),
          shiprocket_last_status: status,
          shiprocket_last_status_update: new Date().toISOString(),
          ...(trackingData?.tracking_url && {
            shiprocket_tracking_url: trackingData.tracking_url,
          }),
        },
      });
    }

    logger.info(
      `Updated fulfillment ${fulfillment.id} and order ${order.id} with status ${fulfillmentStatus} (${status})`
    );

    return res.json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error: any) {
    const logger = req.scope.resolve("logger");
    logger.error("Error processing Shiprocket webhook:", error);
    return res.status(500).json({
      error: error.message || "Failed to process webhook",
    });
  }
};

/**
 * Map Shiprocket status to Shopenup fulfillment status
 */
function mapShiprocketStatusToShopenup(shiprocketStatus: string): string {
  if (!shiprocketStatus) return "not_shipped";

  const statusUpper = shiprocketStatus.toUpperCase();
  const statusMap: Record<string, string> = {
    NEW: "not_shipped",
    PROCESSING: "not_shipped",
    READY_TO_SHIP: "not_shipped",
    PICKED_UP: "shipped",
    IN_TRANSIT: "shipped",
    OUT_FOR_DELIVERY: "shipped",
    DELIVERED: "delivered",
    CANCELLED: "canceled",
    CANCELED: "canceled",
    RTO: "returned",
    RETURNED: "returned",
    LOST: "canceled",
    DAMAGED: "canceled",
    UNDELIVERED: "canceled",
    EXCEPTION: "canceled",
  };

  return statusMap[statusUpper] || "not_shipped";
}

