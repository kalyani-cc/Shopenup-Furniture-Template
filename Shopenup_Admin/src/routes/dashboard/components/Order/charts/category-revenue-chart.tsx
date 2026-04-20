import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useMemo } from 'react'
import type { CategoryData } from '../types'
import { EmptyState } from '../components/empty-state'

type CategoryRevenueChartProps = {
  categories: CategoryData[]
}

// Custom tooltip component to show revenue on hover
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-800">{data.name}</p>
        <p className="text-sm text-gray-600">
          Revenue: <span className="font-medium">₹{data.revenue.toLocaleString()}</span>
        </p>
        <p className="text-sm text-gray-600">
          Quantity: <span className="font-medium">{data.quantity.toLocaleString()}</span>
        </p>
      </div>
    )
  }
  return null
}

// Custom tick component to display category names in 2 lines
const CustomTick = ({ x, y, payload, viewBox }: any) => {
  const name = payload.value || ''
  const words = name.split(' ')
  const midPoint = Math.ceil(words.length / 2)
  const line1 = words.slice(0, midPoint).join(' ')
  const line2 = words.slice(midPoint).join(' ')
  
  // Check if mobile view (chart width < 600px)
  const isMobile = viewBox?.width && viewBox.width < 600
  
  if (isMobile) {
    // On mobile, show truncated single line with ellipsis
    const maxLength = 12
    const truncatedName = name.length > maxLength 
      ? name.substring(0, maxLength - 3) + '...' 
      : name
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={8}
          textAnchor="middle"
          fill="#6b7280"
          fontSize={9}
        >
          {truncatedName}
        </text>
      </g>
    )
  }
  
  // Desktop: show 2 lines
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={8}
        textAnchor="middle"
        fill="#6b7280"
        fontSize={11}
      >
        {line1}
      </text>
      {line2 && (
        <text
          x={0}
          y={0}
          dy={22}
          textAnchor="middle"
          fill="#6b7280"
          fontSize={11}
        >
          {line2}
        </text>
      )}
    </g>
  )
}

/**
 * Calculate nice maximum value for Y-axis scaling
 */
function getNiceMax(value: number, actualMax: number): number {
  if (value <= 0) return 1000
  
  // For values under 1000, use simple rounding
  if (actualMax < 1000) {
    return Math.ceil(value / 100) * 100
  }
  
  // For values 1000 and above, find nice number
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  const normalized = value / magnitude
  let niceValue
  if (normalized <= 1.2) niceValue = 1.2
  else if (normalized <= 1.5) niceValue = 1.5
  else if (normalized <= 2) niceValue = 2
  else if (normalized <= 2.5) niceValue = 2.5
  else if (normalized <= 3) niceValue = 3
  else if (normalized <= 4) niceValue = 4
  else if (normalized <= 5) niceValue = 5
  else niceValue = 10
  
  const niceMax = niceValue * magnitude
  // Don't go more than 25% above the actual max
  const maxAllowed = actualMax * 1.25
  return Math.min(niceMax, maxAllowed)
}

export function CategoryRevenueChart({ categories }: CategoryRevenueChartProps) {
  const chartData = useMemo(() => {
    if (!categories || categories.length === 0) return []

    // Sort by revenue descending and limit to top categories
    return categories
      .filter((cat) => cat.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .map((cat) => ({
        name: cat.name,
        revenue: cat.revenue,
        quantity: cat.quantity,
      }))
  }, [categories])

  if (chartData.length === 0) {
    return (
      <div className="mt-6 w-full lg:flex-1 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">
          Top Selling Categories
        </h2>
        <EmptyState message="No category data available" />
      </div>
    )
  }

  // Calculate max revenue for Y-axis scaling
  const maxRevenue = Math.max(...chartData.map((d) => d.revenue))
  const paddedMax = maxRevenue * 1.2
  const yAxisMax = getNiceMax(paddedMax, maxRevenue)

  return (
    <div className="mt-6 w-full lg:flex-1 p-4 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">
        Top Selling Categories
      </h2>
      <div className="w-full" style={{ minHeight: '300px', height: '400px' }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 10, bottom: 50, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              tick={<CustomTick />}
              interval={0}
              height={50}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickFormatter={(value) => {
                if (value >= 1000) {
                  const kValue = value / 1000
                  // Remove decimal if it's a whole number
                  return kValue % 1 === 0 ? `₹${kValue}K` : `₹${kValue.toFixed(1)}K`
                }
                return `₹${value}`
              }}
              domain={[0, yAxisMax]}
              width={60}
              allowDecimals={false}
              tickCount={5}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="revenue"
              fill="#6366f1"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

