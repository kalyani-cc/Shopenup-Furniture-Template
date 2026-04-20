import type { CreateReturnOrderRequest } from '@shopenup/logistic';
import type { AdminReturn, AdminOrder } from '@shopenup/types';
import ShiprocketFulfillmentService from '../service';
import { getCountryByIso2 } from "../../../admin/data/countries"
import { getProvinceByIso2, getCountryProvinceObjectByIso2 } from "../../../admin/data/country-states"

/**
 * Map return order data to Shiprocket's return order format
 */
// export function mapReturnToShiprocketFormat(
//   returnOrder: AdminReturn,
//   order: AdminOrder,
//   shiprocketService: ShiprocketFulfillmentService,
//   storeLocation?: any, // Optional store location from order fulfillment
// ): CreateReturnOrderRequest {
//   console.log('returnOrder 12345', JSON.stringify(returnOrder, null, 2));
//   // Get order date (use created_at or current date)
//   const orderDate = order.created_at 
//     ? new Date(order.created_at).toISOString().split('T')[0]
//     : new Date().toISOString().split('T')[0];

//   // Get pickup address from order's shipping address (customer's address)
//   const shippingAddress = (order.shipping_address as any) || {};
//   const customerPhone = (order.customer as any)?.phone || shippingAddress.phone || '';
//   const pickupAddress = {
//     customer_name: shippingAddress.first_name || '',
//     last_name: shippingAddress.last_name || '',
//     address: shippingAddress.address_1 || '',
//     address_2: shippingAddress.address_2 || '',
//     city: shippingAddress.city || '',
//     state: shippingAddress.province || '',
//     country: shippingAddress.country_code === 'IN' ? 'India' : (shippingAddress.country || 'India'),
//     pincode: shippingAddress.postal_code || '',
//     email: order.email || '',
//     phone: customerPhone,
//     isd_code: '91', // Default to India
//   };

//   // Get shipping address (warehouse/store address)
//   // Priority: 1. Store location from order fulfillment, 2. Default pickup location, 3. Order billing address
//   const defaultPickupLocation = (shiprocketService as any).options?.defaultPickupLocation;
//   const billingAddress = (order.billing_address as any) || {};
  
//   // Get store location from order fulfillment (if provided)
//   let storeLocationData: any = null;
//   if (storeLocation) {
//     storeLocationData = {
//       name: storeLocation.name || 'Store',
//       address: storeLocation.address || storeLocation.address_1 || '',
//       address_2: storeLocation.address_2 || '',
//       city: storeLocation.city || '',
//       state: storeLocation.province || '',
//       country: storeLocation.country_code === 'IN' ? 'India' : (storeLocation.country || 'India'),
//       pin_code: storeLocation.postal_code || storeLocation.pin_code || '',
//       email: storeLocation.email || order.email || '',
//       phone: storeLocation.phone || '',
//     };
//   }
  
//   // Use store location from fulfillment, then default pickup location, then billing address
//   const shippingAddressData = storeLocationData || defaultPickupLocation || {
//     name: 'Store',
//     address: billingAddress.address_1 || '',
//     address_2: billingAddress.address_2 || '',
//     city: billingAddress.city || '',
//     state: billingAddress.province || '',
//     country: billingAddress.country_code === 'IN' ? 'India' : (billingAddress.country || 'India'),
//     pin_code: billingAddress.postal_code || '',
//     email: order.email || '',
//     phone: (order.customer as any)?.phone || '',
//   };

//   // Map return items using REAL data from return order and order items
//   // Match the same logic as create order mapping (order-mapper.ts)
//   const orderItems = (returnOrder.items || []).map((item: any) => {
//     // Find the corresponding order item
//     const orderItem = order.items?.find((oi: any) => oi.id === item.item_id);
//     const variant = orderItem?.variant;
//     const product = variant?.product as any;
    
//     // Use REAL data with fallbacks (same as order-mapper.ts)
//     const itemTitle = orderItem?.title || variant?.product?.title || 'Product';
//     const itemSku = variant?.sku || orderItem?.variant_sku || item.sku || item.item?.sku || '';
//     const itemQuantity = item.quantity || item.received_quantity || 1;
    
//     // Use same selling_price calculation as order-mapper.ts (line 161)
//     // unit_price is already in the correct format (rupees, not cents)
//     const sellingPrice = orderItem?.unit_price || item.unit_price || item.item?.unit_price || 0;
    
