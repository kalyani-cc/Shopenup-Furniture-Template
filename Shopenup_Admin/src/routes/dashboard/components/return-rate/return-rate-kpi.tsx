import { useMemo } from "react";
import { useReturns } from "../../../../hooks/api/returns";
import { useDashboardFilter } from "../../../../providers/dashboard-filter-provider";
import { DeltaArrow } from "../Order/kpi-box/delta-arrow";

interface ReturnRateKPIProps {
  className?: string;
}

export const ReturnRateKPI = ({ className }: ReturnRateKPIProps) => {
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
  // The API returns shippedOrdersCount directly
  const allReturns = useReturns(returnQueryFilters);

  const { isLoading, error } = allReturns;

  // Calculate Return Rate metrics using shippedOrdersCount from API
  const returnMetrics = useMemo(() => {
    // Get shipped orders count from API response
    const shippedOrdersCount = (allReturns as any)?.shippedOrdersCount ?? 0;
    
    // Returns are already filtered by the API to only include returns from shipped orders
    const returnedOrders = (allReturns as any)?.returns?.length ?? 0;

    // Calculate return rate: (Returned orders ÷ Total shipped) × 100
    const returnRate =
      shippedOrdersCount > 0
        ? ((returnedOrders / shippedOrdersCount) * 100).toFixed(2)
        : "0.00";

    return {
      totalShipped: shippedOrdersCount,
      totalReturned: returnedOrders,
      returnRate: parseFloat(returnRate), // Convert to number for calculations
      returnRateFormatted: `${returnRate}%`,
    };
  }, [allReturns]);

  // Extract comparison data when comparison mode is enabled
  const comparisonData = useMemo(() => {
    if (
      filters.comparisonMode &&
      allReturns &&
      'comparison' in allReturns &&
      allReturns.comparison?.previousPeriod
    ) {
      return allReturns.comparison;
    }
    return null;
  }, [allReturns, filters.comparisonMode]);

  // Calculate previous period return rate and differences
  const comparisonMetrics = useMemo(() => {
    if (!comparisonData?.previousPeriod) {
      return null;
    }

    const previousShippedOrdersCount = comparisonData.previousPeriod.shippedOrdersCount ?? 0;
    const previousReturnedOrders = comparisonData.previousPeriod.returns?.length ?? 0;
    // Also check count field if returns array is not available (more reliable)
    const previousReturnedOrdersFromCount = comparisonData.previousPeriod.count ?? 0;
    const previousReturnedOrdersFinal = previousReturnedOrders > 0 ? previousReturnedOrders : previousReturnedOrdersFromCount;

    // Check if previous period has valid data (shipped orders > 0)
    const hasValidPreviousData = previousShippedOrdersCount > 0;

    // Calculate previous period return rate
    const previousReturnRate =
      hasValidPreviousData
        ? ((previousReturnedOrdersFinal / previousShippedOrdersCount) * 100)
        : 0;

    // Calculate differences only if previous period has valid data
    const returnRateDifference = hasValidPreviousData
      ? returnMetrics.returnRate - previousReturnRate
      : null;
    const shippedDifference = returnMetrics.totalShipped - previousShippedOrdersCount;
    const returnedDifference = returnMetrics.totalReturned - previousReturnedOrdersFinal;

    return {
      previousReturnRate: previousReturnRate,
      previousReturnRateFormatted: `${previousReturnRate.toFixed(2)}%`,
      previousShipped: previousShippedOrdersCount,
      previousReturned: previousReturnedOrdersFinal,
      returnRateDifference: returnRateDifference,
      shippedDifference: shippedDifference,
      returnedDifference: returnedDifference,
      hasValidPreviousData: hasValidPreviousData,
    };
  }, [comparisonData, returnMetrics]);

  // Calculate delta percentage for comparison
  const delta = useMemo(() => {
    if (!comparisonMetrics?.hasValidPreviousData || comparisonMetrics.returnRateDifference === null) {
      return null;
    }
    // Calculate percentage change: (current - previous) / previous * 100
    const previousRate = comparisonMetrics.previousReturnRate;
    if (previousRate === 0) return null;
    return ((returnMetrics.returnRate - previousRate) / previousRate) * 100;
  }, [comparisonMetrics, returnMetrics.returnRate]);

  const deltaDirection = useMemo(() => {
    if (delta === null) return 'flat';
    // Lower return rate is better, so negative delta is positive trend
    return delta <= 0 ? 'up' : 'down';
  }, [delta]);

  // Format comparison string
  const comparison = useMemo(() => {
    if (!comparisonMetrics) {
      return `vs previous period 0 ( +0.0% )`;
    }
    const previousValue = comparisonMetrics.previousReturnRate.toFixed(2);
    const sign = delta !== null && delta >= 0 ? '+' : '';
    const deltaValue = delta !== null ? delta.toFixed(1) : '0.0';
    return `vs previous period ${previousValue} ( ${sign}${deltaValue}% )`;
  }, [comparisonMetrics, delta]);

  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
        <div className="text-sm font-medium text-indigo-800">Return Rate (%)</div>
        <div className="mt-3 text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
        <div className="text-sm font-medium text-indigo-800">Return Rate (%)</div>
        <div className="mt-3 text-sm text-red-500">Error loading data</div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
      <div className="text-sm font-medium text-indigo-800">Return Rate (%)</div>

      <div className="mt-3 flex items-center gap-3">
        <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 leading-tight">
          {returnMetrics.returnRateFormatted}
        </div>

        {filters.comparisonMode && delta !== null && (
          <div
            className={`flex items-center text-sm font-medium ${
              deltaDirection === 'up'
                ? 'text-green-600'
                : deltaDirection === 'down'
                  ? 'text-red-500'
                  : 'text-gray-400'
            }`}
          >
            <span className="inline-flex items-center">
              <DeltaArrow direction={deltaDirection} />
            </span>
            <span className="ml-1">
              {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {filters.comparisonMode && comparison && (() => {
        const colorClass = delta !== null
          ? delta <= 0
            ? 'text-green-600'
            : 'text-red-500'
          : 'text-gray-500';
        
        const match = comparison.match(/vs previous period\s+([\d,.\d]+)\s*\(([^)]+)\)/);
        
        if (match && match.length >= 3) {
          const previousValue = match[1].trim();
          const percentage = match[2].trim();
          
          return (
            <div className="mt-2 text-sm text-gray-400">
              <span>vs previous period </span>
              <span className="text-gray-500 font-medium">{previousValue}</span>
              <span className="ml-1">( </span>
              <span className={`${colorClass} font-medium`}>{percentage}</span>
              <span> )</span>
            </div>
          );
        }
        
        return (
          <div className="mt-2 text-sm text-gray-400">
            <span>{comparison}</span>
          </div>
        );
      })()}
    </div>
  );
};

