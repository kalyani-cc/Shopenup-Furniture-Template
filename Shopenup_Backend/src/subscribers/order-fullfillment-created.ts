import type { SubscriberArgs, SubscriberConfig } from "@shopenup/framework"
import type { IFulfillmentModuleService } from "@shopenup/framework/types"
import { Modules } from "@shopenup/framework/utils"
import { getCountryByIso2 } from "../admin/data/countries"
import { getProvinceByIso2, getCountryProvinceObjectByIso2 } from "../admin/data/country-states"
import { getAuthenticatedClient } from 'src/modules/shiprocket/utils/shiprocket-client';
import { isMockModeEnabled, generateMockOrderCreation, generateMockAwbAssignment } from 'src/modules/shiprocket/utils/mock-mode';

/**
 * Subscriber to store Shiprocket shipping metadata in order when order is placed
 * This ensures courier_company_id and charge are available when creating Shiprocket orders
 */
export default async function orderFullfillmentCreatedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    try {
        const logger = container.resolve("logger") as any
        // console.log("orderFullfillmentCreatedHandler", data)
        
        const query = container.resolve("query") as any
        const { data: [order] } = await query.graph({
            entity: "order",
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
            filters: { id: (data as any).order_id },
          })
        
        console.log("order 1234", JSON.stringify(order.items, null, 2))
        // console.log("order.billing_address", order.billing_address)
        // console.log("order.shipping_address", order.shipping_address)
        
        if (!order) {
            logger.warn(`Order ${(data as any).order_id} not found`)
            return
        }

        // Get the latest fulfillment (most recently created)
        const fulfillments = order.fulfillments || []
        if (fulfillments.length === 0) {
            logger.info(`Order ${order.id} has no fulfillments`)
            return
        }

        // Sort fulfillments by created_at descending to get the latest one
        const latestFulfillment = fulfillments.sort((a: any, b: any) => {
            const dateA = new Date(a.created_at || 0).getTime()
            const dateB = new Date(b.created_at || 0).getTime()
            return dateB - dateA
        })[0]

        // console.log("[Order Fulfillment Created] Latest Fulfillment:", {
        //     id: latestFulfillment.id,
        //     location_id: latestFulfillment.location_id,
        //     created_at: latestFulfillment.created_at,
        // })

        // Get location_id from the latest fulfillment
        const stockLocationId = latestFulfillment.location_id
        if (!stockLocationId) {
            logger.warn(`Latest fulfillment ${latestFulfillment.id} has no location_id`)
            return
        }

        // Resolve stock location name using query.graph (more reliable)
        let stockLocationName: string | undefined
        try {
            // console.log("[Order Fulfillment Created] Fetching stock location details...")
            const { data: [stockLocation] } = await query.graph({
                entity: "stock_location",
                fields: [
                    "id",
                    "name",
                    "address.*",
                ],
                filters: { id: stockLocationId },
            })
            
            if (stockLocation) {
                stockLocationName = stockLocation.name
                // console.log("[Order Fulfillment Created] Stock Location:", {
                //     id: stockLocationId,
                //     name: stockLocationName,
                // })
              logger.info(`Found stock location for order ${order.id}: ${stockLocationName} (${stockLocationId})`)
            } else {
                logger.warn(`Stock location ${stockLocationId} not found`)
            }
        } catch (error: any) {
            logger.warn(`Could not resolve stock location ${stockLocationId} for order ${order.id}: ${error?.message || error}`)
            console.error("[Order Fulfillment Created] Error fetching stock location:", error)
        }

        // Build Shiprocket order payload and create order in Shiprocket
        if (stockLocationName) {
            const shiprocketPayload = buildShiprocketPayload(order, stockLocationName)
            console.log("[Order Fulfillment Created] 📦 Shiprocket Order Payload:", JSON.stringify(shiprocketPayload, null, 2))
            
            // Check if order already exists in Shiprocket (avoid duplicate creation)
            if (order.metadata?.shiprocket_order_id) {
                logger.info(`Order ${order.id} already has Shiprocket order_id: ${order.metadata.shiprocket_order_id}, skipping creation`)
                return
            }

            try {
                // Get Shiprocket configuration
                // Try container first, fallback to environment variables
                let shiprocketConfig: any = null
                try {
                    shiprocketConfig = container.resolve("shiprocketConfig") as any
                } catch (configError: any) {
                    // Container resolution failed, use environment variables directly
                    console.log("[Order Fulfillment Created] Using environment variables for Shiprocket config")
                }
                
                // Fallback to environment variables if container resolution failed
                if (!shiprocketConfig) {
                    const email = process.env.SHIPROCKET_EMAIL
                    const password = process.env.SHIPROCKET_PASSWORD
                    
                    if (!email || !password) {
                        logger.warn("Shiprocket configuration not found (no SHIPROCKET_EMAIL/PASSWORD), skipping order creation")
                        return
                    }
                    
                    shiprocketConfig = {
                        email,
                        password,
                        baseUrl: process.env.SHIPROCKET_BASE_URL || "https://apiv2.shiprocket.in/v1/external",
                    }
                }

                // Check if mock mode is enabled
                let orderResult: any;
                let shiprocketOrderData: any;

                if (isMockModeEnabled()) {
                    console.log("[Order Fulfillment Created] ⚠️ USING MOCK DATA (USE_SHIPROCKET_MOCK=true)")
                    orderResult = generateMockOrderCreation(order.id)
                    shiprocketOrderData = orderResult.data
                } else {
                    // Get authenticated Shiprocket client
                    const shiprocket = await getAuthenticatedClient({
                        email: shiprocketConfig.email,
                        password: shiprocketConfig.password,
                        baseUrl: shiprocketConfig.baseUrl,
                    })

                    // Create order in Shiprocket
                    console.log("[Order Fulfillment Created] 🚀 Creating order in Shiprocket...")
                    
                    // Real API call
                    orderResult = await shiprocket.orders.createOrder(shiprocketPayload)
                    if (!orderResult.success) {
                        console.error("[Order Fulfillment Created] ❌ Failed to create Shiprocket order:", orderResult.error)
                        logger.error(`Failed to create Shiprocket order for ${order.id}:`, orderResult.error)
                        return
                    }
                    shiprocketOrderData = orderResult.data
                }
                console.log("[Order Fulfillment Created] ✅ Order created successfully in Shiprocket!")
                console.log("[Order Fulfillment Created] Shiprocket Order ID:", shiprocketOrderData?.order_id)
                console.log("[Order Fulfillment Created] Shiprocket Shipment ID:", shiprocketOrderData?.shipment_id)

                // Get courier_id from order metadata
                // Check in selected_shipping_option first, then fallback to direct metadata
                const courierId = 
                    order.metadata?.selected_shipping_option?.courier_company_id ||
                    order.metadata?.courier_company_id || 
                    order.metadata?.courier_id
                
                // Assign Courier & Generate AWB if courier_id is available
                let awbData: any = null
                if (courierId && shiprocketOrderData?.shipment_id) {
                    try {
                        console.log("[Order Fulfillment Created] 🚚 Assigning courier and generating AWB...")
                        console.log("[Order Fulfillment Created] Courier ID:", courierId)
                        console.log("[Order Fulfillment Created] Shipment ID:", shiprocketOrderData.shipment_id)
                        
                        let awbResult: any;

                        if (isMockModeEnabled()) {
                            console.log("[Order Fulfillment Created] ⚠️ USING MOCK AWB DATA (USE_SHIPROCKET_MOCK=true)")
                            awbResult = generateMockAwbAssignment({
                                shipmentId: shiprocketOrderData.shipment_id,
                                courierId: courierId,
                                orderId: shiprocketOrderData.order_id?.toString(),
                            })
                        } else {
                            // Get authenticated Shiprocket client (if not already done)
                            const shiprocket = await getAuthenticatedClient({
                                email: shiprocketConfig.email,
                                password: shiprocketConfig.password,
                                baseUrl: shiprocketConfig.baseUrl,
                            })

                            // Use assignAwb API to assign courier and generate AWB
                            awbResult = await shiprocket.orders.assignAwb({
                                shipment_id: shiprocketOrderData.shipment_id,
                                courier_id: typeof courierId === 'string' ? parseInt(courierId) : courierId,
                            })
                        }

                        if (awbResult.success && awbResult.data?.awb_assign_status === 1) {
                            // Extract data from the nested response structure
                            const responseData = awbResult.data.response?.data as any
                            // Construct label URL using shipment_id (API doesn't return label_url directly)
                            const labelUrl = responseData?.shipment_id 
                                ? `https://apiv2.shiprocket.in/v1/external/courier/generate/label?shipment_id=${responseData.shipment_id}`
                                : undefined
                            
                            awbData = {
                                awb_code: responseData?.awb_code,
                                awb_code_status: responseData?.awb_code_status,
                                courier_company_id: responseData?.courier_company_id,
                                courier_name: responseData?.courier_name || responseData?.child_courier_name,
                                shipment_id: responseData?.shipment_id,
                                order_id: responseData?.order_id,
                                label_url: labelUrl,
                                pickup_scheduled_date: responseData?.pickup_scheduled_date,
                                applied_weight: responseData?.applied_weight,
                                routing_code: responseData?.routing_code,
                                rto_routing_code: responseData?.rto_routing_code,
                                invoice_no: responseData?.invoice_no,
                                cod: responseData?.cod,
                                assigned_date_time: responseData?.assigned_date_time?.date,
                                shipped_by: responseData?.shipped_by,
                            }
                            console.log("[Order Fulfillment Created] ✅ AWB assigned successfully!")
                            console.log("[Order Fulfillment Created] AWB Code:", awbData?.awb_code)
                            console.log("[Order Fulfillment Created] Courier Name:", awbData?.courier_name)
                            console.log("[Order Fulfillment Created] Shipment ID:", awbData?.shipment_id)
                            console.log("[Order Fulfillment Created] Order ID:", awbData?.order_id)
                            console.log("[Order Fulfillment Created] Pickup Scheduled:", awbData?.pickup_scheduled_date)
                        } else {
                            console.error("[Order Fulfillment Created] ❌ Failed to assign AWB:", awbResult.error || awbResult.data)
                            logger.error(
                                `Failed to assign AWB for order ${order.id}:`,
                                awbResult.error || awbResult.data
                            )
                        }
                    } catch (awbError: any) {
                        console.error("[Order Fulfillment Created] ❌ Error assigning AWB:", awbError)
                        logger.error(`Error assigning AWB for order ${order.id}:`, awbError)
                        // Continue even if AWB assignment fails
                    }
                } else {
                    if (!courierId) {
                        logger.warn(`No courier_id found in order metadata for order ${order.id}, skipping shipment creation`)
                    }
                    if (!shiprocketOrderData?.shipment_id) {
                        logger.warn(`No shipment_id in Shiprocket order response for order ${order.id}, skipping shipment creation`)
                    }
                }

                // Store both API results in fulfillment.data
                await updateFulfillmentWithShiprocketData(
                    container,
                    latestFulfillment,
                    shiprocketOrderData,
                    awbData,
                    courierId,
                    logger
                )

                // Store Shiprocket order and shipment details in order metadata
                // const orderService = container.resolve("orderService") as any
                // if (orderService) {
                //     const trackingUrl = shipmentData?.awb_code 
                //         ? `https://apiv2.shiprocket.in/v1/external/orders/print/label/${shipmentData.awb_code}` 
                //         : undefined
                    
                //     await orderService.update(order.id, {
                //         metadata: {
                //             ...order.metadata,
                //             shiprocket_order_id: shiprocketOrderData?.order_id,
                //             shiprocket_shipment_id: shiprocketOrderData?.shipment_id,
                //             shiprocket_status: shiprocketOrderData?.status,
                //             shiprocket_order_created_at: new Date().toISOString(),
                //             // Shipment details (if created)
                //             ...(shipmentData && {
                //                 shiprocket_awb_code: shipmentData.awb_code,
                //                 shiprocket_courier_id: shipmentData.courier_company_id || courierId,
                //                 shiprocket_courier_name: shipmentData.courier_name,
                //                 shiprocket_tracking_url: trackingUrl,
                //                 shiprocket_shipment_status: shipmentData.status || "pending",
                //             }),
                //         },
                //     })
                //     logger.info(
                //         `Stored Shiprocket order details for order ${order.id}: order_id=${shiprocketOrderData?.order_id}, shipment_id=${shiprocketOrderData?.shipment_id}${shipmentData?.awb_code ? `, awb_code=${shipmentData.awb_code}` : ''}`
                //     )
                // } else {
                //     logger.warn(`OrderService not available, could not store Shiprocket order details for order ${order.id}`)
                // }
            } catch (error: any) {
                console.error("[Order Fulfillment Created] ❌ Error creating Shiprocket order:", error)
                logger.error(`Error creating Shiprocket order for ${order.id}:`, error)
                // Don't throw - this is not critical enough to fail fulfillment creation
            }
          }
    } catch (error) {
        const logger = container.resolve("logger") as any
        logger.error(`Error in orderFullfillmentCreatedHandler for order ${(data as any).order_id}:`, error)
        // Don't throw - this is not critical enough to fail order creation
    }
}

