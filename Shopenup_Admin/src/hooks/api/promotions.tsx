import { HttpTypes } from "@shopenup/types"
import { FetchError } from "@shopenup/js-sdk"
import {
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
} from "@tanstack/react-query"
import { sdk, backendUrl } from "../../lib/client"
import { queryClient } from "../../lib/query-client"
import { queryKeysFactory } from "../../lib/query-key-factory"
import { campaignsQueryKeys } from "./campaigns"

const PROMOTIONS_QUERY_KEY = "promotions" as const
export const promotionsQueryKeys = {
  ...queryKeysFactory(PROMOTIONS_QUERY_KEY),
  // TODO: handle invalidations properly
  listRules: (
    id: string | null,
    ruleType: string,
    query?: HttpTypes.AdminGetPromotionRuleParams
  ) => [PROMOTIONS_QUERY_KEY, id, ruleType, query],
  listRuleAttributes: (ruleType: string, promotionType?: string) => [
    PROMOTIONS_QUERY_KEY,
    ruleType,
    promotionType,
  ],
  listRuleValues: (
    ruleType: string,
    ruleValue: string,
    query: HttpTypes.AdminGetPromotionsRuleValueParams
  ) => [PROMOTIONS_QUERY_KEY, ruleType, ruleValue, query],
}

// Dashboard filter format matching CustomPromotionFilters
export type DashboardPromotionFilters = {
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

// Helper function to prepare dashboard filters for custom API
const prepareDashboardFiltersForAPI = (
  dashboardFilters?: DashboardPromotionFilters
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

// Helper function to call custom promotions API endpoint (GET)
async function fetchCustomPromotions(filters: any): Promise<{
  discountUsageImpact?: {
    percentage: number
    totalRevenue: number
    revenueWithDiscounts: number
    totalDiscountAmount: number
  }
  topPerformingPromoCodes?: Array<{
    code: string
    orders: number
    revenue: number
    avgDiscount: number
    totalDiscount: number
    promotionId?: string
  }>
  count: number
  offset: number
  limit: number
  filters: any
  comparison?: {
    previousPeriod: {
      discountUsageImpact?: {
        percentage: number
        totalRevenue: number
        revenueWithDiscounts: number
        totalDiscountAmount: number
      }
      topPerformingPromoCodes?: Array<{
        code: string
        orders: number
        revenue: number
        avgDiscount: number
        totalDiscount: number
        promotionId?: string
      }>
    }
    previousDateRange: {
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

  const url = `${backendUrl.replace(/\/$/, "")}/admin/custom/promotions?${queryParams.toString()}`

  const response = await fetch(url, {
    method: "GET",
    credentials: "include", // Include session cookies for authentication
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }))
    const error: any = new Error(errorData.message || `Failed to fetch promotions: ${response.statusText}`)
    error.status = response.status
    throw error
  }

  const data = await response.json()
  
  // Backend returns: { discountUsageImpact, topPerformingPromoCodes, count, offset, limit, filters, comparison }
  // Ensure response has the expected structure with proper defaults
  const result = {
    discountUsageImpact: data.discountUsageImpact || undefined,
    topPerformingPromoCodes: Array.isArray(data.topPerformingPromoCodes) ? data.topPerformingPromoCodes : [],
    count: data.count !== undefined ? data.count : 0,
    offset: data.offset !== undefined ? data.offset : 0,
    limit: data.limit !== undefined ? data.limit : 0,
    filters: data.filters || {},
    comparison: data.comparison || undefined,
  }
  
  return result
}

export const usePromotion = (
  id: string,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminPromotionResponse,
      FetchError,
      HttpTypes.AdminPromotionResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.detail(id),
    queryFn: async () => sdk.admin.promotion.retrieve(id),
    ...options,
  })

  return { ...data, ...rest }
}

export const usePromotionRules = (
  id: string | null,
  ruleType: string,
  query?: HttpTypes.AdminGetPromotionRuleParams,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminPromotionRuleListResponse,
      FetchError,
      HttpTypes.AdminPromotionRuleListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.listRules(id, ruleType, query),
    queryFn: async () => sdk.admin.promotion.listRules(id, ruleType, query),
    ...options,
  })

  return { ...data, ...rest }
}

