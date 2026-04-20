import { LoaderFunctionArgs } from "react-router-dom"

import { productTagsQueryKeys } from "../../../hooks/api"
import { sdk } from "../../../lib/client"
import { queryClient } from "../../../lib/query-client"

const productTagDetailQuery = (id: string) => ({
  queryKey: productTagsQueryKeys.detail(id),
  queryFn: async () => sdk.admin.productTag.retrieve(id),
})

export const productTagLoader = async ({ params }: LoaderFunctionArgs) => {
  try {
    const id = params.id
    const query = productTagDetailQuery(id!)

    return await queryClient.ensureQueryData(query)
  } catch (error) {
    console.error('❌ [product-tag-loader] Error loading product tag:', error);
    throw error; // Re-throw to let React Router handle it
  }
}
