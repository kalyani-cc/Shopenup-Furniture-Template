import {
  BellAlert,
  BellAlertDone,
  InformationCircleSolid,
} from "@shopenup/icons"
import { HttpTypes } from "@shopenup/types"
import { clx, Drawer, Heading, IconButton, Text, Button } from "@shopenup/ui"
import { formatDistance } from "date-fns"
import { useEffect, useState, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { notificationQueryKeys, useNotifications } from "../../../hooks/api"
import { sdk } from "../../../lib/client"
import { FilePreview } from "../../common/file-preview"
import { InfiniteList } from "../../common/infinite-list"
const LAST_READ_NOTIFICATION_KEY = "notificationsLastReadAt"
/* ---------------------- NOTIFICATION DATA TYPE ---------------------- */
interface NotificationData {
  type?: string
  subject?: string
  heading?: string
  title?: string
  description?: string
  message?: string
  order_id?: string
  first_name?: string
  last_name?: string
  currency_symbol?: string
  total?: number
  items?: any[]
  product_title?: string
  variant_sku?: string
  variant_title?: string
  current_quantity?: number
  stocked_quantity?: number
  reserved_quantity?: number
  available_quantity?: number
  threshold?: number
  product_link?: string
  inventory_item_id?: string
  inventory_id?: string
  variant_id?: string
  product_id?: string
  location_id?: string
  location_name?: string
  alert_level?: string
  status?: string
  notification_type?: string
  resource_type?: string
  resource_id?: string
  store_name?: string
  // Restock subscription fields
  email?: string
  customer_id?: string
  // Return notification fields
  return_id?: string
  return_status?: string
  items_count?: number
  order_display_id?: string
  customer_name?: string
  file?: {
    url?: string
    filename?: string
  } | null
}
/* ---------------------- NOTIFICATION PROPS ------------------------ */
interface NotificationProps {
  notification: HttpTypes.AdminNotification
  unread: boolean
  onClose?: () => void
}
/* ---------------------------- MAIN UI ----------------------------- */
export const Notifications = () => {
  const [open, setOpen] = useState(false)
  const [hasUnread, setHasUnread] = useUnreadNotifications()
  /* NEW: Get unread count */
  const unreadCount = useUnreadNotificationsCount()
  const [lastReadAt, setLastReadAt] = useState(
    localStorage.getItem(LAST_READ_NOTIFICATION_KEY)
  )
  const queryClient = useQueryClient()
  const previousOpenRef = useRef(false)
  
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])
  
  // Refetch notifications when drawer opens
  useEffect(() => {
    if (open && !previousOpenRef.current) {
      // Drawer just opened - invalidate and refetch notifications
      queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.all,
      })
    }
    previousOpenRef.current = open
  }, [open, queryClient])
  
  const handleOnOpen = (shouldOpen: boolean) => {
    if (shouldOpen) {
      setHasUnread(false)
      setOpen(true)
      localStorage.setItem(LAST_READ_NOTIFICATION_KEY, new Date().toISOString())
    } else {
      setOpen(false)
      setLastReadAt(localStorage.getItem(LAST_READ_NOTIFICATION_KEY))
    }
  }
  return (
    <Drawer open={open} onOpenChange={handleOnOpen}>
      <Drawer.Trigger asChild>
        <div className="relative">
          <IconButton
            variant="transparent"
            size="small"
            className="text-ui-fg-muted hover:text-ui-fg-subtle"
          >
            {hasUnread ? <BellAlertDone /> : <BellAlert />}
          </IconButton>
          {/* ---------- NEW BADGE ---------- */}
          {unreadCount > 0 && (
            <div
              className="
                absolute -top-1 -right-1
                h-4 min-w-4 px-1
                bg-blue-600
                text-white
                text-[10px]
                flex items-center justify-center
                rounded-full
                font-semibold
              "
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </div>
          )}
        </div>
      </Drawer.Trigger>
      <Drawer.Content 
        className="!z-[110]" 
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        overlayProps={{
          className: "!z-[105]",
          onClick: (e) => e.stopPropagation(),
        }}
      >
        <Drawer.Header>
          <Drawer.Title asChild>
            <Heading>Notifications</Heading>
          </Drawer.Title>
        </Drawer.Header>
        <Drawer.Body 
          className="overflow-y-auto px-0"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <InfiniteList<
            HttpTypes.AdminNotificationListResponse,
            HttpTypes.AdminNotification,
            HttpTypes.AdminNotificationListParams
          >
            responseKey="notifications"
            queryKey={notificationQueryKeys.all}
            pageSize={30}
            queryFn={async (_params) => {
              try {
                // Always fetch only the latest 30 notifications, ignoring pagination
                const result = await sdk.admin.notification.list({
                  limit: 30,
                  offset: 0, // Always start from the beginning to get latest 30
                })
                
                
                // Debug: Log all notifications to see what's being returned
                if (result?.notifications) {
                } else {
                  console.warn('[Notifications Drawer] No notifications array in response:', result)
                }
                
                // Modify response to prevent further pagination
                // This ensures getNextPageParam returns undefined after first page
                // Limit to exactly 30 notifications in the bell icon dropdown
                // Filter out payment notifications - only show inventory and order notifications
                if (result) {
                  const notifications = result.notifications || []
                  
                  // Filter out payment notifications - keep only order and inventory notifications
                  const nonPaymentNotifications = notifications.filter((n: HttpTypes.AdminNotification) => {
                    const raw = n.data || {}
                    
                    // Check if it's an order notification (has order_id) - KEEP IT
                    const hasOrderId = !!raw.order_id
                    if (hasOrderId) {
                      return true
                    }
                    
                    // Check if it's an inventory notification - KEEP IT
                    const isInventoryNotification = 
                      raw.notification_type === "inventory_low_stock" ||
                      raw.status === "LOW_STOCK" ||
                      !!raw.inventory_id ||
                      !!raw.inventory_item_id ||
                      !!raw.product_title ||
                      !!raw.variant_id ||
                      !!raw.product_id
                    
                    if (isInventoryNotification) {
                      return true
                    }
                    
                    // Check if it's a restock subscription notification - KEEP IT
                    const isRestockSubscription = 
                      raw.notification_type === "restock_subscription" ||
                      (!!raw.email && raw.variant_id)
                    
                    if (isRestockSubscription) {
                      return true
                    }
                    
                    // Check if it's a return notification - KEEP IT
                    // Primary check: return_id (most reliable, set by our subscriber)
                    // Secondary checks: notification_type and resource_type (also set by our subscriber)
                    const isReturnNotification = 
                      !!raw.return_id ||
                      raw.notification_type === "return_requested" ||
                      raw.notification_type === "return_received" ||
                      raw.resource_type === "return"
                    
                    if (isReturnNotification) {
                      return true
                    }
                    
                    // Check if it's a payment notification - EXCLUDE IT
                    const resourceType = (n as any).resource_type || raw.resource_type
                    const notificationType = raw.notification_type
                    const template = (n as any).template
                    
                    const isPaymentNotification = 
                      resourceType === 'payment' ||
                      notificationType === 'payment_received' ||
                      notificationType === 'payment_failed' ||
                      notificationType === 'payout_processed' ||
                      template === 'payment-received' ||
                      template === 'payment-failed' ||
                      template === 'payout-processed'
                    
                    // Exclude payment notifications
                    if (isPaymentNotification) {
                      return false
                    }
                    
                    // Keep all other notifications
                    return true
                  })
                  
                  const limitedNotifications = nonPaymentNotifications.slice(0, 30)
                  
                  // Set count to the limited number to prevent pagination beyond 30
                  // This makes the pagination logic think there are no more pages
                  return {
                    ...result,
                    notifications: limitedNotifications,
                    count: limitedNotifications.length, // Use actual limited count to stop pagination
                    limit: 30,
                    offset: 0,
                  }
                }
                
                console.warn('[Notifications Drawer] No result from API, returning empty array')
                return { notifications: [], count: 0, limit: 30, offset: 0 }
              } catch (error) {
                console.error('[Notifications Drawer] Error fetching notifications:', error)
                return { notifications: [], count: 0, limit: 30, offset: 0 }
              }
            }}
            queryOptions={{ 
              enabled: open,
              refetchOnMount: true,
              refetchOnWindowFocus: false,
              staleTime: 0, // Always consider data stale so it refetches when drawer opens
            }}
            renderEmpty={() => <NotificationsEmptyState />}
            renderItem={(notification) => {
              // Guard against undefined/null notifications
              if (!notification) {
                return null
              }
              
              return (
                <Notification
                  key={notification.id}
                  notification={notification}
                  unread={
                    Date.parse(notification.created_at) >
                    (lastReadAt ? Date.parse(lastReadAt) : 0)
                  }
                  onClose={() => setOpen(false)}
                />
              )
            }}
          />
        </Drawer.Body>
        <div className="border-t border-ui-border-base bg-ui-bg-base px-6 py-4">
          <Link to="/notifications" onClick={() => setOpen(false)}>
            <Button
              variant="secondary"
              size="small"
              className="w-full"
            >
              View All Notifications
            </Button>
          </Link>
        </div>
      </Drawer.Content>
    </Drawer>
  )
}
/* ---------------------- FORMAT NOTIFICATION TITLE ------------------------ */
const truncateOrderId = (id: string) => {
  if (!id) return ""
  if (id.length <= 10) return id
  return `${id.slice(0, 6)}..${id.slice(-4)}`
}
const getNotificationTitle = (raw: NotificationData) => {
  // ------------------ Return notifications (check FIRST before order notifications) ------------------
  // Primary check: return_id (most reliable, set by our subscriber)
  // Secondary checks: notification_type and resource_type (also set by our subscriber)
  if (
    !!raw.return_id ||
    raw.notification_type === "return_requested" ||
    raw.notification_type === "return_received" ||
    raw.resource_type === "return"
  ) {
    // Use title from notification data if available
    if (raw.title) {
      return raw.title
    }
    
    // Use description if available
    if (raw.description) {
      return raw.description
    }
    
    // Generate title from available data
    const orderDisplayId = raw.order_display_id || (raw.order_id ? truncateOrderId(raw.order_id) : "Order")
    const orderId = `Order #${orderDisplayId}`
    
    if (raw.notification_type === "return_requested") {
      return `${orderId} is request to return`
    }
    
    if (raw.notification_type === "return_received") {
      return `Return request completed`
    }
    
    // Fallback
    return `Return Notification · ${orderId}`
  }
  
  // ------------------ Order notifications ------------------
  if (raw.order_id) {
    const truncated = truncateOrderId(raw.order_id)
    const orderId = `Order #${truncated}`
    const subject = (raw.subject || "").toLowerCase()
    if (subject.includes("delivered")) return `${orderId} has been delivered.`
    if (subject.includes("shipped")) return `${orderId} has been shipped.`
    if (subject.includes("confirmed")) return `${orderId} has been confirmed.`
    if (subject.includes("canceled") || subject.includes("cancelled"))
      return `${orderId} has been canceled.`
    if (subject.includes("returned")) return `${orderId} has been returned.`
    if (subject.includes("payment received"))
      return `Payment received for ${orderId}.`
    if (subject.includes("payment failed"))
      return `Payment failed for ${orderId}.`
    return raw.subject || "Order Notification"
  }
  
  // ------------------ Inventory notifications ------------------
  // Check by notification_type or by presence of inventory-related fields
  if (
    raw.notification_type === "inventory_low_stock" ||
    raw.status === "LOW_STOCK" ||
    raw.product_title ||
    raw.variant_sku ||
    raw.inventory_item_id ||
    raw.inventory_id
  ) {
    const subject = (raw.subject || "").toLowerCase()
    const productName = raw.product_title || "Product"
    const sku = raw.variant_sku ? ` (SKU: ${raw.variant_sku})` : ""
    
    // Use available_quantity if present, otherwise current_quantity
    const quantity = raw.available_quantity !== undefined 
      ? raw.available_quantity 
      : raw.current_quantity !== undefined 
        ? raw.current_quantity 
        : null
    const threshold = raw.threshold !== undefined ? raw.threshold : null

    // Check for out of stock
    if (subject.includes("out of stock") || subject.includes("out-of-stock") || quantity === 0) {
      return `Out of Stock: ${productName}${sku}`
    }
    
    // Check for low stock - use API subject if available, otherwise generate
    if (subject.includes("low stock") || subject.includes("low-stock") || raw.notification_type === "inventory_low_stock") {
      // If API provides a subject, use it (may include product name)
      if (raw.subject && raw.subject.includes(productName)) {
        return raw.subject
      }
      // Otherwise generate our own
      const thresholdText = threshold !== null ? ` (Threshold: ${threshold})` : ""
      const quantityText = quantity !== null ? ` - ${quantity} remaining` : ""
      return `Low Stock Alert: ${productName}${sku}${quantityText}${thresholdText}`
    }
    
    // Generic inventory notification
    if (quantity !== null) {
      return `Inventory Alert: ${productName}${sku} - ${quantity} available`
    }
    
    // Fallback to API provided subject or heading
    return raw.subject || raw.heading || `Inventory Notification: ${productName}${sku}`
  }
  
  // ------------------ Restock subscription notifications ------------------
  if (
    raw.notification_type === "restock_subscription" ||
    raw.email
  ) {
    const productName = raw.product_title || "Product"
    const variantName = raw.variant_title || ""
    const email = raw.email || "Customer"
    const sku = raw.variant_sku ? ` (SKU: ${raw.variant_sku})` : ""
    
    if (raw.subject && raw.subject.includes(email)) {
      return raw.subject
    }
    
    const variantText = variantName ? ` (${variantName})` : ""
    return `Customer ${email} subscribed to restock notifications for ${productName}${variantText}${sku}`
  }
  
  // Use heading or subject if available, otherwise generic
  return raw.heading || raw.subject || raw.message || "Notification"
}
/* ---------------------- NOTIFICATION ITEM UI ------------------------ */
const Notification = ({ notification, unread, onClose }: NotificationProps) => {
  // Guard against missing notification or data
  if (!notification) {
    return null
  }

  const navigate = useNavigate()
  const raw: NotificationData = notification.data || {}
  const title = getNotificationTitle(raw)

  // Determine if this is an inventory notification
  const isInventoryNotification = 
    raw.notification_type === "inventory_low_stock" ||
    raw.status === "LOW_STOCK" ||
    !!raw.inventory_id ||
    !!raw.inventory_item_id ||
    (!!raw.product_title && !raw.email && raw.notification_type !== "restock_subscription")
  
  // Determine if this is a restock subscription notification
  const isRestockSubscription = 
    raw.notification_type === "restock_subscription" ||
    (!!raw.email && raw.variant_id && !raw.order_id)
  
  // Determine if this is a return notification
  // Primary check: return_id (most reliable, set by our subscriber)
  // Secondary checks: notification_type and resource_type (also set by our subscriber)
  const isReturnNotification = 
    !!raw.return_id ||
    raw.notification_type === "return_requested" ||
    raw.notification_type === "return_received" ||
    raw.resource_type === "return"
  
  // Get alert level for styling
  const alertLevel = raw.alert_level?.toLowerCase() || (raw.available_quantity !== undefined && raw.threshold !== undefined && raw.available_quantity <= raw.threshold / 2 ? "critical" : "warning")
  const isCritical = alertLevel === "critical"
  
  const goToItem = () => {
    // Close the drawer first
    if (onClose) {
      onClose()
    }
    
    if (raw.order_id) {
      navigate(`/orders/${raw.order_id}`)
    } else if (isReturnNotification && raw.order_id) {
      // Navigate to order page for return notifications
      navigate(`/orders/${raw.order_id}`)
    } else if (isRestockSubscription) {
      // Navigate to product page for restock subscription
      if (raw.variant_id) {
        // Try to navigate to variant management page
        navigate(`/products/${raw.product_id}/variants/${raw.variant_id}`)
      } else if (raw.product_id) {
        navigate(`/products/${raw.product_id}`)
      } else if (raw.product_link) {
        const link = raw.product_link.replace(/\/admin\/products\//, '/products/')
        navigate(link)
      }
    } else if (isInventoryNotification) {
      // For inventory notifications (low stock), prioritize inventory page over storefront links
      if (raw.inventory_item_id || raw.inventory_id) {
        // Support both inventory_item_id and inventory_id - go directly to inventory page
        const inventoryId = raw.inventory_item_id || raw.inventory_id
        navigate(`/inventory/${inventoryId}`)
      } else if (raw.variant_id && raw.product_id) {
        // If we have variant_id, try to navigate to variant page which has inventory section
        navigate(`/products/${raw.product_id}/variants/${raw.variant_id}`)
      } else if (raw.product_id) {
        // Fallback to product page if no inventory ID available
        navigate(`/products/${raw.product_id}`)
      } else if (raw.product_title || raw.variant_sku || raw.variant_id) {
        // Navigate to inventory list page for inventory notifications
        navigate(`/inventory`)
      }
    } else if (raw.inventory_item_id || raw.inventory_id) {
      // Support both inventory_item_id and inventory_id for other notification types
      const inventoryId = raw.inventory_item_id || raw.inventory_id
      navigate(`/inventory/${inventoryId}`)
    } else if (raw.product_link) {
      // Try to convert storefront/admin URL to app URL if needed (for non-inventory notifications)
      const link = raw.product_link.replace(/\/admin\/products\//, '/products/')
      navigate(link)
    } else if (raw.product_id) {
      navigate(`/products/${raw.product_id}`)
    } else if (raw.product_title || raw.variant_sku || raw.variant_id) {
      // Navigate to inventory list page
      navigate(`/inventory`)
    }
  }
  
  return (
    <div
      className={clx(
        "relative flex items-start justify-center gap-3 border-b p-6 cursor-pointer hover:bg-ui-bg-subtle-hover transition-colors",
        {
          "bg-orange-50/50 border-orange-200": isInventoryNotification && isCritical,
          "bg-yellow-50/50 border-yellow-200": isInventoryNotification && !isCritical,
          "bg-blue-50/50 border-blue-200": isRestockSubscription,
          "bg-purple-50/50 border-purple-200": isReturnNotification && raw.notification_type === "return_requested",
          "bg-green-50/50 border-green-200": isReturnNotification && raw.notification_type === "return_received",
        }
      )}
      onClick={goToItem}
    >
      <div className={clx("flex size-5 items-center justify-center shrink-0", {
        "text-orange-600": isInventoryNotification && isCritical,
        "text-yellow-600": isInventoryNotification && !isCritical,
        "text-blue-600": isRestockSubscription,
        "text-purple-600": isReturnNotification && raw.notification_type === "return_requested",
        "text-green-600": isReturnNotification && raw.notification_type === "return_received",
        "text-ui-fg-muted": !isInventoryNotification && !isRestockSubscription && !isReturnNotification,
      })}>
        <InformationCircleSolid />
      </div>
      <div className="flex w-full flex-col gap-y-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <Text
              size="small"
              leading="compact"
              weight="plus"
              className={clx("cursor-pointer hover:underline truncate max-w-[70%]", {
                "text-orange-700": isInventoryNotification && isCritical,
                "text-yellow-700": isInventoryNotification && !isCritical,
                "text-blue-700": isRestockSubscription,
                "text-purple-700": isReturnNotification && raw.notification_type === "return_requested",
                "text-green-700": isReturnNotification && raw.notification_type === "return_received",
                "text-ui-fg-interactive": !isInventoryNotification && !isRestockSubscription && !isReturnNotification,
              })}
            >
              {title}
            </Text>
            <div className="align-center flex items-center gap-2 shrink-0">
              <Text
                as="span"
                className={clx("text-ui-fg-subtle truncate max-w-[110px]", {
                  "text-ui-fg-base": unread,
                })}
                size="small"
                leading="compact"
                weight="plus"
              >
                {formatDistance(notification.created_at, new Date(), {
                  addSuffix: true,
                })}
              </Text>
              {unread && <div className="bg-ui-bg-interactive h-2 w-2 rounded" />}
            </div>
          </div>
          
          {/* Show message if available and different from title */}
          {raw.message && raw.message !== title && (
            <Text
              size="xsmall"
              leading="compact"
              className="text-ui-fg-subtle"
            >
              {raw.message}
            </Text>
          )}
          
          {/* Show inventory details for inventory notifications */}
          {isInventoryNotification && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              {raw.location_name && (
                <Text
                  size="xsmall"
                  leading="compact"
                  className="text-ui-fg-muted"
                >
                  📍 {raw.location_name}
                </Text>
              )}
              {raw.available_quantity !== undefined && (
                <Text
                  size="xsmall"
                  leading="compact"
                  className={clx({
                    "text-orange-600 font-medium": isCritical,
                    "text-yellow-600 font-medium": !isCritical,
                    "text-ui-fg-muted": !isInventoryNotification,
                  })}
                >
                  Available: {raw.available_quantity}
                  {raw.threshold !== undefined && ` / ${raw.threshold}`}
                </Text>
              )}
              {raw.stocked_quantity !== undefined && raw.reserved_quantity !== undefined && (
                <Text
                  size="xsmall"
                  leading="compact"
                  className="text-ui-fg-muted"
                >
                  Stocked: {raw.stocked_quantity} | Reserved: {raw.reserved_quantity}
                </Text>
              )}
            </div>
          )}
          
          {/* Show restock subscription details */}
          {isRestockSubscription && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              {raw.email && (
                <Text
                  size="xsmall"
                  leading="compact"
                  className="text-ui-fg-muted"
                >
                  📧 {raw.email}
                </Text>
              )}
              {raw.variant_sku && (
                <Text
                  size="xsmall"
                  leading="compact"
                  className="text-ui-fg-muted"
                >
                  SKU: {raw.variant_sku}
                </Text>
              )}
              {raw.variant_title && (
                <Text
                  size="xsmall"
                  leading="compact"
                  className="text-ui-fg-muted"
                >
                  Variant: {raw.variant_title}
                </Text>
              )}
            </div>
          )}
          
          {/* Show return notification details */}
          {isReturnNotification && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              {raw.customer_name && (
                <Text
                  size="xsmall"
                  leading="compact"
                  className="text-ui-fg-muted"
                >
                  👤 {raw.customer_name}
                </Text>
              )}
              {raw.items_count !== undefined && (
                <Text
                  size="xsmall"
                  leading="compact"
                  className="text-ui-fg-muted"
                >
                  📦 {raw.items_count} {raw.items_count === 1 ? "item" : "items"}
                </Text>
              )}
              {raw.order_display_id && (
                <Text
                  size="xsmall"
                  leading="compact"
                  className="text-ui-fg-muted"
                >
                  Order #{raw.order_display_id}
                </Text>
              )}
            </div>
          )}
        </div>
        {raw.file?.url && (
          <FilePreview
            filename={raw.file.filename ?? ""}
            url={raw.file.url}
            hideThumbnail
          />
        )}
      </div>
    </div>
  )
}
/* ---------------------- EMPTY STATE ------------------------ */
const NotificationsEmptyState = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center z-20">
      <BellAlertDone />
      <Text size="small" leading="compact" weight="plus" className="mt-3">
        No notifications yet
      </Text>

      <Text
        size="small"
        className="text-ui-fg-muted mt-1 max-w-[294px] text-center"
      >
        All caught up! New alerts will appear here.
      </Text>
    </div>
  )
}
/* ---------------------- UNREAD LOGIC ------------------------ */
const useUnreadNotifications = () => {
  const [hasUnread, setHasUnread] = useState(false)

  const { notifications } = useNotifications(
    { limit: 1, offset: 0, fields: "created_at" },
    { refetchInterval: 60000 }
  )

  const lastNotificationCreatedAt = notifications?.[0]?.created_at
  useEffect(() => {
    if (!lastNotificationCreatedAt) return
    const lastNotificationTimestamp = Date.parse(lastNotificationCreatedAt)
    const lastRead = localStorage.getItem(LAST_READ_NOTIFICATION_KEY)
    const lastReadTimestamp = lastRead ? Date.parse(lastRead) : 0
    setHasUnread(lastNotificationTimestamp > lastReadTimestamp)
  }, [lastNotificationCreatedAt])
  return [hasUnread, setHasUnread] as const
}
/* ---------------------- UNREAD COUNT HOOK ------------------------ */
const useUnreadNotificationsCount = () => {
  const [count, setCount] = useState(0)
  const { notifications } = useNotifications(
    { limit: 30 }, // Changed from 50 to 30
    { refetchInterval: 60000 }
  )
  useEffect(() => {
    const lastRead = localStorage.getItem(LAST_READ_NOTIFICATION_KEY)
    const lastReadTimestamp = lastRead ? Date.parse(lastRead) : 0
    const unread = notifications?.filter(
      (n) => Date.parse(n.created_at) > lastReadTimestamp
    )
    setCount(unread?.length || 0)
  }, [notifications])
  return count
}