import { AwilixContainer } from "awilix";

export default async function shiprocketConfigLoader({
  container,
}: {
  container: AwilixContainer;
}): Promise<void> {
  // Register Shiprocket configuration in the container
  // This allows other services to access the configuration
  container.register({
    shiprocketConfig: {
      resolve: () => {
        // Get configuration from environment or module options
        return {
          email: process.env.SHIPROCKET_EMAIL || "",
          password: process.env.SHIPROCKET_PASSWORD || "",
          baseUrl:
            process.env.SHIPROCKET_BASE_URL ||
            "https://apiv2.shiprocket.in/v1/external",
          timeout: parseInt(process.env.SHIPROCKET_TIMEOUT || "30000"),
          retryAttempts: parseInt(process.env.SHIPROCKET_RETRY_ATTEMPTS || "3"),
          retryDelay: parseInt(process.env.SHIPROCKET_RETRY_DELAY || "1000"),
          defaultPickupLocation: process.env.SHIPROCKET_PICKUP_LOCATION
            ? JSON.parse(process.env.SHIPROCKET_PICKUP_LOCATION)
            : undefined,
        };
      },
    },
  });

  // Wrap the stock location service to emit custom events
  // This allows us to trigger Shiprocket pickup location creation
  // when stock locations are created/updated
  // Note: Services might not be available during module initialization
  // This is expected and handled gracefully - subscribers will handle events instead
  try {
    const originalStockLocationService = container.resolve("stockLocationService");
    const eventBusService = container.resolve("event_bus");

    // Store original methods
    const originalCreate = originalStockLocationService.create.bind(originalStockLocationService);
    const originalUpdate = originalStockLocationService.update.bind(originalStockLocationService);

    // Override create method
    originalStockLocationService.create = async function(data: any) {
      const stockLocation = await originalCreate(data);
      
      try {
        await eventBusService.emit({
          name: "stock_location.created",
          data: { id: stockLocation.id },
        });
      } catch (emitError) {
        // Silently handle event emission errors
      }
      
      return stockLocation;
    };

    // Override update method
    originalStockLocationService.update = async function(id: string, data: any) {
      const stockLocation = await originalUpdate(id, data);
      
      try {
        await eventBusService.emit({
          name: "stock_location.updated",
          data: { id: stockLocation.id },
        });
      } catch (emitError) {
        // Silently handle event emission errors
      }
      
      return stockLocation;
    };
  } catch (error: any) {
    // Silently handle - services might not be registered yet during module initialization
    // Subscribers will handle stock location events instead
  }
}

