import { HttpTypes } from "@shopenup/types"
import {
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
} from "@tanstack/react-query"

import { FetchError } from "@shopenup/js-sdk"
import { sdk, backendUrl } from "../../lib/client"
import { queryClient } from "../../lib/query-client"
import { queryKeysFactory } from "../../lib/query-key-factory"
import { ordersQueryKeys } from "./orders"

const RETURNS_QUERY_KEY = "returns" as const
export const returnsQueryKeys = queryKeysFactory(RETURNS_QUERY_KEY)

// Dashboard filter format matching CustomReturnFilters
export type DashboardReturnFilters = {
  dateRange?: {
    from: Date | string
    to: Date | string
  }
  selectedDateRange?: string
  region?: string
  state?: string
  comparisonMode?: boolean
  limit?: number
  offset?: number
}

export type ShiprocketReturnResponse = {
  success: boolean
  data?: any
  error?: string
  message?: string
}


// Helper function to prepare dashboard filters for custom API
const prepareDashboardFiltersForAPI = (
  dashboardFilters?: DashboardReturnFilters
): any => {
  if (!dashboardFilters) {
    return {}
  }

  const apiPayload: any = {}

  // Convert date range - ensure dates are ISO strings
  if (dashboardFilters.dateRange?.from && dashboardFilters.dateRange?.to) {
    try {
      const fromDate = dashboardFilters.dateRange.from instanceof Date 
        ? dashboardFilters.dateRange.from 
        : new Date(dashboardFilters.dateRange.from)
      const toDate = dashboardFilters.dateRange.to instanceof Date
        ? dashboardFilters.dateRange.to
        : new Date(dashboardFilters.dateRange.to)
      
      // Only add if dates are valid
      if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
        apiPayload.dateRange = {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        }
      }
    } catch (error) {
      // Silently skip invalid date ranges
    }
  }

  // Add other filter properties (only if they have non-empty values)
  if (dashboardFilters.selectedDateRange) {
    apiPayload.selectedDateRange = dashboardFilters.selectedDateRange
  }

  if (dashboardFilters.region && dashboardFilters.region !== "" && dashboardFilters.region.trim() !== "") {
    apiPayload.region = dashboardFilters.region
  }

  if (dashboardFilters.state && dashboardFilters.state !== "" && dashboardFilters.state.trim() !== "") {
    apiPayload.state = dashboardFilters.state
  }

  if (dashboardFilters.comparisonMode !== undefined) {
    apiPayload.comparisonMode = dashboardFilters.comparisonMode
  }

  // Preserve limit, offset if provided
  if (dashboardFilters.limit !== undefined && dashboardFilters.limit > 0) {
    apiPayload.limit = dashboardFilters.limit
  }
  if (dashboardFilters.offset !== undefined && dashboardFilters.offset >= 0) {
    apiPayload.offset = dashboardFilters.offset
  }

  return apiPayload
}

