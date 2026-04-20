"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Heading, Text } from "@shopenup/ui"
import { useTopRatedProducts } from "../../../../hooks/api/use-dashboard"
import { useQueries } from "@tanstack/react-query"
import { sdk } from "../../../../lib/client/client"
import { Cell } from "recharts"


const COLORS = ["#6366F1", "#6366F1", "#6366F1", "#6366F1", "#6366F1"]

const ChartCustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const { name, average_rating, review_count } = payload[0].payload
    return (
      <div className="bg-white p-3 rounded-md shadow-md">
        <Text className="font-semibold">{name}</Text>
        <Text className="text-sm text-gray-600">
          Average Rating: {average_rating.toFixed(1)} ⭐
        </Text>
        <Text className="text-sm text-gray-500">Reviews: {review_count}</Text>
      </div>
    )
  }
  return null
}

export const TopRatedProductsChart = () => {
  const { data, isLoading, isError, error } = useTopRatedProducts()

  // Fetch product names for each product_id
  const productQueries = useQueries({
    queries:
      data?.data?.map((product) => ({
        queryKey: ["product", product.product_id],
        queryFn: async () => {
          try {
            const productData = await sdk.admin.product.retrieve(product.product_id, {
              fields: "id,title",
            })
            return { productId: product.product_id, name: productData.product.title }
          } catch {
            return { productId: product.product_id, name: product.product_id }
          }
        },
        enabled: !!data?.data && data.data.length > 0,
        staleTime: 5 * 60 * 1000,
      })) || [],
  })

  // Create map of product_id -> name
  const productNameMap = new Map<string, string>()
  productQueries.forEach((query) => {
    if (query.data) {
      productNameMap.set(query.data.productId, query.data.name)
    }
  })

  const isLoadingProducts = productQueries.some((q) => q.isLoading)

  if (isLoading || isLoadingProducts) {
    return (
      <div className="p-6 bg-white rounded-lg flex flex-col items-center justify-center min-h-[400px]">
        <Heading level="h2" className="text-xl font-semibold mb-4 text-gray-800">
          Top Rated Products
        </Heading>
        <Text className="text-gray-500">Loading...</Text>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6 bg-white rounded-lg flex flex-col items-center justify-center min-h-[400px]">
        <Heading level="h2" className="text-xl font-semibold mb-4 text-gray-800">
          Top Rated Products
        </Heading>
        <Text className="text-red-500">
          Error: {error instanceof Error ? error.message : "Failed to load data"}
        </Text>
      </div>
    )
  }

  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="p-6 bg-white rounded-lg flex flex-col items-center justify-center min-h-[400px]">
        <Heading level="h2" className="text-xl font-semibold mb-4 text-gray-800">
          Top Rated Products
        </Heading>
        <Text className="text-gray-500">No data available</Text>
      </div>
    )
  }

  const chartData = data.data.map((p, index) => ({
    ...p,
    name: productNameMap.get(p.product_id) || p.product_id,
    fill: COLORS[index % COLORS.length],
  }))

  if (chartData.length === 0) {
    return (
      <div className="p-6 bg-white rounded-lg flex items-center justify-center min-h-[400px]">
        <Heading level="h2" className="text-xl font-semibold mb-4 text-gray-800">
          Top Rated Products
        </Heading>
        <Text className="text-gray-500">No review data available</Text>
      </div>
    )
  }

  // Custom X-axis tick for multi-line product names
  const CustomTick = ({ x, y, payload }: any) => {
    if (!payload?.value) return null
    const words = payload.value.split(" ")
    const mid = Math.ceil(words.length / 2)
    const line1 = words.slice(0, mid).join(" ")
    const line2 = words.slice(mid).join(" ")

    return (
      <g transform={`translate(${x},${y + 10})`}>
        <text
          textAnchor="middle"
          fill="#6b7280"
          fontSize={11}
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          <tspan x="0" dy="0">
            {line1}
          </tspan>
          {line2 && (
            <tspan x="0" dy="12">
              {line2}
            </tspan>
          )}
        </text>
      </g>
    )
  }

  return (
    <div className="p-6 bg-white rounded-lg flex flex-col justify-between min-h-[400px]">
      <Heading level="h2" className="text-lg font-semibold mb-4 text-gray-800">
        Top Rated Products
      </Heading>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData} margin={{ top: 20, right: 10, bottom: 60, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={<CustomTick />} interval={0} height={60} />
          <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} domain={[0, 5]} tickCount={6} />
          <Tooltip content={<ChartCustomTooltip />} />
          <Bar dataKey="average_rating" radius={[6, 6, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={`bar-${i}`} fill={entry.fill} />

            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <Text className="text-gray-500 text-sm text-center mt-4">
        Showing top {chartData.length} rated products
      </Text>
    </div>
  )
}
