import { useDashboardOrdersSummary } from '../../../../../hooks/api/getOrderStats'
import { useDashboardFilters } from '../hooks/use-dashboard-filters'
import { useKPIData } from '../hooks/use-kpi-data'
import { KPIBox } from '../kpi-box'
import { LoadingState } from '../components/loading-state'
import { ErrorState } from '../components/error-state'

export function OrderKPIsSection() {
  const apiFilters = useDashboardFilters(true)
  const { data, isLoading, error } = useDashboardOrdersSummary(apiFilters)
  const kpis = useKPIData(data)

  if (isLoading) {
    const kpiTitles = ['Total Orders', 'Sales', 'Average Order Value', 'Total Customers']
    return (
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiTitles.map((title, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-md p-5 shadow-sm">
            <div className="text-sm font-medium text-indigo-800">{title}</div>
            <div className="mt-3 text-sm text-gray-500">Loading...</div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return <ErrorState message={error.message || 'Failed to load dashboard data'} />
  }

  if (!data || kpis.length === 0) {
    return null
  }

  // Only show first 4 KPIs (Total Orders, Sales, Average Order Value, Total Customers)
  const firstFourKPIs = kpis.slice(0, 4)

  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {firstFourKPIs.map((kpi, i) => (
        <KPIBox
          key={i}
          title={kpi.title}
          value={kpi.value}
          prefix={kpi.prefix}
          suffix={kpi.suffix}
          delta={kpi.delta}
          deltaDirection={kpi.deltaDirection}
          comparison={kpi.comparison}
        />
      ))}
    </div>
  )
}

