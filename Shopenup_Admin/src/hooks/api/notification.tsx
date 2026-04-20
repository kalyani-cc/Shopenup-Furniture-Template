import { QueryKey, UseQueryOptions, useQuery } from "@tanstack/react-query"

import { HttpTypes } from "@shopenup/types"
import { sdk } from "../../lib/client"
import { queryKeysFactory } from "../../lib/query-key-factory"
import { queryClient } from "../../lib/query-client"
import { FetchError } from "@shopenup/js-sdk"

const NOTIFICATION_QUERY_KEY = "notification" as const
export const notificationQueryKeys = queryKeysFactory(NOTIFICATION_QUERY_KEY)

/**
 * Helper function to invalidate all notification queries
 * Use this after actions that should trigger notification updates
 * (e.g., order placement, inventory updates, payment captures)
 * 
 * @param delayMs Optional delay in milliseconds before invalidating (default: 500ms)
 *                This gives the backend time to create notifications
 */
export const invalidateNotificationQueries = (delayMs: number = 500) => {
  if (delayMs > 0) {
    setTimeout(() => {
      // Invalidate regular notifications
      queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.all,
      })
      
      // Invalidate payment notifications
     
    }, delayMs)
  } else {
    // Immediate invalidation
    queryClient.invalidateQueries({
      queryKey: notificationQueryKeys.all,
    })
    
   
  }
}

export const useNotification = (
  id: string,
  query?: Record<string, any>,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminNotificationResponse,
      FetchError,
      HttpTypes.AdminNotificationResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: notificationQueryKeys.detail(id),
    queryFn: async () => sdk.admin.notification.retrieve(id, query),
    ...options,
  })

  return { ...data, ...rest }
}

export const useNotifications = (
  query?: HttpTypes.AdminNotificationListParams,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminNotificationListResponse,
      FetchError,
      HttpTypes.AdminNotificationListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: () => sdk.admin.notification.list(query),
    queryKey: notificationQueryKeys.list(query),
    ...options,
  })

  return { ...data, ...rest }
}
