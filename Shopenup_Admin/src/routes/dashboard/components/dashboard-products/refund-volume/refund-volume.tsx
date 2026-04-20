"use client"

import { useMemo } from "react"
import { useRefundVolume } from "../../../../../hooks/api/use-dashboard"
import { RotateCcw } from "lucide-react"
import { DeltaArrow } from "../../Order/kpi-box/delta-arrow"

interface RefundVolumeCardsProps {
  className?: string
}

// Shared hook data extraction
const useRefundData = () => {
  const { data, isLoading, isError, error } = useRefundVolume()
  const hasComparison = data?.comparisonMode === true

  const refundCount = useMemo(() => {
    if (!data) return 0
    return hasComparison ? data.summary?.refunds?.current ?? 0 : data.count ?? 0
  }, [data, hasComparison])

  const previousRefundCount = useMemo(
    () => (hasComparison ? data?.summary?.refunds?.previous ?? 0 : 0),
    [data, hasComparison]
  )

  const refundedAmount = useMemo(() => {
    if (!data) return 0
    return hasComparison
      ? data.summary?.refunded_amount?.current ?? 0
      : data.total_refunded_amount ?? 0
  }, [data, hasComparison])

  const previousRefundedAmount = useMemo(
    () => (hasComparison ? data?.summary?.refunded_amount?.previous ?? 0 : 0),
    [data, hasComparison]
  )

  const avgRefundTime = useMemo(() => {
    if (!data) return 0
    return hasComparison
      ? data.summary?.avg_refund_time_hours?.current ?? 0
      : data.avg_refund_time_hours ?? 0
  }, [data, hasComparison])

  const previousAvgRefundTime = useMemo(
    () => (hasComparison ? data?.summary?.avg_refund_time_hours?.previous ?? 0 : 0),
    [data, hasComparison]
  )

  const calcDelta = (curr: number, prev: number) => {
    if (!hasComparison) return null
    if (prev === 0) return curr === 0 ? 0 : 100
    return ((curr - prev) / prev) * 100
  }

  return {
    data,
    isLoading,
    isError,
    error,
    hasComparison,
    refundCount,
    previousRefundCount,
    refundedAmount,
    previousRefundedAmount,
    avgRefundTime,
    previousAvgRefundTime,
    calcDelta,
  }
}

// Individual KPI Components
export const TotalRefundsKPI = ({ className }: { className?: string }) => {
  const {
    data,
    isLoading,
    isError,
    error,
    hasComparison,
    refundCount,
    previousRefundCount,
    calcDelta,
  } = useRefundData()

  const delta = calcDelta(refundCount, previousRefundCount)
  const direction = delta !== null ? (delta >= 0 ? "up" : "down") : "flat"
  const color = delta !== null ? (delta >= 0 ? "text-green-600" : "text-red-500") : "text-gray-500"

  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
        <div className="text-sm font-medium text-indigo-800">Total Refunds</div>
        <div className="mt-3 text-sm text-gray-500">Loading...</div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
        <div className="text-sm font-medium text-indigo-800 flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-indigo-700" />
          Total Refunds
        </div>
        <div className="mt-3 text-sm text-red-500">
          {error instanceof Error ? error.message : "Failed to load data"}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
      <div className="text-sm font-medium text-indigo-800 flex items-center gap-2">
        <RotateCcw className="h-4 w-4 text-indigo-700" />
        Total Refunds
      </div>

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 leading-tight">
          {refundCount.toLocaleString("en-IN")}
        </div>

        {hasComparison && delta !== null && (
          <div className={`flex items-center text-sm font-medium ${color}`}>
            <DeltaArrow direction={direction} />
            <span className="ml-1 whitespace-nowrap">
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {hasComparison && delta !== null && (
        <div className="mt-2 text-sm text-gray-400 text-wrap">
          <span>vs previous </span>
          <span className="text-gray-500 font-medium">
            {previousRefundCount.toLocaleString("en-IN")}
          </span>
          <span className="ml-1 whitespace-nowrap font-medium">
            (<span className={color}>
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)}%
            </span>)
          </span>
        </div>
      )}
    </div>
  )
}

