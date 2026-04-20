import { 
  MapPin, 
  ArchiveBox, 
  CheckCircleSolid,
  TruckFast,
  ArrowUpRightOnBox
} from "@shopenup/icons"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import { 
  Container, 
  Text, 
  Heading, 
  Badge, 
  Button,
  Skeleton,
} from "@shopenup/ui"
import { useReturnShiprocketTracking } from "../../../../../hooks/api/use-return-shiprocket-tracking"
import { getShiprocketStatusCategory, getShiprocketStatusLabel } from "../../../../../lib/shiprocket_status_map"

interface ReturnTrackingProps {
  returnOrder: any
}

export const ReturnTracking = ({ returnOrder }: ReturnTrackingProps) => {
  const { t } = useTranslation()
  const { data: trackingData, isLoading, isRefetching } = useReturnShiprocketTracking(
    returnOrder.return_id,
    {
      enabled: !!returnOrder.id,
      // refetchInterval: 30000, // Refresh every 30 seconds
    }
  )
  if (isLoading) {
    return (
      <Container className="divide-y border-t border-ui-border-base">
        <div className="px-6 py-4">
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </Container>
    )
  }

  // Check if tracking data is unavailable (no awb_code and no scans)
  const hasNoTrackingData = !trackingData || (!trackingData.awb_code && (!trackingData.scans || trackingData.scans.length === 0))

  if (hasNoTrackingData) {
    return (
      <Container className="divide-y border border-ui-border-base bg-ui-bg-subtle rounded-lg">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-ui-border-base bg-ui-bg-base">
          <div className="flex items-center gap-x-3">
            <div className="p-2 bg-ui-bg-base-subtle rounded-lg">
              <TruckFast className="w-5 h-5 text-ui-fg-muted" />
            </div>
            <div>
              <Heading level="h3">{t("orders.returns.shiprocket.tracking")}</Heading>
            </div>
          </div>
        </div>

        {/* Placeholder Content */}
        <div className="px-6 py-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-ui-bg-base-subtle rounded-full mb-4">
              <ArchiveBox className="w-8 h-8 text-ui-fg-muted" />
            </div>
            <Text size="small" className="text-ui-fg-subtle mb-2">
              {t("orders.returns.shiprocket.noTracking", "Tracking information not available")}
            </Text>
            <Text size="xsmall" className="text-ui-fg-subtle">
              Tracking details will appear here once the return shipment is processed
            </Text>
          </div>
        </div>
      </Container>
    )
  }

  const { scans, current_status, awb_code, tracking_url } = trackingData
  // Status colors
  const getStatusColor = (statusCode?: number) => {
    const status = getShiprocketStatusCategory(Number(statusCode))
    if (status === "delivered") return "green"
    if (status === "in_transit") return "blue"
    if (status === "out_for_delivery") return "orange"
    if (status === "pickup") return "purple"
    if (status === "rto") return "red"
    if (status === "exception") return "red"
    if (status === "cancelled") return "red"
    return "grey"
  }

  // Status icon
  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes("delivered") || statusLower.includes("received")) return <CheckCircleSolid className="w-4 h-4" />
    if (statusLower.includes("transit") || statusLower.includes("picked")) return <TruckFast className="w-4 h-4" />
    return <ArchiveBox className="w-4 h-4" />
  }

  return (
    <Container className="divide-y border border-ui-border-base bg-ui-bg-subtle rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-ui-border-base bg-ui-bg-base">
        <div className="flex items-center gap-x-3">
          <div className="p-2 bg-ui-bg-base-subtle rounded-lg">
            <TruckFast className="w-5 h-5 text-ui-fg-muted" />
          </div>
          <div>
            <Heading level="h3">{t("orders.returns.shiprocket.tracking")}</Heading>
            {awb_code && (
              <Text size="small" className="text-ui-fg-subtle">
                AWB: {awb_code}
              </Text>
            )}
          </div>
        </div>
        <div className="flex items-center gap-x-2">
          {isRefetching && (
            <Text size="small" className="text-ui-fg-subtle">
              {t("orders.fulfillment.refreshing", "Refreshing...")}
            </Text>
          )}
          {tracking_url && (
            <Button
              variant="secondary"
              size="small"
              onClick={() => window.open(tracking_url, "_blank")}
              className="gap-x-2"
            >
              {t("orders.returns.shiprocket.liveTrack", "Live track")}
              <ArrowUpRightOnBox className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Current Status */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-x-2 mb-4">
          <Text size="small" className="font-medium text-ui-fg-subtle">
            {t("orders.returns.shiprocket.currentStatus")}:
          </Text>
          <Badge color={getStatusColor(Number(current_status))}>
            <div className="flex items-center gap-x-1">
              {getStatusIcon(getShiprocketStatusCategory(Number(current_status)) as string)}
              <span>{getShiprocketStatusLabel(Number(current_status))}</span>
            </div>
          </Badge>
        </div>

        {/* Tracking Timeline */}
        <div>
          <Text size="small" className="font-medium text-ui-fg-subtle mb-3 block">
            {t("orders.returns.shiprocket.trackingHistory")}:
          </Text>
          <div className="max-h-[240px] overflow-y-auto pr-2 space-y-4">
            {scans.map((scan, index) => {
              const scanDate = scan.date ? new Date(scan.date) : new Date()
              const isLast = index === 0

              return (
                <div key={index} className="flex gap-x-4">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full ${
                      isLast ? 'bg-ui-fg-interactive' : 'bg-ui-border-base'
                    }`} />
                    {index < scans.length - 1 && (
                      <div className="w-px h-full bg-ui-border-base min-h-[60px]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between mb-1">
                      <Text size="small" className="font-medium">
                        {scan.activity}
                      </Text>
                      <Text size="small" className="text-ui-fg-subtle">
                        {format(scanDate, "MMM dd, yyyy HH:mm")}
                      </Text>
                    </div>
                    {scan.location && (
                      <div className="flex items-center gap-x-1 text-ui-fg-subtle">
                        <MapPin className="w-3 h-3" />
                        <Text size="small">{scan.location}</Text>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Container>
  )
}

