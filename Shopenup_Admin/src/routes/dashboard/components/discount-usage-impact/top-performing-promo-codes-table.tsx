import { useMemo } from "react";
import { usePromotions } from "../../../../hooks/api/promotions";
import { useDashboardFilter } from "../../../../providers/dashboard-filter-provider";

interface TopPerformingPromoCodesTableProps {
  className?: string;
}

type PromoCodeStats = {
  code: string;
  orders: number;
  revenue: number;
  avgDiscount: number;
  totalDiscount: number;
  promotionId?: string;
};

export const TopPerformingPromoCodesTable = ({ className }: TopPerformingPromoCodesTableProps) => {
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
  // The API returns topPerformingPromoCodes data directly
  const promotionsData = usePromotions(promotionQueryFilters);

  const { isLoading, error } = promotionsData;

  // Extract top performing promo codes from API response and sort by order count (highest first)
  const promoCodeStats = useMemo(() => {
    if (promotionsData && 'topPerformingPromoCodes' in promotionsData && promotionsData.topPerformingPromoCodes) {
      const stats = promotionsData.topPerformingPromoCodes as PromoCodeStats[];
      // Sort by orders count in descending order (highest first)
      return [...stats].sort((a, b) => b.orders - a.orders);
    }
    return [];
  }, [promotionsData]);

  if (isLoading) {
    return (
      <div className={`rounded-xl shadow-lg p-6 text-center text-black animate-pulse ${className || ""}`}>
        Loading top performing promo codes...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gradient-to-r from-red-500 via-pink-500 to-orange-500 rounded-xl shadow-lg p-6 text-center text-white ${className || ""}`}>
        <div>Failed to load data.</div>
        {error && (
          <div className="mt-2 text-xs opacity-80">
            Error: {error?.message || JSON.stringify(error)}
          </div>
        )}
      </div>
    );
  }

  if (promoCodeStats.length === 0) {
    return (
      <div className={`rounded-2xl overflow-hidden shadow-xl bg-white border border-indigo-200 ${className || ""}`}>
        <div className="p-3 sm:p-4 bg-gradient-to-r from-indigo-50 via-blue-50 to-violet-50">
          <h3 className="text-base sm:text-lg font-semibold text-blue-800">
            Top Performing Promo Codes
          </h3>
        </div>
        <div className="px-3 sm:px-4 py-6 sm:py-8 text-center text-sm sm:text-base text-gray-500">
          No promo code data available
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl overflow-hidden shadow-xl bg-white border border-indigo-200 ${className || ""}`}>
      <div className="p-3 sm:p-4 bg-gradient-to-r from-indigo-50 via-blue-50 to-violet-50">
        <h3 className="text-base sm:text-lg font-semibold text-blue-800">
          Top Performing Promo Codes
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700">No</th>
              <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700">Promo Code</th>
              <th className="text-center px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700">Used In Orders</th>
            </tr>
          </thead>
          <tbody>
            {promoCodeStats.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-2 sm:px-4 py-6 sm:py-8 text-center text-gray-500 text-sm">
                  No data available
                </td>
              </tr>
            ) : (
              promoCodeStats.map((stat, index) => (
                <tr key={stat.code} className="border-b hover:bg-gray-50">
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">{index + 1}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900">{stat.code || "-"}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center font-semibold text-gray-900">
                    {stat.orders.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

