import { QueryClient } from "@tanstack/react-query"

import { HttpTypes } from "@shopenup/types"
import { productsQueryKeys } from "../../../hooks/api/products"
import { sdk } from "../../../lib/client"
import { queryClient } from "../../../lib/query-client"

const productsListQuery = () => ({
  queryKey: productsQueryKeys.list({
    limit: 20,
    offset: 0,
    is_giftcard: false,
  }),
  queryFn: async () =>
    sdk.admin.product.list({ limit: 20, offset: 0, is_giftcard: false }),
})

export const productsLoader = (client: QueryClient) => {
  return async () => {
    try {
      const query = productsListQuery()

      return (
        queryClient.getQueryData<HttpTypes.AdminProductListResponse>(
          query.queryKey
        ) ?? (await client.fetchQuery(query))
      )
    } catch (error) {
      console.error('❌ [products-loader] Error loading products:', error);
      throw error; // Re-throw to let React Router handle it
    }
  }
}