export const TotalRefundedKPI = ({ className }: { className?: string }) => {
  const {
    data,
    isLoading,
    isError,
    error,
    hasComparison,
    refundedAmount,
    previousRefundedAmount,
    calcDelta,
  } = useRefundData()

  const delta = calcDelta(refundedAmount, previousRefundedAmount)
  const direction = delta !== null ? (delta >= 0 ? "up" : "down") : "flat"
  const color = delta !== null ? (delta >= 0 ? "text-green-600" : "text-red-500") : "text-gray-500"

  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
        <div className="text-sm font-medium text-indigo-800">Total Refunded</div>
        <div className="mt-3 text-sm text-gray-500">Loading...</div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
        <div className="text-sm font-medium text-indigo-800 flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-indigo-700" />
          Total Refunded
        </div>
        <div className="mt-3 text-sm text-red-500">
          {error instanceof Error ? error.message : "Failed to load data"}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
      <div className="text-sm font-medium text-indigo-800 flex items-center gap-2">
        <RotateCcw className="h-4 w-4 text-indigo-700" />
        Total Refunded
      </div>

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 leading-tight">
          ₹{refundedAmount.toLocaleString("en-IN")}
        </div>

        {hasComparison && delta !== null && (
          <div className={`flex items-center text-sm font-medium ${color}`}>
            <DeltaArrow direction={direction} />
            <span className="ml-1 whitespace-nowrap">
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {hasComparison && delta !== null && (
        <div className="mt-2 text-sm text-gray-400 text-wrap">
          <span>vs previous </span>
          <span className="text-gray-500 font-medium">
            ₹{previousRefundedAmount.toLocaleString("en-IN")}
          </span>
          <span className="ml-1 whitespace-nowrap font-medium">
            (<span className={color}>
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)}%
            </span>)
          </span>
        </div>
      )}
    </div>
  )
}

export const AverageRefundTimeKPI = ({ className }: { className?: string }) => {
  const {
    data,
    isLoading,
    isError,
    error,
    hasComparison,
    avgRefundTime,
    previousAvgRefundTime,
    calcDelta,
  } = useRefundData()

  const delta = calcDelta(avgRefundTime, previousAvgRefundTime)
  // For refund time, lower is better, so invert the direction
  const direction = delta !== null ? (delta >= 0 ? "down" : "up") : "flat"
  const color = delta !== null ? (delta >= 0 ? "text-red-500" : "text-green-600") : "text-gray-500"

  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
        <div className="text-sm font-medium text-indigo-800">Average Refund Time</div>
        <div className="mt-3 text-sm text-gray-500">Loading...</div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
        <div className="text-sm font-medium text-indigo-800 flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-indigo-700" />
          Average Refund Time
        </div>
        <div className="mt-3 text-sm text-red-500">
          {error instanceof Error ? error.message : "Failed to load data"}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
      <div className="text-sm font-medium text-indigo-800 flex items-center gap-2">
        <RotateCcw className="h-4 w-4 text-indigo-700" />
        Average Refund Time
      </div>

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 leading-tight">
          {avgRefundTime.toFixed(1)} hrs
        </div>

        {hasComparison && delta !== null && (
          <div className={`flex items-center text-sm font-medium ${color}`}>
            <DeltaArrow direction={direction} />
            <span className="ml-1 whitespace-nowrap">
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {hasComparison && delta !== null && (
        <div className="mt-2 text-sm text-gray-400 text-wrap">
          <span>vs previous </span>
          <span className="text-gray-500 font-medium">
            {previousAvgRefundTime.toFixed(1)} hrs
          </span>
          <span className="ml-1 whitespace-nowrap font-medium">
            (<span className={color}>
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)}%
            </span>)
          </span>
        </div>
      )}
    </div>
  )
}

