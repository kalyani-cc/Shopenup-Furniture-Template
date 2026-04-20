"use client"

import React from "react"
import { Link } from "react-router-dom"
import { useOutOfStockItems } from "../../../../../hooks/api/use-dashboard"
import { ExclamationCircle } from "@shopenup/icons"

interface OutOfStockItemsProps {
  showOnlyKPI?: boolean
}

const OutOfStockItems: React.FC<OutOfStockItemsProps> = ({ showOnlyKPI = false }) => {
  // Fetch out-of-stock items from backend
  const { 
    data, 
    isLoading, 
    isError, 
    error 
  } = useOutOfStockItems()

  const outOfStockCount = data?.total_count || 0
  const estimatedRevenueImpact = data?.estimated_revenue_impact || 0

  // Format currency
  const formatCurrency = (amount: number, currencyCode: string = "INR") => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // UI states
  if (isLoading) {
    return (
      <div className="rounded-xl shadow-lg p-6 text-center text-black animate-pulse">
        Loading out-of-stock items...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-gradient-to-r from-red-500 via-pink-500 to-orange-500 rounded-xl shadow-lg p-6 text-center text-white">
        <div>Failed to load data.</div>
        {error && (
          <div className="mt-2 text-xs opacity-80">
            Error: {error?.message || JSON.stringify(error)}
          </div>
        )}
      </div>
    )
  }

  // Build link to inventory list
  const inventoryListLink = "/inventory"

  // KPI Tile Component
  const KPITile = (
    <Link
      to={inventoryListLink}
      className="block rounded-xl shadow-lg bg-white border border-red-200 p-6 hover:shadow-xl hover:border-red-300 transition-all duration-200 group"
    >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <ExclamationCircle className="h-5 w-5 text-red-600" />
              <h3 className="text-2xl font-medium text-red-900 group-hover:text-red-900">
                Out of Stock Items
              </h3>
            </div>
            <p className="text-xs text-red-600 mb-3">
              Products with zero available inventory
            </p>
            
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-black">
                  {outOfStockCount.toLocaleString("en-IN")}
                </span>
                <span className="text-sm text-black">
                  {outOfStockCount === 1 ? "item" : "items"}
                </span>
              </div>
              
              {estimatedRevenueImpact > 0 && (
                <div className="mt-3 pt-3 border-t border-red-100">
                  <p className="text-xs text-red-600 mb-1">Estimated Revenue Impact</p>
                  <p className="text-xl font-bold text-red-700">
                    {formatCurrency(estimatedRevenueImpact)}
                  </p>
                  <p className="text-xs text-red-500 mt-1">per month</p>
                </div>
              )}
            </div>
            
            {outOfStockCount > 0 && (
              <p className="text-xs text-red-700 mt-3 font-medium">
                Urgent action required
              </p>
            )}
          </div>
          
          <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg
              className="h-6 w-6 text-red-500 group-hover:text-red-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </Link>
  )

  // If only KPI is requested, return just the tile
  if (showOnlyKPI) {
    return <div className="w-full">{KPITile}</div>
  }

  return (
    <div className="w-full">
      {/* KPI Tile */}
      {KPITile}

      {outOfStockCount === 0 && !isLoading && (
        <div className="mt-4 text-center text-sm text-green-700 bg-green-50 p-4 rounded-lg border border-green-200">
          All items are in stock. No out-of-stock items found.
        </div>
      )}
    </div>
  )
}

export default OutOfStockItems



