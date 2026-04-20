import { useMemo } from 'react'
import type { OrderSummaryResponse } from '../../../../../hooks/api/getOrderStats'
import type { CategoryData, ChartData, DashboardSummaryType } from '../types'

/**
 * Extract chart data from API response
 */
export function useChartData(data: OrderSummaryResponse | undefined): ChartData[] {
  return useMemo(() => {
    if (!data) return []

    const responseData = 'data' in data ? data.data : data
    if (responseData && responseData.chart) {
      return responseData.chart
    }
    return []
  }, [data])
}

/**
 * Extract category data from API response
 */
export function useCategoryData(data: OrderSummaryResponse | undefined): CategoryData[] {
  return useMemo(() => {
    if (!data) return []

    const responseData = 'data' in data ? data.data : data
    if (responseData && responseData.top_selling_categories) {
      return responseData.top_selling_categories
    }
    return []
  }, [data])
}

/**
 * Extract summary data from API response
 */
export function useSummaryData(
  data: OrderSummaryResponse | undefined
): DashboardSummaryType | null {
  return useMemo(() => {
    if (!data) return null

    const responseData = 'data' in data ? data.data : data
    if (responseData && responseData.summary) {
      return responseData.summary
    }
    return null
  }, [data])
}

