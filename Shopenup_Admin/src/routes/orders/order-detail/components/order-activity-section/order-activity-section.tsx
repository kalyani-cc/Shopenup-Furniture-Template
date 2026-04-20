import { AdminOrder } from "@shopenup/types"
import { Container, Heading } from "@shopenup/ui"
import { useTranslation } from "react-i18next"
import { OrderTimeline } from "./order-timeline"
// import { LiveTracking } from "../order-fulfillment-section/live-tracking"
import { ReturnTracking } from "../order-summary-section/return-tracking"
import { useReturns } from "../../../../../hooks/api/returns"
import { useGetShiprocketReturn } from "../../../../../hooks/api/returns"

type OrderActivityProps = {
  order: AdminOrder
}

export const OrderActivitySection = ({ order }: OrderActivityProps) => {
  const { t } = useTranslation()

  // Get returns for this order
  const returnsResult = useReturns({
    order_id: order.id,
    fields: "+metadata",
  })

  const returnsData = (returnsResult as any)?.returns?.[0]
  console.log("returnsData   ", returnsData)

    const {
      data: shiprocketResult,
      isLoading,
      isError,
    } = useGetShiprocketReturn(returnsData?.id)


  const returnWithShiprocket = shiprocketResult?.data

  // Find Shiprocket fulfillment for live tracking
  // Check multiple possible provider_id values
  const shiprocketFulfillment = order.fulfillments?.find(
    (fulfillment) => {
      const providerId = fulfillment.provider_id?.toLowerCase() || ''
      return providerId === 'shiprocket' || 
             providerId.includes('shiprocket') ||
             // Also check if it has Shiprocket data in metadata
             !!(fulfillment.data as any)?.shiprocket ||
             !!(fulfillment.data as any)?.awb_code ||
             !!(fulfillment.data as any)?.shiprocket_order_id
    }
  )


  return (
    <>
      <Container className="flex flex-col gap-y-8 px-6 py-4">
        <div className="flex flex-col gap-y-4">
          <div className="flex items-center justify-between">
            <Heading level="h2">{t("orders.activity.header")}</Heading>
          </div>
          {/* TODO: Re-add when we have support for notes */}
          {/* <OrderNoteForm order={order} /> */}
        </div>
        <OrderTimeline order={order} />
      </Container>
      {/* Live Tracking for Shiprocket fulfillments - rendered outside Container to avoid nesting */}
      {/* {shiprocketFulfillment && (
        <LiveTracking orderId={order.id} fulfillment={shiprocketFulfillment} />
      )} */}
      {/* Return Tracking for Shiprocket return orders */}
      {/* {returnWithShiprocket && (
        <div className="mt-4">
          <ReturnTracking returnOrder={returnWithShiprocket} />
        </div>
      )} */}

      {isLoading && (
        <div className="text-sm text-gray-500">
          Loading return tracking…
        </div>
      )}

      {!isLoading && !isError && returnWithShiprocket && (
        <div className="mt-4">
          <ReturnTracking returnOrder={returnWithShiprocket} />
        </div>
      )}
    </>
  )
}
