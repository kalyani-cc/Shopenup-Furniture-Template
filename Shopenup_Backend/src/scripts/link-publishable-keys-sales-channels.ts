import {
  createSalesChannelsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from '@shopenup/shopenup/core-flows';
import { ExecArgs, ISalesChannelModuleService } from '@shopenup/framework/types';
import { ContainerRegistrationKeys, Modules } from '@shopenup/framework/utils';

/**
 * Fixes: "Publishable key needs to have a sales channel configured"
 *
 * Links every publishable API key that has zero sales channels to the
 * "Default Sales Channel" (creates that channel if missing).
 *
 * Run: npx shopenup exec ./src/scripts/link-publishable-keys-sales-channels.ts
 */
export default async function linkPublishableKeysSalesChannels({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const salesChannelModuleService: ISalesChannelModuleService = container.resolve(
    Modules.SALES_CHANNEL,
  );

  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: 'Default Sales Channel',
  });

  if (!defaultSalesChannel.length) {
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [{ name: 'Default Sales Channel' }],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  const salesChannelId = defaultSalesChannel[0].id;

  const { data: apiKeys } = await query.graph({
    entity: 'api_key',
    fields: ['id', 'title', 'type', 'sales_channels_link.sales_channel_id'],
    filters: {
      type: 'publishable',
    },
  });

  if (!apiKeys?.length) {
    logger.warn('No publishable API keys found.');
    return;
  }

  for (const key of apiKeys) {
    const links = (key as { sales_channels_link?: { sales_channel_id?: string }[] })
      .sales_channels_link ?? [];
    const linkedIds = links.map((l) => l.sales_channel_id).filter(Boolean);
    if (linkedIds.length) {
      logger.info(`Skipping ${key.id} (${key.title}) — already linked to sales channel(s).`);
      continue;
    }

    logger.info(`Linking sales channel ${salesChannelId} to publishable key ${key.id} (${key.title})`);
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: {
        id: key.id,
        add: [salesChannelId],
      },
    });
  }

  logger.info('Finished linking publishable keys to the default sales channel.');
}
