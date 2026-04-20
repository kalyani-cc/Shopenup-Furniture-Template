import { useMemo } from 'react'
import { useDashboardFilter } from '../../../../../providers/dashboard-filter-provider'
import type { DashboardFilters } from '../../../../../hooks/api/getOrderStats'

/**
 * Hook to transform dashboard filter state into API-compatible filters
 */
export function useDashboardFilters(includeComparison: boolean = true): DashboardFilters {
  const { filters } = useDashboardFilter()

  return useMemo(
    () => ({
      dateRange: {
        from: filters.dateRange.from.toISOString(),
        to: filters.dateRange.to.toISOString(),
      },
      previousDateRange: includeComparison && filters.previousDateRange
        ? {
            from: filters.previousDateRange.from.toISOString(),
            to: filters.previousDateRange.to.toISOString(),
          }
        : undefined,
      comparisonMode: includeComparison ? filters.comparisonMode : false,
      region: filters.region || undefined,
      state: filters.state || undefined,
    }),
    [
      filters.dateRange.from,
      filters.dateRange.to,
      filters.previousDateRange?.from,
      filters.previousDateRange?.to,
      filters.comparisonMode,
      filters.region,
      filters.state,
      includeComparison,
    ]
  )
}

