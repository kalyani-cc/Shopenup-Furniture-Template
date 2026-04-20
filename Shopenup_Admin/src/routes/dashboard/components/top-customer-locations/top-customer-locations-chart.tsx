"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { useTopCustomerLocations } from "../../../../hooks/api/use-dashboard"
import { Heading, Text } from "@shopenup/ui"

const COLORS = [
  "#6366f1",
  "#6366f1",
  "#6366f1",
  "#6366f1",
  "#6366f1",
  "#6366f1",
  "#6366f1",
  "#6366f1",
  "#6366f1",
  "#6366f1",
]

const ChartCustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white p-3 rounded-md shadow-md">
        <Text className="font-semibold mb-1 text-gray-800">{label}</Text>
        <Text className="text-sm text-gray-600">
          Orders: {data.orderCount.toLocaleString()}
        </Text>
        {data.countryCode && (
          <Text className="text-sm text-gray-500">
            Country: {data.countryCode.toUpperCase()}
          </Text>
        )}
      </div>
    )
  }
  return null
}

export const TopCustomerLocationsChart = () => {
  const { data, isLoading, isError, error } = useTopCustomerLocations()

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg flex flex-col items-center justify-center min-h-[400px]">
        <Heading level="h2" className="text-xl font-semibold mb-4 text-gray-800">
          Top 10 Customer Locations
        </Heading>
        <Text className="text-gray-500">Loading...</Text>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6 bg-white rounded-lg flex flex-col items-center justify-center min-h-[400px]">
        <Heading level="h2" className="text-xl font-semibold mb-4 text-gray-800">
          Top 10 Customer Locations
        </Heading>
        <Text className="text-red-500">
          Error: {error instanceof Error ? error.message : "Failed to load data"}
        </Text>
      </div>
    )
  }

  if (!data || !data.data) {
    return (
      <div className="p-6 bg-white rounded-lg flex flex-col items-center justify-center min-h-[400px]">
        <Heading level="h2" className="text-xl font-semibold mb-4 text-gray-800">
          Top 10 Customer Locations
        </Heading>
        <Text className="text-gray-500">No data available</Text>
      </div>
    )
  }

  const { topLocations } = data.data

  if (!topLocations || topLocations.length === 0) {
    return (
      <div className="p-6 bg-white rounded-lg flex flex-col items-center justify-center min-h-[400px]">
        <Heading level="h2" className="text-xl font-semibold mb-4 text-gray-800">
          Top 10 Customer Locations
        </Heading>
        <Text className="text-gray-500">No location data available</Text>
      </div>
    )
  }

  const chartData = topLocations.map((location, index) => ({
    state: location.state,
    orderCount: location.orderCount,
    countryCode: location.countryCode,
    color: COLORS[index % COLORS.length],
  }))

  return (
    <div className="p-6 bg-white rounded-lg flex flex-col justify-between min-h-[400px]">
      <Heading level="h2" className="text-xl font-semibold mb-4 text-gray-800">
        Top 10 Customer Locations
      </Heading>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 20,
            left: 10,
            bottom: 50,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="state"
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
          />
          <YAxis />
          <Tooltip content={<ChartCustomTooltip />} />
          <Bar dataKey="orderCount" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
