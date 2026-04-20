import { useMutation, UseMutationOptions } from "@tanstack/react-query"

import { queryKeysFactory } from "../../lib/query-key-factory"

import { HttpTypes } from "@shopenup/types"
import { sdk } from "../../lib/client"
import { queryClient } from "../../lib/query-client"
import { ordersQueryKeys } from "./orders"
import { FetchError } from "@shopenup/js-sdk"
import { adminFetch } from "../../lib/fetch"

const FULFILLMENTS_QUERY_KEY = "fulfillments" as const
export const fulfillmentsQueryKeys = queryKeysFactory(FULFILLMENTS_QUERY_KEY)

// Shiprocket Fulfillment Data Type
export interface ShiprocketFulfillmentData {
  awb_code?: string
  shiprocket_order_id?: number
  shiprocket_shipment_id?: number
  last_status?: string
  last_status_at?: string
  current_status_id?: number
  courier_name?: string
  courier_id?: number
  tracking_url?: string
  label_url?: string
  manifest_url?: string
  scans?: Array<{
    date: string
    activity: string
    location: string
  }>
  packed_at?: string
  shipped_at?: string
  delivered_at?: string
  awb_assigned_at?: string
  pickup_status?: string
  pickup_token_number?: string
  pickup_scheduled_date?: string
  pickup_requested_at?: string
  manifest_id?: string
  manifest_generated_at?: string
  invoice_no?: string
  routing_code?: string
  rto_routing_code?: string
  applied_weight?: number
  packed?: boolean
  shiprocket_tracking_url?: string
  shiprocket_label_url?: string
}

export const useCreateFulfillment = (
  options?: UseMutationOptions<any, FetchError, any>
) => {
  return useMutation({
    mutationFn: (payload: any) => sdk.admin.fulfillment.create(payload),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({ queryKey: fulfillmentsQueryKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.all,
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useCancelFulfillment = (
  id: string,
  options?: UseMutationOptions<any, FetchError, any>
) => {
  return useMutation({
    mutationFn: () => sdk.admin.fulfillment.cancel(id),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({ queryKey: fulfillmentsQueryKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.all,
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useCreateFulfillmentShipment = (
  fulfillmentId: string,
  options?: UseMutationOptions<
    { fulfillment: HttpTypes.AdminFulfillment },
    FetchError,
    HttpTypes.AdminCreateFulfillmentShipment
  >
) => {
  return useMutation({
    mutationFn: (payload: HttpTypes.AdminCreateFulfillmentShipment) =>
      sdk.admin.fulfillment.createShipment(fulfillmentId, payload),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.all,
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/**
 * Mark fulfillment as packed
 */
export const useMarkFulfillmentAsPacked = (
  orderId: string,
  fulfillmentId: string,
  options?: UseMutationOptions<
    { success: boolean; fulfillment_id: string },
    Error,
    void
  >
) => {
  return useMutation({
    mutationFn: () =>
      adminFetch<{ success: boolean; fulfillment_id: string }>(
        `/admin/fulfillments/${fulfillmentId}/shiprocket/mark-packed`,
        {
          method: "POST",
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.detail(orderId),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/**
 * Request Shiprocket pickup
 */
export const useRequestShiprocketPickup = (
  orderId: string,
  fulfillmentId: string,
  options?: UseMutationOptions<
    { success: boolean; fulfillment_id: string; pickup_requested_at: string },
    Error,
    void
  >
) => {
  return useMutation({
    mutationFn: () =>
      adminFetch<{ success: boolean; fulfillment_id: string; pickup_requested_at: string }>(
        `/admin/fulfillments/${fulfillmentId}/shiprocket/request-pickup`,
        {
          method: "POST",
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.detail(orderId),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/**
 * Generate Shiprocket manifest
 */
export const useGenerateShiprocketManifest = (
  orderId: string,
  fulfillmentId: string,
  options?: UseMutationOptions<
    { success: boolean; fulfillment_id: string; manifest_id: string; manifest_url: string },
    Error,
    void
  >
) => {
  return useMutation({
    mutationFn: () =>
      adminFetch<{ success: boolean; fulfillment_id: string; manifest_id: string; manifest_url: string }>(
        `/admin/fulfillments/${fulfillmentId}/shiprocket/generate-manifest`,
        {
          method: "POST",
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.detail(orderId),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/**
 * Download shipping label (trigger download)
 */
export const useDownloadShiprocketLabel = (
  _orderId: string,
  fulfillmentId: string,
  options?: UseMutationOptions<
    { success: boolean; label_url: string; awb_code: string },
    Error,
    void
  >
) => {
  return useMutation({
    mutationFn: () =>
      adminFetch<{ success: boolean; label_url: string; awb_code: string }>(
        `/admin/fulfillments/${fulfillmentId}/shiprocket/download-label`
      ),
    onSuccess: (data, variables, context) => {
      // Open label in new tab
      // if (data.label_url) {
      //   window.open(data.label_url, "_blank")
      // }
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/**
 * Mark fulfillment as shipped
 * Used by admin manually or by Shiprocket webhook when package is picked up
 * 
 * Calls: POST /admin/orders/:orderId/fulfillments/:fulfillmentId/shipments
 */
export const useMarkFulfillmentAsShipped = (
  orderId: string,
  fulfillmentId: string,
  options?: UseMutationOptions<
    { success: boolean; fulfillment_id: string; order_id: string; shipped_at: string; tracking_status?: string },
    Error,
    { items?: Array<{ id: string; quantity: number }>; labels?: string[]; no_notification?: boolean; tracking_status?: string; tracking_location?: string } | void
  >
) => {
  return useMutation({
    mutationFn: (payload?: { items?: Array<{ id: string; quantity: number }>; labels?: string[]; no_notification?: boolean; tracking_status?: string; tracking_location?: string }) =>
      adminFetch<{ success: boolean; fulfillment_id: string; order_id: string; shipped_at: string; tracking_status?: string }>(
        `/admin/orders/${orderId}/fulfillments/${fulfillmentId}/shipments`,
        { 
          method: "POST",
          body: JSON.stringify({
            items: payload?.items || [],
            labels: payload?.labels || [],
            no_notification: payload?.no_notification || false,
            ...(payload?.tracking_status && { tracking_status: payload.tracking_status }),
            ...(payload?.tracking_location && { tracking_location: payload.tracking_location }),
          }),
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.detail(orderId),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/**
 * Mark fulfillment as delivered
 * Used by admin manually or by Shiprocket webhook when package is delivered
 * 
 * Calls: POST /admin/orders/:orderId/fulfillments/:fulfillmentId/mark-as-delivered
 */
export function useMarkFulfillmentAsDelivered(
  orderId: string,
  fulfillmentId: string,
  options?: UseMutationOptions<
    { success: boolean; fulfillment_id: string; order_id: string; delivered_at: string; tracking_status?: string },
    Error,
    { tracking_status?: string; tracking_location?: string; delivered_to?: string } | void
  >
) {
  return useMutation({
    mutationFn: (payload?: { tracking_status?: string; tracking_location?: string; delivered_to?: string }) =>
      adminFetch<{ success: boolean; fulfillment_id: string; order_id: string; delivered_at: string; tracking_status?: string }>(
        `/admin/orders/${orderId}/fulfillments/${fulfillmentId}/mark-as-delivered`,
        { 
          method: "POST",
          body: JSON.stringify(payload || {}),
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.detail(orderId),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