/**
 * Helper to extract numeric value from BigNumber or plain number
 */
function toNumber(value: any): number {
    if (value === null || value === undefined) return 0
    // Check if it's a BigNumber object (has numeric_ property)
    if (typeof value === 'object' && 'numeric_' in value) {
        return value.numeric_
    }
    // Check if it's a BigNumber with raw_ property
    if (typeof value === 'object' && 'raw_' in value && value.raw_?.value) {
        return parseFloat(value.raw_.value)
    }
    // Plain number
    return typeof value === 'number' ? value : parseFloat(value) || 0
}

/**
 * Build Shiprocket order payload from order data
 */
function buildShiprocketPayload(order: any, pickupLocation: string): any {
    const shippingAddress = order.shipping_address || order.delivery_address || {}
    const billingAddress = order.billing_address || shippingAddress
    
    // Format order date as "YYYY-MM-DD HH:mm"
    const orderDate = new Date(order.created_at || Date.now())
    const formattedOrderDate = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')} ${String(orderDate.getHours()).padStart(2, '0')}:${String(orderDate.getMinutes()).padStart(2, '0')}`

    // Split billing customer name from billing address
    // const billingName = `${billingAddress.first_name || ""} ${billingAddress.last_name || ""}`.trim()
    // const nameParts = billingName.split(" ")
    const billingFirstName = `${billingAddress.first_name || ""}`.trim()
    const billingLastName = `${billingAddress.last_name || ""}`.trim()

    // Split shipping customer name from shipping address
    // const shippingName = `${shippingAddress.first_name || ""} ${shippingAddress.last_name || ""}`.trim()
    // const shippingNameParts = shippingName.split(" ")
    const shippingFirstName = `${shippingAddress.first_name || ""}`.trim()
    const shippingLastName = `${shippingAddress.last_name || ""}`.trim()

    // Check if billing and shipping addresses are different
    const isSameAddress = 
        billingAddress.address_1 === shippingAddress.address_1 &&
        billingAddress.city === shippingAddress.city &&
        billingAddress.postal_code === shippingAddress.postal_code &&
        billingAddress.country_code === shippingAddress.country_code

    // Calculate item-level tax and discount
    const orderItems = order.items || []
    const orderItemsWithTax = orderItems.map((item: any) => {
        const unitPrice = toNumber(item.fulfilled_total) || toNumber(item.total) || 0
        const quantity = toNumber(item.quantity) || 1
        const itemSubtotal = unitPrice * quantity
        
        // Calculate tax for this item
        // Priority: 1. Use item.tax_total if available, 2. Calculate from tax_lines rate
        let calculatedTax = 0
        const itemTaxTotal = toNumber(item.tax_total)
        if (itemTaxTotal > 0) {
            // Use the tax_total directly if available
            calculatedTax = itemTaxTotal
        } else if (item.tax_lines && item.tax_lines.length > 0) {
            // Calculate tax from tax rate (e.g., 18% of subtotal)
            // Sum all tax_lines rates
            const totalTaxRate = item.tax_lines.reduce((sum: number, taxLine: any) => {
                return sum + toNumber(taxLine.rate)
            }, 0)
            calculatedTax = (itemSubtotal * totalTaxRate) / 100
        }
        
        // Get discount for this item
        const itemDiscount = toNumber(item.discount_subtotal)
        
        // Get HSN code
        const hsnCode = item.variant?.product?.hs_code || 
                       item.variant?.hs_code || 
                       null

        return {
            name: item.title || "Product",
            sku: item.sku || item.variant_sku || item.variant_id || `SKU-${item.id}`,
            units: quantity,
            selling_price: Math.round(unitPrice * 100) / 100,
            // discount: itemDiscount > 0 ? Math.round(itemDiscount * 100) / 100 : "",
            discount: "",
            // tax: calculatedTax > 0 ? Math.round(calculatedTax * 100) / 100 : "",
            tax : "",
            hsn: hsnCode ? parseInt(String(hsnCode).replace(/\D/g, "")) : null,
        }
    })

    // Calculate total discount
    const totalDiscount = toNumber(order.discount_subtotal) || orderItems.reduce((sum: number, item: any) => {
        return sum + toNumber(item.discount_total || item.discount_subtotal)
    }, 0)

    // Shipping charges with tax included
    const shippingSubtotal = toNumber(order.shipping_subtotal) || toNumber(order.shipping_total) || 0
    const shippingTax = toNumber(order.shipping_tax_total) || 0
    const shippingCharges = shippingSubtotal + shippingTax

    // Payment method
    const isCOD = order.payment_collections?.[0]?.status === "awaiting" || order.payment_collections?.[0]?.status === "not_paid" || order.payment_collections?.[0]?.status === "authorized"
    const paymentMethod = isCOD ? "COD" : "Prepaid"

    // Calculate weight and dimensions
    // Shiprocket requires minimum weight of 0.5 kg (500 gm)
    const MINIMUM_WEIGHT_KG = 0.5
    const totalWeight = Math.max(
        orderItems.reduce((sum: number, item: any) => {
            const weight = toNumber(item.variant?.product?.weight) || toNumber(item.variant?.weight) || toNumber(item.weight) || 0.5
            const quantity = toNumber(item.quantity) || 1
            return sum + weight * quantity
        }, 0) || MINIMUM_WEIGHT_KG,
        MINIMUM_WEIGHT_KG
    )

    // Calculate dimensions
    // let length = 10, breadth = 15, height = 20   
    let length = 0, breadth = 0, height = 0
    let hasDimensions = false
    for (const item of orderItems) {
        const itemLength = toNumber(item.variant?.product?.length) || toNumber(item.variant?.length) || toNumber(item.length) || 0
        const itemBreadth = toNumber(item.variant?.product?.width) || toNumber(item.variant?.width) || toNumber(item.breadth) || toNumber(item.width) || 0
        const itemHeight = toNumber(item.variant?.product?.height) || toNumber(item.variant?.height) || toNumber(item.height) || 0
        if (itemLength > 0 && itemBreadth > 0 && itemHeight > 0) {
            length = Math.max(length, itemLength)
            breadth = Math.max(breadth, itemBreadth)
            height += itemHeight * (toNumber(item.quantity) || 1)
            hasDimensions = true
        }
        console.log("item 1234", length, breadth, height)
    }
    const itemTotal = toNumber(order.item_total)
    
    return {
        order_id: order.display_id?.toString() || order.id?.toString() || `ORDER-${Date.now()}`,
        order_date: formattedOrderDate,
        pickup_location: pickupLocation,
        comment: order.metadata?.comment || `Order from ${order.display_id || order.id}`,
        billing_customer_name: billingFirstName,
        billing_last_name: billingLastName,
        billing_address: billingAddress.address_1 || "",
        billing_address_2: billingAddress.address_2 || "",
        billing_city: billingAddress.city || "",
        billing_pincode: parseInt(billingAddress.postal_code) || 0,
        billing_state: mapStateCode(billingAddress.country_code, billingAddress.province || billingAddress.state) || "",
        billing_country: mapCountryCode(billingAddress.country_code) || "India",
        billing_email: billingAddress.email || order.email || "",
        billing_phone: parseInt(billingAddress.phone?.replace(/\D/g, "") || "0") || 0,
        shipping_is_billing: isSameAddress,
        shipping_customer_name: isSameAddress ? "" : shippingFirstName,
        shipping_last_name: isSameAddress ? "" : shippingLastName,
        shipping_address: isSameAddress ? "" : (shippingAddress.address_1 || ""),
        shipping_address_2: isSameAddress ? "" : (shippingAddress.address_2 || ""),
        shipping_city: isSameAddress ? "" : (shippingAddress.city || ""),
        shipping_pincode: isSameAddress ? "" : parseInt((shippingAddress.postal_code)) || 0,
        shipping_country: isSameAddress ? "" : (mapCountryCode(shippingAddress.country_code) || ""),
        shipping_state: isSameAddress ? "" : mapStateCode(shippingAddress.country_code, shippingAddress.province || shippingAddress.state) || "",
        shipping_email: isSameAddress ? "" : (shippingAddress.email || order.email || ""),
        shipping_phone: isSameAddress ? "" : (shippingAddress.phone?.replace(/\D/g, "") || ""),
        order_items: orderItemsWithTax,
        payment_method: paymentMethod,
        shipping_charges: Math.round(shippingCharges * 100) / 100,
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: Math.round(totalDiscount * 100) / 100,
        sub_total: Math.round(itemTotal * 100) / 100,
        length: length,
        breadth: breadth,
        height: height,
        weight: totalWeight,
    }
}

