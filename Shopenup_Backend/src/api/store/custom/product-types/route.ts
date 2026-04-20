import { HttpTypes, ProductTypeDTO } from '@shopenup/framework/types';
import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from '@shopenup/framework';

export const GET = async (
  req: AuthenticatedShopenupRequest<HttpTypes.AdminProductTypeListParams>,
  res: ShopenupResponse,
) => {
  try {
    const query = req.scope.resolve("query")
    const { data: productTypes, metadata } = await query.graph({
      entity: "product_types",
      filters: req.filterableFields,
      fields: req.remoteQueryConfig.fields as (keyof ProductTypeDTO)[],
      pagination: req.remoteQueryConfig.pagination
    })

    res.json({
      product_types: productTypes,
      count: metadata.count,
      offset: metadata.skip,
      limit: metadata.take,
    });
  } catch (error) {
    console.error('Error fetching product types:', error);
    res.status(500).json({
      code: 'internal_error',
      message: (error as Error)?.message || 'Failed to fetch product types',
    });
  }
};
