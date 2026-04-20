import { Buildings, XCircle, ArrowDownTray, ArchiveBox, HandTruck, DocumentText, TruckFast, CheckCircleSolid } from "@shopenup/icons"
import {
  AdminOrder,
  AdminOrderFulfillment,
  AdminOrderLineItem,
} from "@shopenup/types"
import {
  Button,
  Container,
  Copy,
  Heading,
  StatusBadge,
  Text,
  Tooltip,
  toast,
  usePrompt,
  Badge,
} from "@shopenup/ui"
import { format } from "date-fns"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"
import { ActionMenu } from "../../../../../components/common/action-menu"
import { Skeleton } from "../../../../../components/common/skeleton"
import { Thumbnail } from "../../../../../components/common/thumbnail"
import {
  useCancelOrderFulfillment,
  useMarkOrderFulfillmentAsDelivered,
} from "../../../../../hooks/api/orders"
import { useStockLocation } from "../../../../../hooks/api/stock-locations"
import {
  useMarkFulfillmentAsPacked,
  useRequestShiprocketPickup,
  useGenerateShiprocketManifest,
  useDownloadShiprocketLabel,
  useMarkFulfillmentAsShipped,
  useMarkFulfillmentAsDelivered as useMarkShiprocketFulfillmentAsDelivered,
  ShiprocketFulfillmentData,
} from "../../../../../hooks/api/fulfillment"
import { formatProvider } from "../../../../../lib/format-provider"
import { getLocaleAmount } from "../../../../../lib/money-amount-helpers"
import { FulfillmentSetType } from "../../../../locations/common/constants"

type OrderFulfillmentSectionProps = {
  order: AdminOrder
}

export const OrderFulfillmentSection = ({
  order,
}: OrderFulfillmentSectionProps) => {
  const fulfillments = order.fulfillments || []

  return (
    <div className="flex flex-col gap-y-3">
      <UnfulfilledItemBreakdown order={order} />
      {fulfillments.map((f, index) => (
        <Fulfillment key={f.id} index={index} fulfillment={f} order={order} />
      ))}
    </div>
  )
}

const UnfulfilledItem = ({
  item,
  currencyCode,
}: {
  item: AdminOrderLineItem
  currencyCode: string
}) => {
  return (
    <div
      key={item.id}
      className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4"
    >
      <div className="flex items-start gap-x-4">
        <Thumbnail src={item.thumbnail} />
        <div>
          <Text
            size="small"
            leading="compact"
            weight="plus"
            className="text-ui-fg-base"
          >
            {item.title}
          </Text>
          {item.variant_sku && (
            <div className="flex items-center gap-x-1">
              <Text size="small">{item.variant_sku}</Text>
              <Copy content={item.variant_sku} className="text-ui-fg-muted" />
            </div>
          )}
          <Text size="small">
            {(item as any).variant?.options?.map((o: any) => o.value).join(" · ") || ""}
          </Text>
        </div>
      </div>
      <div className="grid grid-cols-3 items-center gap-x-4">
        <div className="flex items-center justify-end">
          <Text size="small">
            {getLocaleAmount(item.unit_price as number, currencyCode)}
          </Text>
        </div>
        <div className="flex items-center justify-end">
          <Text>
            <span className="tabular-nums">
              {item.quantity - item.detail.fulfilled_quantity}
            </span>
            x
          </Text>
        </div>
        <div className="flex items-center justify-end">
          <Text size="small">
            {getLocaleAmount(Number(item.subtotal) || 0, currencyCode)}
          </Text>
        </div>
      </div>
    </div>
  )
}

const UnfulfilledItemBreakdown = ({ order }: { order: AdminOrder }) => {
  // Create an array of order items that haven't been fulfilled or at least not fully fulfilled
  const unfulfilledItemsWithShipping = order.items!.filter(
    (i) => i.requires_shipping && i.detail.fulfilled_quantity < i.quantity
  )

  const unfulfilledItemsWithoutShipping = order.items!.filter(
    (i) => !i.requires_shipping && i.detail.fulfilled_quantity < i.quantity
  )

  return (
    <>
      {!!unfulfilledItemsWithShipping.length && (
        <UnfulfilledItemDisplay
          order={order}
          unfulfilledItems={unfulfilledItemsWithShipping}
          requiresShipping={true}
        />
      )}

      {!!unfulfilledItemsWithoutShipping.length && (
        <UnfulfilledItemDisplay
          order={order}
          unfulfilledItems={unfulfilledItemsWithoutShipping}
          requiresShipping={false}
        />
      )}
    </>
  )
}

