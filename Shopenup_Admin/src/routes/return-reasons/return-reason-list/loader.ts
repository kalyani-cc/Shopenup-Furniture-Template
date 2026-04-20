import {
  AdminReturnReasonListParams,
  AdminReturnReasonListResponse,
} from "@shopenup/types"

import { returnReasonsQueryKeys } from "../../../hooks/api/return-reasons"
import { sdk } from "../../../lib/client"
import { queryClient } from "../../../lib/query-client"

const returnReasonListQuery = (query?: AdminReturnReasonListParams) => ({
  queryKey: returnReasonsQueryKeys.list(query),
  queryFn: async () => sdk.admin.returnReason.list(query),
})

export const returnReasonListLoader = async () => {
  try {
    const query = returnReasonListQuery()
    return (
      queryClient.getQueryData<AdminReturnReasonListResponse>(query.queryKey) ??
      (await queryClient.fetchQuery(query))
    )
  } catch (error) {
    console.error('❌ [return-reason-list-loader] Error loading return reasons:', error);
    throw error; // Re-throw to let React Router handle it
  }
}
