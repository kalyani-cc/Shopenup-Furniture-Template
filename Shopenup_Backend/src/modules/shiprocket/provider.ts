import { getAuthenticatedClient } from "./utils/shiprocket-client"
import { isMockModeEnabled, generateMockRates } from "./utils/mock-mode"

// Types for fulfillment provider
interface CalculateShippingOptionPriceDTO {
  id: string
  optionData?: any
  data?: any
  context?: any
}

interface IFulfillmentProvider {
  calculateShippingOptionPrice(input: CalculateShippingOptionPriceDTO): Promise<{
    calculated_amount: number
    is_calculated_price_tax_inclusive?: boolean
  }>
  createFulfillment(data: any, items: any[], order: any): Promise<any>
  cancelFulfillment?(fulfillment: any): Promise<any>
  getFulfillmentDocuments?(fulfillment: any): Promise<any>
}

type ShopenupContainer = any

export const SHIPROCKET_PROVIDER_ID = "shiprocket"

type ConstructorParams = {
  container: ShopenupContainer
}

class ShiprocketFulfillmentProvider implements IFulfillmentProvider {
  static identifier = SHIPROCKET_PROVIDER_ID

  private readonly container: ShopenupContainer

  constructor({ container }: ConstructorParams) {
    this.container = container
  }

  /**
   * Calculate shipping option price
   * This is called by calculateShippingOptionsPricesStep workflow
   */
  async calculateShippingOptionPrice(
    input: CalculateShippingOptionPriceDTO
  ): Promise<{
    calculated_amount: number
    is_calculated_price_tax_inclusive?: boolean
  }> {
    const { id, optionData, data, context } = input

    try {
      // Extract cart and stock location from context
      const cart = (context as any)?.cart || (context as any)
      const fromLocation = (context as any)?.from_location

      // Get stock location info from data (from product availability)
      // This is passed when user selects a shipping option
      // Check multiple possible locations for the data
      const dataAny = data as any
      const contextAny = context as any
      
      const stockLocationId = dataAny?.stock_location_id || 
                             dataAny?.data?.stock_location_id ||
                             contextAny?.input?.data?.stock_location_id ||
                             contextAny?.stock_location_id
      
      const stockPincodeFromData = dataAny?.stock_pincode || 
                                   dataAny?.data?.stock_pincode ||
                                   contextAny?.input?.data?.stock_pincode ||
                                   contextAny?.stock_pincode

      // Priority 1: Use stock_pincode from data (from product availability)
      // Priority 2: Use from_location from context (if fulfillment sets are configured)
      // Priority 3: Find nearest stock location based on delivery address
      let originPincode: string

      if (stockPincodeFromData) {
        originPincode = String(stockPincodeFromData).trim()
      } else if (fromLocation?.address?.postal_code) {
        originPincode = fromLocation.address.postal_code.trim()
      } else {
        // Find nearest stock location based on delivery postal code
        const destPincode = cart?.shipping_address?.postal_code
        if (destPincode) {
          originPincode = await this.findNearestStockLocationPincode(destPincode)
        } else {
          originPincode = process.env.DEFAULT_PICKUP_PIN || "400001"
        }
      }

      const destPincode = cart?.shipping_address?.postal_code || "400001"

      if (!destPincode || destPincode === "400001") {
        console.warn("[Shiprocket Provider] ⚠️  No delivery postal code in cart")
      }

      // Get weight and dimensions from cart
      // Shiprocket requires minimum weight of 0.5 kg (500 gm)
      const MINIMUM_WEIGHT_KG = 0.5
      const weightInKg = Math.max(this.getCartWeightInKg(cart), MINIMUM_WEIGHT_KG)
      const { lengthCm, widthCm, heightCm } = this.getCartDimensions(cart)

      // Check if price is already provided in data (from frontend)
      // This happens when user selects a specific courier option
      const providedPrice = (data as any)?.shiprocket_price ||
                           (data as any)?.data?.shiprocket_price ||
                           (context as any)?.input?.data?.shiprocket_price

      if (providedPrice && providedPrice > 0) {
        return {
          calculated_amount: Math.round(Number(providedPrice)),
          is_calculated_price_tax_inclusive: false,
        }
      }

      // Get carrier code if specified (for specific courier selection)
      const carrierCode = (optionData as any)?.data?.courier_company_id ||
                         (data as any)?.courier_company_id ||
                         (data as any)?.data?.courier_company_id

      // Call Shiprocket API to get rate
      const shiprocketAmount = await this.getShiprocketRate({
        originPincode,
        destPincode,
        weightInKg,
        lengthCm,
        widthCm,
        heightCm,
        carrierCode,
      })

      return {
        calculated_amount: Math.round(shiprocketAmount),
        is_calculated_price_tax_inclusive: false,
      }
    } catch (error: any) {
      console.error("[Shiprocket Provider] ❌ Error calculating price:", error?.message || error)
      console.error("[Shiprocket Provider] Error stack:", error?.stack)
      // Return 0 on error - Medusa will handle it
      return {
        calculated_amount: 0,
        is_calculated_price_tax_inclusive: false,
      }
    }
  }

  /**
   * Find nearest stock location postal code based on delivery postal code
   * Uses the shared stock location service
   */
  private async findNearestStockLocationPincode(deliveryPincode: string): Promise<string> {
    const { getNearestStockLocationPincode } = await import("./utils/stock-location-service.js")
    return getNearestStockLocationPincode(deliveryPincode)
  }

