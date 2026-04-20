"use client"

import { useMemo } from "react"
import { useCustomerLifetimeValue } from "../../../../hooks/api/use-dashboard"
import { useDashboardFilter } from "../../../../providers/dashboard-filter-provider"
import { DeltaArrow } from "../Order/kpi-box/delta-arrow"

interface CustomerLifetimeValueTileProps {
  className?: string
}

export const CustomerLifetimeValueTile = ({ className }: CustomerLifetimeValueTileProps) => {
  const { filters } = useDashboardFilter()
  const { data, isLoading, isError, error } = useCustomerLifetimeValue()

  const currentCLV = Number(data?.data?.averageCLV ?? 0)
  const previousCLV = Number(data?.data?.previousCLV ?? 0)
  const hasComparison = filters?.comparisonMode ?? false

  const delta = useMemo(() => {
    if (!hasComparison || previousCLV === 0) return null
    return ((currentCLV - previousCLV) / previousCLV) * 100
  }, [currentCLV, previousCLV, hasComparison])

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

  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
        <div className="text-sm font-medium text-indigo-800">Customer Lifetime Value (₹)</div>
        <div className="mt-3 text-sm text-gray-500">Loading...</div>
      </div>
    )
  }

  if (isError || !data?.data) {
    return (
      <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
        <div className="text-sm font-medium text-indigo-800">Customer Lifetime Value (₹)</div>
        <div className="mt-3 text-sm text-red-500">
          {error instanceof Error ? error.message : "Failed to load data"}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
      <div className="text-sm font-medium text-indigo-800">Customer Lifetime Value (₹)</div>

    <div className="mt-3 flex items-center gap-2">
  {/* VALUE */}
  <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900">
    ₹{currentCLV.toFixed(2)}
  </div>

  {/* AVG (inline next to value) */}
  <span className="text-sm font-semibold text-gray-500">
    Avg
  </span>

  {/* DELTA */}
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
      <span className="ml-1 whitespace-nowrap">
        {delta >= 0 ? "+" : ""}
        {delta.toFixed(1)}%
      </span>
    </div>
  )}
</div>


      {hasComparison && (
        <div className="mt-2 text-sm text-gray-400">
          <span>vs previous period </span>
          <span className="text-gray-500 font-medium">
            ₹{previousCLV.toFixed(2)}
          </span>
          <span className={`whitespace-nowrap font-medium ${comparisonColorClass}`}>
            ({delta !== null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%` : "0.0%"})
          </span>
        </div>
      )}
    </div>
  )
}
