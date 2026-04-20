import { useDashboardOrdersSummary } from '../../../../../hooks/api/getOrderStats'
import { useDashboardFilters } from '../hooks/use-dashboard-filters'
import { useSummaryData } from '../hooks/use-chart-data'
import { OrderStatusChart } from '../charts/order-status-chart'
import { LoadingState } from '../components/loading-state'
import { ErrorState } from '../components/error-state'

export function OrderStatusChartSection() {
  const apiFilters = useDashboardFilters(false)
  const { data, isLoading, error } = useDashboardOrdersSummary(apiFilters)
  const summary = useSummaryData(data)

  if (isLoading) {
    return <LoadingState message="Loading order status distribution..." variant="chart" />
  }

  if (error) {
    return <ErrorState message={error.message || 'Failed to load order status data'} />
  }

  if (!summary) {
    return null
  }

  return <OrderStatusChart summary={summary} />
}

