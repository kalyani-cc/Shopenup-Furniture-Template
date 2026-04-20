import { LoaderFunctionArgs } from "react-router-dom"
import { reservationItemsQueryKeys } from "../../../hooks/api/reservations"
import { sdk } from "../../../lib/client"
import { queryClient } from "../../../lib/query-client"

const reservationDetailQuery = (id: string) => ({
  queryKey: reservationItemsQueryKeys.detail(id),
  queryFn: async () => sdk.admin.reservation.retrieve(id),
})

export const reservationItemLoader = async ({ params }: LoaderFunctionArgs) => {
  try {
    const id = params.id
    const query = reservationDetailQuery(id!)

    return await queryClient.ensureQueryData(query)
  } catch (error) {
    console.error('❌ [reservation-loader] Error loading reservation:', error);
    throw error; // Re-throw to let React Router handle it
  }
}
