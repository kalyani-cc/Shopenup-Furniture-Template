import { FetchError } from "@shopenup/js-sdk"
import { QueryKey, UseQueryOptions, useQuery } from "@tanstack/react-query"
import { backendUrl } from "../../lib/client/client"
import { queryKeysFactory } from "../../lib/query-key-factory"

const DASHBOARD_QUERY_KEY = "dashboard" as const
export const dashboardQueryKeys = queryKeysFactory(DASHBOARD_QUERY_KEY)

export type DashboardFilters = {
  dateRange: { from: string; to: string }
  previousDateRange?: { from: string; to: string }
  comparisonMode?: boolean | string
  region?: string
  state?: string
}

export type DashboardSummary = {
  sales: number
  orders: number
  total_pending: number
  total_shipping: number
  total_delivered: number
  total_canceled: number
  total_returned: number
  average_order_value: number
  total_customers: number
  new_customers: number
  returns: number
}

export type DashboardSummaryComparison = {
  sales: { current: number; previous: number }
  orders: { current: number; previous: number }
  total_pending: { current: number; previous: number }
  total_shipping: { current: number; previous: number }
  total_delivered: { current: number; previous: number }
  total_canceled: { current: number; previous: number }
  total_returned: { current: number; previous: number }
  average_order_value: { current: number; previous: number }
  total_customers: { current: number; previous: number }
  new_customers: { current: number; previous: number }
  returns: { current: number; previous: number }
}

export type OrderSummaryResponse =
  | {
      data: {
        range: {
          start: string
          end: string
        }
        grouping: string
        chart: Array<{
          label: string
          sales: number
          orders: number
        }>
        summary: DashboardSummary
        top_selling_categories: Array<{
          id: string
          name: string
          revenue: number
          quantity: number
        }>
      }
    }
  | {
      data: {
        range: {
          start: string
          end: string
        }
        grouping: string
        chart: Array<{
          label: string
          sales: number
          orders: number
        }>
        summary: DashboardSummaryComparison
        top_selling_categories: Array<{
          id: string
          name: string
          revenue: number
          quantity: number
        }>
      }
    }

export const useDashboardOrdersSummary = (
  filters: DashboardFilters,
  options?: Omit<
    UseQueryOptions<OrderSummaryResponse, FetchError, OrderSummaryResponse, QueryKey>,
    "queryFn" | "queryKey"
  >
) => {
  return useQuery({
    queryKey: dashboardQueryKeys.detail("orders-summary", filters),
    queryFn: async () => {
      // Build query params - handle nested objects properly
      const queryParams = new URLSearchParams()
      
      if (filters.dateRange) {
        queryParams.append("dateRange[from]", filters.dateRange.from)
        queryParams.append("dateRange[to]", filters.dateRange.to)
      }
      
      if (filters.previousDateRange) {
        queryParams.append("previousDateRange[from]", filters.previousDateRange.from)
        queryParams.append("previousDateRange[to]", filters.previousDateRange.to)
      }
      
      if (filters.comparisonMode !== undefined) {
        queryParams.append("comparisonMode", String(filters.comparisonMode))
      }
      
      if (filters.region) {
        queryParams.append("region", filters.region)
      }
      
      if (filters.state) {
        queryParams.append("state", filters.state)
      }

      const response = await fetch(`${backendUrl}/admin/order?${queryParams.toString()}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Dashboard API error: ${response.statusText}`)
      }

      const responseData = await response.json()
      
      // Handle both wrapped and unwrapped responses
      // If response already has 'data' property, return as is
      // Otherwise, wrap it
      if ('data' in responseData) {
        return responseData as OrderSummaryResponse
      }
      
      // If response is the data object directly, wrap it
      return { data: responseData } as OrderSummaryResponse
    },
    ...options,
  })
}
