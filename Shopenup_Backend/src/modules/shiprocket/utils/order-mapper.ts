import type { CreateOrderRequest } from "@shopenup/logistic";

/**
 * Map Shopenup/Shopenup Order to Shiprocket CreateOrderRequest format
 */
export function mapOrderToShiprocket(
  order: any,
  pickupLocation: {
    pickup_location: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    pin_code: string;
  },
  options?: {
    courierId?: number;
    paymentMethod?: "Prepaid" | "COD";
  }
): CreateOrderRequest {
  const shippingAddress = order.shipping_address || order.billing_address;
  const billingAddress = order.billing_address || shippingAddress;

  // Validate that we have at least basic address information
  if (!billingAddress || (!billingAddress.address_1 && !billingAddress.address)) {
    throw new Error("Billing address is required to create Shiprocket order");
  }
  
  if (!billingAddress.city || (!billingAddress.postal_code && !billingAddress.postcode)) {
    throw new Error("Billing address must have city and postal code");
  }

  // Check if shipping address is complete enough to be separate from billing
  // Also check if addresses are actually different (not just same object reference)
  const shippingAddressExists = order.shipping_address && 
    (order.shipping_address.address_1 || order.shipping_address.address) &&
    order.shipping_address.city &&
    (order.shipping_address.postal_code || order.shipping_address.postcode);
  
  // Check if shipping address is different from billing address
  // Compare key fields to determine if addresses are actually different
  const shippingAddr1 = (order.shipping_address?.address_1 || order.shipping_address?.address || "").trim();
  const billingAddr1 = (billingAddress.address_1 || billingAddress.address || "").trim();
  const shippingCity = (order.shipping_address?.city || "").trim();
  const billingCity = (billingAddress.city || "").trim();
  const shippingPincode = (order.shipping_address?.postal_code || order.shipping_address?.postcode || "").trim();
  const billingPincode = (billingAddress.postal_code || billingAddress.postcode || "").trim();
  
  const addressesAreDifferent = shippingAddressExists && (
    shippingAddr1 !== billingAddr1 ||
    shippingCity !== billingCity ||
    shippingPincode !== billingPincode
  );
  
  // Only set hasCompleteShippingAddress to true if addresses exist, are complete, AND are different
  const hasCompleteShippingAddress = shippingAddressExists && addressesAreDifferent;

  // Determine payment method
  const isCOD =
    options?.paymentMethod === "COD" ||
    order.payment_status === "awaiting" ||
    order.payment_status === "not_paid" ||
    order.payment_collections?.some(
      (pc: any) => pc.payment_methods?.some((pm: any) => pm.provider_id === "cod")
    );

  // Calculate totals
  const subTotal =
    order.subtotal ||
    order.items?.reduce(
      (sum: number, item: any) =>
        sum + (item.unit_price || 0) * (item.quantity || 1),
      0
    ) ||
    0;

  // Calculate weight
  // Shiprocket requires minimum weight of 0.5 kg (500 gm)
  const MINIMUM_WEIGHT_KG = 0.5
  const weight = Math.max(
    order.items?.reduce(
      (sum: number, item: any) =>
        sum + (item.variant?.weight || 0.5) * (item.quantity || 1),
      0
    ) || MINIMUM_WEIGHT_KG,
    MINIMUM_WEIGHT_KG
  );

  // Calculate dimensions
  const dimensions = order.items?.reduce(
    (acc: any, item: any) => {
      const variant = item.variant || {};
      return {
        length: Math.max(acc.length, variant.length || 10),
        breadth: Math.max(acc.breadth, variant.width || 10),
        height: acc.height + (variant.height || 10) * (item.quantity || 1),
      };
    },
    { length: 10, breadth: 10, height: 0 }
  );

  return {
    order_id: order.display_id?.toString() || order.id?.toString() || `ORDER-${Date.now()}`,
    order_date: new Date(order.created_at || Date.now()).toISOString().split("T")[0],
    pickup_location: pickupLocation,
    billing_customer_name: formatCustomerName(billingAddress),
    billing_last_name: billingAddress.last_name || "",
    billing_address: (billingAddress.address_1 || billingAddress.address || "").trim(),
    billing_address_2: (billingAddress.address_2 || "").trim() || undefined,
    billing_city: (billingAddress.city || "").trim(),
    billing_pincode: (billingAddress.postal_code || billingAddress.postcode || "").trim(),
    billing_state: mapIndianState((billingAddress.province || billingAddress.state || "").trim()),
    billing_country: mapCountryCode(billingAddress.country_code || "IN"),
    billing_email: (order.email || billingAddress.email || "").trim(),
    billing_phone: formatPhoneNumber(
      shippingAddress.phone || billingAddress.phone || ""
    ),
    billing_alternate_phone: shippingAddress.phone_2 || billingAddress.phone_2 || undefined,
    // Default to shipping_is_billing: true for safety
    // Only set to false if we have a complete, valid, and different shipping address
    // This avoids Shiprocket's "Please add billing/shipping address first" error
    shipping_is_billing: !hasCompleteShippingAddress,
    // Always include shipping fields - set to empty strings if shipping_is_billing is true
    shipping_customer_name: hasCompleteShippingAddress 
      ? formatCustomerName(shippingAddress)
      : "",
    shipping_last_name: hasCompleteShippingAddress 
      ? (shippingAddress?.last_name || "")
      : "",
    shipping_address: hasCompleteShippingAddress
      ? (shippingAddress.address_1 || shippingAddress.address || "").trim()
      : "",
    shipping_address_2: hasCompleteShippingAddress
      ? ((shippingAddress.address_2 || "").trim() || "")
      : "",
    shipping_city: hasCompleteShippingAddress
      ? (shippingAddress.city || "").trim()
      : "",
    shipping_pincode: hasCompleteShippingAddress
      ? (shippingAddress.postal_code || shippingAddress.postcode || "").trim()
      : "",
    shipping_state: hasCompleteShippingAddress
      ? mapIndianState((shippingAddress.province || shippingAddress.state || "").trim())
      : "",
    shipping_country: hasCompleteShippingAddress
      ? mapCountryCode(shippingAddress.country_code || "IN")
      : "",
    shipping_email: hasCompleteShippingAddress
      ? ((shippingAddress.email || "").trim() || "")
      : "",
    shipping_phone: hasCompleteShippingAddress && shippingAddress.phone
      ? formatPhoneNumber(shippingAddress.phone)
      : "",
    order_items: (order.items || []).map((item: any) => ({
      name: item.title || item.variant?.product?.title || "Product",
      sku:
        item.variant?.sku ||
        item.sku ||
        item.variant_id ||
        `SKU-${item.id}`,
      units: item.quantity || 1,
      selling_price: item.unit_price || item.price || 0,
      discount: item.discount_total || 0,
      tax: item.tax_total || 0,
      hsn: item.variant?.product?.hsn_code,
      product_id: item.variant?.product_id?.toString(),
    })),
    payment_method: isCOD ? "COD" : "Prepaid",
    sub_total: subTotal,
    length: dimensions?.length,
    breadth: dimensions?.breadth,
    height: dimensions?.height,
    weight: weight,
    order_meta: {
      shopenup_order_id: order.id,
      display_id: order.display_id,
      ...(options?.courierId && { courier_id: options.courierId }),
    },
  };
}

