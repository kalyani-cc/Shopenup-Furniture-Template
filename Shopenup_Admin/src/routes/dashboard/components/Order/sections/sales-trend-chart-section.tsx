import { useDashboardOrdersSummary } from '../../../../../hooks/api/getOrderStats'
import { useDashboardFilters } from '../hooks/use-dashboard-filters'
import { useChartData } from '../hooks/use-chart-data'
import { SalesTrendChart } from '../charts/sales-trend-chart'
import { LoadingState } from '../components/loading-state'
import { ErrorState } from '../components/error-state'

export function SalesTrendChartSection() {
  const apiFilters = useDashboardFilters(false)
  const { data, isLoading, error } = useDashboardOrdersSummary(apiFilters)
  const chartData = useChartData(data)

  if (isLoading) {
    return <LoadingState message="Loading sales trend data..." variant="chart" />
  }

  if (error) {
    return <ErrorState message={error.message || 'Failed to load sales trend data'} />
  }

  if (chartData.length === 0) {
    return null
  }

  return <SalesTrendChart chartData={chartData} />
}

