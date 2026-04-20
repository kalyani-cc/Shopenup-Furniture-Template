import { refetchProductType } from '../helpers';
import { AdminGetProductTypeParamsType } from '../validators';
import { ProductTypeDTO } from '@shopenup/framework/types';
import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from '@shopenup/framework';

export const GET = async (
  req: AuthenticatedShopenupRequest<AdminGetProductTypeParamsType>,
  res: ShopenupResponse
) => {
  try {
    const productType = await refetchProductType(
      req.params.id,
      req.scope,
      req.remoteQueryConfig.fields as (keyof ProductTypeDTO)[],
    );

    res.status(200).json({ product_type: productType });
  } catch (error) {
    console.error('Error fetching product type:', error);
    res.status(500).json({
      code: 'internal_error',
      message: (error as Error)?.message || 'Failed to fetch product type',
    });
  }
};