// Helper function to call custom returns API endpoint (GET)
async function fetchCustomReturns(filters: any): Promise<HttpTypes.AdminReturnsResponse & { 
  topReturnReasons?: Array<{ reason: string; count: number }>; 
  shippedOrdersCount?: number;
  comparison?: {
    previousPeriod: {
      returns?: any[]
      count?: number
      topReturnReasons?: Array<{ reason: string; count: number }>
      shippedOrdersCount?: number
    }
    previousDateRange?: {
      from: string
      to: string
    }
  }
}> {
  // Build query parameters from filters
  const queryParams = new URLSearchParams()
  
  // Add dateRange as JSON string if present (backend expects JSON string in query params)
  if (filters.dateRange?.from && filters.dateRange?.to) {
    queryParams.append('dateRange', JSON.stringify(filters.dateRange))
  }
  
  if (filters.selectedDateRange) {
    queryParams.append('selectedDateRange', filters.selectedDateRange)
  }
  
  if (filters.region) {
    queryParams.append('region', filters.region)
  }
  
  if (filters.state) {
    queryParams.append('state', filters.state)
  }
  
  if (filters.comparisonMode !== undefined) {
    queryParams.append('comparisonMode', String(filters.comparisonMode))
  }
  
  if (filters.limit !== undefined) {
    queryParams.append('limit', String(filters.limit))
  }
  
  if (filters.offset !== undefined) {
    queryParams.append('offset', String(filters.offset))
  }

  const url = `${backendUrl.replace(/\/$/, "")}/admin/custom/returns?${queryParams.toString()}`

  const response = await fetch(url, {
    method: "GET",
    credentials: "include", // Include session cookies for authentication
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }))
    const error: any = new Error(errorData.message || `Failed to fetch returns: ${response.statusText}`)
    error.status = response.status
    throw error
  }

  const data = await response.json()
  
  // Backend returns: { returns, count, offset, limit, filters, topReturnReasons, shippedOrdersCount, comparison }
  // Ensure response has the expected structure with proper defaults
  const result: HttpTypes.AdminReturnsResponse & { 
    topReturnReasons?: Array<{ reason: string; count: number }>; 
    shippedOrdersCount?: number;
    comparison?: {
      previousPeriod: {
        returns?: any[]
        count?: number
        topReturnReasons?: Array<{ reason: string; count: number }>
        shippedOrdersCount?: number
      }
      previousDateRange?: {
        from: string
        to: string
      }
    }
  } = {
    returns: Array.isArray(data.returns) ? data.returns : [],
    count: data.count !== undefined ? data.count : (Array.isArray(data.returns) ? data.returns.length : 0),
    offset: data.offset !== undefined ? data.offset : 0,
    limit: data.limit !== undefined ? data.limit : 0,
    // Include topReturnReasons if available (for future use)
    topReturnReasons: Array.isArray(data.topReturnReasons) ? data.topReturnReasons : undefined,
    // Include shippedOrdersCount from API response
    shippedOrdersCount: data.shippedOrdersCount !== undefined ? data.shippedOrdersCount : 0,
    // Include comparison data if available
    comparison: data.comparison || undefined,
  }
  
  return result
}

export const useReturn = (
  id: string,
  query?: Record<string, any>,
  options?: Omit<
    UseQueryOptions<any, FetchError, any, QueryKey>,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () => sdk.admin.return.retrieve(id, query),
    queryKey: returnsQueryKeys.detail(id, query),
    ...options,
  })

  return { ...data, ...rest }
}

export const useReturns = (
  query?: HttpTypes.AdminReturnFilters | DashboardReturnFilters,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminReturnFilters | DashboardReturnFilters,
      FetchError,
      HttpTypes.AdminReturnsResponse | (HttpTypes.AdminReturnsResponse & { 
        topReturnReasons?: Array<{ reason: string; count: number }>; 
        shippedOrdersCount?: number;
        comparison?: {
          previousPeriod: {
            returns?: any[]
            count?: number
            topReturnReasons?: Array<{ reason: string; count: number }>
            shippedOrdersCount?: number
          }
          previousDateRange?: {
            from: string
            to: string
          }
        }
      }),
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  // Check if query is in dashboard filter format (has dateRange property)
  const isDashboardFilter = query && typeof query === 'object' && 'dateRange' in query

  const { data, ...rest } = useQuery({
    queryFn: async () => {
      if (isDashboardFilter) {
        // Use custom API endpoint for dashboard filters
        const apiPayload = prepareDashboardFiltersForAPI(query as DashboardReturnFilters)
        return fetchCustomReturns(apiPayload)
      } else {
        // Use standard SDK method for regular filters
        return sdk.admin.return.list(query as HttpTypes.AdminReturnFilters)
      }
    },
    queryKey: returnsQueryKeys.list(query),
    ...options,
  })

  return { ...data, ...rest }
}

