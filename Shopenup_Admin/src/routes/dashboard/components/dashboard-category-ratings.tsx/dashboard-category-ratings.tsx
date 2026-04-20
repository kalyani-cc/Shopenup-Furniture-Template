"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Container, Heading, Text } from "@shopenup/ui"
import { useCategoryRatings } from "../../../../hooks/api/use-dashboard"

const RATING_COLORS = {
  rating_5: "#EEF2FF", // Indigo-100
  rating_4: "#C7D2FE", // Indigo-200
  rating_3: "#A5B4FC", // Indigo-300
  rating_2: "#818CF8", // Indigo-400
  rating_1: "#6366F1", // Indigo-500
}

const ChartCustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload

    if (data.review_count === 0) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 max-w-xs">
          <Text className="font-semibold text-gray-800 mb-1">{data.category}</Text>
          <Text className="text-sm text-gray-500 italic">No reviews yet</Text>
        </div>
      )
    }

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 max-w-sm max-h-96 overflow-y-auto">
        <Text className="font-semibold text-gray-800 mb-2">{data.category}</Text>
        <Text className="text-sm text-gray-600 mb-3">
          Avg Rating: {data.average_rating.toFixed(1)} ⭐ ({data.review_count} reviews)
        </Text>

        <div className="space-y-2">
          {/* Dynamic Rating Detail Sections */}
          {[5, 4, 3, 2, 1].map((r) => {
            const count = data[`rating_${r}`]
            const products = data[`rating_${r}_products`]

            if (!count) return null

            const borderColors: any = {
              5: "border-indigo-100",
              4: "border-indigo-200",
              3: "border-indigo-300",
              2: "border-indigo-400",
              1: "border-indigo-500",
            }

            return (
              <div key={r} className={`border-l-4 ${borderColors[r]} pl-2`}>
                <Text className="text-xs font-semibold text-gray-700">
                  {r}⭐ ({count} products)
                </Text>
                {products?.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {products.map((product: string, idx: number) => (
                      <li key={idx} className="text-xs text-gray-600 truncate">
                        • {product}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
  return null
}

export const CategoryRatingsChart = () => {
  const { data, isLoading, isError, error } = useCategoryRatings()

  if (isLoading) {
    return (
      <Container className="p-6 bg-white rounded-xl flex flex-col items-center justify-center min-h-[400px]">
        <Heading level="h2" className="text-lg font-semibold mb-4">
          Category Ratings
        </Heading>
        <Text className="text-gray-500">Loading...</Text>
      </Container>
    )
  }

  if (isError) {
    return (
      <Container className="p-6 bg-white rounded-xl flex flex-col items-center justify-center min-h-[400px]">
        <Heading level="h2" className="text-lg font-semibold mb-4">
          Category Ratings
        </Heading>
        <Text className="text-red-500">
          Error: {error instanceof Error ? error.message : "Failed to load data"}
        </Text>
      </Container>
    )
  }

  if (!data?.data?.length) {
    return (
      <Container className="p-6 bg-white rounded-xl flex flex-col items-center justify-center min-h-[400px]">
        <Heading level="h2" className="text-lg font-semibold mb-4">
          Category Ratings
        </Heading>
        <Text className="text-gray-500">No category rating data available</Text>
      </Container>
    )
  }

  const chartData = data.data
  const categoriesWithReviews = chartData.filter((cat) => cat.review_count > 0)
  const categoriesWithoutReviews = chartData.filter((cat) => cat.review_count === 0)

  // Calculate chart height based on number of categories, with reasonable min/max
  const chartHeight = Math.min(Math.max(400, chartData.length * 80), 600)

  const CustomXAxisTick = ({ x, y, payload }: any) => {
    const categoryData = chartData.find((cat) => cat.category === payload.value)
    const hasNoReviews = categoryData?.review_count === 0
    const label = payload.value
    const maxLength = 25
    const displayLabel = label.length > maxLength ? label.substring(0, maxLength) + "..." : label
    const reviewIndicator = hasNoReviews ? " (No reviews)" : ""
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={10}
          textAnchor="end"
          fill={hasNoReviews ? "#9CA3AF" : "#374151"}
          fontSize={13}
          fontWeight={hasNoReviews ? "normal" : "500"}
          transform="rotate(-45)"
        >
          {displayLabel}{reviewIndicator}
        </text>
      </g>
    )
  }

  return (
    <div className="w-full p-6 bg-white rounded-xl flex flex-col">
      <Heading level="h2" className="text-xl font-semibold mb-4 text-gray-800">
        Category Ratings Distribution
      </Heading>

      <div className="w-full overflow-x-auto">
        <div style={{ minWidth: "700px" }}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={chartData}
              margin={{ top: 30, right: 40, bottom: 80, left: 60 }}
            >
              <XAxis dataKey="category" tick={<CustomXAxisTick />} height={120} interval={0} />

              <YAxis
                label={{
                  value: "Number of Products",
                  angle: -90,
                  position: "insideLeft",
                  dx: -35,
                  style: { textAnchor: "middle", fontSize: 14, fill: "#374151", fontWeight: "500" },
                }}
                tick={{ fontSize: 12, fill: "#6B7280" }}
              />

              <Tooltip content={<ChartCustomTooltip />} />

              <Legend
                verticalAlign="top"
                height={50}
                iconType="square"
                iconSize={16}
                wrapperStyle={{ paddingBottom: "20px" }}
                formatter={(value) => (
                  <span className="text-base font-semibold text-gray-700">{value}</span>
                )}
              />

              <Bar dataKey="rating_5" name="5 ⭐" stackId="ratings" fill={RATING_COLORS.rating_5} />
              <Bar dataKey="rating_4" name="4 ⭐" stackId="ratings" fill={RATING_COLORS.rating_4} />
              <Bar dataKey="rating_3" name="3 ⭐" stackId="ratings" fill={RATING_COLORS.rating_3} />
              <Bar dataKey="rating_2" name="2 ⭐" stackId="ratings" fill={RATING_COLORS.rating_2} />
              <Bar dataKey="rating_1" name="1 ⭐" stackId="ratings" fill={RATING_COLORS.rating_1} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Text className="text-gray-600 text-sm font-medium text-center">
          Showing {chartData.length} categories
        </Text>

        {categoriesWithoutReviews.length > 0 && (
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <Text className="text-sm font-semibold text-gray-700 mb-1">
              Categories without reviews ({categoriesWithoutReviews.length}):
            </Text>
            <Text className="text-sm text-gray-600 break-words">
              {categoriesWithoutReviews.map((cat) => cat.category).join(", ")}
            </Text>
          </div>
        )}

        {categoriesWithReviews.length > 0 && (
          <Text className="text-sm text-gray-500 text-center">
            {categoriesWithReviews.length} categories with active reviews
          </Text>
        )}
      </div>
    </div>
  )
}
