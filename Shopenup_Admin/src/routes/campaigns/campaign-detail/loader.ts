import { LoaderFunctionArgs } from "react-router-dom"

import { campaignsQueryKeys } from "../../../hooks/api/campaigns"
import { sdk } from "../../../lib/client"
import { queryClient } from "../../../lib/query-client"
import { CAMPAIGN_DETAIL_FIELDS } from "./constants"

const campaignDetailQuery = (id: string) => ({
  queryKey: campaignsQueryKeys.detail(id),
  queryFn: async () =>
    sdk.admin.campaign.retrieve(id, {
      fields: CAMPAIGN_DETAIL_FIELDS,
    }),
})

export const campaignLoader = async ({ params }: LoaderFunctionArgs) => {
  try {
    const id = params.id
    const query = campaignDetailQuery(id!)

    return await queryClient.ensureQueryData(query)
  } catch (error) {
    console.error('❌ [campaign-loader] Error loading campaign:', error);
    throw error; // Re-throw to let React Router handle it
  }
}
