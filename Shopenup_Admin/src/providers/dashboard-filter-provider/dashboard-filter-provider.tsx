import { PropsWithChildren, useCallback, useMemo, useState, useEffect } from "react"
import { DashboardFilterContext, Filters, DateRangePreset, DashboardTab } from "./dashboard-filter-context"

// Helper function to get current date/time in IST (India Standard Time - UTC+5:30)
const getISTDate = (): Date => {
  return new Date()
}

// Helper function to get start of day in IST (00:00:00 IST)
// Creates a date representing midnight IST for the given date
const getStartOfDayIST = (date: Date): Date => {
  // Get the date components in IST
  const istString = date.toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  
  // Parse the IST date string and create date at midnight IST
  const [datePart] = istString.split(", ")
  const [month, day, year] = datePart.split("/")
  const istDate = new Date(`${year}-${month}-${day}T00:00:00+05:30`)
  return istDate
}

// Helper function to get end of day in IST (23:59:59.999 IST)
// Creates a date representing end of day IST for the given date
const getEndOfDayIST = (date: Date): Date => {
  // Get the date components in IST
  const istString = date.toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  
  // Parse the IST date string and create date at end of day IST
  const [datePart] = istString.split(", ")
  const [month, day, year] = datePart.split("/")
  const istDate = new Date(`${year}-${month}-${day}T23:59:59.999+05:30`)
  return istDate
}

// Calculate previous date range based on selectedDateRange preset
const calculatePreviousDateRange = (
  selectedDateRange: DateRangePreset,
  currentDateRange: { from: Date; to: Date }
): { from: Date; to: Date } => {
  const istNow = getISTDate()
  const today = getStartOfDayIST(istNow)

  switch (selectedDateRange) {
    case "today": {
      // Previous: yesterday
      const yesterdayIST = new Date(today)
      yesterdayIST.setDate(yesterdayIST.getDate() - 1)
      return {
        from: getStartOfDayIST(yesterdayIST),
        to: getEndOfDayIST(yesterdayIST),
      }
    }
    case "Day": {
      // Previous: the day before yesterday (2 days ago)
      const twoDaysAgoIST = new Date(today)
      twoDaysAgoIST.setDate(twoDaysAgoIST.getDate() - 2)
      return {
        from: getStartOfDayIST(twoDaysAgoIST),
        to: getEndOfDayIST(twoDaysAgoIST),
      }
    }
    case "Week": {
      // Current week: Monday to today
      // Previous: Last week (Monday to Sunday of last week)
      const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1
      
      // Last Monday (1 week before current week's Monday)
      const lastMondayIST = new Date(today)
      lastMondayIST.setDate(today.getDate() - daysFromMonday - 7)
      const startOfLastWeek = getStartOfDayIST(lastMondayIST)
      
      // Last Sunday (end of last week)
      const lastSundayIST = new Date(lastMondayIST)
      lastSundayIST.setDate(lastMondayIST.getDate() + 6)
      const endOfLastWeek = getEndOfDayIST(lastSundayIST)
      
      return {
        from: startOfLastWeek,
        to: endOfLastWeek,
      }
    }
    case "Month": {
      // Current month: 1st of current month to today
      // Previous: Last month (1st to last day of previous month)
      const firstOfCurrentMonth = new Date(today)
      firstOfCurrentMonth.setDate(1)
      
      // First day of previous month
      const firstOfLastMonth = new Date(firstOfCurrentMonth)
      firstOfLastMonth.setMonth(firstOfCurrentMonth.getMonth() - 1)
      const startOfLastMonth = getStartOfDayIST(firstOfLastMonth)
      
      // Last day of previous month (1 day before current month starts)
      const lastDayOfLastMonth = new Date(firstOfCurrentMonth)
      lastDayOfLastMonth.setDate(0) // Sets to last day of previous month
      const endOfLastMonth = getEndOfDayIST(lastDayOfLastMonth)
      
      return {
        from: startOfLastMonth,
        to: endOfLastMonth,
      }
    }
    case "Quarter": {
      // Current quarter: Start of current quarter to today
      // Previous: Last quarter (start to end of previous quarter)
      const currentMonth = today.getMonth()
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3
      
      // Start of current quarter
      const currentQuarterStart = new Date(today)
      currentQuarterStart.setMonth(quarterStartMonth, 1)
      
      // Start of previous quarter (3 months before current quarter)
      const previousQuarterStart = new Date(currentQuarterStart)
      previousQuarterStart.setMonth(quarterStartMonth - 3, 1)
      const startOfLastQuarter = getStartOfDayIST(previousQuarterStart)
      
      // End of previous quarter (1 day before current quarter starts)
      const lastDayOfLastQuarter = new Date(currentQuarterStart)
      lastDayOfLastQuarter.setDate(0)
      const endOfLastQuarter = getEndOfDayIST(lastDayOfLastQuarter)
      
      return {
        from: startOfLastQuarter,
        to: endOfLastQuarter,
      }
    }
    case "Year": {
      // Current year: January 1st to today
      // Previous: Last year (January 1st to December 31st of previous year)
      const currentYear = today.getFullYear()
      
      // January 1st of last year
      const firstOfLastYear = new Date(currentYear - 1, 0, 1)
      const startOfLastYear = getStartOfDayIST(firstOfLastYear)
      
      // December 31st of last year
      const lastDayOfLastYear = new Date(currentYear, 0, 0) // Day 0 of current year = Dec 31 of previous year
      const endOfLastYear = getEndOfDayIST(lastDayOfLastYear)
      
      return {
        from: startOfLastYear,
        to: endOfLastYear,
      }
    }
    case "custom":
    default: {
      // For custom, calculate based on the duration of current range
      const duration = currentDateRange.to.getTime() - currentDateRange.from.getTime()
      const previousTo = new Date(currentDateRange.from.getTime() - 86400000) // 1 day before current from
      const previousFrom = new Date(previousTo.getTime() - duration) // Same duration before previousTo
      return {
        from: getStartOfDayIST(previousFrom),
        to: getEndOfDayIST(previousTo),
      }
    }
  }
}

