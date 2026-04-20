import { DatePicker, Label, Select, Switch, Button, Text, Tabs, Popover } from "@shopenup/ui"
import { useDashboardFilter } from "../../providers/dashboard-filter-provider"
import { DateRangePreset } from "../../providers/dashboard-filter-provider/dashboard-filter-context"
import { CountrySelect } from "../inputs/country-select/country-select"
import { getCountryProvinceObjectByIso2 } from "../../lib/data/country-states"
import { useMemo, useState, useEffect } from "react"
import { useSidebar } from "../../providers/sidebar-provider"

// Filter Reset Icon Component
const FilterResetIcon = ({ className }: { className?: string }) => (
  <svg
    fill="currentColor"
    viewBox="0 0 32 32"
    className={className}
  >
    <path d="M22.5,9A7.4522,7.4522,0,0,0,16,12.792V8H14v8h8V14H17.6167A5.4941,5.4941,0,1,1,22.5,22H22v2h.5a7.5,7.5,0,0,0,0-15Z" />
    <path d="M26,6H4V9.171l7.4142,7.4143L12,17.171V26h4V24h2v2a2,2,0,0,1-2,2H12a2,2,0,0,1-2-2V18L2.5858,10.5853A2,2,0,0,1,2,9.171V6A2,2,0,0,1,4,4H26Z" />
  </svg>
)

type DatePreset = DateRangePreset

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "Week", label: "Week" },
  { value: "Month", label: "Month" },
  { value: "Quarter", label: "Quarter" },
  { value: "Year", label: "Year" },
  { value: "custom", label: "Custom" },
]

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

// Helper function to get date range for preset (all dates in IST)
const getDateRangeForPreset = (preset: DatePreset): { from: Date; to: Date } => {
  const istNow = getISTDate()
  const today = getStartOfDayIST(istNow)
  const endOfToday = getEndOfDayIST(istNow)

  switch (preset) {
    case "today": {
      return {
        from: today,
        to: endOfToday,
      }
    }
    case "Day": {
      // Yesterday (last completed day) in IST
      const yesterdayIST = new Date(today)
      yesterdayIST.setDate(yesterdayIST.getDate() - 1)
      const yesterday = getStartOfDayIST(yesterdayIST)
      const endOfYesterday = getEndOfDayIST(yesterdayIST)
      return {
        from: yesterday,
        to: endOfYesterday,
      }
    }
    case "Week": {
      // Current week: Monday to today in IST
      const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1 // Convert Sunday (0) to 6
      const mondayIST = new Date(today)
      mondayIST.setDate(today.getDate() - daysFromMonday)
      const startOfWeek = getStartOfDayIST(mondayIST)
      return {
        from: startOfWeek,
        to: endOfToday,
      }
    }
    case "Month": {
      // Current month: 1st of current month to today in IST
      const firstOfMonthIST = new Date(today)
      firstOfMonthIST.setDate(1) // Set to 1st of current month
      const startOfMonth = getStartOfDayIST(firstOfMonthIST)
      return {
        from: startOfMonth,
        to: endOfToday,
      }
    }
    case "Quarter": {
      // Current quarter: Start of current quarter to today in IST
      const currentMonth = today.getMonth() // 0 = January, ..., 11 = December
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3 // 0, 3, 6, or 9
      const quarterStartIST = new Date(today)
      quarterStartIST.setMonth(quarterStartMonth, 1) // Set to 1st day of quarter start month
      const startOfQuarter = getStartOfDayIST(quarterStartIST)
      return {
        from: startOfQuarter,
        to: endOfToday,
      }
    }
    case "Year": {
      // Current year: January 1st to today in IST
      const firstOfYearIST = new Date(today)
      firstOfYearIST.setMonth(0, 1) // Set to January 1st
      const startOfYear = getStartOfDayIST(firstOfYearIST)
      return {
        from: startOfYear,
        to: endOfToday,
      }
    }
    case "custom":
    default:
      // Return current filter values for custom
      return {
        from: today,
        to: endOfToday,
      }
  }
}

