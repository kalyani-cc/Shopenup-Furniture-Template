import { HttpTypes } from "@shopenup/types"
import { QueryClient } from "@tanstack/react-query"
import { promotionsQueryKeys } from "../../../hooks/api/promotions"
import { sdk } from "../../../lib/client"
import { queryClient } from "../../../lib/query-client"

const params = {
  limit: 20,
  offset: 0,
}

const promotionsListQuery = () => ({
  queryKey: promotionsQueryKeys.list(params),
  queryFn: async () => sdk.admin.promotion.list(params),
})

export const promotionsLoader = (client: QueryClient) => {
  return async () => {
    try {
      const query = promotionsListQuery()

      return (
        queryClient.getQueryData<HttpTypes.AdminPromotionListResponse>(
          query.queryKey
        ) ?? (await client.fetchQuery(query))
      )
    } catch (error) {
      console.error('❌ [promotions-loader] Error loading promotions:', error);
      throw error; // Re-throw to let React Router handle it
    }
  }
}
