import { Shiprocket } from "@shopenup/logistic";
import type {
  CreateOrderRequest,
  CreateOrderResponse,
  ShipmentRequest,
  ShipmentResponse,
  CreateReturnOrderRequest,
  ReturnOrderResponse,
} from "@shopenup/logistic";
import { storeShiprocketPrice } from "./loaders/shiprocket-price-loader";
import { CalculateShippingOptionPriceDTO, CalculatedShippingOptionPrice } from "@shopenup/framework/types";
import ShiprocketFulfillmentProvider from "./provider";
import { isMockModeEnabled, generateMockRates, generateMockTracking } from "./utils/mock-mode";

interface ShiprocketOptions {
  email: string;
  password: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  defaultPickupLocation?: {
    pickup_location: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    pin_code: string;
  };
}

class ShiprocketFulfillmentService {
  static identifier = "shiprocket";
  static displayName = "Shiprocket";
  static defaultOptions = {};
  static Provider = ShiprocketFulfillmentProvider;

  private shiprocket: Shiprocket;
  private options: ShiprocketOptions;
  private authPromise: Promise<void> | null = null;
  private container: any;

  constructor(container: any, options: ShiprocketOptions) {
    this.container = container;
    // Validate required options
    if (!options) {
      throw new Error("ShiprocketFulfillmentService: Options are required");
    }

    if (!options.email || !options.password) {
      console.warn(
        "ShiprocketFulfillmentService: Email and password are required. Provider may not work correctly."
      );
    }

    this.options = options;

    try {
      this.shiprocket = new Shiprocket({
        email: options.email || "",
        password: options.password || "",
        baseUrl: options.baseUrl,
        timeout: options.timeout,
        retryAttempts: options.retryAttempts,
        retryDelay: options.retryDelay,
      });
    } catch (error: any) {
      console.error("ShiprocketFulfillmentService: Failed to initialize Shiprocket client:", error);
      throw new Error(`Failed to initialize Shiprocket: ${error.message || "Unknown error"}`);
    }
  }