// Default filter values - set to "Month" range in IST
const getDefaultFilters = (): Filters => {
  const istNow = getISTDate()
  const today = getStartOfDayIST(istNow)
  const endOfToday = getEndOfDayIST(istNow)
  
  // Current month: 1st of current month to today in IST
  const firstOfMonthIST = new Date(today)
  firstOfMonthIST.setDate(1) // Set to 1st of current month
  const startOfMonth = getStartOfDayIST(firstOfMonthIST)

  return {
    dateRange: {
      from: startOfMonth,
      to: endOfToday,
    },
    selectedDateRange: "Month",
    region: "in", // Default to India
    state: "", // Default to "All States"
    comparisonMode: false,
  }
}

export const DashboardFilterProvider = ({
  children,
}: PropsWithChildren) => {
  const [filters, setFiltersState] = useState<Filters>(getDefaultFilters())
  const [activeTab, setActiveTab] = useState<DashboardTab>("kpis")

  const setFilters = useCallback(
    (
      newFilters: Partial<Filters> | ((prev: Filters) => Filters)
    ) => {
      setFiltersState((prev) => {
        let updated: Filters
        if (typeof newFilters === "function") {
          updated = newFilters(prev)
        } else {
          updated = { ...prev, ...newFilters }
        }

        // Calculate previousDateRange if comparisonMode is true
        if (updated.comparisonMode) {
          updated.previousDateRange = calculatePreviousDateRange(
            updated.selectedDateRange,
            updated.dateRange
          )
        } else {
          // Remove previousDateRange if comparisonMode is false
          const { previousDateRange, ...rest } = updated
          updated = rest as Filters
        }

        return updated
      })
    },
    []
  )

  // Recalculate previousDateRange when dateRange, selectedDateRange, or comparisonMode changes
  useEffect(() => {
    if (filters.comparisonMode) {
      const previousRange = calculatePreviousDateRange(
        filters.selectedDateRange,
        filters.dateRange
      )
      
      setFiltersState((prev) => {
        // Only update if the calculated range is different
        if (
          !prev.previousDateRange ||
          prev.previousDateRange.from.getTime() !== previousRange.from.getTime() ||
          prev.previousDateRange.to.getTime() !== previousRange.to.getTime()
        ) {
          return { ...prev, previousDateRange: previousRange }
        }
        return prev
      })
    }
  }, [filters.dateRange, filters.selectedDateRange, filters.comparisonMode])

  const resetFilters = useCallback(() => {
    setFiltersState(getDefaultFilters())
  }, [])

  const contextValue = useMemo(
    () => ({
      filters,
      setFilters,
      resetFilters,
      activeTab,
      setActiveTab,
    }),
    [filters, setFilters, resetFilters, activeTab]
  )

  return (
    <DashboardFilterContext.Provider value={contextValue}>
      {children}
    </DashboardFilterContext.Provider>
  )
}

