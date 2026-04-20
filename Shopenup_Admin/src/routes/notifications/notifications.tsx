/**
 * NOTIFICATIONS PAGE
 * 
 * Uses EXACT SAME filtering logic as the drawer (bell icon)
 * Fetches ALL notifications instead of just 30
 */

import {
  BellAlertDone,
  InformationCircleSolid,
} from "@shopenup/icons"
import { HttpTypes } from "@shopenup/types"
import { clx, Heading, Text, Select, Label } from "@shopenup/ui"
import { formatDistance } from "date-fns"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { sdk } from "../../lib/client"

const LAST_READ_NOTIFICATION_KEY = "notificationsLastReadAt"

type NotificationFilter = "all" | "order" | "payment" | "inventory"

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
  email?: string
  customer_id?: string
  // Return notification fields
  return_id?: string
  return_status?: string
  items_count?: number
  order_display_id?: string
  customer_name?: string
  [key: string]: any
}

export const NotificationsPage = () => {
  const [lastReadAt, setLastReadAt] = useState(
    localStorage.getItem(LAST_READ_NOTIFICATION_KEY)
  )
  const [filter, setFilter] = useState<NotificationFilter>("all")

  useEffect(() => {
    const currentTime = new Date().toISOString()
    localStorage.setItem(LAST_READ_NOTIFICATION_KEY, currentTime)
    setLastReadAt(currentTime)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const result = await sdk.admin.notification.list({
        limit: 1000, // Fetch 1000 notifications (all of them)
        offset: 0,
      })
      
      
      return result
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  })

  // EXACT SAME FILTERING AS DRAWER (lines 195-248)
  const allNotifications = data?.notifications || []
  const filteredNotifications = allNotifications.filter((n: HttpTypes.AdminNotification) => {
    const raw = n.data || {}
    
    // Check if it's a payment notification
    const resourceType = (n as any).resource_type || raw.resource_type
    const notificationType = raw.notification_type
    const template = (n as any).template
    const subject = ((raw as any).subject || "").toLowerCase()
    
    const isPaymentNotification = 
      resourceType === 'payment' ||
      notificationType === 'payment_received' ||
      notificationType === 'payment_failed' ||
      notificationType === 'payment_captured' ||
      notificationType === 'payment_refunded' ||
      notificationType === 'payout_processed' ||
      template === 'payment-received' ||
      template === 'payment-failed' ||
      template === 'payment-captured' ||
      template === 'payment-refunded' ||
      template === 'payout-processed' ||
      subject.includes('payment received') ||
      subject.includes('payment failed') ||
      subject.includes('payment captured') ||
      subject.includes('payment refunded')
    
    // If payment filter is selected, only show payment notifications
    if (filter === 'payment') {
      return isPaymentNotification
    }
    
    // Check if it's an order notification (has order_id)
    const hasOrderId = !!raw.order_id
    
    // Check if it's an inventory notification
    const isInventoryNotification = 
      raw.notification_type === "inventory_low_stock" ||
      raw.status === "LOW_STOCK" ||
      !!raw.inventory_id ||
      !!raw.inventory_item_id ||
      !!raw.product_title ||
      !!raw.variant_id ||
      !!raw.product_id
    
    // Check if it's a restock subscription notification
    const isRestockSubscription = 
      raw.notification_type === "restock_subscription" ||
      (!!raw.email && raw.variant_id)
    
    // Check if it's a return notification
    // Primary check: return_id (most reliable, set by our subscriber)
    // Secondary checks: notification_type and resource_type (also set by our subscriber)
    const isReturnNotification = 
      !!raw.return_id ||
      raw.notification_type === "return_requested" ||
      raw.notification_type === "return_received" ||
      raw.resource_type === "return"
    
    // For inventory filter, show inventory and restock subscription notifications
    if (filter === 'inventory') {
      return isInventoryNotification || isRestockSubscription
    }
    
    // For order filter, show order notifications (excluding payment) and return notifications
    if (filter === 'order') {
      return (hasOrderId && !isPaymentNotification) || isReturnNotification
    }
    
    // For "all" filter, show everything
    if (filter === 'all') {
      return true
    }
    
    return false
  })


  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-ui-border-base bg-ui-bg-base px-6 py-4">
        <div className="flex items-center justify-between">
          <Heading level="h1">Notifications</Heading>
          <div className="flex items-center gap-2">
            <Label htmlFor="notification-filter" size="small" className="text-ui-fg-subtle">
              Filter:
            </Label>
            <Select
              value={filter}
              onValueChange={(value) => setFilter(value as NotificationFilter)}
            >
              <Select.Trigger 
                id="notification-filter" 
                className="min-w-[100px] w-auto max-w-[220px]"
              >
                <Select.Value placeholder="Select filter" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="all">All</Select.Item>
                <Select.Item value="order">Order</Select.Item>
                <Select.Item value="payment">Payment</Select.Item>
                <Select.Item value="inventory">Inventory</Select.Item>
              </Select.Content>
            </Select>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredNotifications.length > 0 ? (
          <div>
            {filteredNotifications.map((notification) => (
              <Notification
                key={notification.id}
                notification={notification}
                unread={
                  Date.parse(notification.created_at) >
                  (lastReadAt ? Date.parse(lastReadAt) : 0)
                }
              />
            ))}
          </div>
        ) : (
          <NotificationsEmptyState />
        )}
      </div>
    </div>
  )
}

