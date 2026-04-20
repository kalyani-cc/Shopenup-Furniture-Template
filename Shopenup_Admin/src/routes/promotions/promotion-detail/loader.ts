import { LoaderFunctionArgs } from "react-router-dom"
import { promotionsQueryKeys } from "../../../hooks/api/promotions"
import { sdk } from "../../../lib/client"
import { queryClient } from "../../../lib/query-client"

const promotionDetailQuery = (id: string) => ({
  queryKey: promotionsQueryKeys.detail(id),
  queryFn: async () => sdk.admin.promotion.retrieve(id),
})

export const promotionLoader = async ({ params }: LoaderFunctionArgs) => {
  try {
    const id = params.id
    const query = promotionDetailQuery(id!)

    return await queryClient.ensureQueryData(query)
  } catch (error) {
    console.error('❌ [promotion-loader] Error loading promotion:', error);
    throw error; // Re-throw to let React Router handle it
  }
}
