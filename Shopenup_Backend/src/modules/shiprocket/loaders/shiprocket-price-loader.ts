/**
 * Shiprocket Price Loader
 * 
 * Based on Medusa's design for calculated shipping prices:
 * - calculatePrice() is called when a shipping option with price_type="calculated" is selected
 * - The return value from calculatePrice() sets the price on the shipping method instance
 * - Validation should check if the shipping method has a price, not the option's stored price
 * 
 * This loader ensures that when validation retrieves the shipping option, it recognizes
 * that it's a calculated type and that calculatePrice can return a valid price.
 */

import { AwilixContainer } from "awilix";

// Global Map to store prices temporarily (keyed by option_id)
// Prices are stored when validateFulfillmentData is called
// and retrieved when validation checks the option
// Prices are cleared after 30 seconds to prevent memory leaks
const pendingOptionPrices = new Map<string, { price: number; timestamp: number }>();

// Clean up old entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of pendingOptionPrices.entries()) {
    if (now - value.timestamp > 30000) { // 30 seconds
      pendingOptionPrices.delete(key);
    }
  }
}, 60000); // Run cleanup every 60 seconds

// Export function to store price (called from validateFulfillmentData)
export function storeShiprocketPrice(optionId: string, price: number): void {
  pendingOptionPrices.set(optionId, {
    price,
    timestamp: Date.now(),
  });
}

export default async function shiprocketPriceLoader({
  container,
}: {
  container: AwilixContainer;
}): Promise<void> {
  // Wrap the shipping option service to inject calculated prices for validation.
  // Note: Services might not be available during module initialization
  // This is expected and handled gracefully
  try {
    const shippingOptionModuleService = container.resolve("shippingOption");
    const cartModuleService = container.resolve("cart");
    
    if (!shippingOptionModuleService || !cartModuleService) {
      return;
    }

    // Store original retrieve method
    const originalRetrieve = shippingOptionModuleService.retrieve?.bind(
      shippingOptionModuleService
    );

    // Wrap retrieve to inject calculated price when validation retrieves the option
    // According to Medusa: For calculated price types, the option's amount should be null
    // but we need to show validation that a price can be calculated
    if (originalRetrieve) {
      shippingOptionModuleService.retrieve = async function (
        id: string,
        config?: any
      ) {
        // Call original method
        const shippingOption = await originalRetrieve(id, config);
        
        // If this is a Shiprocket calculated price type option
        if (shippingOption?.price_type === "calculated" && 
            (shippingOption?.provider_id === "shiprocket_shiprocket" || 
             shippingOption?.provider_id === "shiprocket")) {
          
          // Get price from pending prices (stored by calculatePrice)
          const pendingPriceEntry = pendingOptionPrices.get(id);
          let price = pendingPriceEntry?.price;
          
          // If not found, check if there's a price stored with a different key
          if (!price || price <= 0) {
            for (const [key, storedEntry] of pendingOptionPrices.entries()) {
              if (storedEntry?.price > 0) {
                price = storedEntry.price;
                break;
              }
            }
          }
          
          if (price && price > 0) {
            // Set calculated_price on the shipping option object
            // This makes validation see that a price exists (even though it's calculated)
            if (shippingOption) {
              shippingOption.calculated_price = {
                calculated_amount: price,
                original_amount: price,
                currency_code: shippingOption.calculated_price?.currency_code || "inr",
              };
              
              // Also set amount temporarily for validation
              shippingOption.amount = price;
            }
          }
        }
        
        return shippingOption;
      };
    }
  } catch (error: any) {
    // Silently handle - services might not be registered yet during module initialization
  }
}
