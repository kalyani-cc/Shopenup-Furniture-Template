import { ExecArgs, ISearchService } from '@shopenup/framework/types';
import { Modules } from '@shopenup/framework/utils';

export default async function indexProducts({ container }: ExecArgs) {
  const logger = container.resolve('logger');

  let meilisearchService: ISearchService | undefined
  try {
    meilisearchService = container.resolve('meilisearchService')
  } catch (e) {
    logger.info('Search indexing skipped: meilisearchService not registered')
    return
  }

  const productModuleService = container.resolve(Modules.PRODUCT);

  const [products, count] = await productModuleService.listAndCountProducts(
    undefined,
    {
      relations: [
        'variants',
        'options',
        'tags',
        'collection',
        'type',
        'images',
      ],
    },
  );

  logger.info(`Adding ${count} products to MeiliSearch...`);

  await meilisearchService!.addDocuments('products', products, 'products');

  logger.info('Products added to MeiliSearch');
}
