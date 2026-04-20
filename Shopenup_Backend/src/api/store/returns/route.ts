import {
  ShopenupRequest,
  ShopenupResponse,
  AuthenticatedShopenupRequest,
} from "@shopenup/framework";
import { createAndCompleteReturnOrderWorkflow } from "@shopenup/core-flows";
import { Modules } from "@shopenup/framework/utils";
import type { INotificationModuleService } from "@shopenup/framework/types";
import {
  createAndCompleteReturnOrderFixedWorkflow,
} from "../../../workflows/create-and-complete-return-order/create-and-complete-return-fixed"

export function getReturnShippingOptionId(
  stockLocation: any
): string | null {
  if (!stockLocation?.fulfillment_sets) return null

  return (
    stockLocation.fulfillment_sets
      .flatMap((fulfillmentSet: any) =>
        fulfillmentSet.service_zones.flatMap((serviceZone: any) =>
          serviceZone.shipping_options.filter(
            (option: any) => option?.data?.is_return === true
          )
        )
      )
      .map((option: any) => option.id)[0] ?? null
  )
}


export async function POST(req: ShopenupRequest, res: ShopenupResponse) {
  try {
    // Parse body - handle both string and object formats
    const input = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // Validate required fields according to Medusa spec
    if (!input.order_id) {
      return res.status(400).json({
        title: "Response Error",
        code: "invalid_request_error",
        message: "order_id must be provided",
        type: "invalid_data",
      });
    }

    if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
      return res.status(400).json({
        title: "Response Error",
        code: "invalid_request_error",
        message: "items must be provided and must be a non-empty array",
        type: "invalid_data",
      });
    }

    if (!input.return_shipping || !input.return_shipping.option_id) {
      return res.status(400).json({
        title: "Response Error",
        code: "invalid_request_error",
        message: "return_shipping.option_id must be provided",
        type: "invalid_data",
      });
    }


    const { data: stockLocation } = await req.scope.resolve("query").graph({
      entity: "stock_location",
      fields: ["address.*", "fulfillment_sets.service_zones.shipping_options.*"],
      filters: { id: input.location_id },
    })
    
    const returnOptionId = getReturnShippingOptionId(stockLocation[0])


    // const workflow = createAndCompleteReturnOrderWorkflow(req.scope);
    input.return_shipping.option_id = returnOptionId;
    // input.items = input.items.map((item: any) => ({
    //   ...item,
    //   reason_id: Array.isArray(item.reason_id)
    //     ? item.reason_id[0]
    //     : item.reason_id,
    // }))



    
    
    const workflow =
    createAndCompleteReturnOrderFixedWorkflow(req.scope)
    
    const { result } = await workflow.run({
      input: input,
    });
    const returnData = result as any;
    const locationId = input.location_id;

    // If location_id was provided but not saved, update it directly in the database
    if (locationId && !returnData.location_id) {
      try {
        // Use direct PostgreSQL query to ensure location_id is saved
        const pg = await import("pg");
        const connectionString = process.env.DATABASE_URL;
        
        if (connectionString) {
          const client = new pg.Client({ connectionString });
          await client.connect();
          
          try {
            // Update location_id directly in the return table
            await client.query(
              `UPDATE "return" SET "location_id" = $1 WHERE "id" = $2`,
              [locationId, returnData.id]
            );
            
          } finally {
            await client.end();
          }
        }
      } catch (updateError: any) {
        console.error("[POST /store/returns] Error updating location_id:", updateError);
        // Continue - return the result even if update fails
      }
    }

    // Fetch the return with all fields to ensure proper response format
    let returnResponse = returnData;
    try {
      const query = req.scope.resolve("query");
      const { data: updatedReturns } = await query.graph({
        entity: "return",
        filters: { id: returnData.id },
        fields: [
          "id",
          "display_id",
          "status",
          "order_id",
          "location_id",
          "exchange_id",
          "claim_id",
          "refund_amount",
          "created_at",
          "canceled_at",
          "received_at",
          "requested_at",
          "*items",
          "*items.reason",
          "*items.item",
        ],
      });
      
      if (updatedReturns && updatedReturns.length > 0) {
        returnResponse = updatedReturns[0] as any;
      }
    } catch (fetchError) {
      console.error("[POST /store/returns] Error fetching updated return:", fetchError);
      // Use original returnData if fetch fails
    }

    // Create return request notification
    try {
      const notificationModuleService: INotificationModuleService = req.scope.resolve(Modules.NOTIFICATION);
      const query = req.scope.resolve("query");
      
      // Fetch order details for notification
      const { data: orders } = await query.graph({
        entity: 'order',
        fields: [
          'id',
          'display_id',
          'email',
          'customer.*',
          'customer.first_name',
          'customer.last_name',
        ],
        filters: { id: returnResponse.order_id },
      });
      
      const order = orders?.[0] as any;
      const orderDisplayId = order?.display_id || order?.id || 'N/A';
      const customerName = order?.customer
        ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || 'Customer'
        : 'Customer';
      const itemsCount = returnResponse.items?.length || 0;
      const itemsText = itemsCount === 1 ? 'item' : 'items';
      
      const notificationTitle = `Order #${orderDisplayId} is request to return`;
      const notificationDescription = `Customer ${customerName} has requested a return for ${itemsCount} ${itemsText} from Order #${orderDisplayId}.`;
      
      await notificationModuleService.createNotifications({
        to: '', // Empty string for admin notifications using feed channel
        channel: 'feed', // Feed channel for admin panel notifications
        template: 'admin-ui', // Must be 'admin-ui' for admin panel notifications
        data: {
          title: notificationTitle,
          description: notificationDescription,
          return_id: returnResponse.id,
          order_id: returnResponse.order_id,
          order_display_id: orderDisplayId,
          customer_name: customerName,
          customer_email: order?.email || '',
          return_status: returnResponse.status,
          items_count: itemsCount,
          currency_code: order?.currency_code || 'INR',
          store_name: process.env.STORE_NAME || 'Store',
          triggered_at: new Date().toISOString(),
          notification_type: 'return_requested',
          resource_type: 'return',
          resource_id: returnResponse.id,
          alert_level: 'INFO',
        },
      });
      
    } catch (notifError) {
      console.error('[POST /store/returns] Error creating return notification:', notifError);
      // Continue - don't fail the request if notification creation fails
    }

    // Format response according to Medusa specification
    const formattedReturn = {
      id: returnResponse.id,
      display_id: returnResponse.display_id || 0,
      status: returnResponse.status || "requested",
      order_id: returnResponse.order_id,
      location_id: returnResponse.location_id || locationId || null,
      exchange_id: returnResponse.exchange_id || null,
      claim_id: returnResponse.claim_id || null,
      refund_amount: returnResponse.refund_amount || null,
      created_at: returnResponse.created_at,
      canceled_at: returnResponse.canceled_at || null,
      received_at: returnResponse.received_at || null,
      items: (returnResponse.items || []).map((item: any) => ({
        id: item.id,
        quantity: item.quantity || 0,
        received_quantity: item.received_quantity || 0,
        damaged_quantity: item.damaged_quantity || 0,
        reason_id: item.reason_id || null,
        note: item.note || null,
        item_id: item.item_id,
        return_id: item.return_id || returnResponse.id,
        metadata: item.metadata || {},
      })),
    };

    return res.json({ return: formattedReturn });
  } catch (error: any) {
    console.error("[POST /store/returns] Error:", error);
    
    // Format error response according to Medusa specification
    return res.status(400).json({
      title: "Response Error",
      code: "invalid_request_error",
      message: error?.message || "Failed to create return",
      type: error?.type || "invalid_data",
    });
  }
}
