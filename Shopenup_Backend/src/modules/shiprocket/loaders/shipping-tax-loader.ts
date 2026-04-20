/**
 * Shipping Tax Loader
 * 
 * Wraps the cart service to intercept shipping method updates and process tax-inclusive shipping.
 */

import { AwilixContainer } from "awilix";
import { ShippingTaxCalculator } from "../services/shipping-tax-calculator";

export default async function shippingTaxLoader({
  container,
}: {
  container: AwilixContainer;
}): Promise<void> {
  // Wrap the cart service to intercept shipping method updates and process tax-inclusive shipping.
  // Note: Services might not be available during module initialization
  // This is expected and handled gracefully
  try {
    const cartModuleService = container.resolve("cart");

    // Store original methods
    const originalAddShippingMethod = cartModuleService.addShippingMethods?.bind(
      cartModuleService
    );
    const originalUpdateShippingMethods =
      cartModuleService.updateShippingMethods?.bind(cartModuleService);

    // Wrap addShippingMethods
    if (originalAddShippingMethod) {
      cartModuleService.addShippingMethods = async function (
        cartId: string,
        methods: any[]
      ) {
        // Call original method first
        const result = await originalAddShippingMethod(cartId, methods);

        // Process tax-inclusive shipping after adding
        await processShippingTaxForCart(container, cartId);

        return result;
      };
    }

    // Wrap updateShippingMethods
    if (originalUpdateShippingMethods) {
      cartModuleService.updateShippingMethods = async function (
        cartId: string,
        methods: any[]
      ) {
        // Call original method first
        const result = await originalUpdateShippingMethods(cartId, methods);

        // Process tax-inclusive shipping after updating
        await processShippingTaxForCart(container, cartId);

        return result;
      };
    }
  } catch (error: any) {
    // Silently handle - services might not be registered yet during module initialization
  }
}

/**
 * Process shipping tax for a cart
 */
async function processShippingTaxForCart(
  container: AwilixContainer,
  cartId: string
): Promise<void> {
  try {
    const query = container.resolve("query");
    const cartModuleService = container.resolve("cart");

    // Retrieve cart with shipping methods
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: [
        "id",
        "shipping_methods.*",
        "shipping_methods.shipping_option.*",
        "shipping_methods.shipping_option.metadata.*",
        "shipping_methods.tax_lines.*",
      ],
      filters: { id: cartId },
    });

    const cart = carts?.[0];
    if (!cart || !cart.shipping_methods || cart.shipping_methods.length === 0) {
      return;
    }

    const updatedMethods: any[] = [];
    let hasChanges = false;

    // Process each shipping method
    for (const shippingMethod of cart.shipping_methods) {
      // Skip if already processed (has tax_lines and is_tax_inclusive)
      if (
        shippingMethod.is_tax_inclusive &&
        shippingMethod.tax_lines &&
        shippingMethod.tax_lines.length > 0
      ) {
        continue;
      }

      const processedMethod = ShippingTaxCalculator.processShippingMethod(
        shippingMethod
      );

      if (processedMethod && processedMethod.tax_lines) {
        hasChanges = true;
        updatedMethods.push({
          id: shippingMethod.id,
          is_tax_inclusive: true,
          tax_lines: processedMethod.tax_lines,
          amount: processedMethod.amount, // Base amount (tax-exclusive)
          metadata: processedMethod.metadata,
        });

        const methodTax = processedMethod.tax_lines.reduce(
          (sum: number, line: any) => sum + (line.amount || 0),
          0
        );
      }
    }

    // Update shipping methods if we have tax-inclusive ones
    if (hasChanges && updatedMethods.length > 0) {
      await cartModuleService.updateShippingMethods(cart.id, updatedMethods);
    }
  } catch (error: any) {
    console.error(
      "[ShippingTax] Error processing shipping tax:",
      error?.message || error
    );
    // Don't throw - allow cart operations to continue
  }
}

