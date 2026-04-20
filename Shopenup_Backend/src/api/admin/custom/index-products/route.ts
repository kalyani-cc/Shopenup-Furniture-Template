import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from '@shopenup/framework';
import { indexProductsWorkflow } from '../../../../workflows/index-products';

export async function POST(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse,
): Promise<void> {
  try {
    const result = await indexProductsWorkflow(req.scope).run();

    res.json(result);
  } catch (error) {
    console.error('Error indexing products:', error);
    res.status(500).json({
      code: 'internal_error',
      message: (error as Error)?.message || 'Failed to index products',
    });
  }
}