/**
 * Format customer name from address object
 */
function formatCustomerName(address: any): string {
  if (address.first_name || address.last_name) {
    return `${address.first_name || ""} ${address.last_name || ""}`.trim();
  }
  if (address.name) {
    return address.name;
  }
  return "Customer";
}

/**
 * Format phone number (remove spaces, ensure 10 digits for India)
 */
function formatPhoneNumber(phone: string): string {
  if (!phone) return "";
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");
  // If starts with country code (91 for India), remove it
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.substring(2);
  }
  return digits;
}

/**
 * Map Indian state code to state name (e.g., "IN-GJ" -> "Gujarat")
 */
function mapIndianState(stateCode: string): string {
  if (!stateCode) return "";
  
  // If already a state name (doesn't start with "IN-"), return as is
  if (!stateCode.startsWith("IN-")) {
    return stateCode;
  }
  
  const stateMap: Record<string, string> = {
    "IN-AN": "Andaman and Nicobar Islands",
    "IN-AP": "Andhra Pradesh",
    "IN-AR": "Arunachal Pradesh",
    "IN-AS": "Assam",
    "IN-BR": "Bihar",
    "IN-CH": "Chandigarh",
    "IN-CT": "Chhattisgarh",
    "IN-DN": "Dadra and Nagar Haveli and Daman and Diu",
    "IN-DL": "Delhi",
    "IN-GA": "Goa",
    "IN-GJ": "Gujarat",
    "IN-HR": "Haryana",
    "IN-HP": "Himachal Pradesh",
    "IN-JH": "Jharkhand",
    "IN-KA": "Karnataka",
    "IN-KL": "Kerala",
    "IN-LD": "Lakshadweep",
    "IN-MP": "Madhya Pradesh",
    "IN-MH": "Maharashtra",
    "IN-MN": "Manipur",
    "IN-ML": "Meghalaya",
    "IN-MZ": "Mizoram",
    "IN-NL": "Nagaland",
    "IN-OR": "Odisha",
    "IN-PY": "Puducherry",
    "IN-PB": "Punjab",
    "IN-RJ": "Rajasthan",
    "IN-SK": "Sikkim",
    "IN-TN": "Tamil Nadu",
    "IN-TG": "Telangana",
    "IN-TR": "Tripura",
    "IN-UP": "Uttar Pradesh",
    "IN-UT": "Uttarakhand",
    "IN-WB": "West Bengal",
  };
  
  return stateMap[stateCode.toUpperCase()] || stateCode;
}

/**
 * Map country code to country name
 */
export function mapCountryCode(countryCode: string): string {
  const countryMap: Record<string, string> = {
    IN: "India",
    US: "United States",
    GB: "United Kingdom",
    CA: "Canada",
    AU: "Australia",
    DE: "Germany",
    FR: "France",
    IT: "Italy",
    ES: "Spain",
    NL: "Netherlands",
    BE: "Belgium",
    AT: "Austria",
    CH: "Switzerland",
    SE: "Sweden",
    NO: "Norway",
    DK: "Denmark",
    FI: "Finland",
    PL: "Poland",
    PT: "Portugal",
    GR: "Greece",
    IE: "Ireland",
    NZ: "New Zealand",
    SG: "Singapore",
    MY: "Malaysia",
    TH: "Thailand",
    ID: "Indonesia",
    PH: "Philippines",
    VN: "Vietnam",
    JP: "Japan",
    KR: "South Korea",
    CN: "China",
    HK: "Hong Kong",
    AE: "United Arab Emirates",
    SA: "Saudi Arabia",
    IL: "Israel",
    ZA: "South Africa",
    BR: "Brazil",
    MX: "Mexico",
    AR: "Argentina",
    CL: "Chile",
    CO: "Colombia",
  };
  return countryMap[countryCode.toUpperCase()] || countryCode;
}

