import { LoaderFunctionArgs } from "react-router-dom"

import { shippingProfileQueryKeys } from "../../../hooks/api/shipping-profiles"
import { sdk } from "../../../lib/client"
import { queryClient } from "../../../lib/query-client"

const shippingProfileQuery = (id: string) => ({
  queryKey: shippingProfileQueryKeys.detail(id),
  queryFn: async () => sdk.admin.shippingProfile.retrieve(id),
})

export const shippingProfileLoader = async ({ params }: LoaderFunctionArgs) => {
  try {
    const id = params.shipping_profile_id
    const query = shippingProfileQuery(id!)

    return await queryClient.ensureQueryData(query)
  } catch (error) {
    console.error('❌ [shipping-profile-loader] Error loading shipping profile:', error);
    throw error; // Re-throw to let React Router handle it
  }
}