  /**
   * Get total weight from cart items in kg
   */
  private getCartWeightInKg(cart: any): number {
    if (!cart?.items?.length) {
      return 0.5 // default min weight
    }

    let totalGrams = 0

    for (const item of cart.items) {
      const variant = item.variant
      // Weight might be in grams or kg - check metadata or use default
      const weight = variant?.weight ?? 
                     variant?.product?.weight ?? 
                     (item.weight || 0) // from fulfillment options API
      
      // Assume weight is in grams if > 100, otherwise assume kg
      const weightInGrams = weight > 100 ? weight : weight * 1000
      totalGrams += weightInGrams * (item.quantity || 1)
    }

    // Convert grams -> kg, minimum 0.5kg
    const totalKg = totalGrams / 1000
    return Math.max(totalKg, 0.5)
  }

  /**
   * Get cart dimensions
   */
  private getCartDimensions(cart: any): {
    lengthCm: number
    widthCm: number
    heightCm: number
  } {
    // You can enhance this to calculate actual dimensions from items
    // For now, return default box dimensions
    return {
      lengthCm: 30,
      widthCm: 20,
      heightCm: 10,
    }
  }

  /**
   * Call Shiprocket API to get shipping rate
   */
  private async getShiprocketRate(args: {
    originPincode: string
    destPincode: string
    weightInKg: number
    lengthCm: number
    widthCm: number
    heightCm: number
    carrierCode?: number
  }): Promise<number> {
    const {
      originPincode,
      destPincode,
      weightInKg,
      lengthCm,
      widthCm,
      heightCm,
      carrierCode,
    } = args

    try {
      // Check if mock mode is enabled
      if (isMockModeEnabled()) {
        console.log("[Shiprocket Provider] ⚠️ USING MOCK DATA (USE_SHIPROCKET_MOCK=true)")
        const mockRates = generateMockRates({
          originPincode,
          destPincode,
          weightInKg,
          carrierCode,
        })
        const shiprocketResponse = mockRates.data as any
        const availableCouriers = shiprocketResponse?.data?.available_courier_companies || []

        if (availableCouriers.length === 0) {
          throw new Error("No couriers available for this route")
        }

        // If carrier code is specified, find that specific courier
        if (carrierCode) {
          const specificCourier = availableCouriers.find(
            (courier: any) => courier.courier_company_id === carrierCode
          )
          if (specificCourier?.rate) {
            return specificCourier.rate
          }
        }

        // Otherwise, use recommended courier or lowest price
        const recommendedCourierId = shiprocketResponse?.data?.recommended_courier_company_id
        const recommendedCourier = availableCouriers.find(
          (courier: any) => courier.courier_company_id === recommendedCourierId
        )

        if (recommendedCourier?.rate) {
          return recommendedCourier.rate
        }

        // Fallback to lowest price
        const sortedByPrice = [...availableCouriers].sort(
          (a: any, b: any) => (a.rate || 0) - (b.rate || 0)
        )

        return sortedByPrice[0]?.rate || 0
      }

      // Get Shiprocket configuration
      let shiprocketConfig: any
      try {
        shiprocketConfig = this.container.resolve("shiprocketConfig")
      } catch (error) {
        shiprocketConfig = {
          email: process.env.SHIPROCKET_EMAIL || "",
          password: process.env.SHIPROCKET_PASSWORD || "",
          baseUrl: process.env.SHIPROCKET_BASE_URL || "https://apiv2.shiprocket.in/v1/external",
        }
      }

      if (!shiprocketConfig?.email || !shiprocketConfig?.password) {
        throw new Error("Shiprocket configuration not found")
      }

      // Get authenticated Shiprocket client
      const shiprocket = await getAuthenticatedClient({
        email: shiprocketConfig.email,
        password: shiprocketConfig.password,
        baseUrl: shiprocketConfig.baseUrl,
      })

      // Call Shiprocket serviceability API
      const rates = await shiprocket.couriers.checkServiceability({
        pickup_postcode: originPincode,
        delivery_postcode: destPincode,
        weight: weightInKg,
        cod: false, // Can be determined from payment method
      })

      if (!rates.success || !rates.data) {
        throw new Error(rates.error?.message || "Shiprocket API call failed")
      }

      const shiprocketResponse = rates.data as any
      const availableCouriers = shiprocketResponse?.data?.available_courier_companies || []

      if (availableCouriers.length === 0) {
        throw new Error("No couriers available for this route")
      }

      // If carrier code is specified, find that specific courier
      if (carrierCode) {
        const specificCourier = availableCouriers.find(
          (courier: any) => courier.courier_company_id === carrierCode
        )
        if (specificCourier?.rate) {
          return specificCourier.rate
        }
      }

      // Otherwise, use recommended courier or lowest price
      const recommendedCourierId = shiprocketResponse?.data?.recommended_courier_company_id
      const recommendedCourier = availableCouriers.find(
        (courier: any) => courier.courier_company_id === recommendedCourierId
      )

      if (recommendedCourier?.rate) {
        return recommendedCourier.rate
      }

      // Fallback to lowest price
      const sortedByPrice = [...availableCouriers].sort(
        (a: any, b: any) => (a.rate || 0) - (b.rate || 0)
      )

      return sortedByPrice[0]?.rate || 0
    } catch (error: any) {
      console.error("[Shiprocket Provider] Error calling Shiprocket API:", error.message)
      throw error
    }
  }

  async createFulfillment(data: any, items: any[], order: any): Promise<any> {
    throw new Error("createFulfillment is not implemented. This method has been removed.")
  }

  async cancelFulfillment(fulfillment: any): Promise<any> {
    // Implement cancellation logic
    throw new Error("cancelFulfillment not implemented")
  }

  async getFulfillmentDocuments(fulfillment: any): Promise<any> {
    // Implement document retrieval
    throw new Error("getFulfillmentDocuments not implemented")
  }
}

export default ShiprocketFulfillmentProvider

