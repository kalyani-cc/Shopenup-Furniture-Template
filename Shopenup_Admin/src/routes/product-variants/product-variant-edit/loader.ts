import { LoaderFunctionArgs } from "react-router-dom"

import { productVariantQueryKeys } from "../../../hooks/api"
import { sdk } from "../../../lib/client"
import { queryClient } from "../../../lib/query-client"

const queryFn = async (id: string, variantId: string) => {
  return await sdk.admin.product.retrieveVariant(id, variantId)
}

const editProductVariantQuery = (id: string, variantId: string) => ({
  queryKey: productVariantQueryKeys.detail(variantId),
  queryFn: async () => queryFn(id, variantId),
})

export const editProductVariantLoader = async ({
  params,
  request,
}: LoaderFunctionArgs) => {
  try {
    const id = params.id

    const searchParams = new URL(request.url).searchParams
    const searchVariantId = searchParams.get("variant_id")

    const variantId = params.variant_id || searchVariantId

    const query = editProductVariantQuery(id!, variantId || searchVariantId!)

    return (
      queryClient.getQueryData<ReturnType<typeof queryFn>>(query.queryKey) ??
      (await queryClient.fetchQuery(query))
    )
  } catch (error) {
    console.error('❌ [product-variant-edit-loader] Error loading product variant:', error);
    throw error; // Re-throw to let React Router handle it
  }
}
