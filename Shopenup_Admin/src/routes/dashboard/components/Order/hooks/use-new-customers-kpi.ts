import { useMemo } from 'react'
import type { OrderSummaryResponse } from '../../../../../hooks/api/getOrderStats'
import type { KPIData, DashboardSummaryType } from '../types'

/**
 * Type guard to check if summary is in comparison mode
 */
function isComparisonMode(
  summary: DashboardSummaryType
): summary is {
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
} {
  return (
    typeof summary === 'object' &&
    summary !== null &&
    'orders' in summary &&
    typeof summary.orders === 'object' &&
    summary.orders !== null &&
    'current' in summary.orders &&
    'previous' in summary.orders
  )
}

/**
 * Calculate percentage delta between current and previous values
 */
function calculateDelta(current: number, previous: number): number | undefined {
  if (current === 0 && previous === 0) return 0
  if (previous === 0) return undefined
  return ((current - previous) / previous) * 100
}

/**
 * Format comparison string for display
 */
function formatComparison(previous: number, delta: number | undefined): string {
  if (delta === undefined) {
    return `vs previous period ${Math.round(previous).toLocaleString()} ( +0.0% )`
  }
  const sign = delta >= 0 ? '+' : ''
  return `vs previous period ${Math.round(previous).toLocaleString()} ( ${sign}${delta.toFixed(1)}% )`
}

/**
 * Hook to get New Customers KPI data
 */
export function useNewCustomersKPI(data: OrderSummaryResponse | undefined): KPIData | null {
  return useMemo(() => {
    if (!data) {
      return null
    }

    const responseData = 'data' in data ? data.data : data

    if (!responseData || !responseData.summary) {
      return null
    }

    const summary = responseData.summary

    if (isComparisonMode(summary)) {
      // Comparison mode - calculate deltas
      return {
        title: 'New Customers',
        value: summary.new_customers.current,
        delta: calculateDelta(
          summary.new_customers.current,
          summary.new_customers.previous
        ),
        deltaDirection:
          summary.new_customers.current >= summary.new_customers.previous
            ? 'up'
            : 'down',
        comparison: formatComparison(
          summary.new_customers.previous,
          calculateDelta(
            summary.new_customers.current,
            summary.new_customers.previous
          )
        ),
      }
    } else {
      // Normal mode - just show value
      return {
        title: 'New Customers',
        value: summary.new_customers,
      }
    }
  }, [data])
}