/**
 * Map country code to country name using the countries data file
 */
function mapCountryCode(countryCode: string | null | undefined): string {
    if (!countryCode) {
        return "India" // Default fallback
    }
    
    const country = getCountryByIso2(countryCode)
    return country?.display_name || country?.name || countryCode
}

/**
 * Map state/province code or name to state name using the country-states data file
 */
function mapStateCode(countryCode: string | null | undefined, stateCode: string | null | undefined): string {
    if (!stateCode || !countryCode) {
        return stateCode || ""
    }
    
    // Try to get state name using ISO 3166-2 code
    // First, try if stateCode is already in ISO 3166-2 format (e.g., "IN-DL")
    let provinceName = getProvinceByIso2(stateCode)
    if (provinceName) {
        return provinceName
    }
    
    // If not found, try constructing ISO 3166-2 code (e.g., "DL" -> "IN-DL")
    const constructedCode = `${countryCode.toUpperCase()}-${stateCode.toUpperCase()}`
    provinceName = getProvinceByIso2(constructedCode)
    if (provinceName) {
        return provinceName
    }
    
    // If still not found, try to search through country's provinces by name
    const countryProvinceObj = getCountryProvinceObjectByIso2(countryCode)
    if (countryProvinceObj) {
        // Search for exact match in province names (case-insensitive)
        const stateCodeUpper = stateCode.toUpperCase()
        for (const [code, name] of Object.entries(countryProvinceObj.options)) {
            if (name.toUpperCase() === stateCodeUpper || code.toUpperCase() === stateCodeUpper) {
                return name
            }
        }
    }
    
    // Fallback: return the original stateCode if no match found
    return stateCode
}