export const usePromotions = (
  query?: HttpTypes.AdminGetPromotionsParams | DashboardPromotionFilters,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminGetPromotionsParams | DashboardPromotionFilters,
      FetchError,
      HttpTypes.AdminPromotionListResponse | { 
        discountUsageImpact?: {
          percentage: number
          totalRevenue: number
          revenueWithDiscounts: number
          totalDiscountAmount: number
        }
        topPerformingPromoCodes?: Array<{
          code: string
          orders: number
          revenue: number
          avgDiscount: number
          totalDiscount: number
          promotionId?: string
        }>
        count: number
        offset: number
        limit: number
        filters: any
        comparison?: {
          previousPeriod: {
            discountUsageImpact?: {
              percentage: number
              totalRevenue: number
              revenueWithDiscounts: number
              totalDiscountAmount: number
            }
            topPerformingPromoCodes?: Array<{
              code: string
              orders: number
              revenue: number
              avgDiscount: number
              totalDiscount: number
              promotionId?: string
            }>
          }
          previousDateRange: {
            from: string
            to: string
          }
        }
      },
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
        const apiPayload = prepareDashboardFiltersForAPI(query as DashboardPromotionFilters)
        return fetchCustomPromotions(apiPayload)
      } else {
        // Use standard SDK method for regular filters
        return sdk.admin.promotion.list(query as HttpTypes.AdminGetPromotionsParams)
      }
    },
    queryKey: promotionsQueryKeys.list(query),
    ...options,
  })

  // Return data as-is (custom API returns different structure than standard API)
  return { ...data, ...rest }
}

export const usePromotionRuleAttributes = (
  ruleType: string,
  promotionType?: string,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminRuleAttributeOptionsListResponse,
      FetchError,
      HttpTypes.AdminRuleAttributeOptionsListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.listRuleAttributes(ruleType, promotionType),
    queryFn: async () =>
      sdk.admin.promotion.listRuleAttributes(ruleType, promotionType),
    ...options,
  })

  return { ...data, ...rest }
}

export const usePromotionRuleValues = (
  ruleType: string,
  ruleValue: string,
  query?: HttpTypes.AdminGetPromotionsRuleValueParams,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminRuleValueOptionsListResponse,
      FetchError,
      HttpTypes.AdminRuleValueOptionsListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: promotionsQueryKeys.listRuleValues(
      ruleType,
      ruleValue,
      query || {}
    ),
    queryFn: async () =>
      sdk.admin.promotion.listRuleValues(ruleType, ruleValue, query),
    ...options,
  })

  return { ...data, ...rest }
}

export const useDeletePromotion = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.DeleteResponse<"promotion">,
    FetchError,
    void
  >
) => {
  return useMutation({
    mutationFn: () => sdk.admin.promotion.delete(id),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: promotionsQueryKeys.detail(id),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useCreatePromotion = (
  options?: UseMutationOptions<
    HttpTypes.AdminPromotionResponse,
    FetchError,
    HttpTypes.AdminCreatePromotion
  >
) => {
  return useMutation({
    mutationFn: (payload) => sdk.admin.promotion.create(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: campaignsQueryKeys.lists() })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdatePromotion = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.AdminPromotionResponse,
    FetchError,
    HttpTypes.AdminUpdatePromotion
  >
) => {
  return useMutation({
    mutationFn: (payload) => sdk.admin.promotion.update(id, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.all })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const usePromotionAddRules = (
  id: string,
  ruleType: string,
  options?: UseMutationOptions<
    HttpTypes.AdminPromotionResponse,
    FetchError,
    HttpTypes.BatchAddPromotionRulesReq
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.admin.promotion.addRules(id, ruleType, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.all })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const usePromotionRemoveRules = (
  id: string,
  ruleType: string,
  options?: UseMutationOptions<
    HttpTypes.AdminPromotionResponse,
    FetchError,
    HttpTypes.BatchRemovePromotionRulesReq
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.admin.promotion.removeRules(id, ruleType, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.all })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const usePromotionUpdateRules = (
  id: string,
  ruleType: string,
  options?: UseMutationOptions<
    HttpTypes.AdminPromotionResponse,
    FetchError,
    HttpTypes.BatchUpdatePromotionRulesReq
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.admin.promotion.updateRules(id, ruleType, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: promotionsQueryKeys.all })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
