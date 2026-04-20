import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from '@shopenup/framework';
import { Modules } from '@shopenup/framework/utils';
import type { IOrderModuleService } from '@shopenup/framework/types';
import ShiprocketFulfillmentService from 'src/modules/shiprocket/service';
import { createShiprocketReturnOrder, mapReturnToShiprocketFormat } from 'src/modules/shiprocket/utils/create-return-order';
import ShiprocketReturnService from 'src/modules/shiprocket-returns/service';
import { SHIPROCKET_RETURN_MODULE } from "src/modules/shiprocket-returns/index"
import { getAuthenticatedClient } from 'src/modules/shiprocket/utils/shiprocket-client';
import { isMockModeEnabled, generateMockOrderCreation, generateMockAwbAssignment } from 'src/modules/shiprocket/utils/mock-mode';

/**
 * Accept return and create return order in Shiprocket
 * POST /admin/returns/:id/shiprocket/accept
 */
export async function POST(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse,
) {
  const { id: returnId } = req.params;
  const logger = req.scope.resolve('logger') as any;

  try {
    logger.info(`[Accept Return] 📦 Accepting return ${returnId} and creating Shiprocket return order`);

    // Resolve services
    const query = req.scope.resolve('query') as any;
    const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER);

    // TODO: Uncomment when using real Shiprocket API (currently using mock data)
    // const shiprocketService = req.scope.resolve('shiprocketService') as ShiprocketFulfillmentService;

    // Get return order using query service with all necessary fields
    const { data: returns } = await query.graph({
      entity: 'return',
      filters: { id: returnId },
      fields: [
        'id',
        'order_id',
        'display_id',
        'status',
        'metadata',
        'items',
        'items.*',
        'items.item_id',
        'items.quantity',
        'items.unit_price',
        'items.title',
        'items.item',
        'items.variant.*',
        "order.*",
      ],
    });
    const returnOrder = returns && returns.length > 0 ? returns[0] : null;
    if (!returnOrder) {
      return res.status(404).json({
        success: false,
        error: 'Return order not found',
      });
    }

    // Get order using query service to avoid MikroORM relation errors
    let order: any;
    let storeLocation: any = null;

    try {
      logger.info(`[Accept Return] 🔍 Fetching order ${returnOrder.order_id}`);

      // First, try query service WITHOUT location fields (to avoid hanging)
      const { data: orders } = await query.graph({
        entity: 'order',
        filters: { id: returnOrder.order_id },
        fields: [
          "id",
          "display_id",
          "created_at",
          "currency_code",
          "item_total",
          "total",
          "metadata",
          "original_total",
          "original_subtotal",
          "original_item_subtotal",
          "email",
          "payment_status",
          "payment_collections.status",
          "items.*",
          "items.tax_total",
          "items.discount_total",
          "items.unit_price",
          "items.quantity",
          "items.title",
          "items.sku",
          "items.variant_sku",
          "items.tax_lines.*",
          "items.tax_lines.rate",
          "items.variant.*",
          "items.variant.product.*",
          "shipping_address.*",
          "billing_address.*",
          "shipping_methods.*",
          "tax_total",
          "subtotal",
          "discount_total",
          "discount_subtotal",
          "item_tax_total",
          "shipping_tax_total",
          "shipping_subtotal",
          "fulfillments.*",
          "fulfillments.location_id",
        ],
      });

      order = orders && orders.length > 0 ? orders[0] : null;
      // console.log('order 456', JSON.stringify(order, null, 2));

      // If order found, try to fetch location separately
      if (order && order.fulfillments && order.fulfillments.length > 0) {
        const fulfillment = order.fulfillments[0];
        const locationId = fulfillment.location_id;

        if (locationId) {
          logger.info(`[Accept Return] 📍 Fetching location ${locationId} separately`);
          try {
            // Fetch location separately to avoid query hanging
            // Stock locations have address as a nested object
            const { data: locations } = await query.graph({
              entity: 'stock_location',
              filters: { id: locationId },
              fields: [
                'id',
                'name',
                'address.*',
                'address.address_1',
                'address.address_2',
                'address.city',
                'address.province',
                'address.postal_code',
                'address.country_code',
                'address.phone',
                'metadata.*',
              ],
            });

            const location = locations && locations.length > 0 ? locations[0] : null;
            if (location) {
              // Map location to match expected structure
              const address = location.address || {};
              storeLocation = {
                id: location.id,
                name: location.name,
                address: address.address_1 || '',
                address_1: address.address_1 || '',
                address_2: address.address_2 || '',
                city: address.city || '',
                province: address.province || '',
                postal_code: address.postal_code || '',
                country_code: address.country_code || '',
                phone: address.phone || '',
                email: '', // Stock locations might not have email
              };
              logger.info(`[Accept Return] ✅ Found store location: ${storeLocation.name}`);
            }
          } catch (locationError: any) {
            logger.warn(`[Accept Return] ⚠️ Could not fetch location ${locationId}: ${locationError?.message}`);
            logger.error(`[Accept Return] Location error stack:`, locationError?.stack);
            // Continue without location - will use fallback
          }
        }
      }

      // Fallback to module service if query service doesn't work
      if (!order) {
        // console.log('order 789', order);
        logger.info(`[Accept Return] 🔄 Falling back to module service`);
        order = await orderModuleService.retrieveOrder(returnOrder.order_id, {
          relations: ['items', 'items.variant', 'items.variant.product', 'shipping_address', 'billing_address', 'customer', 'fulfillments'],
        });

        // Try to get location from fulfillment if available
        if (order?.fulfillments && order.fulfillments.length > 0) {
          const fulfillment = order.fulfillments[0];
          if (fulfillment.location_id && !storeLocation) {
            try {
              logger.info(`[Accept Return] 📍 Fetching location ${fulfillment.location_id} via query service`);
              const { data: locations } = await query.graph({
                entity: 'stock_location',
                filters: { id: fulfillment.location_id },
                fields: [
                  'id',
                  'name',
                  'address.*',
                  'address.address_1',
                  'address.address_2',
                  'address.city',
                  'address.province',
                  'address.postal_code',
                  'address.country_code',
                  'address.phone',
                  'metadata.*',
                ],
              });

              const location = locations && locations.length > 0 ? locations[0] : null;
              if (location) {
                // Map location to match expected structure
                const address = location.address || {};
                storeLocation = {
                  id: location.id,
                  name: location.name,
                  address: address.address_1 || '',
                  address_1: address.address_1 || '',
                  address_2: address.address_2 || '',
                  city: address.city || '',
                  province: address.province || '',
                  postal_code: address.postal_code || '',
                  country_code: address.country_code || '',
                  phone: address.phone || '',
                  email: '',
                };
              }
            } catch (e: any) {
              logger.warn(`[Accept Return] ⚠️ Could not fetch location via query service: ${e?.message}`);
            }
          }
        }
      }
    } catch (orderError: any) {
      logger.warn(`[Accept Return] ⚠️ Query service error, trying module service: ${orderError?.message}`);
      logger.error(`[Accept Return] Error stack:`, orderError?.stack);
      // Fallback to module service without relations
      try {
        order = await orderModuleService.retrieveOrder(returnOrder.order_id);
        // console.log('order 101112', order);
      } catch (moduleError: any) {
        logger.error(`[Accept Return] ❌ Error retrieving order: ${moduleError?.message}`);
        return res.status(500).json({
          success: false,
          error: 'Failed to retrieve order',
          message: moduleError?.message || 'Unknown error',
        });
      }
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Check if return already has Shiprocket return order created
    const returnData = (returnOrder.metadata as any) || {};
    if (returnData.shiprocket?.return_order_id) {
      logger.info(`[Accept Return] ℹ️ Return ${returnId} already has Shiprocket return order: ${returnData.shiprocket.return_order_id}`);
      return res.json({
        success: true,
        message: 'Return order already created in Shiprocket',
        shiprocket_return_order_id: returnData.shiprocket.return_order_id,
        data: returnData.shiprocket,
      });
    }

    // Create return order in Shiprocket
    logger.info(`[Accept Return] 🚀 Creating return order in Shiprocket for return ${returnId}`);

    // TODO: Uncomment when using real Shiprocket API (currently using mock data)
    // const shiprocketService = req.scope.resolve('shiprocketService') as ShiprocketFulfillmentService;

    // Generate the payload using REAL data from return order and order
    let shiprocketPayload: any = null;
    try {
      // Try to get shiprocket service for default pickup location (if available)
      // let shiprocketServiceForPayload: any = null;
      // try {
      //   shiprocketServiceForPayload = req.scope.resolve('shiprocketService') as ShiprocketFulfillmentService;
      // } catch (e) {
      //   // Service not available, use mock service with null pickup location
      //   shiprocketServiceForPayload = {
      //     options: {
      //       defaultPickupLocation: null, // Will use order billing address as fallback
      //     },
      //   };
      // }
      // Store location is already fetched above (or null if not available)
      logger.info(`[Accept Return] 📍 Store location:`, storeLocation ? {
        name: storeLocation.name,
        city: storeLocation.city,
        address: storeLocation.address || storeLocation.address_1,
      } : 'Not found, will use default');
      // console.log('return order 131415', returnOrder);
      // console.log('order 161718', JSON.stringify(order, null, 2));
      // Generate payload using REAL data from return order and order
      shiprocketPayload = mapReturnToShiprocketFormat(
        returnOrder as any,
        order as any,
        // shiprocketServiceForPayload,
        storeLocation, // Pass store location from fulfillment
      );

      // Log the REAL payload that would be sent to Shiprocket
      logger.info(`[Accept Return] 📦 Shiprocket Return Order Payload (REAL DATA - what would be sent):`);
      logger.info(JSON.stringify(shiprocketPayload, null, 2));

      // Also log key data points for verification
      logger.info(`[Accept Return] 📊 Payload Summary:`);
      logger.info(`  - Order ID: ${shiprocketPayload.order_id}`);
      logger.info(`  - Order Date: ${shiprocketPayload.order_date}`);
      logger.info(`  - Pickup: ${shiprocketPayload.pickup_customer_name}, ${shiprocketPayload.pickup_city}, ${shiprocketPayload.pickup_pincode}`);
      logger.info(`  - Shipping: ${shiprocketPayload.shipping_customer_name}, ${shiprocketPayload.shipping_city}, ${shiprocketPayload.shipping_pincode}`);
      logger.info(`  - Items Count: ${shiprocketPayload.order_items?.length || 0}`);
      logger.info(`  - Payment Method: ${shiprocketPayload.payment_method}`);
      logger.info(`  - Sub Total: ${shiprocketPayload.sub_total}`);
      logger.info(`  - Weight: ${shiprocketPayload.weight}kg, Dimensions: ${shiprocketPayload.length}x${shiprocketPayload.breadth}x${shiprocketPayload.height}cm`);

    } catch (payloadError: any) {
      logger.error(`[Accept Return] ❌ Could not generate Shiprocket payload: ${payloadError?.message}`);
      logger.error(`[Accept Return] Error stack:`, payloadError?.stack);
      console.error('[Accept Return] ❌ Error generating payload:', payloadError);
    }

    // Create return order in Shiprocket
    // TODO: Uncomment below to use actual Shiprocket API
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

    let shiprocketResponse: any;
    let awbResponse: any = null;

    // MOCK DATA FOR TESTING - Comment out this section when ready to use real API
    // logger.info(`[Accept Return] 🧪 Using MOCK data for testing full process`);
    // const mockShipmentId = Math.floor(Math.random() * 10000000) + 10000000;
    // const mockCourierId = 51;
    // const mockReturnOrderId = Math.floor(Math.random() * 1000000) + 100000;
    // const mockAwbCode = `SRR${Math.floor(Math.random() * 1000000000)}`;
    // const mockInvoiceNo = `INV${Math.floor(Math.random() * 1000)}`;
    // const now = new Date();
    // const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // // Mock return order creation response
    // shiprocketResponse = {
    //   success: true,
    //   return_order_id: mockReturnOrderId,
    //   order_id: returnOrder.id,
    //   shipment_id: mockShipmentId,
    //   status: 'NEW',
    //   status_code: 1,
    //   courier_company_id: mockCourierId,
    //   courier_name: 'Mock Courier Service',
    //   label_url: `https://apiv2.shiprocket.in/v1/external/courier/generate/label?shipment_id=${mockShipmentId}`,
    //   tracking_url: `https://shiprocket.co/tracking/${mockAwbCode}`,
    //   created_at: now.toISOString(),
    //   message: 'Return order created successfully (MOCK)',
    // };

    // logger.info(`[Accept Return] ✅ Mock return order created: ${mockReturnOrderId}, shipment: ${mockShipmentId}`);

    // // Mock AWB assignment response (simulating POST /v1/external/courier/assign/awb)
    // logger.info(`[Accept Return] 📦 Mock assigning AWB for shipment ${mockShipmentId} with courier ${mockCourierId}`);

    // // Simulate a small delay for AWB assignment
    // await new Promise(resolve => setTimeout(resolve, 100));

    // awbResponse = {
    //   awb_assign_status: 1,
    //   response: {
    //     data: {
    //       courier_company_id: mockCourierId,
    //       awb_code: mockAwbCode,
    //       cod: 0,
    //       order_id: mockReturnOrderId,
    //       shipment_id: mockShipmentId,
    //       awb_code_status: 1,
    //       assigned_date_time: {
    //         date: now.toISOString(),
    //         timezone_type: 3,
    //         timezone: 'Asia/Kolkata',
    //       },
    //       applied_weight: 0.5,
    //       company_id: 1,
    //       courier_name: 'Mock Courier Service',
    //       child_courier_name: null,
    //       pickup_scheduled_date: tomorrow.toISOString().split('T')[0],
    //       routing_code: 'DEL/DEL',
    //       rto_routing_code: 'DEL',
    //       invoice_no: mockInvoiceNo,
    //       transporter_id: '1',
    //       transporter_name: 'Mock Transporter',
    //       shipped_by: {
    //         shipper_company_name: 'Mock Company',
    //         shipper_name: 'Mock Shipper',
    //         shipper_email: 'shipper@mock.com',
    //         shipper_phone: '9876543210',
    //         shipper_address: 'Mock Address',
    //         shipper_city: 'Mumbai',
    //         shipper_state: 'Maharashtra',
    //         shipper_country: 'India',
    //         shipper_postcode: '400001',
    //       },
    //     },
    //   },
    // };

    // logger.info(`[Accept Return] ✅ Mock AWB assigned successfully: ${mockAwbCode}`);

    // Check if mock mode is enabled
    if (isMockModeEnabled()) {
      console.log('[Accept Return] ⚠️ USING MOCK DATA (USE_SHIPROCKET_MOCK=true)');
      logger.info(`[Accept Return] 🚀 Creating mock return order in Shiprocket`);
      
      // Generate mock return order (reuse order creation mock)
      shiprocketResponse = generateMockOrderCreation(returnId);
      
      // Extract response data (handle both direct and wrapped responses)
      const returnOrderData = (shiprocketResponse as any).data || shiprocketResponse;
      const shipmentId = returnOrderData.shipment_id;
  
      if (shipmentId) {
        // Assign AWB after creating return order
        logger.info(`[Accept Return] 📦 Assigning mock AWB for shipment ${shipmentId}`);
        
        try {
          awbResponse = generateMockAwbAssignment({
            shipmentId: shipmentId,
            courierId: 32, // Default mock courier
            orderId: returnOrderData.order_id?.toString(),
          });
          
          logger.info(`[Accept Return] ✅ Mock AWB assigned successfully: ${awbResponse?.data?.response?.data?.awb_code || awbResponse?.awb_code || 'N/A'}`);
        } catch (awbError: any) {
          logger.error(`[Accept Return] ⚠️ Failed to assign mock AWB: ${awbError?.message || 'Unknown error'}`);
        }
      }
    } else if (shiprocketConfig) {
      try {
        const shiprocket = await getAuthenticatedClient({
          email: shiprocketConfig.email,
          password: shiprocketConfig.password,
          baseUrl: shiprocketConfig.baseUrl,
        });
        // Create return order in Shiprocket
        logger.info(`[Accept Return] 🚀 Creating return order in Shiprocket`);
        shiprocketResponse = await shiprocket.returns.createReturnOrder(shiprocketPayload);
        
        // Extract response data (handle both direct and wrapped responses)
        const returnOrderData = (shiprocketResponse as any).data || shiprocketResponse;
        const shipmentId = returnOrderData.shipment_id;
    
        if (shipmentId) {
          // Assign AWB after creating return order
          logger.info(`[Accept Return] 📦 Assigning AWB for shipment ${shipmentId}`);
          
          try {
            const assignAwbResult = await shiprocket.orders.assignAwb({
              shipment_id: shipmentId,
            });
    
            // Extract AWB response data
            awbResponse = (assignAwbResult as any).data || assignAwbResult;
            
            logger.info(`[Accept Return] ✅ AWB assigned successfully: ${awbResponse?.response?.data?.awb_code || awbResponse?.awb_code || 'N/A'}`);
          } catch (awbError: any) {
            logger.error(`[Accept Return] ⚠️ Failed to assign AWB: ${awbError?.message || 'Unknown error'}`);
            logger.error(`[Accept Return] AWB Error stack:`, awbError?.stack);
            // Continue even if AWB assignment fails - return order is still created
          }
        } else {
          logger.warn(`[Accept Return] ⚠️ Missing shipment_id or courier_id, skipping AWB assignment`);
        }
      } catch (createError: any) {
        logger.error(`[Accept Return] ❌ Failed to create return order in Shiprocket: ${createError?.message || 'Unknown error'}`);
        logger.error(`[Accept Return] Create Error stack:`, createError?.stack);
        throw createError;
      }
    }

    // Extract response data (handle both direct and wrapped responses)
    const returnOrderData = (shiprocketResponse as any).data || shiprocketResponse;
    const awbData = awbResponse?.response?.data || awbResponse?.data || null;

    // Build comprehensive metadata similar to order fulfillment
    const shiprocketMetadata: any = {
      // Return order creation data
      return_order_id: returnOrderData.return_order_id || returnOrderData.order_id,
      shipment_id: returnOrderData.shipment_id,
      status: returnOrderData.status,
      status_code: returnOrderData.status_code,
      courier_company_id: returnOrderData.courier_company_id,
      courier_name: returnOrderData.courier_name,
      created_at: returnOrderData.created_at || new Date().toISOString(),

      // AWB assignment data (from assignAwb API)
      awb: awbData?.awb_code || null,
      awb_code: awbData?.awb_code || null,
      awb_code_status: awbData?.awb_code_status || null,
      awb_assign_status: awbResponse?.awb_assign_status || null,
      assigned_date_time: awbData?.assigned_date_time || null,

      // Additional AWB data
      applied_weight: awbData?.applied_weight || null,
      company_id: awbData?.company_id || null,
      child_courier_name: awbData?.child_courier_name || null,
      pickup_scheduled_date: awbData?.pickup_scheduled_date || null,
      routing_code: awbData?.routing_code || null,
      rto_routing_code: awbData?.rto_routing_code || null,
      invoice_no: awbData?.invoice_no || null,
      transporter_id: awbData?.transporter_id || null,
      transporter_name: awbData?.transporter_name || null,
      shipped_by: awbData?.shipped_by || null,

      // URLs (if available)
      label_url: returnOrderData.label_url || null,
      tracking_url: returnOrderData.tracking_url || (awbData?.awb_code ? `https://shiprocket.co/tracking/${awbData.awb_code}` : null),

      // Store full response for reference
      _raw_response: {
        return_order: returnOrderData,
        awb_assignment: awbResponse,
      },
    };

    const updatedMetadata = {
      ...returnData,
      shiprocket: shiprocketMetadata,
    };


    // Update return metadata directly on the backend
    logger.info(`[Accept Return] 📝 Updating return metadata with Shiprocket data`);

    // Note: Metadata persistence is handled by the frontend via the metadata endpoint
    // The metadata endpoint will attempt to persist it, and if that fails, 
    // the metadata is still returned in the response for the frontend to handle
    logger.info(`[Accept Return] ℹ️ Metadata prepared - will be persisted via metadata endpoint`);

    logger.info(`[Accept Return] ✅ Return ${returnId} accepted and Shiprocket return order created: ${returnOrderData.return_order_id || returnOrderData.order_id}`);

    // Implement data storage using ShiprocketReturnService (resolved by model name)
    try {
      const shiprocketReturnService = req.scope.resolve<ShiprocketReturnService>(
        SHIPROCKET_RETURN_MODULE
      ) as any

      if (shiprocketReturnService) {
        logger.info(`[Accept Return] 💾 Storing return data in ShiprocketReturn table`);

        await shiprocketReturnService.createReturn({
          order_id: returnOrder.order_id,
          return_id: returnOrder.id,

          shiprocket_return_id: String(returnOrderData.return_order_id || returnOrderData.order_id),
          shiprocket_shipment_id: String(returnOrderData.shipment_id),
          awb_code: awbData?.awb_code || null,

          courier_company: returnOrderData.courier_name || null,
          courier_company_id: String(returnOrderData.courier_company_id || ""),

          return_status: returnOrderData.status || "created",
          pickup_status: "scheduled",
          shipment_status: "in_transit",

          pickup_scheduled_date: awbData?.pickup_scheduled_date ? new Date(awbData.pickup_scheduled_date) : null,

          label_url: returnOrderData.label_url || null,
          tracking_url: returnOrderData.tracking_url || (awbData?.awb_code ? `https://shiprocket.co/tracking/${awbData.awb_code}` : null),

          create_payload: shiprocketPayload,
          create_response: {
            return_order: returnOrderData,
            awb_assignment: awbResponse,
          },
          metadata: shiprocketMetadata,
        });

        logger.info(`[Accept Return] ✅ Return data stored successfully`);
      } else {
        logger.warn(`[Accept Return] ⚠️ shiprocketReturnService not resolved, skipping DB storage`);
      }
    } catch (dbError: any) {
      logger.error(`[Accept Return] ❌ Failed to store return data in DB: ${dbError.message}`);
      // Continue response even if DB storage fails
    }

    return res.json({
      success: true,
      message: (shiprocketResponse as any).message || 'Return order created in Shiprocket successfully',
      shiprocket_return_order_id: returnOrderData.return_order_id || returnOrderData.order_id,
      data: returnOrderData,
      metadata: updatedMetadata, // Include metadata in response
    });
  } catch (error: any) {
    logger.error(`[Accept Return] ❌ Error accepting return ${returnId}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to accept return and create Shiprocket return order',
      message: error.message || 'Unknown error',
      stack: error.stack,
    });
  }
}

