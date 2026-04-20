import { useContext } from "react"
import { DashboardFilterContext } from "./dashboard-filter-context"

export const useDashboardFilter = () => {
  const context = useContext(DashboardFilterContext)
  if (!context) {
    throw new Error(
      "useDashboardFilter must be used within a DashboardFilterProvider"
    )
  }
  return context
}