const UnfulfilledItemDisplay = ({
  order,
  unfulfilledItems,
  requiresShipping = false,
}: {
  order: AdminOrder
  unfulfilledItems: AdminOrderLineItem[]
  requiresShipping: boolean
}) => {
  const { t } = useTranslation()

  if (order.status === "canceled") {
    return
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("orders.fulfillment.unfulfilledItems")}</Heading>

        <div className="flex items-center gap-x-4">
          {requiresShipping && (
            <StatusBadge color="red" className="text-nowrap">
              {t("orders.fulfillment.requiresShipping")}
            </StatusBadge>
          )}

          <StatusBadge color="red" className="text-nowrap">
            {t("orders.fulfillment.awaitingFulfillmentBadge")}
          </StatusBadge>

          <ActionMenu
            groups={[
              {
                actions: [
                  {
                    label: t("orders.fulfillment.fulfillItems"),
                    icon: <Buildings />,
                    to: `/orders/${order.id}/fulfillment?requires_shipping=${requiresShipping}`,
                  },
                ],
              },
            ]}
          />
        </div>
      </div>
      <div>
        {unfulfilledItems.map((item: AdminOrderLineItem) => (
          <UnfulfilledItem
            key={item.id}
            item={item}
            currencyCode={order.currency_code}
          />
        ))}
      </div>
    </Container>
  )
}

// Helper to get Shiprocket data from fulfillment
const getShiprocketData = (fulfillment: AdminOrderFulfillment): ShiprocketFulfillmentData => {
  return (fulfillment.data as ShiprocketFulfillmentData) || {}
}

// Shiprocket Tracking Section Component
const ShiprocketTrackingSection = ({
  fulfillment,
}: {
  fulfillment: AdminOrderFulfillment
}) => {
  const { t } = useTranslation()
  const shiprocketData = getShiprocketData(fulfillment)
  
  const awbCode = shiprocketData.awb_code
  const courierName = shiprocketData.courier_name
  const trackingUrl = shiprocketData.shiprocket_tracking_url
  
  // Determine current status based on fulfillment state and Shiprocket data
  let currentStatus = "AWB Assigned"
  if (fulfillment.delivered_at) {
    currentStatus = "Delivered"
  } else if (fulfillment.shipped_at) {
    currentStatus = "In Transit"
  } else if (shiprocketData.pickup_requested_at) {
    currentStatus = "Awaiting Pickup"
  } else if (shiprocketData.packed) {
    currentStatus = "Packed"
  }
  
  if (!awbCode) {
    return null
  }

  return (
    <div className="text-ui-fg-subtle divide-y border-t border-ui-border-base">
      {/* Courier */}
      <div className="grid grid-cols-2 items-center px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("orders.fulfillment.shiprocket.courier", "Courier")}
        </Text>
        <Text size="small" leading="compact">
          {courierName || "-"}
        </Text>
      </div>
      
      {/* AWB */}
      <div className="grid grid-cols-2 items-center px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("orders.fulfillment.shiprocket.awb", "AWB")}
        </Text>
        <div className="flex items-center gap-x-2">
          {trackingUrl ? (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-fg"
            >
              <Text size="small" leading="compact">
                {awbCode}
              </Text>
            </a>
          ) : (
            <Text size="small" leading="compact">
              {awbCode}
            </Text>
          )}
          <Copy content={awbCode} className="text-ui-fg-muted" />
        </div>
      </div>
      
      {/* Status */}
      <div className="grid grid-cols-2 items-center px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("orders.fulfillment.shiprocket.status", "Status")}
        </Text>
        <div className="flex items-center gap-x-2">
          <Badge 
            color={
              currentStatus === "Delivered" ? "green" : 
              currentStatus === "In Transit" ? "blue" : 
              currentStatus === "Awaiting Pickup" ? "orange" : 
              "grey"
            }
            size="xsmall"
          >
            {currentStatus}
          </Badge>
        </div>
      </div>

      {/* Pickup Scheduled Date (if available) */}
      {shiprocketData.pickup_scheduled_date && (
        <div className="grid grid-cols-2 items-center px-6 py-4">
          <Text size="small" leading="compact" weight="plus">
            {t("orders.fulfillment.shiprocket.pickupScheduled", "Pickup Scheduled")}
          </Text>
          <Text size="small" leading="compact">
            {shiprocketData.pickup_scheduled_date}
          </Text>
        </div>
      )}
    </div>
  )
}

