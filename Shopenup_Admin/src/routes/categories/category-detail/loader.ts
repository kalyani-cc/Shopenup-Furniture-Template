import { LoaderFunctionArgs } from "react-router-dom"

import { categoriesQueryKeys } from "../../../hooks/api/categories"
import { sdk } from "../../../lib/client"
import { queryClient } from "../../../lib/query-client"

const categoryDetailQuery = (id: string) => ({
  queryKey: categoriesQueryKeys.detail(id),
  queryFn: async () => sdk.admin.productCategory.retrieve(id),
})

export const categoryLoader = async ({ params }: LoaderFunctionArgs) => {
  try {
    const id = params.id
    const query = categoryDetailQuery(id!)

    return await queryClient.ensureQueryData(query)
  } catch (error) {
    console.error('❌ [category-loader] Error loading category:', error);
    throw error; // Re-throw to let React Router handle it
  }
}
