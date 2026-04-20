import { ModuleProvider, Modules } from "@shopenup/framework/utils";
import ShiprocketFulfillmentService from "./service";
import ShiprocketFulfillmentProvider from "./provider";
import shiprocketConfigLoader from "./loaders/shiprocket-config";
import shippingTaxLoader from "./loaders/shipping-tax-loader";
import shiprocketPriceLoader from "./loaders/shiprocket-price-loader";
// import ShiprocketReturnService from "./services/shiprocket-return-service";

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [ShiprocketFulfillmentService],
  loaders: [shiprocketConfigLoader, shippingTaxLoader, shiprocketPriceLoader],
  // Note: Stock location subscribers are now in src/subscribers/ folder
  // They will be automatically picked up by the framework
  // Note: Providers are registered through the service, not here
});

// Export provider for direct use if needed
export { ShiprocketFulfillmentProvider };

