
"use client"

import React, { useState, useEffect } from "react"
import { usePaymentMethodDistribution } from "../../../../../hooks/api/use-dashboard"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { CreditCard } from "@shopenup/icons"
import type { PieLabelRenderProps } from "recharts"
const COLORS = [
  "#6366F1",
  "#3B82F6",
  "#2563EB",
  "#1D4ED8",
  "#1E40AF",
  "#1E3A8A",
]
/* ----------------------------------------------
   CUSTOM LABEL WITH ARROW POINTER (FIXED TYPES)
------------------------------------------------ */
const DonutLabel = (props: PieLabelRenderProps) => {
  // FIXED: converting unknown → number
  const {
    name = "",
    cx = 0,
    cy = 0,
    midAngle = 0,
    outerRadius = 0,
    percent = 0
  } = props as unknown as {
    name: string
    cx: number
    cy: number
    midAngle: number
    outerRadius: number
    percent: number
  }

  const screenWidth =
    typeof window !== "undefined" ? window.innerWidth : 1200

  const RADIAN = Math.PI / 180

  // Adjust label positioning based on screen size
  const labelOffset = screenWidth < 640 ? 20 : screenWidth < 768 ? 25 : 35
  const lineOffset = screenWidth < 640 ? 5 : screenWidth < 768 ? 6 : 8
  const textOffset = screenWidth < 640 ? 5 : screenWidth < 768 ? 8 : 10

  const sx = cx + (outerRadius + lineOffset) * Math.cos(-midAngle * RADIAN)
  const sy = cy + (outerRadius + lineOffset) * Math.sin(-midAngle * RADIAN)

  const ex = cx + (outerRadius + labelOffset) * Math.cos(-midAngle * RADIAN)
  const ey = cy + (outerRadius + labelOffset) * Math.sin(-midAngle * RADIAN)

  const tx = ex + (ex > cx ? textOffset : -textOffset)
  const ty = ey

  // Responsive font sizes
  const fontSize = screenWidth < 400 ? 8 : screenWidth < 640 ? 9 : screenWidth < 768 ? 11 : 14

  // Adjust line and circle sizes for mobile
  const lineWidth = screenWidth < 640 ? 1 : 1.5
  const circleRadius = screenWidth < 640 ? 2 : 2.5

  return (
    <g>
      <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="#888" strokeWidth={lineWidth} />
      <circle cx={ex} cy={ey} r={circleRadius} fill="#666" />
      <text
        x={tx}
        y={ty}
        textAnchor={ex > cx ? "start" : "end"}
        dominantBaseline="middle"
        fontSize={fontSize}
        fill="#111"
      >
        {name} ({(percent * 100).toFixed(0)}%)
      </text>
    </g>
  )
}
/* ---------------------------------------------------
   COMPONENT
---------------------------------------------------- */
const PaymentMethodDistribution: React.FC = () => {
  const { data, isLoading, isError, error } = usePaymentMethodDistribution()
  const [screenWidth, setScreenWidth] = useState<number>(1200)

  useEffect(() => {
    const updateScreenWidth = () => {
      setScreenWidth(window.innerWidth)
    }

    updateScreenWidth()
    window.addEventListener("resize", updateScreenWidth)
    return () => window.removeEventListener("resize", updateScreenWidth)
  }, [])

  const isMobile = screenWidth < 640
  const isTablet = screenWidth >= 640 && screenWidth < 1024

  if (isLoading) {
    return (
      <div className="rounded-xl shadow p-4 md:p-6 bg-white border border-gray-200 text-center text-gray-700 animate-pulse h-[320px] md:h-[340px] lg:h-[420px] flex items-center justify-center">
        <p className="text-sm md:text-base">Loading payment method distribution...</p>
      </div>
    )
  }
  if (isError) {
    return (
      <div className="bg-white rounded-xl shadow p-4 md:p-6 border border-red-200 text-center text-red-600 h-[320px] md:h-[340px] lg:h-[420px] flex items-center justify-center">
        <p className="text-sm md:text-base">
          Failed to load data. {error?.message && <span>{error.message}</span>}
        </p>
      </div>
    )
  }
  const totalOrders = data?.total_orders || 0
  const methods = data?.payment_methods || []
  const chartData = methods.map((m, index) => ({
    name: m.method.toUpperCase(),
    value: m.percentage,
    count: m.count,
    color: COLORS[index % COLORS.length],
  }))

  // Responsive chart dimensions
  const chartHeight = isMobile ? 320 : isTablet ? 340 : 360
  const innerRadius = isMobile ? "45%" : "50%"
  const outerRadius = isMobile ? "70%" : "65%"
  const centerTextSize = isMobile ? "11" : isTablet ? "13" : "14"
  const centerNumberSize = isMobile ? "14" : isTablet ? "15" : "16"

  return (
    <div className="w-full lg:flex-1 bg-white rounded-xl shadow p-4 md:p-6 border border-gray-200 flex flex-col">
      <div className="mb-3 md:mb-4 flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
          <h3 className="text-base md:text-lg font-semibold text-gray-800">
            Payment Method Distribution
          </h3>
        </div>
        <p className="text-xs md:text-sm text-gray-500">Share of orders by payment provider</p>
      </div>

      <div className="flex items-center justify-center min-h-[320px] md:min-h-[340px] lg:min-h-[360px] w-full overflow-visible">
        {totalOrders === 0 || chartData.length === 0 ? (
          <div className="flex items-center justify-center w-full h-[320px] md:h-[340px] lg:h-[360px] rounded-lg border border-dashed border-gray-200 bg-gray-50">
            <div className="text-center px-4">
              <p className="text-xs md:text-sm font-medium text-gray-700">No data available</p>
              <p className="text-xs text-gray-500 mt-1">
                No orders found for this period.
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full overflow-visible">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                paddingAngle={isMobile ? 1 : 2}
                strokeWidth={isMobile ? 1.5 : 2}
                labelLine={false}
                label={DonutLabel}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name, props) => {
                  const count = props.payload.count
                  const percentage =
                    typeof value === "number" ? `${value}%` : String(value)
                  return [`${count} orders`, `${name} (${percentage})`]
                }}
              />
              {/* Center text */}
              <text
                x="50%"
                y="45%"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={centerTextSize}
                fontWeight="600"
                fill="#111827"
              >
                Total Payments
              </text>
              <text
                x="50%"
                y="55%"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={centerNumberSize}
                fontWeight="700"
                fill="#111827"
              >
                {totalOrders.toLocaleString("en-IN")}
              </text>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
export default PaymentMethodDistribution