const RefundVolumeCards = ({ className }: RefundVolumeCardsProps) => {
  const {
    data,
    isLoading,
    isError,
    error,
    hasComparison,
    refundCount,
    previousRefundCount,
    refundedAmount,
    previousRefundedAmount,
    avgRefundTime,
    previousAvgRefundTime,
    calcDelta,
  } = useRefundData()

  const deltaRefundCount = calcDelta(refundCount, previousRefundCount)
  const deltaRefundedAmount = calcDelta(refundedAmount, previousRefundedAmount)
  const deltaAvgRefundTime = calcDelta(avgRefundTime, previousAvgRefundTime)

  const getDirection = (delta: number | null) => {
    if (delta === null) return "flat"
    return delta >= 0 ? "up" : "down"
  }

  const getColor = (delta: number | null, invert = false, prev = 0) => {
    if (delta === null) return "text-gray-500"
    // If previous is 0 and current > 0, treat as positive
    if (prev === 0) return "text-green-600"
    const positive = delta >= 0
    if (invert) return positive ? "text-red-500" : "text-green-600"
    return positive ? "text-green-600" : "text-red-500"
  }

  // -----------------------------
  // Loading
  // -----------------------------
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white border border-gray-100 rounded-md p-5 shadow-sm animate-pulse"
          >
            <div className="text-sm font-medium text-indigo-800">Loading...</div>
            <div className="mt-3 text-sm text-gray-400">Fetching data...</div>
          </div>
        ))}
      </div>
    )
  }

  // -----------------------------
  // Error
  // -----------------------------
  if (isError || !data) {
    return (
      <div className="bg-white border border-gray-100 rounded-md p-5 shadow-sm">
        <div className="text-sm font-medium text-indigo-800 flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-indigo-700" />
          Refund Volume
        </div>
        <div className="mt-3 text-sm text-red-500">
          {error instanceof Error ? error.message : "Failed to load data"}
        </div>
      </div>
    )
  }

  // -----------------------------
  // Empty
  // -----------------------------
  if (refundCount === 0 && refundedAmount === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-md p-5 shadow-sm">
        <div className="text-sm font-medium text-indigo-800 flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-indigo-700" />
          Refund Volume
        </div>
        <div className="mt-3 flex items-center justify-center h-[180px] rounded-lg border border-dashed border-gray-200 bg-gray-50">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">No data available</p>
            <p className="text-xs text-gray-500 mt-1">
              No refunds found for the selected period.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // -----------------------------
  // StatCard Component
  // -----------------------------
  const StatCard = ({
    title,
    value,
    suffix,
    delta,
    previous,
    invert = false,
  }: {
    title: string
    value: number
    suffix?: string
    delta: number | null
    previous: number
    invert?: boolean
  }) => {
    const direction = getDirection(delta)
    const color = getColor(delta, invert, previous)

    return (
      <div
        className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${
          className || ""
        }`}
      >
        <div className="text-sm font-medium text-indigo-800 flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-indigo-700" />
          {title}
        </div>

        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 leading-tight">
            {suffix === "₹"
              ? `₹${value.toLocaleString("en-IN")}`
              : `${value.toFixed ? value.toFixed(1) : value}${suffix || ""}`}
          </div>

          {hasComparison && delta !== null && (
            <div className={`flex items-center text-sm font-medium ${color}`}>
              <DeltaArrow direction={direction} />
              <span className="ml-1 whitespace-nowrap">
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {hasComparison && delta !== null && (
          <div className="mt-2 text-sm text-gray-400 text-wrap">
            <span>vs previous </span>
            <span className="text-gray-500 font-medium">
              {suffix === "₹"
                ? `₹${previous.toLocaleString("en-IN")}`
                : `${previous.toFixed ? previous.toFixed(1) : previous}${suffix || ""}`}
            </span>
            <span className="ml-1 whitespace-nowrap font-medium">
              (<span className={`${color}`}>
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(1)}%
              </span>)
            </span>
          </div>
        )}
      </div>
    )
  }

  // -----------------------------
  // Render three cards
  // -----------------------------
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard
        title="Total Refunds"
        value={refundCount}
        delta={deltaRefundCount}
        previous={previousRefundCount}
      />
      <StatCard
        title="Total Refunded"
        value={refundedAmount}
        suffix="₹"
        delta={deltaRefundedAmount}
        previous={previousRefundedAmount}
      />
      <StatCard
        title="Average Refund Time"
        value={avgRefundTime}
        suffix=" hrs"
        delta={deltaAvgRefundTime}
        previous={previousAvgRefundTime}
        invert
      />
    </div>
  )
}

export default RefundVolumeCards
