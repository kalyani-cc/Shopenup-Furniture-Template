import { useMemo } from "react";
import { usePromotions } from "../../../../hooks/api/promotions";
import { useDashboardFilter } from "../../../../providers/dashboard-filter-provider";
import { DeltaArrow } from "../Order/kpi-box/delta-arrow";

interface DiscountUsageImpactKPIProps {
  className?: string;
}

export const DiscountUsageImpactKPI = ({ className }: DiscountUsageImpactKPIProps) => {
  const { filters } = useDashboardFilter();

  // Build query filters for promotions - use dashboard filter format (calls custom API)
  const promotionQueryFilters = useMemo(() => {
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

  // Fetch promotions with dashboard filters applied (uses custom API endpoint)
  // The API returns discountUsageImpact data directly
  const promotionsData = usePromotions(promotionQueryFilters);

  const { isLoading, error } = promotionsData;

  // Extract discount usage impact from API response
  const discountUsageImpact = useMemo(() => {
    if (promotionsData && 'discountUsageImpact' in promotionsData && promotionsData.discountUsageImpact) {
      return promotionsData.discountUsageImpact;
    }
    return {
      percentage: 0,
      totalRevenue: 0,
      revenueWithDiscounts: 0,
      totalDiscountAmount: 0,
    };
  }, [promotionsData]);

  // Extract comparison data when comparison mode is enabled
  const comparisonData = useMemo(() => {
    if (
      filters.comparisonMode &&
      promotionsData &&
      'comparison' in promotionsData &&
      promotionsData.comparison?.previousPeriod?.discountUsageImpact
    ) {
      return promotionsData.comparison;
    }
    return null;
  }, [promotionsData, filters.comparisonMode]);

  // Calculate differences between current and previous period
  const comparisonDifferences = useMemo(() => {
    if (!comparisonData?.previousPeriod?.discountUsageImpact) {
      return null;
    }

    const current = discountUsageImpact;
    const previous = comparisonData.previousPeriod.discountUsageImpact;

    return {
      percentage: current.percentage - previous.percentage,
      totalRevenue: current.totalRevenue - previous.totalRevenue,
      revenueWithDiscounts: current.revenueWithDiscounts - previous.revenueWithDiscounts,
      totalDiscountAmount: current.totalDiscountAmount - previous.totalDiscountAmount,
    };
  }, [comparisonData, discountUsageImpact]);

  // Calculate delta percentage for comparison
  const delta = useMemo(() => {
    if (!comparisonDifferences) {
      return null;
    }
    return comparisonDifferences.percentage;
  }, [comparisonDifferences]);

  const deltaDirection = useMemo(() => {
    if (delta === null) return 'flat';
    // Higher percentage is better for discount usage impact
    return delta >= 0 ? 'up' : 'down';
  }, [delta]);

  // Format comparison string
  const comparison = useMemo(() => {
    if (!comparisonData?.previousPeriod?.discountUsageImpact) {
      return `vs previous period 0 ( +0.0% )`;
    }
    const previousValue = comparisonData.previousPeriod.discountUsageImpact.percentage.toFixed(2);
    const sign = delta !== null && delta >= 0 ? '+' : '';
    const deltaValue = delta !== null ? delta.toFixed(1) : '0.0';
    return `vs previous period ${previousValue} ( ${sign}${deltaValue}% )`;
  }, [comparisonData, delta]);

  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
        <div className="text-sm font-medium text-indigo-800">Discount Usage Impact (%)</div>
        <div className="mt-3 text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
        <div className="text-sm font-medium text-indigo-800">Discount Usage Impact (%)</div>
        <div className="mt-3 text-sm text-red-500">Error loading data</div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-100 rounded-md p-5 shadow-sm ${className || ""}`}>
      <div className="text-sm font-medium text-indigo-800">Discount Usage Impact (%)</div>

      <div className="mt-3 flex items-center gap-3">
        <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 leading-tight">
          {discountUsageImpact.percentage.toFixed(2)}%
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
          ? delta >= 0
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