// Shiprocket Action Buttons Component
const ShiprocketActionButtons = ({
  order,
  fulfillment,
}: {
  order: AdminOrder
  fulfillment: AdminOrderFulfillment
}) => {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const shiprocketData = getShiprocketData(fulfillment)
  
  const awbCode = shiprocketData.awb_code
  const isPacked = shiprocketData.packed
  const pickupRequested = !!shiprocketData.pickup_requested_at
  const manifestGenerated = !!shiprocketData.manifest_id || !!shiprocketData.manifest_generated_at
  const isShipped = !!fulfillment.shipped_at
  const isDelivered = !!fulfillment.delivered_at
  
  // Check if this is a Shiprocket fulfillment (has AWB)
  const isShiprocketFulfillment = !!awbCode
  
  // Mutation hooks
  const { mutateAsync: downloadLabel, isPending: isDownloadingLabel } = useDownloadShiprocketLabel(
    order.id,
    fulfillment.id
  )
  
  const { mutateAsync: markAsPacked, isPending: isMarkingPacked } = useMarkFulfillmentAsPacked(
    order.id,
    fulfillment.id
  )
  
  const { mutateAsync: requestPickup, isPending: isRequestingPickup } = useRequestShiprocketPickup(
    order.id,
    fulfillment.id
  )
  
  const { mutateAsync: generateManifest, isPending: isGeneratingManifest } = useGenerateShiprocketManifest(
    order.id,
    fulfillment.id
  )
  
  const { mutateAsync: markAsShipped, isPending: isMarkingAsShipped } = useMarkFulfillmentAsShipped(
    order.id,
    fulfillment.id
  )
  
  const { mutateAsync: markAsDelivered, isPending: isMarkingAsDelivered } = useMarkShiprocketFulfillmentAsDelivered(
    order.id,
    fulfillment.id
  )

  // Button visibility conditions based on the state machine
  const showDownloadLabel = isShiprocketFulfillment && !isDelivered
  const showMarkAsPacked = isShiprocketFulfillment && !isPacked && !isShipped && !isDelivered
  const showRequestPickup = isShiprocketFulfillment && isPacked && !pickupRequested && !isShipped && !isDelivered
  const showGenerateManifest = isShiprocketFulfillment && pickupRequested && !manifestGenerated && !isShipped && !isDelivered
  
  // Manual testing buttons - show after manifest generated and not yet shipped/delivered
  const showMarkAsShipped = isShiprocketFulfillment && manifestGenerated && !isShipped && !isDelivered
  const showMarkAsDelivered = isShiprocketFulfillment && isShipped && !isDelivered
  
  // If fulfillment is already delivered or canceled, don't show action buttons
  if (fulfillment.canceled_at) {
    return null
  }
  
  // If no Shiprocket data, don't show these buttons
  if (!isShiprocketFulfillment) {
    return null
  }

  const handleDownloadLabel = async () => {
    try {
      await downloadLabel(undefined, {
        onSuccess: () => {
          toast.success(t("orders.fulfillment.shiprocket.toast.labelDownloaded", "Shipping label opened in new tab"))
        },
        onError: (e) => {
          toast.error(e.message)
        },
      })
    } catch (error: any) {
      toast.error(error.message || "Failed to download label")
    }
  }

  const handleMarkAsPacked = async () => {
    try {
      await markAsPacked(undefined, {
        onSuccess: () => {
          toast.success(t("orders.fulfillment.shiprocket.toast.markedAsPacked", "Fulfillment marked as packed"))
        },
        onError: (e) => {
          toast.error(e.message)
        },
      })
    } catch (error: any) {
      toast.error(error.message || "Failed to mark as packed")
    }
  }

  const handleRequestPickup = async () => {
    try {
      await requestPickup(undefined, {
        onSuccess: () => {
          toast.success(t("orders.fulfillment.shiprocket.toast.pickupRequested", "Pickup requested successfully"))
        },
        onError: (e) => {
          toast.error(e.message)
        },
      })
    } catch (error: any) {
      toast.error(error.message || "Failed to request pickup")
    }
  }

  const handleGenerateManifest = async () => {
    try {
      await generateManifest(undefined, {
        onSuccess: () => {
          toast.success(t("orders.fulfillment.shiprocket.toast.manifestGenerated", "Manifest generated successfully"))
        },
        onError: (e) => {
          toast.error(e.message)
        },
      })
    } catch (error: any) {
      toast.error(error.message || "Failed to generate manifest")
    }
  }

  const handleMarkAsShipped = async () => {
    const res = await prompt({
      title: t("general.areYouSure"),
      description: t("orders.fulfillment.shiprocket.markAsShippedWarning", "This will mark the fulfillment as shipped. This action is for testing purposes."),
      confirmText: t("actions.continue"),
      cancelText: t("actions.cancel"),
      variant: "confirmation",
    })

    if (res) {
      try {
        // Get fulfillment items - map to the format expected by the API
        const fulfillmentAny = fulfillment as any
        const fulfillmentItems = fulfillmentAny.items || []
        const items = fulfillmentItems.map((item: any) => ({
          id: item.line_item_id || item.id,
          quantity: item.quantity || 1,
        }))

        await markAsShipped({
          items,
          labels: [],
          no_notification: false,
        }, {
          onSuccess: () => {
            toast.success(t("orders.fulfillment.shiprocket.toast.markedAsShipped", "Fulfillment marked as shipped"))
          },
          onError: (e) => {
            toast.error(e.message)
          },
        })
      } catch (error: any) {
        toast.error(error.message || "Failed to mark as shipped")
      }
    }
  }

  const handleMarkAsDelivered = async () => {
    const res = await prompt({
      title: t("general.areYouSure"),
      description: t("orders.fulfillment.shiprocket.markAsDeliveredWarning", "This will mark the fulfillment as delivered. This action is for testing purposes."),
      confirmText: t("actions.continue"),
      cancelText: t("actions.cancel"),
      variant: "confirmation",
    })

    if (res) {
      try {
        await markAsDelivered(undefined, {
          onSuccess: () => {
            toast.success(t("orders.fulfillment.shiprocket.toast.markedAsDelivered", "Fulfillment marked as delivered"))
          },
          onError: (e) => {
            toast.error(e.message)
          },
        })
      } catch (error: any) {
        toast.error(error.message || "Failed to mark as delivered")
      }
    }
  }

  // Show nothing if no actions available
  if (!showDownloadLabel && !showMarkAsPacked && !showRequestPickup && !showGenerateManifest && !showMarkAsShipped && !showMarkAsDelivered) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showDownloadLabel && (
        <Button 
          onClick={handleDownloadLabel} 
          variant="secondary" 
          size="small"
          disabled={isDownloadingLabel}
        >
          <ArrowDownTray className="mr-1.5 h-4 w-4" />
          {t("orders.fulfillment.shiprocket.downloadLabel", "Download Label")}
        </Button>
      )}
      
      {showMarkAsPacked && (
        <Button 
          onClick={handleMarkAsPacked} 
          variant="secondary"
          size="small"
          disabled={isMarkingPacked}
        >
          <ArchiveBox className="mr-1.5 h-4 w-4" />
          {t("orders.fulfillment.shiprocket.markAsPacked", "Mark as Packed")}
        </Button>
      )}
      
      {showRequestPickup && (
        <Button 
          onClick={handleRequestPickup} 
          variant="secondary"
          size="small"
          disabled={isRequestingPickup}
        >
          <HandTruck className="mr-1.5 h-4 w-4" />
          {t("orders.fulfillment.shiprocket.requestPickup", "Request Pickup")}
        </Button>
      )}
      
      {showGenerateManifest && (
        <Button 
          onClick={handleGenerateManifest} 
          variant="secondary"
          size="small"
          disabled={isGeneratingManifest}
        >
          <DocumentText className="mr-1.5 h-4 w-4" />
          {t("orders.fulfillment.shiprocket.generateManifest", "Generate Manifest")}
        </Button>
      )}
      
      {showMarkAsShipped && (
        <Button 
          onClick={handleMarkAsShipped} 
          variant="secondary"
          size="small"
          disabled={isMarkingAsShipped}
        >
          <TruckFast className="mr-1.5 h-4 w-4" />
          {t("orders.fulfillment.shiprocket.markAsShipped", "Mark as Shipped")}
        </Button>
      )}
      
      {showMarkAsDelivered && (
        <Button 
          onClick={handleMarkAsDelivered} 
          variant="secondary"
          size="small"
          disabled={isMarkingAsDelivered}
        >
          <CheckCircleSolid className="mr-1.5 h-4 w-4" />
          {t("orders.fulfillment.shiprocket.markAsDelivered", "Mark as Delivered")}
        </Button>
      )}
    </div>
  )
}

