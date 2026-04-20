"use client"

import React, { useMemo } from "react"
import { usePaymentSuccessRate } from "../../../../../hooks/api/use-dashboard"
import { CheckCircle } from "@shopenup/icons"
import { DeltaArrow } from "../../Order/kpi-box/delta-arrow"

interface PaymentSuccessRateCardProps {
  className?: string
  showOnlyKPI?: boolean
}

export const PaymentSuccessRateCard = ({
  className,
  showOnlyKPI = false,
}: PaymentSuccessRateCardProps) => {
  const { data, isLoading, isError, error } = usePaymentSuccessRate()

  const hasComparison = Boolean(data?.comparison)
  const currentRate = useMemo(() => data?.success_rate ?? 0, [data])
  const previousRate = useMemo(
    () => data?.comparison?.previous_period?.success_rate ?? 0,
    [data]
  )

  // 🔹 Updated delta calculation to handle previousRate = 0
  const delta = useMemo(() => {
    if (!hasComparison) return null
    return previousRate === 0 ? currentRate : ((currentRate - previousRate) / previousRate) * 100
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

  const showComparisonDetails = hasComparison && delta !== null && !showOnlyKPI

  const authorized = data?.authorized ?? 0
  const attempted = data?.attempted ?? 0

  // 🌀 Loading State
  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
        <div className="text-sm font-medium text-indigo-800">Payment Success Rate (%)</div>
        <div className="mt-3 text-sm text-gray-500">Loading...</div>
      </div>
    )
  }

  // ❌ Error State
  if (isError || !data) {
    return (
      <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
        <div className="text-sm font-medium text-indigo-800">Payment Success Rate (%)</div>
        <div className="mt-3 text-sm text-red-500">
          {error instanceof Error ? error.message : "Failed to load data"}
        </div>
      </div>
    )
  }

  // ⚪ Empty State
  if (attempted === 0) {
    return (
      <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
        <div className="text-sm font-medium text-indigo-800 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-gray-500" />
          Payment Success Rate (%)
        </div>
        <div className="mt-3 flex items-center justify-center h-[180px] rounded-lg border border-dashed border-gray-200 bg-gray-50">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">No data available</p>
            <p className="text-xs text-gray-500 mt-1">
              No payments found for the selected period.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ✅ Main Render
return (
  <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
    <div className="text-sm font-medium text-indigo-800 flex items-center gap-2">
      <CheckCircle className="h-4 w-4 text-indigo-700" />
      Payment Success Rate (%)
    </div>

    {/* Current Rate + Delta (wrap if needed) */}
    <div className="mt-3 flex flex-wrap items-center gap-3">
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
          <DeltaArrow direction={deltaDirection} />
          <span className="ml-1">
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
        </div>
      )}
    </div>

    {/* Previous Rate */}
    {hasComparison && previousRate !== null && (
      <div className="mt-1 text-sm text-gray-500">
        Previous: <span className="font-medium">{previousRate.toFixed(2)}%</span>
      </div>
    )}

    {/* Warning if low */}
    {currentRate < 70 && !showOnlyKPI && (
      <div className="mt-3 text-xs text-yellow-600 font-medium">
        ⚠️ Review payment processing
      </div>
    )}
  </div>
)



}

export default PaymentSuccessRateCard
