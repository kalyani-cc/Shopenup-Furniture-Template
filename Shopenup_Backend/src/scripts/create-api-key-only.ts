import {
  createApiKeysWorkflow,
  createSalesChannelsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from '@shopenup/shopenup/core-flows';
import { ExecArgs, ISalesChannelModuleService } from '@shopenup/framework/types';
import { ContainerRegistrationKeys, Modules } from '@shopenup/framework/utils';

export default async function createApiKeyOnly({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const salesChannelModuleService: ISalesChannelModuleService = container.resolve(
    Modules.SALES_CHANNEL,
  );

  try {
    logger.info('🔑 Creating publishable API key...');

    const { result: publishableApiKeyResult } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: 'Frontend Publishable Key',
            type: 'publishable',
            created_by: '',
          },
        ],
      },
    });

    const publishableApiKey = publishableApiKeyResult[0];

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

    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: {
        id: publishableApiKey.id,
        add: [defaultSalesChannel[0].id],
      },
    });
    logger.info('Linked publishable key to Default Sales Channel (required for /store/products).');

    logger.info('✅ Publishable API key created successfully!');
    logger.info(`Key ID: ${publishableApiKey.id}`);
    logger.info(`Key Title: ${publishableApiKey.title}`);
    logger.info(`Key Type: ${publishableApiKey.type}`);
    logger.info(`Key Token: ${publishableApiKey.token}`);

    return publishableApiKey;
    
  } catch (error) {
    logger.error('❌ Error creating API key:', error);
    
    if (error.message?.includes('already exists')) {
      logger.info('ℹ️  API key already exists, checking database...');
      // You can add logic here to check if the key exists
    }
    
    throw error;
  }
}