interface DashboardFilterBarProps {
  hideFilters?: boolean
}

export const DashboardFilterBar = ({ hideFilters = false }: DashboardFilterBarProps = {}) => {
  const { filters, setFilters, resetFilters, activeTab, setActiveTab } = useDashboardFilter()
  const { mobile: isMobileSidebarOpen } = useSidebar()
  const [datePreset, setDatePreset] = useState<DatePreset>(filters.selectedDateRange || "Month")
  const [dateRangePopoverOpen, setDateRangePopoverOpen] = useState(false)

  // Sync local state with filters.selectedDateRange
  useEffect(() => {
    if (filters.selectedDateRange && filters.selectedDateRange !== datePreset) {
      setDatePreset(filters.selectedDateRange)
    }
  }, [filters.selectedDateRange])

  // Initialize date range on mount if it's the default
  useEffect(() => {
    const monthRange = getDateRangeForPreset("Month")
    const isDefault =
      Math.abs(
        filters.dateRange.from.getTime() - monthRange.from.getTime()
      ) < 60000 &&
      Math.abs(filters.dateRange.to.getTime() - monthRange.to.getTime()) <
        60000

    if (isDefault) {
      setDatePreset("Month")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  // Detect which preset matches current date range
  // When in the first month of a quarter (Jan, Apr, Jul, Oct),
  // both Month and Quarter have the same start date, so we need
  // to respect the user's explicit selection when both match
  const detectDatePreset = useMemo((): DatePreset => {
    const priorityOrder: DatePreset[] = ["today", "Week", "Month", "Quarter", "Year"]
    const matchedPresets: DatePreset[] = []
    
    // First, find all presets that match
    for (const presetValue of priorityOrder) {
      const presetRange = getDateRangeForPreset(presetValue)
      
      const fromMatch =
        Math.abs(
          filters.dateRange.from.getTime() - presetRange.from.getTime()
        ) < 60000 // Within 1 minute (to account for milliseconds)
      const toMatch =
        Math.abs(filters.dateRange.to.getTime() - presetRange.to.getTime()) <
        60000

      if (fromMatch && toMatch) {
        matchedPresets.push(presetValue)
      }
    }

    // If no matches, return custom
    if (matchedPresets.length === 0) {
      return "custom"
    }

    // If the currently selected preset is in the matched list, prefer it
    // This respects the user's explicit selection
    if (matchedPresets.includes(filters.selectedDateRange)) {
      return filters.selectedDateRange
    }

    // If Month and Quarter both match, prefer the currently selected one
    // or default to Month if in first month of quarter
    if (matchedPresets.includes("Month") && matchedPresets.includes("Quarter")) {
      const today = getStartOfDayIST(getISTDate())
      const currentMonth = today.getMonth() // 0 = January, ..., 11 = December
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3 // 0, 3, 6, or 9
      
      // If we're in the first month of the quarter, prefer Month
      // Otherwise, prefer Quarter
      if (currentMonth === quarterStartMonth) {
        return "Month"
      } else {
        return "Quarter"
      }
    }

    // Return the first matched preset (most specific)
    return matchedPresets[0]
  }, [filters.dateRange, filters.selectedDateRange])

  // Update datePreset when filters change externally, but only if:
  // 1. The detected preset is different from current
  // 2. The detected preset matches filters.selectedDateRange (to respect user selection)
  // OR if selectedDateRange doesn't match current date range
  useEffect(() => {
    const detected = detectDatePreset
    // Only update if detection result is different AND it makes sense to update
    // Don't override user's explicit selection if the date range still matches their selection
    if (detected !== datePreset) {
      // If user has explicitly selected a preset, only change if the detected one matches their selection
      // or if their selection no longer matches the date range
      const currentSelectionMatches = filters.selectedDateRange === datePreset
      const detectedMatchesSelection = detected === filters.selectedDateRange
      
      if (detectedMatchesSelection || !currentSelectionMatches) {
        setDatePreset(detected)
      }
    }
  }, [detectDatePreset, datePreset, filters.selectedDateRange])

  const hasActiveFilters = useMemo(() => {
    const monthRange = getDateRangeForPreset("Month")
    const isDefaultDateRange =
      Math.abs(
        filters.dateRange.from.getTime() - monthRange.from.getTime()
      ) < 60000 &&
      Math.abs(filters.dateRange.to.getTime() - monthRange.to.getTime()) <
        60000

    return (
      !isDefaultDateRange ||
      filters.region !== "" ||
      filters.state !== "" ||
      filters.comparisonMode === true
    )
  }, [filters])

  const handleDatePresetChange = (value: string) => {
    const preset = value as DatePreset
    setDatePreset(preset)
    
    if (preset !== "custom") {
      const dateRange = getDateRangeForPreset(preset)
      setFilters({ dateRange, selectedDateRange: preset })
    } else {
      setFilters({ selectedDateRange: preset })
    }
  }

  const handleDateFromChange = (date: Date | null) => {
    if (date) {
      setDatePreset("custom") // Switch to custom when manually changing dates
      
      // Get the "from" date at start of day in IST
      const fromDate = getStartOfDayIST(date)
      
      // Get end of today in IST
      const today = getEndOfDayIST(getISTDate())
      
      // Get the current "to" date
      const currentToDate = filters.dateRange.to
      
      // Calculate the maximum allowed "to" date (90 days from new "from" date)
      const maxAllowedToDate = new Date(fromDate)
      maxAllowedToDate.setDate(maxAllowedToDate.getDate() + 90)
      const maxToDate = maxAllowedToDate > today ? today : getEndOfDayIST(maxAllowedToDate)
      
      // Calculate days difference between new "from" date and current "to" date
      const daysDifference = Math.ceil(
        (currentToDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      // If current "to" date is still valid (within 90 days of new "from" and not in the future),
      // keep it. Otherwise, set it to 90 days from new "from" date (or today, whichever is earlier)
      let newToDate: Date
      if (daysDifference <= 90 && daysDifference >= 0 && currentToDate <= today) {
        // Current "to" date is still valid - keep it
        newToDate = currentToDate
      } else {
        // Current "to" date is invalid - set to 90 days from new "from" date (or today)
        newToDate = maxToDate
      }
      
      setFilters({
        dateRange: {
          from: fromDate,
          to: newToDate,
        },
        selectedDateRange: "custom",
      })
    }
  }

  const handleDateToChange = (date: Date | null) => {
    if (date) {
      setDatePreset("custom") // Switch to custom when manually changing dates
      
      // Ensure the date range doesn't exceed 90 days
      const fromDate = filters.dateRange.from
      const toDate = date
      const daysDifference = Math.ceil(
        (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      // If the range exceeds 90 days, adjust the "to" date to be exactly 90 days from "from"
      let finalToDate = toDate
      if (daysDifference > 90) {
        finalToDate = new Date(fromDate)
        finalToDate.setDate(finalToDate.getDate() + 90)
      }
      
      // Get end of today in IST
      const today = getEndOfDayIST(getISTDate())
      
      // Don't allow "to" date to be in the future
      if (finalToDate > today) {
        finalToDate = today
      }
      
      setFilters({
        dateRange: {
          ...filters.dateRange,
          to: getEndOfDayIST(finalToDate),
        },
        selectedDateRange: "custom",
      })
    }
  }

  const handleRegionChange = (value: string) => {
    // Empty string or empty value means no filter (all regions)
    const regionValue = value || ""
    // Clear state when country changes
    setFilters({ region: regionValue, state: "IN-MH" })
  }

  const handleComparisonModeChange = (checked: boolean) => {
    setFilters({ comparisonMode: checked })
  }

  // Calculate min/max dates for custom date range
  const customDateLimits = useMemo(() => {
    const today = getISTDate()
    const oneYearAgo = new Date(today)
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    
    return {
      minFromDate: getStartOfDayIST(oneYearAgo),
      maxFromDate: getStartOfDayIST(today),
      maxToDate: (() => {
        const maxToDate = new Date(filters.dateRange.from)
        maxToDate.setDate(maxToDate.getDate() + 90)
        const endOfToday = getEndOfDayIST(today)
        return maxToDate > endOfToday ? endOfToday : getEndOfDayIST(maxToDate)
      })(),
    }
  }, [filters.dateRange.from])

  // Add dynamic style to fix z-index issue when mobile sidebar is open
  useEffect(() => {
    // Add/remove class on body to indicate sidebar state
    if (isMobileSidebarOpen) {
      document.body.classList.add('mobile-sidebar-open')
    } else {
      document.body.classList.remove('mobile-sidebar-open')
    }
    
    // Add style tag to lower DatePicker modal z-index when sidebar is open
    const styleId = 'dashboard-filter-datepicker-zindex-fix'
    let styleElement = document.getElementById(styleId)
    
    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = styleId
      document.head.appendChild(styleElement)
    }
    
    // Lower z-index for DatePicker modal overlays and content when sidebar is open
    // Target various possible DatePicker modal structures
    styleElement.textContent = `
      /* Target DatePicker modal overlays and content when mobile sidebar is open */
      body.mobile-sidebar-open [role="dialog"][data-rac-dialog],
      body.mobile-sidebar-open [data-rac-dialog-overlay],
      body.mobile-sidebar-open [data-rac-popover],
      body.mobile-sidebar-open [data-rac-popover-overlay],
      body.mobile-sidebar-open [data-radix-popover-content],
      body.mobile-sidebar-open [data-radix-popover-overlay],
      body.mobile-sidebar-open [data-radix-calendar],
      body.mobile-sidebar-open [data-rac-calendar] {
        z-index: 40 !important;
      }
    `
    
    return () => {
      // Cleanup on unmount
      document.body.classList.remove('mobile-sidebar-open')
      const styleElement = document.getElementById(styleId)
      if (styleElement) {
        styleElement.remove()
      }
    }
  }, [isMobileSidebarOpen])

  // Add permanent style and MutationObserver to ensure DatePicker popover appears above filters
  useEffect(() => {
    const styleId = 'dashboard-filter-datepicker-permanent-zindex'
    let styleElement = document.getElementById(styleId)
    
    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = styleId
      document.head.appendChild(styleElement)
    }
    
    // Ensure DatePicker popover content appears above filters
    // Filter bar has z-[100], so we need much higher z-index
    styleElement.textContent = `
      /* Ensure DatePicker popover content appears above filters - Very aggressive targeting */
      /* Target all possible popover and calendar elements with very high z-index */
      [data-rac-popover],
      [data-rac-popover-content],
      [data-radix-popover-content],
      [data-rac-calendar],
      [data-radix-calendar],
      [role="dialog"][data-rac-dialog],
      [data-rac-dialog-overlay],
      [data-rac-popover-overlay],
      [data-radix-popover-overlay],
      /* Target React Aria Components popover */
      [data-rac-popover-trigger] + [data-rac-popover-content],
      /* Target any portal containers */
      body > [data-rac-popover-content],
      body > [data-radix-popover-content],
      body > [data-rac-calendar],
      body > [data-radix-calendar],
      /* Target any divs that might contain the popover */
      div[data-rac-popover],
      div[data-radix-popover-content],
      /* Target React Aria DatePicker specific elements */
      [data-rac-date-picker],
      [data-rac-date-field],
      /* Ensure popover wrapper/container also has high z-index */
      [data-rac-popover-portal],
      [data-radix-popover-portal],
      [data-rac-popover-root],
      /* Target any element with popover-related classes */
      [class*="popover"],
      [class*="Popover"],
      [class*="calendar"],
      [class*="Calendar"] {
        z-index: 200 !important;
      }
      
      /* Specifically target elements that are direct children of body (portals) */
      body > div[style*="z-index"],
      body > div[data-radix-portal],
      body > div[data-rac-portal] {
        z-index: 200 !important;
      }
    `
    
    // Function to apply z-index to popover elements
    const applyZIndexToPopovers = () => {
      const selectors = [
        '[data-rac-popover]',
        '[data-rac-popover-content]',
        '[data-radix-popover-content]',
        '[data-rac-calendar]',
        '[data-radix-calendar]',
        '[role="dialog"][data-rac-dialog]',
        '[data-rac-dialog-overlay]',
        '[data-rac-popover-overlay]',
        '[data-radix-popover-overlay]',
      ]
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector)
        elements.forEach((el) => {
          if (el instanceof HTMLElement) {
            const currentZIndex = window.getComputedStyle(el).zIndex
            const currentZIndexNum = parseInt(currentZIndex) || 0
            if (currentZIndexNum < 200) {
              el.style.zIndex = '200'
            }
          }
        })
      })
    }
    
    // Apply immediately
    applyZIndexToPopovers()
    
    // Use MutationObserver to catch dynamically added popover elements
    const observer = new MutationObserver(() => {
      applyZIndexToPopovers()
    })
    
    // Observe the entire document for added nodes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'data-rac-popover', 'data-radix-popover-content']
    })
    
    // Also check periodically as a fallback
    const intervalId = setInterval(applyZIndexToPopovers, 100)
    
    return () => {
      observer.disconnect()
      clearInterval(intervalId)
      const styleElement = document.getElementById(styleId)
      if (styleElement) {
        styleElement.remove()
      }
    }
  }, [])

  return (
    <>
    {/* Filter Form - Hidden on mobile when hideFilters is true */}
    <div className={`bg-white rounded-lg shadow-sm border border-ui-border-base p-3 mb-2 ${hideFilters ? 'hidden sm:block' : 'block'}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Date Range Preset */}
        <div className="space-y-2">
          <Label htmlFor="date-preset" size="xsmall" weight="plus">
            Date Range
          </Label>
          <Select value={datePreset} onValueChange={handleDatePresetChange}>
            <Select.Trigger id="date-preset">
              <Select.Value placeholder="Select date range" />
            </Select.Trigger>
            <Select.Content className="z-[110]">
              {DATE_PRESETS.map((preset) => (
                <Select.Item key={preset.value} value={preset.value}>
                  {preset.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>

        {/* Custom Date Range - Only show when custom is selected */}
        {datePreset === "custom" && (
          <div className="space-y-2 relative z-[150]">
            <Label htmlFor="custom-date-range" size="xsmall" weight="plus">
              Custom Date Range
            </Label>
            <Popover open={dateRangePopoverOpen} onOpenChange={setDateRangePopoverOpen}>
              <Popover.Trigger asChild>
                <Button
                  id="custom-date-range"
                  variant="secondary"
                  size="small"
                  className="w-full justify-between"
                >
                  <Text size="small">
                    {filters.dateRange.from.toLocaleDateString()} - {filters.dateRange.to.toLocaleDateString()}
                  </Text>
                </Button>
              </Popover.Trigger>
              <Popover.Content
                align="start"
                className="w-auto p-4 z-[200]"
                onInteractOutside={(e) => {
                  // Prevent closing when clicking on date picker calendars
                  const target = e.target as HTMLElement
                  if (target.closest('[data-rac-calendar]') || target.closest('[data-radix-calendar]')) {
                    e.preventDefault()
                  }
                }}
              >
                <div className="space-y-4">
                  {/* Note about 90 days limit */}
                  <Text size="xsmall" className="text-ui-fg-subtle italic">
                    Note: You can select a maximum of 90 days for the date range.
                  </Text>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date-from" size="xsmall" weight="plus">
                        Date From
                      </Label>
                      <DatePicker
                        key={`date-from-${filters.dateRange.from.getTime()}`}
                        modal={false}
                        minValue={customDateLimits.minFromDate}
                        maxValue={customDateLimits.maxFromDate}
                        value={filters.dateRange.from}
                        onChange={handleDateFromChange}
                        className="date-picker-z-index"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date-to" size="xsmall" weight="plus">
                        Date To
                      </Label>
                      <DatePicker
                        key={`date-to-${filters.dateRange.from.getTime()}-${filters.dateRange.to.getTime()}`}
                        modal={false}
                        minValue={filters.dateRange.from}
                        maxValue={customDateLimits.maxToDate}
                        value={filters.dateRange.to}
                        onChange={handleDateToChange}
                        className="date-picker-z-index"
                      />
                    </div>
                  </div>
                </div>
              </Popover.Content>
            </Popover>
          </div>
        )}

        {/* Region/Country Filter */}
        <div className="space-y-2">
          <Label htmlFor="region-filter" size="xsmall" weight="plus">
            Country
          </Label>
          <CountrySelect
            id="region-filter"
            value={filters.region || ""}
            onChange={(e) => handleRegionChange(e.target.value)}
            placeholder="Select country"
          />
        </div>

        {/* State/Province Filter - Only show if selected country has states */}
        {filters.region && getCountryProvinceObjectByIso2(filters.region) && (
          <div className="space-y-2">
            <Label htmlFor="state-filter" size="xsmall" weight="plus">
              State
            </Label>
            <Select
              value={filters.state || "all"}
              onValueChange={(value) => {
                const stateValue = value === "all" ? "" : value
                setFilters({ state: stateValue })
              }}
            >
              <Select.Trigger id="state-filter">
                <Select.Value placeholder="Select state" />
              </Select.Trigger>
              <Select.Content className="z-[110]">
                <Select.Item value="all">
                  All States
                </Select.Item>
                {Object.entries(
                  getCountryProvinceObjectByIso2(filters.region)?.options ?? {}
                ).map(([iso2, name]) => (
                  <Select.Item key={iso2} value={iso2}>
                    {name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        )}

        {/* Comparison Mode */}
        <div className="space-y-2">
          <Label htmlFor="comparison-mode" size="xsmall" weight="plus">
            Comparison Mode
          </Label>
          <div className="flex items-center gap-2 h-10">
            <Switch
              id="comparison-mode"
              checked={filters.comparisonMode}
              onCheckedChange={handleComparisonModeChange}
            />
            <Label
              htmlFor="comparison-mode"
              size="small"
              className="text-ui-fg-subtle"
            >
              {filters.comparisonMode ? "Enabled" : "Disabled"}
            </Label>
          </div>
        </div>

        {/* Reset Button */}
        {hasActiveFilters && (
          <div className="space-y-2">
            <Label size="xsmall" weight="plus" className="opacity-0">
              Reset
            </Label>
            <Button
              variant="transparent"
              size="small"
              onClick={resetFilters}
              className="text-ui-fg-muted hover:text-ui-fg-base"
            >
              <FilterResetIcon className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>
          </div>
        )}
      </div>
    </div>

    {/* Tabs Section - Outside Filter Bar */}
    <div className="mt-4">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <Tabs.List className="flex gap-1 bg-white p-1 rounded-lg">
          <Tabs.Trigger value="kpis" className="px-4 py-2 rounded-md text-sm font-medium hover:bg-ui-bg-subtle-hover data-[state=active]:bg-ui-bg-subtle-hover data-[state=active]:shadow-sm">
            KPIs
          </Tabs.Trigger>
          <Tabs.Trigger value="charts" className="px-4 py-2 rounded-md text-sm font-medium hover:bg-ui-bg-subtle-hover data-[state=active]:bg-ui-bg-subtle-hover data-[state=active]:shadow-sm">
            Charts
          </Tabs.Trigger>
          <Tabs.Trigger value="statistics" className="px-4 py-2 rounded-md text-sm font-medium hover:bg-ui-bg-subtle-hover data-[state=active]:bg-ui-bg-subtle-hover data-[state=active]:shadow-sm">
            Statistics
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs>
    </div>
    </>
  )
}

