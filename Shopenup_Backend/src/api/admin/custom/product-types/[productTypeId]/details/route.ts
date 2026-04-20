import { Modules } from '@shopenup/framework/utils';
import { ShopenupRequest, ShopenupResponse } from '@shopenup/framework';
import { z } from 'zod';

const productTypeFieldsMetadataSchema = z.object({
  image: z
    .object({
      id: z.string(),
      url: z.string().url(),
    })
    .optional(),
});

export async function GET(
  req: ShopenupRequest,
  res: ShopenupResponse,
): Promise<void> {
  try {
    const { productTypeId } = req.params;
    const productService = req.scope.resolve(Modules.PRODUCT);
    const productType = await productService.retrieveProductType(productTypeId);

    const parsed = productTypeFieldsMetadataSchema.safeParse(
      productType.metadata ?? {},
    );

    res.json({
      image: parsed.success && parsed.data.image ? parsed.data.image : null,
    });
  } catch (error) {
    console.error('Error retrieving product type details:', error);
    res.status(500).json({
      code: 'internal_error',
      message: (error as Error)?.message || 'Failed to retrieve product type details',
    });
  }
}

export async function POST(
  req: ShopenupRequest,
  res: ShopenupResponse,
): Promise<void> {
  try {
    const { productTypeId } = req.params;
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const customFields = productTypeFieldsMetadataSchema.parse(body);

    const productService = req.scope.resolve(Modules.PRODUCT);
    const productType = await productService.retrieveProductType(productTypeId);

    const updatedProductType = await productService.updateProductTypes(
      productTypeId,
      {
        metadata: {
          ...productType.metadata,
          ...customFields,
        },
      },
    );

    res.json(updatedProductType);
  } catch (error) {
    console.error('Error updating product type details:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        code: 'invalid_data',
        message: 'Invalid request data',
        errors: error.errors,
      });
      return;
    }
    res.status(500).json({
      code: 'internal_error',
      message: (error as Error)?.message || 'Failed to update product type details',
    });
  }
}