  /**
   * Get available shipping options for a cart/order
   * Can be called with data (for storefront) or without data (for admin panel preview)
   */
  async getFulfillmentOptions(data?: {
    items?: Array<{
      variant_id?: string;
      quantity?: number;
      title?: string;
      sku?: string;
      weight?: number;
      length?: number;
      breadth?: number;
      height?: number;
    }>;
    shipping_address?: {
      address_1?: string;
      address_2?: string;
      city?: string;
      country_code?: string;
      province?: string;
      postal_code?: string;
      phone?: string;
    };
    pickup_address?: {
      address_1?: string;
      city?: string;
      country_code?: string;
      province?: string;
      postal_code?: string;
    };
  }): Promise<any[]> {
    try {
      // Handle missing data - return static options for admin panel preview (similar to manual fulfillment)
      if (!data || (!data.items && !data.shipping_address)) {
        // Return a simple static option for admin panel
        // This matches the "Gujrat Shipping Option" created in Admin
        return [
          {
            id: "shiprocket-fulfillment", // This should match the shipping option ID from Admin
            name: "Shiprocket Fulfillment",
            is_return : false
          },
            {
              id: "shiprocket-fulfillment-return",
              name: "Shiprocket Fulfillment Return",
              is_return : true
            },
        ];
      }

      // Check if mock mode is enabled
      if (isMockModeEnabled()) {
        console.log("[Shiprocket] ⚠️ USING MOCK DATA (USE_SHIPROCKET_MOCK=true)");
        // Get pickup postcode
        const pickupPostcode =
          this.options.defaultPickupLocation?.pin_code ||
          data.pickup_address?.postal_code ||
          "400001"; // Default Mumbai postcode

        // Get delivery postcode - use provided or default
        const deliveryPostcode = data.shipping_address?.postal_code || "400001";
        
        if (!data.shipping_address?.postal_code) {
          console.warn("[Shiprocket] No shipping address postal code provided, using default:", deliveryPostcode);
        }

        // Calculate total weight - handle missing items
        // Shiprocket requires minimum weight of 0.5 kg (500 gm)
        const MINIMUM_WEIGHT_KG = 0.5
        const items = data.items || [];
        const totalWeight = Math.max(
          items.length > 0
            ? items.reduce((sum, item) => sum + (item.weight || 0.5), 0) || MINIMUM_WEIGHT_KG
            : MINIMUM_WEIGHT_KG, // Default weight if no items
          MINIMUM_WEIGHT_KG
        )

        // Generate mock rates
        const mockRates = generateMockRates({
          originPincode: pickupPostcode,
          destPincode: deliveryPostcode,
          weightInKg: totalWeight,
        });

        const availableCouriers = mockRates.data?.data?.available_courier_companies || [];

        // Map rates to fulfillment options
        const options = availableCouriers.map(
          (rate: any) => ({
            id: `shiprocket_${rate.courier_company_id}`,
            name: rate.courier_name,
            data: {
              courier_company_id: rate.courier_company_id,
              courier_name: rate.courier_name,
              estimated_delivery_days: rate.estimated_delivery_days,
              rate: rate.rate,
              rate_breakup: rate.rate_breakup,
            },
            amount: rate.rate || 0,
            is_return: false,
          })
        );

        return options;
      }

      // Ensure authenticated (using shared method to avoid duplicate calls)
      await this.ensureAuthenticated();
      // Get pickup postcode
      const pickupPostcode =
        this.options.defaultPickupLocation?.pin_code ||
        data.pickup_address?.postal_code ||
        "400001"; // Default Mumbai postcode

      // Get delivery postcode - use provided or default
      const deliveryPostcode = data.shipping_address?.postal_code || "400001";
      
      if (!data.shipping_address?.postal_code) {
        console.warn("[Shiprocket] No shipping address postal code provided, using default:", deliveryPostcode);
      }

      // Calculate total weight - handle missing items
      // Shiprocket requires minimum weight of 0.5 kg (500 gm)
      const MINIMUM_WEIGHT_KG = 0.5
      const items = data.items || [];
      const totalWeight = Math.max(
        items.length > 0
          ? items.reduce((sum, item) => sum + (item.weight || 0.5), 0) || MINIMUM_WEIGHT_KG
          : MINIMUM_WEIGHT_KG, // Default weight if no items
        MINIMUM_WEIGHT_KG
      )

      // Calculate shipping rates
      const rates = await this.shiprocket.couriers.calculateRates({
        pickup_postcode: pickupPostcode,
        delivery_postcode: deliveryPostcode,
        weight: totalWeight,
        cod: false, // Can be determined from payment method
      });

      if (!rates.success) {
        console.error("[Shiprocket] Rate calculation failed:", rates.error?.message || "Unknown error");
        return [];
      }

      if (!rates.data || !Array.isArray(rates.data)) {
        console.warn("[Shiprocket] No rate data returned or data is not an array");
        return [];
      }

      if (rates.data.length === 0) {
        console.warn("[Shiprocket] Rate calculation returned empty array - no couriers available");
        return [];
      }

      // Map rates to fulfillment options
      const options = rates.data.map(
        (rate: any) => ({
          id: `shiprocket_${rate.courier_company_id}`,
          name: rate.courier_name,
          data: {
            courier_company_id: rate.courier_company_id,
            courier_name: rate.courier_name,
            estimated_delivery_days: rate.estimated_delivery_days,
            rate: rate.rate,
            rate_breakup: rate.rate_breakup,
          },
          amount: rate.rate || 0,
          is_return: false,
        })
      );

      return options;
    } catch (error: any) {
      console.error("[Shiprocket] Error getting fulfillment options:", error.message || error);
      console.error("[Shiprocket] Error stack:", error.stack);
      return [];
    }
  }

