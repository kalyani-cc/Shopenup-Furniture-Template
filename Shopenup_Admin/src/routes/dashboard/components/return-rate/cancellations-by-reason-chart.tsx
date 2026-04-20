import { useMemo, useState, useEffect } from "react";
import { Heading, Text } from "@shopenup/ui";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useReturns } from "../../../../hooks/api/returns";
import { useDashboardFilter } from "../../../../providers/dashboard-filter-provider";

const COLORS = ["#6366F1", "#6366F1", "#6366F1", "#6366F1", "#6366F1"];

const ChartCustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const { fullName, value } = payload[0].payload;
    return (
      <div className="bg-white p-2 sm:p-3 rounded-md shadow-md text-xs sm:text-sm">
        <Text className="font-semibold text-xs sm:text-sm">{fullName}</Text>
        <Text className="text-xs sm:text-sm text-gray-600">
          Count: {value}
        </Text>
      </div>
    );
  }
  return null;
};

interface CancellationsByReasonChartProps {
  className?: string;
}

type ChartDataItem = {
  name: string;
  fullName: string;
  value: number;
};

export const CancellationsByReasonChart = ({ className }: CancellationsByReasonChartProps) => {
  const { filters } = useDashboardFilter();
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Build query filters for returns - use dashboard filter format (calls custom API)
  const returnQueryFilters = useMemo(() => {
    if (!filters.dateRange?.from || !filters.dateRange?.to) {
      return undefined; // Don't use custom API if dateRange is missing
    }
    return {
      dateRange: {
        from: filters.dateRange.from,
        to: filters.dateRange.to,
      },
      selectedDateRange: filters.selectedDateRange,
      region: filters.region,
      state: filters.state,
      comparisonMode: filters.comparisonMode,
      limit: 999999,
      offset: 0,
    };
  }, [filters]);

  // Fetch returns with dashboard filters applied (uses custom API endpoint)
  // The API already filters returns to only include those from shipped orders
  const allReturns = useReturns(returnQueryFilters);

  const { isLoading, error } = allReturns;
  const returns = (allReturns as any)?.returns || [];

  // Process return reasons data dynamically from fetched database data - show ALL return reasons
  const chartData = useMemo((): ChartDataItem[] => {
    if (!returns || returns.length === 0) {
      return [];
    }

    // Returns are already filtered by the API to only include returns from shipped orders
    const filteredReturns = returns;

    // Count occurrences of each return reason - dynamically from database
    // Handle different item formats: items, return_items, line_items (matching backend API)
    const reasonCounts: Record<string, number> = {};
    
    filteredReturns.forEach((returnItem: any) => {
      // Try different field names for return items (matching backend API logic)
      const items = returnItem.items || returnItem.return_items || returnItem.line_items || [];
      
      if (Array.isArray(items) && items.length > 0) {
        items.forEach((item: any) => {
          // Try different reason field formats (matching backend API logic)
          const reason = item.reason?.label || 
                        (typeof item.reason === 'string' ? item.reason : null) ||
                        item.return_reason ||
                        (item.reason_id ? `Reason ID: ${item.reason_id}` : null) ||
                        'Others';
          
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        });
      } else if (returnItem.reason) {
        // Some returns might have reason at top level
        const reason = typeof returnItem.reason === 'string' 
          ? returnItem.reason 
          : (returnItem.reason?.label || 'Other');
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      }
    });

    // Convert to array and sort by count (descending) - show ALL reasons, no limit
    const sortedReasons = Object.entries(reasonCounts)
      .sort(([, a], [, b]) => b - a); // Show all reasons, no limit

    // Transform to recharts format - all data from database
    // Truncate labels more aggressively on mobile
    return sortedReasons.map(([label, count]) => ({
      name: label.length > (isMobile ? 12 : 20) ? label.substring(0, isMobile ? 9 : 17) + '...' : label,
      fullName: label,
      value: count,
    }));
  }, [returns, isMobile]);

  if (isLoading) {
    return (
      <div className={`p-4 sm:p-6 bg-white rounded-lg flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] ${className || ""}`}>
        <Heading level="h2" className="text-lg sm:text-xl font-semibold mb-4 text-gray-800">
          Return Reasons
        </Heading>
        <Text className="text-sm sm:text-base text-gray-500">Loading...</Text>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 sm:p-6 bg-white rounded-lg flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] ${className || ""}`}>
        <Heading level="h2" className="text-lg sm:text-xl font-semibold mb-4 text-gray-800">
          Return Reasons
        </Heading>
        <Text className="text-xs sm:text-sm text-red-500 text-center px-2">
          Error: {error instanceof Error ? error.message : "Failed to load data"}
        </Text>
      </div>
    );
  }

  const total = chartData.reduce((sum: number, item: ChartDataItem) => sum + item.value, 0);

  if (total === 0 || chartData.length === 0) {
    return (
      <div className={`p-4 sm:p-6 bg-white rounded-lg flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] ${className || ""}`}>
        <Heading level="h2" className="text-lg sm:text-xl font-semibold mb-4 text-gray-800">
          Return Reasons
        </Heading>
        <Text className="text-sm sm:text-base text-gray-500">No return data available</Text>
      </div>
    );
  }

  // Custom X-axis tick for multi-line labels - responsive for mobile
  const CustomTick = ({ x, y, payload }: any) => {
    if (!payload?.value) return null;
    
    if (isMobile) {
      // On mobile, show single line with rotation or truncation
      return (
        <g transform={`translate(${x},${y + 10})`}>
          <text
            textAnchor="middle"
            fill="#6b7280"
            fontSize={9}
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {payload.value}
          </text>
        </g>
      );
    }
    
    // Desktop: multi-line labels
    const words = payload.value.split(" ");
    const mid = Math.ceil(words.length / 2);
    const line1 = words.slice(0, mid).join(" ");
    const line2 = words.slice(mid).join(" ");

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
    );
  };

  // Add fill color to chart data
  const chartDataWithColors = chartData.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
  }));

  // Calculate bar size and spacing for limited data (1-3 items)
  const dataCount = chartData.length;
  let maxBarSize: number | undefined;
  let barCategoryGap: string;

  if (dataCount === 1) {
    maxBarSize = 100; // Limit single bar to 100px width
    barCategoryGap = "60%"; // Large gap to center the single bar
  } else if (dataCount === 2) {
    maxBarSize = 80; // Limit each bar to 80px width
    barCategoryGap = "40%"; // More spacing between 2 bars
  } else if (dataCount === 3) {
    maxBarSize = 70; // Limit each bar to 70px width
    barCategoryGap = "30%"; // More spacing between 3 bars
  } else {
    maxBarSize = undefined; // No limit for 4+ items
    barCategoryGap = isMobile ? "5%" : "10%"; // Default spacing
  }

  return (
    <div className={`p-4 sm:p-6 bg-white rounded-lg flex flex-col justify-between min-h-[300px] sm:min-h-[400px] outline-none focus:outline-none ${className || ""}`}>
      <Heading level="h2" className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800">
        Return Reasons
      </Heading>

      <div className="w-full overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 350} minWidth={isMobile && dataCount > 1 ? Math.max(600, chartData.length * 40) : undefined}>
          <BarChart 
            data={chartDataWithColors} 
            margin={{ 
              top: isMobile ? 20 : 30, 
              right: isMobile ? 5 : 10, 
              bottom: isMobile ? (chartData.length > 10 ? 80 : 50) : 30, 
              left: isMobile ? 5 : 10 
            }}
            style={{ outline: 'none' }}
            barCategoryGap={barCategoryGap}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="name" 
              tick={<CustomTick />} 
              interval={isMobile && chartData.length > 15 ? "preserveStartEnd" : 0} 
              height={isMobile ? (chartData.length > 10 ? 80 : 60) : 60}
              angle={isMobile && chartData.length > 10 ? -45 : 0}
              textAnchor={isMobile && chartData.length > 10 ? "end" : "middle"}
            />
            <YAxis 
              tick={{ fontSize: isMobile ? 10 : 12, fill: "#6b7280" }} 
              domain={[0, 'auto']} 
              allowDecimals={false}
              width={isMobile ? 35 : 50}
            />
            <Tooltip content={<ChartCustomTooltip />} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={maxBarSize}>
              {chartDataWithColors.map((entry, i) => (
                <Cell key={`bar-${i}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <Text className="text-gray-500 text-xs sm:text-sm text-center mt-2">
        Showing {chartData.length} return reason{chartData.length !== 1 ? 's' : ''}
      </Text>
    </div>
  );
};


