import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from '@shopenup/framework/workflows-sdk';
import { Modules } from '@shopenup/framework/utils';
import { ISearchService, ProductDTO } from '@shopenup/framework/types';

const retrieveProductsStep = createStep(
  {
    name: 'retrieveProductsStep',
  },
  async (input: undefined, context) => {
    const productModuleService = context.container.resolve(Modules.PRODUCT);

    const products = await productModuleService.listProducts(undefined, {
      relations: [
        'variants',
        'options',
        'tags',
        'collection',
        'type',
        'images',
      ],
    });

    return new StepResponse(products);
  },
);

const indexProductsStep = createStep(
  {
    name: 'indexProductsStep',
  },
  async (input: ProductDTO[], context) => {
    let meilisearchService: ISearchService | undefined
    try {
      meilisearchService = context.container.resolve('meilisearchService')
    } catch (e) {
      return new StepResponse(undefined)
    }
    const result = await meilisearchService!.addDocuments(
      'products',
      input,
      'products',
    );
    return new StepResponse(result);
  },
);

export const indexProductsWorkflow = createWorkflow(
  {
    name: 'indexProducts',
    idempotent: true,
    retentionTime: 60 * 60 * 24 * 3, // 3 days
    store: true,
  },
  () => {
    const products = retrieveProductsStep();
    const result = indexProductsStep(products);

    return new WorkflowResponse(result);
  },
);
