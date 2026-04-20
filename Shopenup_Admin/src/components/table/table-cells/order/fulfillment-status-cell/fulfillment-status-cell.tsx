import { useTranslation } from "react-i18next"

import { FulfillmentStatus, HttpTypes } from "@shopenup/types"

import { getOrderFulfillmentStatus } from "../../../../../lib/order-helpers"
import { DataTableStatusCell } from "../../../../data-table/components/data-table-status-cell/data-table-status-cell"

type FulfillmentStatusCellProps = {
  status: FulfillmentStatus
  order?: HttpTypes.AdminOrder
}

export const FulfillmentStatusCell = ({
  status,
  order,
}: FulfillmentStatusCellProps) => {
  const { t } = useTranslation()

  if (!status) {
    // TODO: remove this once fulfillment<>order link is added
    return "-"
  }

  // Check for return requests
  const orderReturns = (order as any)?.returns as HttpTypes.AdminReturn[] | undefined
  if (orderReturns && orderReturns.length > 0) {
    // Filter out canceled returns
    const activeReturns = orderReturns.filter(
      (returnItem: HttpTypes.AdminReturn) => !returnItem.canceled_at
    )
    
    if (activeReturns.length > 0) {
      // Check if any return has been fully received
      // Status is "received" OR has received_at timestamp
      const hasReceivedReturns = activeReturns.some(
        (returnItem: HttpTypes.AdminReturn) => 
          returnItem.status === "received" ||
          (returnItem as any).received_at !== null && (returnItem as any).received_at !== undefined
      )
      
      // Check if any return is requested but not yet received
      // Status can be "requested" or "partially_received"
      // OR if return exists but has no received_at (meaning it's requested but not received)
      const hasRequestedReturns = activeReturns.some(
        (returnItem: HttpTypes.AdminReturn) => {
          const status = returnItem.status
          const receivedAt = (returnItem as any).received_at
          
          // Explicit status check
          if (status === "requested" || status === "partially_received") {
            return true
          }
          
          // Fallback: if return exists but has no received_at, it's a request
          if (!receivedAt && returnItem.id) {
            return true
          }
          
          return false
        }
      )

      if (hasReceivedReturns) {
        // Show "Return Completed" if any return has been received
        return <DataTableStatusCell color="green">Return Completed</DataTableStatusCell>
      } else if (hasRequestedReturns) {
        // Show "Return Request" if there are requested returns that haven't been received
        return <DataTableStatusCell color="orange">Return Request</DataTableStatusCell>
      }
    }
  }

  const { label, color } = getOrderFulfillmentStatus(t, status)

  return <DataTableStatusCell color={color}>{label}</DataTableStatusCell>
}

export const FulfillmentStatusHeader = () => {
  const { t } = useTranslation()

  return (
    <div className="flex h-full w-full items-center">
      <span className="truncate">{t("fields.fulfillment")}</span>
    </div>
  )
}
