"use client"

import { useMemo } from "react"
import { useRepeatPurchaseRate } from "../../../../hooks/api/use-dashboard"
import { useDashboardFilter } from "../../../../providers/dashboard-filter-provider"
import { DeltaArrow } from "../Order/kpi-box/delta-arrow"

interface RepeatPurchaseRateCardProps {
  className?: string
}

export const RepeatPurchaseRateCard = ({ className }: RepeatPurchaseRateCardProps) => {
  const { data, isLoading, isError, error } = useRepeatPurchaseRate()
  const { filters } = useDashboardFilter()

  const hasComparison = filters?.comparisonMode ?? false

  const currentRate = useMemo(() => {
    if (!data?.data?.repeatPurchaseRate) return 0
    const rate = data.data.repeatPurchaseRate
    return typeof rate === "object" && "current" in rate ? rate.current : rate
  }, [data])

  const previousRate = useMemo(() => {
    if (!data?.data?.repeatPurchaseRate) return 0
    const rate = data.data.repeatPurchaseRate
    return typeof rate === "object" && "previous" in rate ? rate.previous ?? 0 : 0
  }, [data])

  const delta = useMemo(() => {
    if (!hasComparison || !previousRate) return null
    return ((currentRate - previousRate) / previousRate) * 100
  }, [currentRate, previousRate, hasComparison])

  const deltaDirection = useMemo(() => {
    if (delta === null) return "flat"
    return delta >= 0 ? "up" : "down"
  }, [delta])

  const comparisonColorClass =
    delta !== null
      ? delta >= 0
        ? "text-green-600"
        : "text-red-500"
      : "text-gray-500"

  // ✅ Loading state
  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
        <div className="text-sm font-medium text-indigo-800">Repeat Rate (%)</div>
        <div className="mt-3 text-sm text-gray-500">Loading...</div>
      </div>
    )
  }

  // ✅ Error state
  if (isError || !data?.data) {
    return (
      <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
        <div className="text-sm font-medium text-indigo-800">Repeat  Rate (%)</div>
        <div className="mt-3 text-sm text-red-500">
          {error instanceof Error ? error.message : "Failed to load data"}
        </div>
      </div>
    )
  }

  // ✅ Main render
  return (
    <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
      <div className="text-sm font-medium text-indigo-800">Repeat Rate (%)</div>

      <div className="mt-3 flex items-center gap-3">
        <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 leading-tight">
          {currentRate.toFixed(2)}%
        </div>

        {hasComparison && delta !== null && (
          <div
            className={`flex items-center text-sm font-medium ${
              deltaDirection === "up"
                ? "text-green-600"
                : deltaDirection === "down"
                ? "text-red-500"
                : "text-gray-400"
            }`}
          >
            <span className="inline-flex items-center">
              <DeltaArrow direction={deltaDirection} />
            </span>
            <span className="ml-1 whitespace-nowrap">
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {hasComparison && delta !== null && (
        <div className="mt-2 text-sm text-gray-400">
          <span>vs previous period </span>
          <span className="text-gray-500 font-medium">{previousRate.toFixed(2)}%</span>
          <span className="ml-1 whitespace-nowrap font-medium">
            (
            <span className={`${comparisonColorClass}`}>
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)}%
            </span>
            )
          </span>
        </div>
      )}
    </div>
  )
}