const Fulfillment = ({
  fulfillment,
  order,
  index,
}: {
  fulfillment: AdminOrderFulfillment
  order: AdminOrder
  index: number
}) => {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const navigate = useNavigate()

  const showLocation = !!fulfillment.location_id
  const shiprocketData = getShiprocketData(fulfillment)
  const isShiprocketFulfillment = !!shiprocketData.awb_code

  // Cast to any to access shipping_option which may exist on extended types
  const fulfillmentAny = fulfillment as any
  const isPickUpFulfillment =
    fulfillmentAny.shipping_option?.service_zone?.fulfillment_set?.type ===
    FulfillmentSetType.Pickup

  const { stock_location, isError, error } = useStockLocation(
    fulfillment.location_id!,
    undefined,
    {
      enabled: showLocation,
    }
  )

  // Determine status text and color based on Shiprocket data
  let statusText = fulfillment.requires_shipping
    ? isPickUpFulfillment
      ? "Awaiting pickup"
      : "Awaiting shipping"
    : "Awaiting delivery"
  let statusColor: "blue" | "green" | "red" | "orange" = "blue"
  let statusTimestamp: string | Date = fulfillment.created_at

  if (fulfillment.canceled_at) {
    statusText = "Canceled"
    statusColor = "red"
    statusTimestamp = fulfillment.canceled_at
  } else if (fulfillment.delivered_at) {
    statusText = "Delivered"
    statusColor = "green"
    statusTimestamp = fulfillment.delivered_at
  } else if (fulfillment.shipped_at) {
    statusText = "Shipped"
    statusColor = "green"
    statusTimestamp = fulfillment.shipped_at
  } else if (isShiprocketFulfillment) {
    // For Shiprocket fulfillments, show more granular status
    if (shiprocketData.manifest_id || shiprocketData.manifest_generated_at) {
      statusText = "Ready for Pickup"
      statusColor = "blue"
    } else if (shiprocketData.pickup_requested_at) {
      statusText = "Pickup Requested"
      statusColor = "blue"
    } else if (shiprocketData.packed) {
      statusText = "Packed"
      statusColor = "orange"
      statusTimestamp = shiprocketData.packed_at || fulfillment.created_at
    } else {
      statusText = "Awaiting Packing"
      statusColor = "blue"
    }
  }

  const { mutateAsync } = useCancelOrderFulfillment(order.id, fulfillment.id)
  const { mutateAsync: markAsDelivered } = useMarkOrderFulfillmentAsDelivered(
    order.id,
    fulfillment.id
  )

  // For non-Shiprocket fulfillments, show the original buttons
  const showShippingButton =
    !isShiprocketFulfillment &&
    !fulfillment.canceled_at &&
    !fulfillment.shipped_at &&
    !fulfillment.delivered_at &&
    fulfillment.requires_shipping &&
    !isPickUpFulfillment

  const showDeliveryButton =
    !isShiprocketFulfillment &&
    !fulfillment.canceled_at && 
    !fulfillment.delivered_at

  const handleMarkAsDelivered = async () => {
    const res = await prompt({
      title: t("general.areYouSure"),
      description: t("orders.fulfillment.markAsDeliveredWarning"),
      confirmText: t("actions.continue"),
      cancelText: t("actions.cancel"),
      variant: "confirmation",
    })

    if (res) {
      await markAsDelivered(undefined, {
        onSuccess: () => {
          toast.success(
            t(
              isPickUpFulfillment
                ? "orders.fulfillment.toast.fulfillmentPickedUp"
                : "orders.fulfillment.toast.fulfillmentDelivered"
            )
          )
        },
        onError: (e) => {
          toast.error(e.message)
        },
      })
    }
  }

  const handleCancel = async () => {
    if (fulfillment.shipped_at) {
      toast.warning(t("orders.fulfillment.toast.fulfillmentShipped"))
      return
    }

    const res = await prompt({
      title: t("general.areYouSure"),
      description: t("orders.fulfillment.cancelWarning"),
      confirmText: t("actions.continue"),
      cancelText: t("actions.cancel"),
    })

    if (res) {
      await mutateAsync(undefined, {
        onSuccess: () => {
          toast.success(t("orders.fulfillment.toast.canceled"))
        },
        onError: (e) => {
          toast.error(e.message)
        },
      })
    }
  }

  if (isError) {
    throw error
  }

  // Get items and labels from fulfillment (may be on extended type)
  const fulfillmentItems = fulfillmentAny.items || []
  const fulfillmentLabels = fulfillmentAny.labels || []

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">
          {t("orders.fulfillment.number", {
            number: index + 1,
          })}
        </Heading>
        <div className="flex items-center gap-x-4">
          <Tooltip
            content={format(
              new Date(statusTimestamp),
              "dd MMM, yyyy, HH:mm:ss"
            )}
          >
            <StatusBadge color={statusColor} className="text-nowrap">
              {statusText}
            </StatusBadge>
          </Tooltip>
          <ActionMenu
            groups={[
              {
                actions: [
                  {
                    label: t("actions.cancel"),
                    icon: <XCircle />,
                    onClick: handleCancel,
                    disabled:
                      !!fulfillment.canceled_at ||
                      !!fulfillment.shipped_at ||
                      !!fulfillment.delivered_at,
                  },
                ],
              },
            ]}
          />
        </div>
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("orders.fulfillment.itemsLabel")}
        </Text>
        <ul>
          {fulfillmentItems.map((f_item: any) => (
            <li key={f_item.line_item_id}>
              <Text size="small" leading="compact">
                {f_item.quantity}x {f_item.title}
              </Text>
            </li>
          ))}
        </ul>
      </div>
      {showLocation && (
        <div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
          <Text size="small" leading="compact" weight="plus">
            {t("orders.fulfillment.shippingFromLabel")}
          </Text>
          {stock_location ? (
            <Link
              to={`/settings/locations/${stock_location.id}`}
              className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-fg"
            >
              <Text size="small" leading="compact">
                {stock_location.name}
              </Text>
            </Link>
          ) : (
            <Skeleton className="w-16" />
          )}
        </div>
      )}
      <div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("fields.provider")}
        </Text>

        <Text size="small" leading="compact">
          {formatProvider(fulfillment.provider_id)}
        </Text>
      </div>
      
      {/* Shiprocket Tracking Section - replaces the old tracking section for Shiprocket fulfillments */}
      {isShiprocketFulfillment ? (
        <ShiprocketTrackingSection fulfillment={fulfillment} />
      ) : (
        <div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
          <Text size="small" leading="compact" weight="plus">
            {t("orders.fulfillment.trackingLabel")}
          </Text>
          <div>
            {fulfillmentLabels.length > 0 ? (
              <ul>
                {fulfillmentLabels.map((tlink: any) => {
                  const hasUrl =
                    tlink.url && tlink.url.length > 0 && tlink.url !== "#"

                  if (hasUrl) {
                    return (
                      <li key={tlink.tracking_number}>
                        <a
                          href={tlink.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-fg"
                        >
                          <Text size="small" leading="compact">
                            {tlink.tracking_number}
                          </Text>
                        </a>
                      </li>
                    )
                  }

                  return (
                    <li key={tlink.tracking_number}>
                      <Text size="small" leading="compact">
                        {tlink.tracking_number}
                      </Text>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <Text size="small" leading="compact">
                -
              </Text>
            )}
          </div>
        </div>
      )}

      {/* Action buttons section */}
      {(showShippingButton || showDeliveryButton || isShiprocketFulfillment) && (
        <div className="bg-ui-bg-subtle flex items-center justify-end gap-x-2 rounded-b-xl px-4 py-4">
          {/* Shiprocket action buttons */}
          {isShiprocketFulfillment && (
            <ShiprocketActionButtons order={order} fulfillment={fulfillment} />
          )}
          
          {/* Original buttons for non-Shiprocket fulfillments */}
          {showDeliveryButton && (
            <Button onClick={handleMarkAsDelivered} variant="secondary">
              {t(
                isPickUpFulfillment
                  ? "orders.fulfillment.markAsPickedUp"
                  : "orders.fulfillment.markAsDelivered"
              )}
            </Button>
          )}

          {showShippingButton && (
            <Button
              onClick={() => navigate(`./${fulfillment.id}/create-shipment`)}
              variant="secondary"
            >
              {t("orders.fulfillment.markAsShipped")}
            </Button>
          )}
        </div>
      )}
    </Container>
  )
}
