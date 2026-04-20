import { useDashboardOrdersSummary } from '../../../../../hooks/api/getOrderStats'
import { useDashboardFilters } from '../hooks/use-dashboard-filters'
import { useCategoryData } from '../hooks/use-chart-data'
import { CategoryRevenueChart } from '../charts/category-revenue-chart'
import { LoadingState } from '../components/loading-state'
import { ErrorState } from '../components/error-state'

export function CategoryRevenueChartSection() {
  const apiFilters = useDashboardFilters(false)
  const { data, isLoading, error } = useDashboardOrdersSummary(apiFilters)
  const categories = useCategoryData(data)

  if (isLoading) {
    return <LoadingState message="Loading category revenue data..." variant="chart" />
  }

  if (error) {
    return <ErrorState message={error.message || 'Failed to load category revenue data'} />
  }

  // Always render the chart component - it will show empty state if no data
  return <CategoryRevenueChart categories={categories} />
}