/**
 * Update fulfillment with Shiprocket API results
 */
async function updateFulfillmentWithShiprocketData(
    container: any,
    fulfillment: any,
    orderData: any,
    awbData: any,
    courierId: any,
    logger: any
): Promise<void> {
    if (!fulfillment?.id) {
        logger.warn("Fulfillment ID not available")
        return
    }

    try {
        const awbCode = awbData?.awb_code
        // Use label_url from AWB response, or construct tracking URL
        const labelUrl = awbData?.label_url
        const trackingUrl = awbCode 
            ? `https://shiprocket.co/tracking/${awbCode}` 
            : undefined
        
        // Build order creation data
        const orderCreationData = {
            shiprocket_order_id: orderData?.order_id,
            shiprocket_shipment_id: orderData?.shipment_id,
            shiprocket_order_status: orderData?.status,
            shiprocket_order_created_at: new Date().toISOString(),
        }

        // Build AWB assignment data (if available)
        const awbAssignmentData = awbData ? {
            shipment_id: awbData.shipment_id,
            awb_code: awbCode,
            awb_code_status: awbData.awb_code_status,
            courier_name: awbData.courier_name,
            courier_company_id: awbData.courier_company_id,
            courier_id: awbData.courier_company_id || courierId,
            label_url: labelUrl,
            shiprocket_label_url: labelUrl,
            shiprocket_tracking_url: trackingUrl,
            shiprocket_awb_assigned_at: awbData.assigned_date_time || new Date().toISOString(),
            pickup_scheduled_date: awbData.pickup_scheduled_date,
            applied_weight: awbData.applied_weight,
            routing_code: awbData.routing_code,
            rto_routing_code: awbData.rto_routing_code,
            invoice_no: awbData.invoice_no,
            cod: awbData.cod,
            shipped_by: awbData.shipped_by,
        } : {}

        // Resolve fulfillment module service using Modules.FULFILLMENT (the correct pattern)
        const fulfillmentModuleService: IFulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
        
        // Update fulfillment data using updateFulfillment method
        await fulfillmentModuleService.updateFulfillment(fulfillment.id, {
            data: {
                ...fulfillment.data,
                ...orderCreationData,
                ...awbAssignmentData,
            },
        })

        logger.info(
            `Stored Shiprocket API results in fulfillment ${fulfillment.id} data: ` +
            `order_id=${orderData?.order_id}${awbCode ? `, awb_code=${awbCode}` : ''}`
        )
    } catch (error: any) {
        logger.warn(`Could not store API results in fulfillment data: ${error?.message || error}`)
        console.error("[Order Fulfillment Created] Error updating fulfillment:", error)
        
        // Log the data that would have been stored
        console.log("[Order Fulfillment Created] 📝 Shiprocket data (not stored due to error):", {
            fulfillment_id: fulfillment.id,
            shiprocket_order_id: orderData?.order_id,
            awb_code: awbData?.awb_code,
        })
    }
}

export const config: SubscriberConfig = {
    event: "order.fulfillment_created",
}