  /**
   * Ensure authenticated - prevents multiple simultaneous auth calls
   */
  private async ensureAuthenticated(): Promise<void> {
    if (this.shiprocket.isAuthenticated()) {
      return;
    }

    // If authentication is in progress, wait for it
    if (this.authPromise) {
      await this.authPromise;
      return;
    }

    // Start authentication
    this.authPromise = this.shiprocket.authenticate().catch((error: any) => {
      // Reset promise on error so we can retry
      this.authPromise = null;
      const errorMessage = error.message || String(error);
      console.error("[Shiprocket] Authentication failed:", errorMessage);
      
      // Provide helpful error messages for common issues
      if (errorMessage.includes("blocked") || errorMessage.includes("too many")) {
        console.error("[Shiprocket] ⚠️  Account temporarily blocked due to failed login attempts.");
        console.error("[Shiprocket] 💡 Solutions:");
        console.error("[Shiprocket]    1. Wait 15-30 minutes for the block to clear");
        console.error("[Shiprocket]    2. Verify credentials in .env file");
        console.error("[Shiprocket]    3. Contact Shiprocket support if issue persists");
      } else if (errorMessage.includes("Invalid") || errorMessage.includes("credentials")) {
        console.error("[Shiprocket] ⚠️  Invalid credentials. Please check SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD in .env");
      }
      
      throw error;
    });

    try {
      await this.authPromise;
    } finally {
      // Clear promise after authentication completes
      this.authPromise = null;
    }
  }

  /**
   * Validate fulfillment option
   * This method is called when a shipping method is added to a cart.
   * The `data` parameter contains shiprocket_price (in paise) and shiprocket_choice from frontend.
   */
  async validateFulfillmentData(
    optionData: any,
    data: any,
    context: any
  ): Promise<any> {
    try {
      // Storefront may omit `shiprocket_price` when selecting a calculated shipping option.
      // In that case, derive it from option/context metadata instead of failing checkout.
      const rawPrice =
        (data as any)?.shiprocket_price ??
        (data as any)?.data?.shiprocket_price ??
        (optionData as any)?.shiprocket_price ??
        (optionData as any)?.data?.shiprocket_price ??
        (optionData as any)?.data?.rate ??
        (optionData as any)?.amount ??
        (context as any)?.input?.data?.shiprocket_price;
      const normalizedPrice = Number(rawPrice);
      const hasValidPrice = Number.isFinite(normalizedPrice) && normalizedPrice > 0;
      const finalPrice = hasValidPrice ? Math.round(normalizedPrice) : 0;

      if (!hasValidPrice) {
        console.warn(
          "[Shiprocket] shiprocket_price missing/invalid in add-shipping-method payload. Falling back to 0.",
          { rawPrice }
        );
      }

      // Extract shiprocket_choice (optional but useful to track which option was chosen)
      const choice = (data as any)?.shiprocket_choice || "recommended";

      // Store price in AsyncLocalStorage so validation can access it when retrieving the option
      const optionId = optionData?.id;
      if (optionId && finalPrice > 0) {
        storeShiprocketPrice(optionId, finalPrice);
      }

      // Return validated data that will be stored on the shipping method
      return {
        shiprocket_price: finalPrice, // integer in smallest currency unit
        shiprocket_choice: choice,
        valid: true,
      };
    } catch (error: any) {
      console.error("[Shiprocket] ❌ Validation failed:", error.message);
      throw new Error(`Failed to validate fulfillment data: ${error?.message || "Unknown error"}`);
    }
  }

  /**
   * Check if the provider can calculate prices dynamically
   * This is required for shipping options with "calculated" price type
   */
  canCalculate(): boolean {
    return true; // Shiprocket supports calculated pricing via API
  }

  

  /**
   * Calculate shipping cost
   * 
   * According to Medusa's official flow:
   * - This is called by POST /store/shipping-options/{id}/calculate API
   * - The API passes cart_id and optionally data (with shiprocket_price and shiprocket_choice)
   * - This method should return the calculated price
   * - The price is then used when adding the shipping method to the cart
   */


  /**
   * Create fulfillment (shipment) for an order
   * 
   * This method implements the fulfillment provider flow:
   * 1. Resolve allocations/stock location used for shipping
   * 2. Build Shiprocket payload (items, weights, pickup, customer address)
   * 3. Create Shiprocket order → get shipment/awb/label
   * 4. Persist Shiprocket ids & label URL into fulfillment.metadata
   * 5. Medusa workflow will mark fulfillment as fulfilled (remove reservation and decrement inventory)
   */

