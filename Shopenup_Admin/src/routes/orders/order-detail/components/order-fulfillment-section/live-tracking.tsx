// Using @shopenup/icons for consistency with the codebase
import { 
  MapPin, 
  ArchiveBox, 
  Clock, 
  CheckCircleSolid,
  TruckFast,
  ArrowDownTray
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
import { useShiprocketTracking } from "../../../../../hooks/api/use-shiprocket-tracking"
import { AdminOrderFulfillment } from "@shopenup/types"

interface LiveTrackingProps {
  orderId: string
  fulfillment: AdminOrderFulfillment
}

export const LiveTracking = ({ orderId, fulfillment }: LiveTrackingProps) => {
  const { t } = useTranslation()
  const { data: trackingData, isLoading, isRefetching, refetch } = useShiprocketTracking(
    orderId,
    fulfillment.id,
    {
      enabled: !!fulfillment.id,
      refetchInterval: 30000, // Refresh every 30 seconds
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

  if (!trackingData) {
    // Show loading state instead of returning null
    return (
      <Container className="divide-y border-t border-ui-border-base">
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            {t("orders.fulfillment.loadingTracking", "Loading tracking information...")}
          </Text>
        </div>
      </Container>
    )
  }

  const { scans, current_status, courier_name, tracking_url, last_status_at } = trackingData

  // Status colors
  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes("delivered")) return "green"
    if (statusLower.includes("transit") || statusLower.includes("picked")) return "blue"
    if (statusLower.includes("out for delivery")) return "orange"
    if (statusLower.includes("scheduled") || statusLower.includes("assigned")) return "grey"
    return "grey"
  }

  // Status icon
  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes("delivered")) return <CheckCircleSolid className="w-4 h-4" />
    if (statusLower.includes("transit") || statusLower.includes("picked")) return <TruckFast className="w-4 h-4" />
    return <ArchiveBox className="w-4 h-4" />
  }

  return (
    <Container className="divide-y border border-ui-border-base bg-ui-bg-subtle rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-ui-border-base bg-ui-bg-base">
        <div className="flex items-center gap-x-3">
          <div className="p-2 bg-ui-bg-base-subtle rounded-lg">
            <MapPin className="w-5 h-5 text-ui-fg-interactive" />
          </div>
          <div>
            <Heading level="h3" className="text-ui-fg-base">
              {t("orders.fulfillment.liveTracking", "Live Tracking")}
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {courier_name && `${courier_name} • `}
              {t("orders.fulfillment.autoRefresh", "Auto-refreshes every 30s")}
            </Text>
          </div>
        </div>
        <Button
          variant="transparent"
          size="small"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="gap-x-2"
        >
          <ArrowDownTray className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
          {t("orders.fulfillment.refresh", "Refresh")}
        </Button>
      </div>

      {/* Current Status */}
      <div className="px-6 py-4 bg-gradient-to-r from-ui-bg-base to-ui-bg-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-x-3">
            <div className={`p-2 rounded-lg bg-${getStatusColor(current_status)}-50`}>
              {getStatusIcon(current_status)}
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle mb-1">
                {t("orders.fulfillment.currentStatus", "Current Status")}
              </Text>
              <div className="flex items-center gap-x-2">
                <Badge color={getStatusColor(current_status)} size="small">
                  {current_status}
                </Badge>
                {last_status_at && (
                  <Text size="xsmall" className="text-ui-fg-muted">
                    {format(new Date(last_status_at), "MMM dd, yyyy HH:mm")}
                  </Text>
                )}
              </div>
            </div>
          </div>
          {tracking_url && (
            <Button
              variant="transparent"
              size="small"
              onClick={() => window.open(tracking_url, "_blank")}
            >
              {t("orders.fulfillment.viewOnShiprocket", "View on Shiprocket")}
            </Button>
          )}
        </div>
      </div>

      {/* Tracking Timeline */}
      {scans && scans.length > 0 && (
        <div className="px-6 py-4">
          <Heading level="h3" className="text-ui-fg-base mb-4">
            {t("orders.fulfillment.trackingHistory", "Tracking History")}
          </Heading>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-ui-border-base" />
            
            {/* Timeline items */}
            <div className="space-y-6">
              {scans.map((scan, index) => {
                const isLatest = index === 0
                const isDelivered = scan.activity.toLowerCase().includes("delivered")
                const isPicked = scan.activity.toLowerCase().includes("picked")
                
                return (
                  <div key={index} className="relative flex gap-x-4">
                    {/* Timeline dot */}
                    <div className="relative z-10 flex-shrink-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                          isLatest
                            ? "bg-ui-bg-interactive border-ui-border-interactive"
                            : "bg-ui-bg-base border-ui-border-base"
                        }`}
                      >
                        {isDelivered ? (
                          <CheckCircleSolid className="w-4 h-4 text-green-600" />
                        ) : isPicked ? (
                          <TruckFast className="w-4 h-4 text-blue-600" />
                        ) : (
                          <ArchiveBox className="w-4 h-4 text-ui-fg-muted" />
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-6">
                      <div className="flex items-start justify-between gap-x-4">
                        <div className="flex-1">
                          <Text
                            size="small"
                            leading="compact"
                            weight={isLatest ? "plus" : "regular"}
                            className={isLatest ? "text-ui-fg-base" : "text-ui-fg-subtle"}
                          >
                            {scan.activity}
                          </Text>
                          <div className="flex items-center gap-x-2 mt-1">
                            <MapPin className="w-3 h-3 text-ui-fg-muted" />
                            <Text size="xsmall" className="text-ui-fg-muted">
                              {scan.location}
                            </Text>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <div className="flex items-center gap-x-1 text-ui-fg-muted">
                            <Clock className="w-3 h-3" />
                            <Text size="xsmall">
                              {format(new Date(scan.date), "MMM dd, HH:mm")}
                            </Text>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!scans || scans.length === 0) && (
        <div className="px-6 py-8 text-center">
          <ArchiveBox className="w-12 h-12 text-ui-fg-muted mx-auto mb-3" />
          <Text size="small" className="text-ui-fg-subtle">
            {t("orders.fulfillment.noTrackingData", "No tracking data available yet")}
          </Text>
        </div>
      )}
    </Container>
  )
}