//     const productImage = '';
//     const productBrand = '';
    
//     // Use same discount calculation as order-mapper.ts (line 162)
//     const itemDiscount = orderItem?.discount_total || item.discount_total || item.discount || 0;
    
//     return {
//       name: itemTitle,
//       qc_enable: false,
//       qc_product_name: itemTitle,
//       sku: itemSku,
//       units: itemQuantity,
//       selling_price: sellingPrice,
//       discount: itemDiscount,
//       qc_brand: productBrand,
//       qc_product_image: productImage,
//     };
//   });

//   // Calculate dimensions using same logic as order-mapper.ts (lines 89-99)
//   const dimensions = calculateReturnDimensions(order.items || [], returnOrder.items || []);
  
//   // Calculate weight using same logic as order-mapper.ts (lines 81-86)
//   const weight = calculateReturnWeight(order.items || [], returnOrder.items || []);

//   // Determine payment method
//   const paymentMethod = 'PREPAID';

//   // Calculate sub_total using same logic as order-mapper.ts (lines 71-78)
//   const subTotal = order.item_total

//   // Calculate total_discount from order items (sum of all item discounts)
//   const totalDiscount = order.items?.reduce(
//     (sum: number, item: any) =>
//       sum + (item.discount_total || 0),
//     0
//   ) || 0;

//   // Map country and state codes to names (same as create order)
//   // Pickup address (customer's address) - from order shipping address
//   const pickupCountryCode = shippingAddress.country_code || 'IN';
//   const pickupStateCode = shippingAddress.province || shippingAddress.state || '';
//   const mappedPickupCountry = mapCountryCode(pickupCountryCode);
//   const mappedPickupState = mapStateCode(pickupCountryCode, pickupStateCode);

//   // Shipping address (store location) - map country and state
//   // Get country code from store location, default pickup location, or billing address
//   let shippingCountryCode = 'IN'; // Default to India
//   if (storeLocation?.country_code) {
//     shippingCountryCode = storeLocation.country_code;
//   } else if (storeLocation?.address?.country_code) {
//     shippingCountryCode = storeLocation.address.country_code;
//   } else if (defaultPickupLocation?.country_code) {
//     shippingCountryCode = defaultPickupLocation.country_code;
//   } else if (billingAddress.country_code) {
//     shippingCountryCode = billingAddress.country_code;
//   }
  
//   // Get state code from store location, default pickup location, or billing address
//   let shippingStateCode = '';
//   if (storeLocation?.province) {
//     shippingStateCode = storeLocation.province;
//   } else if (storeLocation?.address?.province) {
//     shippingStateCode = storeLocation.address.province;
//   } else if (defaultPickupLocation?.state) {
//     shippingStateCode = defaultPickupLocation.state;
//   } else if (billingAddress.province || billingAddress.state) {
//     shippingStateCode = billingAddress.province || billingAddress.state || '';
//   }
  
//   const mappedShippingCountry = mapCountryCode(shippingCountryCode);
//   const mappedShippingState = mapStateCode(shippingCountryCode, shippingStateCode);

//   return {
//     order_id: String(returnOrder.id || order.display_id || order.id),
//     order_date: orderDate,
//     channel_id: undefined, // Optional field
//     pickup_customer_name: pickupAddress.customer_name,
//     pickup_last_name: pickupAddress.last_name || '',
//     company_name: undefined, // Optional
//     pickup_address: pickupAddress.address,
//     pickup_address_2: pickupAddress.address_2 || '',
//     pickup_city: pickupAddress.city,
//     pickup_state: mappedPickupState,
//     pickup_country: mappedPickupCountry,
//     pickup_pincode: parseInt(pickupAddress.pincode) || 0,
//     pickup_email: pickupAddress.email,
//     pickup_phone: pickupAddress.phone,
//     pickup_isd_code: pickupAddress.isd_code,
//     shipping_customer_name: shippingAddressData.name || 'Store',
//     shipping_last_name: '',
//     shipping_address: shippingAddressData.address || '',
//     shipping_address_2: shippingAddressData.address_2 || '',
//     shipping_city: shippingAddressData.city || '',
//     shipping_country: mappedShippingCountry,
//     shipping_pincode: parseInt(shippingAddressData.pin_code) || 0,
//     shipping_state: mappedShippingState,
//     shipping_email: shippingAddressData.email || '',
//     shipping_isd_code: '91',
//     shipping_phone: shippingAddressData.phone ? String(shippingAddressData.phone).replace(/[^0-9]/g, '') : '', // Remove non-numeric characters
//     order_items: orderItems,
//     payment_method: paymentMethod,
//     total_discount: String(totalDiscount),
//     sub_total: subTotal,
//     length: dimensions.length,
//     breadth: dimensions.breadth,
//     height: dimensions.height,
//     weight: weight,
//   };
// }