  async calculatePrice(
    optionData: CalculateShippingOptionPriceDTO["optionData"],
    data?: CalculateShippingOptionPriceDTO["data"],
    context?: CalculateShippingOptionPriceDTO["context"]
  ): Promise<CalculatedShippingOptionPrice> {
    // ... your existing logic up to finalPrice ...
  
    if (data?.shiprocket_price && Number(data?.shiprocket_price) > 0) {
      const finalPrice = Math.round(Number(data?.shiprocket_price))
  
      storeShiprocketPrice(String(optionData?.id), finalPrice);
  
      return {
        calculated_amount: Number((finalPrice / 100).toFixed(2)),
        is_calculated_price_tax_inclusive: true,
      }
    }
  
    // No price found: still return a valid object
    return {
      calculated_amount: 0,
      is_calculated_price_tax_inclusive: true,
    }
  }

  /**
   * Create fulfillment
   * NOTE: Shiprocket order creation is handled by order-fulfillment-created subscriber
   */
  async createFulfillment(
    data: any,
    items: any[],
    order: any
  ): Promise<any> {
    return {
      ...data,
      items: items.map((item) => ({ id: item.id, quantity: item.quantity })),
    };
  }

  /**
   * Cancel fulfillment
   */
  async cancelFulfillment(fulfillment: any): Promise<any> {
    return {
      ...fulfillment,
      canceled_at: new Date(),
    };
  }

  async createReturnFulfillment(): Promise<any> {
    return {
      data: {},
      labels: [],
    }
  }
  /**
   * Get tracking information
   */
  async getFulfillmentDocuments(data: any): Promise<any> {
    try {
      const awbCode = data.tracking_numbers?.[0] || data.data?.awb_code;
      if (!awbCode) {
        throw new Error("AWB code not found");
      }

      // Check if mock mode is enabled
      if (isMockModeEnabled()) {
        console.log("[Shiprocket] ⚠️ USING MOCK DATA (USE_SHIPROCKET_MOCK=true)");
        const mockTracking = generateMockTracking(awbCode);
        return {
          tracking: mockTracking.data,
        };
      }

      await this.ensureAuthenticated();

      const tracking = await this.shiprocket.tracking.trackByAwb(awbCode);

      if (!tracking.success) {
        throw new Error(
          `Failed to get tracking: ${tracking.error?.message || "Unknown error"}`
        );
      }

      return {
        tracking: tracking.data,
      };
    } catch (error: any) {
      console.error("Error getting fulfillment documents:", error);
      throw new Error(`Failed to get tracking: ${error?.message || "Unknown error"}`);
    }
  }

  /**
   * Resolve stock location by ID
   * Fetches stock location from the service and returns it with Shiprocket pickup data
   */
  private async resolveStockLocation(locationId: string): Promise<any | null> {
    try {
      const stockLocationService = this.container.resolve("stockLocationService");
      if (!stockLocationService) {
        console.warn("[Shiprocket] stockLocationService not available in container");
        return null;
      }

      const stockLocation = await stockLocationService.retrieve(locationId, {
        relations: ["address"],
      });

      return stockLocation;
    } catch (error: any) {
      console.warn("[Shiprocket] Failed to resolve stock location:", error.message);
      return null;
    }
  }

  /**
   * Map stock location to Shiprocket pickup location format
   */
  private mapStockLocationToPickupLocation(stockLocation: any): {
    pickup_location: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    pin_code: string;
  } {
    return {
      pickup_location: stockLocation.name || "Warehouse",
      name: stockLocation.name || "Store Owner",
      email: stockLocation.address?.email || this.options.email,
      phone: stockLocation.address?.phone || "9876543210",
      address: stockLocation.address?.address_1 || stockLocation.address?.address || "123 Main Street",
      city: stockLocation.address?.city || "Mumbai",
      state: stockLocation.address?.province || stockLocation.address?.state || "Maharashtra",
      country: stockLocation.address?.country_code === "IN" ? "India" : (stockLocation.address?.country || "India"),
      pin_code: stockLocation.address?.postal_code || stockLocation.address?.postcode || "400001",
    };
  }

