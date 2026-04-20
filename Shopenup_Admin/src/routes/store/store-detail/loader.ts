import { HttpTypes } from "@shopenup/types"

import { retrieveActiveStore, storeQueryKeys } from "../../../hooks/api/store"
import { queryClient } from "../../../lib/query-client"

const storeDetailQuery = () => ({
  queryKey: storeQueryKeys.details(),
  queryFn: async () => retrieveActiveStore(),
})

export const storeLoader = async () => {
  try {
    const query = storeDetailQuery()

    return (
      queryClient.getQueryData<HttpTypes.AdminStoreResponse>(query.queryKey) ??
      (await queryClient.fetchQuery(query))
    )
  } catch (error) {
    console.error('❌ [store-loader] Error loading store:', error);
    throw error; // Re-throw to let React Router handle it
  }
}
