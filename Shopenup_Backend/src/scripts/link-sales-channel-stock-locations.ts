import {
  createSalesChannelsWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@shopenup/shopenup/core-flows";
import { ExecArgs, ISalesChannelModuleService } from "@shopenup/framework/types";
import { ContainerRegistrationKeys, Modules } from "@shopenup/framework/utils";

/**
 * Fixes add-to-cart inventory errors like:
 * "Sales channel <id> is not associated with any stock location for variant <id>"
 *
 * Run:
 * npx shopenup exec ./src/scripts/link-sales-channel-stock-locations.ts
 */
export default async function linkSalesChannelStockLocations({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const salesChannelModuleService: ISalesChannelModuleService = container.resolve(
    Modules.SALES_CHANNEL,
  );

  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [{ name: "Default Sales Channel" }],
      },
    });
    defaultSalesChannel = result;
  }

  const salesChannelId = defaultSalesChannel[0].id;

  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  });

  if (!stockLocations?.length) {
    logger.warn("No stock locations found. Creating a default stock location.");
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: "Default Warehouse",
            address: {
              city: "Unknown",
              country_code: "US",
              address_1: "",
            },
          },
        ],
      },
    });
    stockLocations.push(...result);
  }

  for (const location of stockLocations) {
    try {
      logger.info(
        `Linking sales channel ${salesChannelId} to stock location ${location.id} (${location.name || "Unnamed"})`,
      );
      await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: {
          id: location.id,
          add: [salesChannelId],
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      logger.warn(`Skipping stock location ${location.id}: ${msg}`);
    }
  }

  logger.info("Finished linking default sales channel to stock locations.");
}
