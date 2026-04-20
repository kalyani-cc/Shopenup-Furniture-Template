import { LoaderFunctionArgs } from "react-router-dom"
import { taxRegionsQueryKeys } from "../../../hooks/api/tax-regions"
import { sdk } from "../../../lib/client"
import { queryClient } from "../../../lib/query-client"

const taxRegionDetailQuery = (id: string) => ({
  queryKey: taxRegionsQueryKeys.detail(id),
  queryFn: async () => sdk.admin.taxRegion.retrieve(id),
})

export const taxRegionLoader = async ({ params }: LoaderFunctionArgs) => {
  try {
    const id = params.id
    const query = taxRegionDetailQuery(id!)

    return await queryClient.ensureQueryData(query)
  } catch (error) {
    console.error('❌ [tax-region-loader] Error loading tax region:', error);
    throw error; // Re-throw to let React Router handle it
  }
}
