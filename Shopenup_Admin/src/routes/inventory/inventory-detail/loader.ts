import { LoaderFunctionArgs } from "react-router-dom"

import { inventoryItemsQueryKeys } from "../../../hooks/api/inventory"
import { sdk } from "../../../lib/client"
import { queryClient } from "../../../lib/query-client"
import { INVENTORY_DETAIL_FIELDS } from "./constants"

const inventoryDetailQuery = (id: string) => ({
  queryKey: inventoryItemsQueryKeys.detail(id),
  queryFn: async () =>
    sdk.admin.inventoryItem.retrieve(id, {
      fields: INVENTORY_DETAIL_FIELDS,
    }),
})

export const inventoryItemLoader = async ({ params }: LoaderFunctionArgs) => {
  try {
    const id = params.id
    const query = inventoryDetailQuery(id!)

    return await queryClient.ensureQueryData(query)
  } catch (error) {
    console.error('❌ [inventory-loader] Error loading inventory item:', error);
    throw error; // Re-throw to let React Router handle it
  }
}