// return-shiprocket.ts

/* ======================================================
 * TYPES
 * ====================================================== */

type OrderItem = {
  id: string
  title: string
  sku: string
  unit_price: number
  quantity: number
  tax_total?: number
  discount_total?: number
}

// type ReturnItem = {
//   item_id: string
//   quantity: number
// }

type Address = {
  first_name?: string
  last_name?: string
  address_1: string
  address_2?: string
  city: string
  province: string
  postal_code: string
  country_code: string
  phone?: string
}

type StoreLocation = {
  name: string
  address_1: string
  address_2?: string
  city: string
  province: string
  postal_code: string
  phone?: string
  country_code: string
  email?: string
}

/* ======================================================
 * 1️⃣ CALCULATE SHIPROCKET RETURN SUBTOTAL
 * (MULTI PRODUCT + PARTIAL QTY + TAX + DISCOUNT)
 * ====================================================== */

function normalizeIndianPhoneNumber(phone?: string): string {
  if (!phone) return ""

  // remove non-digits
  let digits = phone.replace(/\D/g, "")

  // remove leading 91 if present
  if (digits.length > 10 && digits.startsWith("91")) {
    digits = digits.slice(2)
  }

  // keep last 10 digits (safest)
  return digits.slice(-10)
}


export function calculateShiprocketReturnSubtotal(
  orderItems:  any[],
  returnItems: any[]
): number {
  let subTotal = 0
  for (const returnItem of returnItems) {
    const orderItem = orderItems.find(
      (oi) => oi.id === returnItem.item_id
    )

    if (!orderItem) continue

    const orderedQty = orderItem.quantity || 1
    const returnedQty = returnItem.quantity || 0

    const unitPrice = orderItem.unit_price || 0
    const totalDiscount = orderItem.discount_subtotal || 0

    // 🔹 Per-unit discount (NO TAX)
    const perUnitDiscount = totalDiscount / orderedQty

    // 🔹 Net item value (after discount, before tax)
    const itemSubtotal =
      (unitPrice - perUnitDiscount) * returnedQty

    subTotal += itemSubtotal
  }

  return Number(subTotal.toFixed(2))
}


/* ======================================================
 * 2️⃣ BUILD SHIPROCKET ORDER ITEMS
 * (ONLY RETURNED ITEMS)
 * ====================================================== */

export function buildShiprocketReturnItems(
  orderItems: OrderItem[],
  returnItems: any[]
) {
  return returnItems.map((returnItem) => {
    const orderItem = orderItems.find(
      (oi) => oi.id === returnItem.item_id
    )

    if (!orderItem) {
      throw new Error(`Order item not found: ${returnItem.item_id}`)
    }

    const perUnitDiscount =
      (orderItem.discount_total || 0) / orderItem.quantity

    const sku =
      (orderItem as any).variant_sku || (orderItem as any).sku_code || ''

    return {
      name: orderItem.title,
      sku,                              // ✅ FIXED
      units: returnItem.quantity,
      selling_price: orderItem.unit_price,
      discount: Number(perUnitDiscount.toFixed(2)),
      qc_enable: false,
    }
  })
}


/* ======================================================
 * 3️⃣ MAP RETURN → SHIPROCKET PAYLOAD (FINAL)
 * ====================================================== */

