import type { SubscriberArgs, SubscriberConfig } from '@shopenup/shopenup';
import { Modules } from '@shopenup/framework/utils';
import { ISearchService } from '@shopenup/framework/types';

export default async function indexProductHandler({
  event: { data, name },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    const productId = data.id;

    const logger = container.resolve('logger');
    const productModuleService = container.resolve(Modules.PRODUCT);
    let meilisearchService: ISearchService | undefined;
    try {
      meilisearchService = container.resolve('meilisearchService');
    } catch (e) {
      return; // search disabled
    }

    if (name === 'product.deleted') {
      await meilisearchService.deleteDocument('products', productId);
      logger.info(`The product ${productId} was deleted from MeiliSearch`);
      return;
    }

    const product = await productModuleService.retrieveProduct(productId, {
      relations: ['variants', 'options', 'tags', 'collection', 'type', 'images'],
    });

    if (name === 'product.updated') {
      await meilisearchService.replaceDocuments(
        'products',
        [product],
        'products',
      );
      logger.info(
        `The product ${productId} ${product.title} was updated in MeiliSearch`,
      );
      return;
    }

    await meilisearchService.addDocuments('products', [product], 'products');
    logger.info(
      `The product ${productId} ${product.title} was added to MeiliSearch`,
    );
  } catch (error) {
    console.error("Error in index products handler:", error);
    // Don't throw - subscribers should fail gracefully
  }
}

export const config: SubscriberConfig = {
  event: ['product.created', 'product.updated', 'product.deleted'],
};
