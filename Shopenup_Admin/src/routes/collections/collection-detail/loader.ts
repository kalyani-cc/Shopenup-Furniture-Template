import { LoaderFunctionArgs } from "react-router-dom"

import { collectionsQueryKeys } from "../../../hooks/api/collections"
import { sdk } from "../../../lib/client"
import { queryClient } from "../../../lib/query-client"

const collectionDetailQuery = (id: string) => ({
  queryKey: collectionsQueryKeys.detail(id),
  queryFn: async () => sdk.admin.productCollection.retrieve(id),
})

export const collectionLoader = async ({ params }: LoaderFunctionArgs) => {
  try {
    const id = params.id
    const query = collectionDetailQuery(id!)

    return await queryClient.ensureQueryData(query)
  } catch (error) {
    console.error('❌ [collection-loader] Error loading collection:', error);
    throw error; // Re-throw to let React Router handle it
  }
}
