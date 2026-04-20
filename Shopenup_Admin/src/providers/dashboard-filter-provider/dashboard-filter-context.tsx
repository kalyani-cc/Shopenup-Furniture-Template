import { createContext } from "react"

export type DateRangePreset =
  | "today"
  | "Day"
  | "Week"
  | "Month"
  | "Quarter"
  | "Year"
  | "custom"

export type Filters = {
  dateRange: { from: Date; to: Date }
  selectedDateRange: DateRangePreset
  region: string
  state: string
  comparisonMode: boolean
  previousDateRange?: { from: Date; to: Date }
}

export type DashboardTab = "kpis" | "charts" | "statistics"

type DashboardFilterContextValue = {
  filters: Filters
  setFilters: (filters: Partial<Filters> | ((prev: Filters) => Filters)) => void
  resetFilters: () => void
  activeTab: DashboardTab
  setActiveTab: (tab: DashboardTab) => void
}

export const DashboardFilterContext =
  createContext<DashboardFilterContextValue | null>(null)

