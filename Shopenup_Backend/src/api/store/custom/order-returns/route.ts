import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from "@shopenup/framework";

/**
 * Store endpoint to list returns for a single order (for the logged-in customer).
 *
 * GET /store/custom/order-returns?order_id=<order_id>
 *
 * Response:
 * { returns: [ ... ] }
 *
 * Note: This endpoint should validate that the order belongs to the authenticated customer.
 */
export async function GET(req: AuthenticatedShopenupRequest, res: ShopenupResponse) {
  try {
    const query = req.scope.resolve("query");

    const url = new URL(req.url || "", "http://localhost");
    const searchParams = url.searchParams;
    const orderId = searchParams.get("order_id");

    if (!orderId) {
      return res.json({ returns: [] });
    }

    const { data: returns } = await query.graph({
      entity: "return",
      filters: {
        order_id: orderId,
      },
      fields: [
        "id",
        "status",
        "order_id",
        "created_at",
        "updated_at",
        "items",
        "items.*",
        "items.reason",
        "items.reason.id",
        "items.reason.label",
        "items.reason.value",
        "items.reason.name",
        "items.reason_id",
        "items.item_id",
        "items.quantity",
        "refund_amount",
        "shipping_method",
        "shipping_data",
        "metadata",
      ],
      pagination: {
        take: 50,
        skip: 0,
      },
    });

    return res.json({ returns: returns || [] });
  } catch (error: any) {
    console.error("Error fetching order returns:", error);
    return res.status(500).json({
      error: "Failed to fetch order returns",
      message: error instanceof Error ? error.message : "Unknown error",
      returns: [],
    });
  }
}
