import { useMemo } from "react";
import { Text } from "@shopenup/ui";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useReturns } from "../../../../hooks/api/returns";
import { useDashboardFilter } from "../../../../providers/dashboard-filter-provider";

interface TopReturnReasonsChartProps {
  className?: string;
}

type ChartDataItem = {
  name: string;
  fullName: string;
  value: number;
};

export const TopReturnReasonsChart = ({ className }: TopReturnReasonsChartProps) => {
  const { filters } = useDashboardFilter();

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

  // Process return reasons data dynamically from fetched database data
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
                        'No reason provided';
          
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        });
      } else if (returnItem.reason) {
        // Some returns might have reason at top level
        const reason = typeof returnItem.reason === 'string' 
          ? returnItem.reason 
          : (returnItem.reason?.label || 'No reason provided');
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      }
    });

    // Convert to array and sort by count (descending)
    const sortedReasons = Object.entries(reasonCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5); // Top 5 reasons

    // Transform to recharts format - all data from database
    return sortedReasons.map(([label, count]) => ({
      name: label.length > 20 ? label.substring(0, 17) + '...' : label,
      fullName: label,
      value: count,
    }));
  }, [returns]);

  if (isLoading) {
    return (
      <div className={`bg-white p-5 rounded-lg border border-gray-300 hover:border-purple-600 focus-within:border-purple-600 transition-colors flex items-center justify-center ${className || ""}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white p-5 rounded-lg border border-gray-300 hover:border-purple-600 focus-within:border-purple-600 transition-colors flex items-center justify-center ${className || ""}`}>
        <div className="text-center">
          <p className="text-red-600 text-sm">Error loading data</p>
        </div>
      </div>
    );
  }

  const total = chartData.reduce((sum: number, item: ChartDataItem) => sum + item.value, 0);

  if (total === 0 || chartData.length === 0) {
    return (
      <div className={`bg-white p-5 rounded-lg border border-gray-300 hover:border-purple-600 focus-within:border-purple-600 transition-colors flex flex-col ${className || ""}`}>
        <div className="mb-4">
          <h3 className="text-blue-900 font-bold text-lg">Top Return Reasons</h3>
        </div>
        <div className="h-64 flex items-center justify-center">
          <Text size="small" className="text-ui-fg-muted">No return data available</Text>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white p-5 rounded-lg border border-gray-300 hover:border-purple-600 focus-within:border-purple-600 transition-colors flex flex-col ${className || ""}`}>
      <div className="flex flex-col">
        <div className="mb-4">
          <h3 className="text-blue-900 font-bold text-lg">Top Return Reasons</h3>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              margin={{ top: 10, right: 10, left: 0, bottom: chartData.length > 5 || chartData.some(item => item.name.length > 12) ? 35 : 20 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="0" vertical={false} stroke="transparent" />
              <XAxis 
                dataKey="name" 
                angle={chartData.length > 5 || chartData.some(item => item.name.length > 12) ? -35 : 0}
                textAnchor={chartData.length > 5 || chartData.some(item => item.name.length > 12) ? "end" : "middle"}
                height={chartData.length > 5 || chartData.some(item => item.name.length > 12) ? 45 : 25}
                interval={0}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                width={50}
                domain={[0, 'auto']}
                allowDecimals={false}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(66, 66, 245, 0.1)' }}
                formatter={(value: number) => [value, 'Count']}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0] && payload[0].payload) {
                    return payload[0].payload.fullName;
                  }
                  return label;
                }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                labelStyle={{ 
                  fontWeight: 600, 
                  marginBottom: '4px',
                  color: '#111827'
                }}
              />
              <Bar 
                dataKey="value" 
                fill="#4242f5" 
                radius={0}
                maxBarSize={80}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

