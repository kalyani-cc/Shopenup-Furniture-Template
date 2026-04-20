import { useDashboardOrdersSummary } from '../../../../../hooks/api/getOrderStats'
import { useDashboardFilters } from '../hooks/use-dashboard-filters'
import { useNewCustomersKPI } from '../hooks/use-new-customers-kpi'
import { KPIBox } from '../kpi-box'
import { ErrorState } from '../components/error-state'

export function NewCustomersKPI() {
  const apiFilters = useDashboardFilters(true)
  const { data, isLoading, error } = useDashboardOrdersSummary(apiFilters)
  const kpi = useNewCustomersKPI(data)

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-100 rounded-md p-5 shadow-sm">
        <div className="text-sm font-medium text-indigo-800">New Customers</div>
        <div className="mt-3 text-sm text-gray-500">Loading...</div>
      </div>
    )
  }

  if (error) {
    return <ErrorState message={error.message || 'Failed to load new customers data'} />
  }

  if (!data || !kpi) {
    return null
  }

  return (
    <KPIBox
      title={kpi.title}
      value={kpi.value}
      prefix={kpi.prefix}
      suffix={kpi.suffix}
      delta={kpi.delta}
      deltaDirection={kpi.deltaDirection}
      comparison={kpi.comparison}
    />
  )
}

