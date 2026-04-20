import { DashboardFilterBar } from "../../components/dashboard/dashboard-filter-bar";
// import { NewVsReturningCustomersChart } from "./components/new-vs-returning/new-vs-returning-customers-chart";
import { RepeatPurchaseRateCard } from "./components/repeat-purchase-rate/repeat-purchase-rate-card";
import { TopCustomerLocationsChart } from "./components/top-customer-locations/top-customer-locations-chart";
import { CustomerLifetimeValueTile } from "./components/customer-lifetime-value/customer-lifetime-value";
import { ReturnRateKPI } from "../../routes/dashboard/components/return-rate/return-rate-kpi"
import { CancellationsByReasonChart } from "../../routes/dashboard/components/return-rate/cancellations-by-reason-chart"
import { DiscountUsageImpactKPI } from "../../routes/dashboard/components/discount-usage-impact/discount-usage-impact-kpi"
import DashboardProducts from "./components/dashboard-products/dashboard-products";
import InventoryMovement from "./components/dashboard-products/inventory-movement/inventory-movement";
import PaymentMethodDistribution from "./components/dashboard-products/payment-method-distribution/payment-method-distribution";
import { TopRatedProductsChart } from "./components/Top_Rated_Products/top_rated_products"
import { CategoryRatingsChart } from "./components/dashboard-category-ratings.tsx/dashboard-category-ratings.tsx"
import { useDashboardFilter } from "../../providers/dashboard-filter-provider";
import { PaymentSuccessRateCard } from "./components/dashboard-products/payment-success-rate/payment-success-rate";
import { TotalRefundsKPI, TotalRefundedKPI, AverageRefundTimeKPI } from "./components/dashboard-products/refund-volume/refund-volume";
import { useState } from "react";
import { ChevronUpMini, ChevronDownMini } from "@shopenup/icons";
import { Button } from "@shopenup/ui";



import {
  OrderKPIsSection,
  NewCustomersKPI,
  OrderStatusChartSection,
  CategoryRevenueChartSection,
  SalesTrendChartSection,
} from './components/Order'

export const Dashboard = () => {
  const { activeTab } = useDashboardFilter()
  const [showFilters, setShowFilters] = useState(true)

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">

      {/* Dashboard Filters - Sticky */}
      <div className="sticky top-0 z-[100] bg-gray-50 mb-4 sm:mb-6 pb-2 sm:pb-4">
        {/* Mobile Toggle Button - Only visible on mobile */}
        <div className="sm:hidden mb-2 flex justify-end">
          <Button
            variant="transparent"
            size="small"
            onClick={() => setShowFilters(!showFilters)}
            className="text-ui-fg-muted hover:text-ui-fg-base flex items-center gap-1"
          >
            {showFilters ? (
              <>
                <ChevronUpMini className="h-4 w-4" />
                <span className="text-xs">Hide Filters</span>
              </>
            ) : (
              <>
                <ChevronDownMini className="h-4 w-4" />
                <span className="text-xs">Show Filters</span>
              </>
            )}
          </Button>
        </div>
        
        {/* Filter Bar - Only hide filter form on mobile when showFilters is false, tabs always visible */}
        <DashboardFilterBar hideFilters={!showFilters} />
      </div>

      {/* KPIs Tab Content */}
      {activeTab === "kpis" && (
        <>
          <div className="mb-4 sm:mb-6">
            <OrderKPIsSection />
          </div>
          {/* Customer Metrics KPIs - 4 in one row */}
          <div className="mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <NewCustomersKPI />
            <RepeatPurchaseRateCard />
            <CustomerLifetimeValueTile />
            <ReturnRateKPI />
          </div>
          {/* Payment & Refund KPIs - 4 in one row */}
          <div className="mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <DiscountUsageImpactKPI />
            <PaymentSuccessRateCard showOnlyKPI={true} />
            <TotalRefundsKPI />
            <TotalRefundedKPI />
          </div>
          {/* Additional Refund KPIs - 4 in one row */}
          <div className="mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <AverageRefundTimeKPI />
          </div>
        </>
      )}

      {/* Charts Tab Content */}
      {activeTab === "charts" && (
        <>
          {/* Sales Trend Chart Section */}
          <div className="mb-4 sm:mb-6">
            <SalesTrendChartSection />
          </div>

          

          {/* Charts Row */}
          <div className="mb-4 sm:mb-6 flex flex-col lg:flex-row gap-4 sm:gap-6">
            <OrderStatusChartSection />
            <PaymentMethodDistribution />
          </div>

          {/* Payment Method Distribution - Full Width */}
          <div className="mb-4 sm:mb-6 w-full">
          <CategoryRevenueChartSection />
          </div>

          {/* Inventory Movement by Location / City - Full Width */}
          <div className="mb-4 sm:mb-6 w-full">
            <InventoryMovement />
          </div>

          {/* Top 10 Customer Locations - Full Width */}
          <div className="mb-4 sm:mb-6 w-full">
            <div className="bg-white rounded-2xl shadow-sm p-3 sm:p-4 border border-gray-100">
              <TopCustomerLocationsChart />
            </div>
          </div>

          {/* Return Rate Section */}
          <div className="mb-4 sm:mb-6">
            {/* Cancellations By Reason Chart - Full Width */}
            <CancellationsByReasonChart />
          </div>
          {/* Top Rated Products - Full Width */}
          <div className="mb-4 sm:mb-6 w-full">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 flex flex-col justify-between">
              <TopRatedProductsChart />
            </div>
          </div>

          {/* Category Ratings Distribution - Full Width */}
          <div className="mb-4 sm:mb-6 w-full">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 flex flex-col justify-between">
              <CategoryRatingsChart />
            </div>
          </div>
        </>
      )}

      {/* Statistics Tab Content */}
      {activeTab === "statistics" && (
        <>
          <div className="mb-4 sm:mb-6">
            <DashboardProducts />
          </div>
        </>
      )}

    </div>
  );
}
