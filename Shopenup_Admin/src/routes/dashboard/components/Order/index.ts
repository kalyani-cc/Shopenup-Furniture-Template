// Sections (components that handle data fetching and state)
export { OrderKPIsSection } from './sections/order-kpis-section'
export { NewCustomersKPI } from './sections/new-customers-kpi'
export { OrderStatusChartSection } from './sections/order-status-chart-section'
export { CategoryRevenueChartSection } from './sections/category-revenue-chart-section'
export { SalesTrendChartSection } from './sections/sales-trend-chart-section'

// Charts (pure presentation components)
export { CategoryRevenueChart } from './charts/category-revenue-chart'
export { OrderStatusChart } from './charts/order-status-chart'
export { SalesTrendChart } from './charts/sales-trend-chart'

// KPI Components
export { KPIBox } from './kpi-box'
export { DeltaArrow } from './kpi-box/delta-arrow'
export type { KPIBoxProps, DeltaDirection } from './kpi-box/types'

// Types
export type {
  KPIData,
  CategoryData,
  ChartData,
  StatusData,
  DashboardSummaryType,
} from './types'
