import type { DashboardSummary, DashboardSummaryComparison } from '../../../../hooks/api/getOrderStats'

export type KPIData = {
  title: string
  value: number
  prefix?: string
  suffix?: string
  delta?: number | string
  deltaDirection?: 'up' | 'down' | 'flat'
  comparison?: string
}

export type CategoryData = {
  id: string
  name: string
  revenue: number
  quantity: number
}

export type ChartData = {
  label: string
  sales: number
  orders: number
}

export type StatusData = {
  name: string
  value: number
  count: number
  percentage: number
  color: string
}

export type DashboardSummaryType = DashboardSummary | DashboardSummaryComparison