export const useInitiateReturn = (
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminReturnResponse,
    FetchError,
    HttpTypes.AdminInitiateReturnRequest
  >
) => {
  return useMutation({
    mutationFn: (payload: HttpTypes.AdminInitiateReturnRequest) =>
      sdk.admin.return.initiateRequest(payload),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useCancelReturn = (
  id: string,
  orderId: string,
  options?: UseMutationOptions<HttpTypes.AdminReturnResponse, FetchError>
) => {
  return useMutation({
    mutationFn: () => sdk.admin.return.cancel(id),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
        refetchType: "all", // We want preview to be updated in the cache immediately
      })

      queryClient.invalidateQueries({
        queryKey: returnsQueryKeys.details(),
      })
      queryClient.invalidateQueries({
        queryKey: returnsQueryKeys.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/**
 * REQUEST RETURN
 */

export const useConfirmReturnRequest = (
  id: string,
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminReturnResponse,
    FetchError,
    HttpTypes.AdminConfirmReturnRequest
  >
) => {
  return useMutation({
    mutationFn: (payload: HttpTypes.AdminConfirmReturnRequest) =>
      sdk.admin.return.confirmRequest(id, payload),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      })

      queryClient.invalidateQueries({
        queryKey: returnsQueryKeys.details(),
      })
      queryClient.invalidateQueries({
        queryKey: returnsQueryKeys.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useCancelReturnRequest = (
  id: string,
  orderId: string,
  options?: UseMutationOptions<HttpTypes.AdminReturnResponse, FetchError>
) => {
  return useMutation({
    mutationFn: () => sdk.admin.return.cancelRequest(id),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
        refetchType: "all", // We want preview to be updated in the cache immediately
      })

      queryClient.invalidateQueries({
        queryKey: returnsQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: returnsQueryKeys.lists(),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/**
 * Accept return and create return order in Shiprocket
 */
export const useAcceptReturnShiprocket = (
  returnId: string,
  orderId: string,
  options?: UseMutationOptions<
    { success: boolean; shiprocket_return_order_id?: number; data?: any; message?: string; metadata?: any },
    FetchError
  >
) => {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`${backendUrl.replace(/\/$/, "")}/admin/returns/${returnId}/shiprocket/accept`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }))
        const error: any = new Error(errorData.message || `Failed to accept return: ${response.statusText}`)
        error.status = response.status
        throw error
      }

      const result = await response.json()
      
      // Update return metadata using custom endpoint (if backend didn't persist it)
      // The backend should persist it, but we'll also try to update via API as fallback
      if (result.metadata) {
        try {
          // Try to update metadata via custom endpoint
          await fetch(`${backendUrl.replace(/\/$/, "")}/admin/returns/${returnId}/metadata`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              metadata: result.metadata,
            }),
          }).then((response) => {
            if (!response.ok) {
              throw new Error('Failed to update return metadata via API');
            }
            return response.json();
          }).catch((error) => {
            // Silently fail - backend should have already persisted it
            console.warn('Failed to update return metadata via API:', error);
          });
        } catch (error) {
          // Silently fail - backend should have already persisted it
          console.warn('Failed to update return metadata:', error);
        }
      }
      
      return result
    },
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      })

      queryClient.invalidateQueries({
        queryKey: returnsQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: returnsQueryKeys.lists(),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useAddReturnItem = (
  id: string,
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminReturnResponse,
    FetchError,
    HttpTypes.AdminAddReturnItems
  >
) => {
  return useMutation({
    mutationFn: (payload: HttpTypes.AdminAddReturnItems) =>
      sdk.admin.return.addReturnItem(id, payload),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdateReturnItem = (
  id: string,
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminReturnResponse,
    FetchError,
    HttpTypes.AdminUpdateReturnItems & { actionId: string }
  >
) => {
  return useMutation({
    mutationFn: ({
      actionId,
      ...payload
    }: HttpTypes.AdminUpdateReturnItems & { actionId: string }) => {
      return sdk.admin.return.updateReturnItem(id, actionId, payload)
    },
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useRemoveReturnItem = (
  id: string,
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminReturnResponse,
    FetchError,
    string
  >
) => {
  return useMutation({
    mutationFn: (actionId: string) =>
      sdk.admin.return.removeReturnItem(id, actionId),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      })

      queryClient.invalidateQueries({
        queryKey: returnsQueryKeys.details(),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdateReturn = (
  id: string,
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminReturnResponse,
    FetchError,
    HttpTypes.AdminUpdateReturnRequest
  >
) => {
  return useMutation({
    mutationFn: (payload: HttpTypes.AdminUpdateReturnRequest) => {
      return sdk.admin.return.updateRequest(id, payload)
    },
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useAddReturnShipping = (
  id: string,
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminReturnResponse,
    FetchError,
    HttpTypes.AdminAddReturnShipping
  >
) => {
  return useMutation({
    mutationFn: (payload: HttpTypes.AdminAddReturnShipping) =>
      sdk.admin.return.addReturnShipping(id, payload),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdateReturnShipping = (
  id: string,
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminReturnResponse,
    FetchError,
    HttpTypes.AdminAddReturnShipping
  >
) => {
  return useMutation({
    mutationFn: ({
      actionId,
      ...payload
    }: HttpTypes.AdminAddReturnShipping & { actionId: string }) =>
      sdk.admin.return.updateReturnShipping(id, actionId, payload),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDeleteReturnShipping = (
  id: string,
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminReturnResponse,
    FetchError,
    string
  >
) => {
  return useMutation({
    mutationFn: (actionId: string) =>
      sdk.admin.return.deleteReturnShipping(id, actionId),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      })

      queryClient.invalidateQueries({
        queryKey: returnsQueryKeys.details(),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/**
 * RECEIVE RETURN
 */

export const useInitiateReceiveReturn = (
  id: string,
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminReturnResponse,
    FetchError,
    HttpTypes.AdminInitiateReceiveReturn
  >
) => {
  return useMutation({
    mutationFn: (payload: HttpTypes.AdminInitiateReceiveReturn) =>
      sdk.admin.return.initiateReceive(id, payload),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useAddReceiveItems = (
  id: string,
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminReturnResponse,
    FetchError,
    HttpTypes.AdminReceiveItems
  >
) => {
  return useMutation({
    mutationFn: (payload: HttpTypes.AdminReceiveItems) =>
      sdk.admin.return.receiveItems(id, payload),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdateReceiveItem = (
  id: string,
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminReturnResponse,
    FetchError,
    HttpTypes.AdminUpdateReceiveItems & { actionId: string }
  >
) => {
  return useMutation({
    mutationFn: ({
      actionId,
      ...payload
    }: HttpTypes.AdminUpdateReceiveItems & { actionId: string }) => {
      return sdk.admin.return.updateReceiveItem(id, actionId, payload)
    },
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useRemoveReceiveItems = (
  id: string,
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminReturnResponse,
    FetchError,
    string
  >
) => {
  return useMutation({
    mutationFn: (actionId: string) => {
      return sdk.admin.return.removeReceiveItem(id, actionId)
    },
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useAddDismissItems = (
  id: string,
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminReturnResponse,
    FetchError,
    HttpTypes.AdminDismissItems
  >
) => {
  return useMutation({
    mutationFn: (payload: HttpTypes.AdminDismissItems) =>
      sdk.admin.return.dismissItems(id, payload),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdateDismissItem = (
  id: string,
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminReturnResponse,
    FetchError,
    HttpTypes.AdminUpdateDismissItems & { actionId: string }
  >
) => {
  return useMutation({
    mutationFn: ({
      actionId,
      ...payload
    }: HttpTypes.AdminUpdateReceiveItems & { actionId: string }) => {
      return sdk.admin.return.updateDismissItem(id, actionId, payload)
    },
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useRemoveDismissItem = (
  id: string,
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminReturnResponse,
    FetchError,
    string
  >
) => {
  return useMutation({
    mutationFn: (actionId: string) => {
      return sdk.admin.return.removeDismissItem(id, actionId)
    },
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useConfirmReturnReceive = (
  id: string,
  orderId: string,
  options?: UseMutationOptions<
    HttpTypes.AdminReturnResponse,
    FetchError,
    HttpTypes.AdminConfirmReceiveReturn
  >
) => {
  return useMutation({
    mutationFn: (payload: HttpTypes.AdminConfirmReceiveReturn) =>
      sdk.admin.return.confirmReceive(id, payload),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      })

      queryClient.invalidateQueries({
        queryKey: returnsQueryKeys.details(),
      })
      queryClient.invalidateQueries({
        queryKey: returnsQueryKeys.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useCancelReceiveReturn = (
  id: string,
  orderId: string,
  options?: UseMutationOptions<HttpTypes.AdminReturnResponse, FetchError>
) => {
  return useMutation({
    mutationFn: () => sdk.admin.return.cancelReceive(id),
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
        refetchType: "all", // We want preview to be updated in the cache immediately
      })

      queryClient.invalidateQueries({
        queryKey: returnsQueryKeys.details(),
      })
      queryClient.invalidateQueries({
        queryKey: returnsQueryKeys.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useGetShiprocketReturn = (
  returnId?: string,
  options?: UseQueryOptions<ShiprocketReturnResponse, FetchError>
) => {
  return useQuery({
    queryKey: ["shiprocket-return", returnId],
    enabled: !!returnId,
    queryFn: async () => {
      const response = await fetch(
        `${backendUrl.replace(/\/$/, "")}/admin/returns/${returnId}/shiprocket`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: response.statusText }))

        const error: any = new Error(
          errorData.message || `Failed to fetch Shiprocket return`
        )
        error.status = response.status
        throw error
      }


      return response.json()
    },
    ...options,
  })
}