/* ---------------------- FORMAT NOTIFICATION TITLE (EXACT COPY FROM DRAWER) ------------------------ */
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
    
    // Check subject for order status
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
    
    // Check notification_type for order events
    if (raw.notification_type === 'order_placed') return `New Order Placed - ${orderId}`
    if (raw.notification_type === 'order_shipped') return `${orderId} Shipped`
    if (raw.notification_type === 'order_delivered') return `${orderId} Delivered`
    if (raw.notification_type === 'order_confirmed') return `${orderId} Confirmed`
    if (raw.notification_type === 'order_cancelled') return `${orderId} Cancelled`
    
    // Check for payment notifications with order_id
    if (raw.notification_type === 'payment_captured') return `Payment Captured - ${orderId}`
    if (raw.notification_type === 'payment_refunded') return `Payment Refunded - ${orderId}`
    
    // Use subject if available and not generic
    if (raw.subject && raw.subject !== "Order Notification" && raw.subject !== "Notification") {
      return raw.subject
    }
    
    // Default fallback with order ID
    return `${orderId} - Update`
  }
  
  // ------------------ Inventory notifications ------------------
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
    
    const quantity = raw.available_quantity !== undefined 
      ? raw.available_quantity 
      : raw.current_quantity !== undefined 
        ? raw.current_quantity 
        : null
    const threshold = raw.threshold !== undefined ? raw.threshold : null

    if (subject.includes("out of stock") || subject.includes("out-of-stock") || quantity === 0) {
      return `Out of Stock: ${productName}${sku}`
    }
    
    if (subject.includes("low stock") || subject.includes("low-stock") || raw.notification_type === "inventory_low_stock") {
      if (raw.subject && raw.subject.includes(productName)) {
        return raw.subject
      }
      const thresholdText = threshold !== null ? ` (Threshold: ${threshold})` : ""
      const quantityText = quantity !== null ? ` - ${quantity} remaining` : ""
      return `Low Stock Alert: ${productName}${sku}${quantityText}${thresholdText}`
    }
    
    if (quantity !== null) {
      return `Inventory Alert: ${productName}${sku} - ${quantity} available`
    }
    
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
  
  return raw.heading || raw.subject || raw.message || "Notification"
}

/* ---------------------- NOTIFICATION ITEM UI (EXACT COPY FROM DRAWER) ------------------------ */
const Notification = ({ notification, unread }: { notification: HttpTypes.AdminNotification, unread: boolean }) => {
  if (!notification) {
    return null
  }

  const navigate = useNavigate()
  const raw: NotificationData = notification.data || {}
  const title = getNotificationTitle(raw)

  const isInventoryNotification = 
    raw.notification_type === "inventory_low_stock" ||
    raw.status === "LOW_STOCK" ||
    !!raw.inventory_id ||
    !!raw.inventory_item_id ||
    (!!raw.product_title && !raw.email && raw.notification_type !== "restock_subscription")
  
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
  
  const alertLevel = raw.alert_level?.toLowerCase() || (raw.available_quantity !== undefined && raw.threshold !== undefined && raw.available_quantity <= raw.threshold / 2 ? "critical" : "warning")
  const isCritical = alertLevel === "critical"
  
  const goToItem = () => {
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
      </div>
    </div>
  )
}

const NotificationsEmptyState = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center py-12">
      <BellAlertDone />
      <Text size="small" leading="compact" weight="plus" className="mt-3">
        No notifications yet
      </Text>
      <Text size="small" className="text-ui-fg-muted mt-1 max-w-[294px] text-center">
        All caught up! New alerts will appear here.
      </Text>
    </div>
  )
}