export function mapReturnToShiprocketFormat(
  returnOrder: any,
  order: {
    id: string
    email: string
    items: OrderItem[]
    shipping_address: Address
  },
  storeLocation: StoreLocation
) {
  // 🔹 Calculate subtotal correctly
  const subTotal = calculateShiprocketReturnSubtotal(
    order.items,
    returnOrder.items
  )

  if (subTotal <= 0) {
    throw new Error('Invalid return subtotal calculation')
  }

  // 🔹 Build returned items
  const shiprocketItems = buildShiprocketReturnItems(
    order.items,
    returnOrder.items
  )

  const dimensions = calculateReturnDimensions(returnOrder.items)

  const pickup = order.shipping_address

  return {
    order_id: `${returnOrder.display_id}`,
    order_date: new Date().toISOString().split('T')[0],

    /* ---------------- Pickup (Customer) ---------------- */
    pickup_customer_name: pickup.first_name || 'Customer',
    pickup_last_name: pickup.last_name || '',
    pickup_address: pickup.address_1,
    pickup_address_2: pickup.address_2 || '',
    pickup_city: pickup.city,
    pickup_state: mapStateCode(pickup.country_code, pickup.province),
    pickup_country: mapCountryCode(pickup.country_code),
    pickup_pincode: Number(pickup.postal_code),
    pickup_email: order.email,
    pickup_phone: normalizeIndianPhoneNumber(pickup.phone),
    pickup_isd_code: '91',

    /* ---------------- Delivery (Seller) ---------------- */
    shipping_customer_name: storeLocation.name,
    shipping_last_name: '',
    shipping_address: storeLocation.address_1,
    shipping_address_2: storeLocation.address_2 || '',
    shipping_city: storeLocation.city,
    shipping_state: mapStateCode(storeLocation.country_code, storeLocation.province),
    shipping_country: mapCountryCode(storeLocation.country_code),
    shipping_pincode: Number(storeLocation.postal_code),
    shipping_email: process.env.SHIPROCKET_EMAIL,
    shipping_phone: normalizeIndianPhoneNumber(storeLocation.phone),
    shipping_isd_code: '91',

    /* ---------------- Return Items ---------------- */
    order_items: shiprocketItems,

    payment_method: 'PREPAID',
    total_discount: 0,

    // ✅ FINAL VALUE SENT TO SHIPROCKET
    sub_total: subTotal,

    /* ---------------- Dimensions ---------------- */
    length: dimensions.length,
    breadth: dimensions.breadth,
    height: dimensions.height,
    weight: Math.max(0.5, shiprocketItems.length * 0.5),
  }
}


/**
 * Calculate return order dimensions
 * Uses same logic as order-mapper.ts (lines 89-99)
 */
function calculateReturnDimensions(
  returnItems: any[]
): { length: number; breadth: number; height: number } {
  const dimensions = returnItems.reduce(
    (acc, item) => {
      const variant = item.variant || {};

      const length = Number(variant.length) || 10;
      const breadth = Number(variant.width) || 10;
      const height = Number(variant.height) || 10;
      const quantity = item.quantity || 1;

      return {
        // 📦 Max footprint
        length: Math.max(acc.length, length),
        breadth: Math.max(acc.breadth, breadth),

        // 📦 Stack height
        height: acc.height + height * quantity,
      };
    },
    { length: 10, breadth: 10, height: 0 }
  );

  return {
    length: Math.max(10, Math.ceil(dimensions.length)),
    breadth: Math.max(10, Math.ceil(dimensions.breadth)),
    height: Math.max(1, Math.ceil(dimensions.height)),
  };
}


/**
 * Calculate return order weight
 * Uses same logic as order-mapper.ts (lines 81-86)
 * Shiprocket requires minimum weight of 0.5 kg (500 gm)
 */
function calculateReturnWeight(orderItems: any[], returnItems: any[]): number {
  const MINIMUM_WEIGHT_KG = 0.5
  // Match order-mapper.ts logic: use order.items with variant.weight
  const weight = Math.max(
    returnItems?.reduce(
      (sum: number, item: any) =>
        sum + (item.variant?.weight || 0.5) * (item.quantity || 1),
      0
    ) || MINIMUM_WEIGHT_KG,
    MINIMUM_WEIGHT_KG
  );

  return weight;
}

/**
 * Create return order in Shiprocket when a return is confirmed
 * Call this function after a return order is confirmed/created
 */
export async function createShiprocketReturnOrder(
  returnOrder: AdminReturn,
  order: AdminOrder,
  shiprocketService: ShiprocketFulfillmentService,
): Promise<any> {
  try {
    const returnData = mapReturnToShiprocketFormat(returnOrder as any, order as any, shiprocketService as any);
    const result = await shiprocketService.createReturnOrder(returnData as any);
    
    return result;
  } catch (error: any) {
    console.error('[Shiprocket] Failed to create return order:', error);
    throw error;
  }
}

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