  /**
   * Map Shopenup order to Shiprocket format
   * Matches exact Shiprocket API payload structure
   */
  private mapOrderToShiprocket(
    data: any, 
    order: any,
    pickupLocation?: {
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
    pickupLocationId?: number
  ): any {
    const defaultPickupLocation = this.options.defaultPickupLocation || {
      pickup_location: "Main Warehouse",
      name: "Store Owner",
      email: this.options.email,
      phone: "9876543210",
      address: "123 Main Street",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      pin_code: "400001",
    };

    const finalPickupLocation = pickupLocation || defaultPickupLocation;
    const shippingAddress = data.shipping_address;
    const isCOD = order?.payment_status === "awaiting" || order?.payment_status === "not_paid";

    // Calculate weight from items
    // Shiprocket requires minimum weight of 0.5 kg (500 gm)
    const MINIMUM_WEIGHT_KG = 0.5
    const totalWeight = Math.max(
      data.items.reduce(
        (sum: number, item: any) => sum + (item.weight || 0.5) * (item.quantity || 1),
        0
      ) || MINIMUM_WEIGHT_KG,
      MINIMUM_WEIGHT_KG
    );

    // Calculate dimensions (use default if not available)
    const dimensions = this.calculateDimensions(data.items);
    
    // Format order date as "YYYY-MM-DD HH:mm"
    const orderDate = new Date(order?.created_at || Date.now());
    const formattedOrderDate = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')} ${String(orderDate.getHours()).padStart(2, '0')}:${String(orderDate.getMinutes()).padStart(2, '0')}`;

    // Split billing customer name into first and last name
    const billingName = `${shippingAddress.first_name || ""} ${shippingAddress.last_name || ""}`.trim();
    const nameParts = billingName.split(" ");
    const billingFirstName = nameParts[0] || "";
    const billingLastName = nameParts.slice(1).join(" ") || "";

    // Calculate subtotal
    const subTotal = data.items.reduce(
      (sum: number, item: any) => sum + (item.unit_price || 0) * (item.quantity || 1),
      0
    );

    return {
      order_id: order?.display_id?.toString() || order?.id?.toString() || `ORDER-${Date.now()}`,
      order_date: formattedOrderDate,
      pickup_location: finalPickupLocation.pickup_location || finalPickupLocation.name, // Use stock location name
      comment: order?.metadata?.comment || `Order from ${order?.display_id || order?.id}`,
      billing_customer_name: billingFirstName,
      billing_last_name: billingLastName,
      billing_address: shippingAddress.address_1 || "",
      billing_address_2: shippingAddress.address_2 || "",
      billing_city: shippingAddress.city || "",
      billing_pincode: parseInt(shippingAddress.postal_code) || 0,
      billing_state: shippingAddress.province || shippingAddress.state || "",
      billing_country: this.mapCountryCode(shippingAddress.country_code) || "India",
      billing_email: shippingAddress.email || order?.email || "",
      billing_phone: parseInt(shippingAddress.phone?.replace(/\D/g, "") || "0") || 0,
      shipping_is_billing: true,
      shipping_customer_name: "",
      shipping_last_name: "",
      shipping_address: "",
      shipping_address_2: "",
      shipping_city: "",
      shipping_pincode: "",
      shipping_country: "",
      shipping_state: "",
      shipping_email: "",
      shipping_phone: "",
      order_items: data.items.map((item: any) => {
        // Get HSN code from product or variant
        const hsnCode = item.variant?.product?.hs_code || 
                       item.variant?.hs_code || 
                       order?.items?.find((oi: any) => oi.id === item.id || oi.variant_id === item.variant_id)?.variant?.product?.hs_code ||
                       order?.items?.find((oi: any) => oi.id === item.id || oi.variant_id === item.variant_id)?.variant?.hs_code ||
                       null;

        return {
          name: item.title || "Product",
          sku: item.sku || item.variant_id || `SKU-${item.id}`,
          units: item.quantity || 1,
          selling_price: Math.round((item.unit_price || 0) * 100) / 100, // Round to 2 decimal places
          discount: "",
          tax: "",
          hsn: hsnCode ? parseInt(hsnCode.replace(/\D/g, "")) : null,
        };
      }),
      payment_method: isCOD ? "COD" : "Prepaid",
      shipping_charges: 0,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discount: order?.discount_total || 0,
      sub_total: Math.round(subTotal * 100) / 100,
      length: dimensions.length,
      breadth: dimensions.breadth,
      height: dimensions.height,
      weight: totalWeight,
    };
  }

  /**
   * Calculate dimensions from items (use default if not available)
   */
  private calculateDimensions(items: any[]): { length: number; breadth: number; height: number } {
    // Try to get dimensions from items
    let totalLength = 0;
    let totalBreadth = 0;
    let totalHeight = 0;
    let hasDimensions = false;

    for (const item of items) {
      const length = item.variant?.length || item.length || 0;
      const breadth = item.variant?.width || item.breadth || item.width || 0;
      const height = item.variant?.height || item.height || 0;

      if (length > 0 && breadth > 0 && height > 0) {
        totalLength = Math.max(totalLength, length);
        totalBreadth = Math.max(totalBreadth, breadth);
        totalHeight += height * (item.quantity || 1);
        hasDimensions = true;
      }
    }

    // Return calculated dimensions or defaults
    return {
      length: hasDimensions ? totalLength : 10,
      breadth: hasDimensions ? totalBreadth : 15,
      height: hasDimensions ? totalHeight : 20,
    };
  }

  /**
   * Map country code to country name
   */
  private mapCountryCode(countryCode: string): string {
    const countryMap: Record<string, string> = {
      IN: "India",
      US: "United States",
      GB: "United Kingdom",
      // Add more mappings as needed
    };
    return countryMap[countryCode] || countryCode;
  }

  /**
   * Create a return order in Shiprocket
   * This should be called when a return order is confirmed/created
   */
  async createReturnOrder(returnData: CreateReturnOrderRequest): Promise<ReturnOrderResponse> {
    try {
      await this.ensureAuthenticated();
      
      const response = await this.shiprocket.returns.createReturnOrder(returnData);
      
      if (response.error) {
        throw new Error(response.error.message || 'Failed to create return order in Shiprocket');
      }

      return response.data as ReturnOrderResponse;
    } catch (error: any) {
      console.error('[Shiprocket] Error creating return order:', error);
      throw new Error(`Failed to create return order in Shiprocket: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Assign AWB (Airway Bill) to a shipment
   * This assigns a courier and generates AWB for tracking
   */
  async assignAwb(data: { shipment_id: number | string; courier_id: number | string }): Promise<any> {
    try {
      await this.ensureAuthenticated();
      
      const response = await this.shiprocket.orders.assignAwb({
        shipment_id: data.shipment_id.toString(),
        courier_id: data.courier_id.toString(),
      });
      
      if (response.error) {
        throw new Error(response.error.message || 'Failed to assign AWB');
      }

      return response.data || response;
    } catch (error: any) {
      console.error('[Shiprocket] Error assigning AWB:', error);
      throw new Error(`Failed to assign AWB: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Request pickup for a shipment
   * This schedules a pickup for the shipment
   */
  async requestPickup(shipmentId: number | string): Promise<any> {
    try {
      await this.ensureAuthenticated();
      
      // Use the courier/generate/pickup endpoint
      const response = await this.shiprocket.getClient().post('/courier/generate/pickup', {
        shipment_id: [shipmentId.toString()],
      });
      
      if (response.error || !response.success) {
        throw new Error(response.error?.message || 'Failed to request pickup');
      }

      return response.data || response;
    } catch (error: any) {
      console.error('[Shiprocket] Error requesting pickup:', error);
      throw new Error(`Failed to request pickup: ${error.message || 'Unknown error'}`);
    }
  }
}

export default ShiprocketFulfillmentService;

