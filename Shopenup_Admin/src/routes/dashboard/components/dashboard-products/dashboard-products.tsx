"use client";

import React from "react";
import BestSellingProducts from "../dashboard-products/best-selling-products/best-selling-products";
import LowStockItems from "./low-stock-items/low-stock-items";
import { TopPerformingPromoCodesTable } from "../discount-usage-impact/top-performing-promo-codes-table";

const DashboardProducts: React.FC = () => {
  return (
    <div className="bg-gray-50 min-h-screen space-y-4 sm:space-y-6 md:space-y-8">
      {/* ---------- Tables Section ---------- */}
      <div className="space-y-4 sm:space-y-6">
        {/* ✅ Top 10 Products by Revenue and Units Sold */}
        <BestSellingProducts />

        {/* KPI Tiles Row - Low Stock, Out of Stock */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {/* <LowStockItems threshold={90} showOnlyKPI={true} /> */}
          {/* <OutOfStockItems showOnlyKPI={true} /> */}
        </div>

        {/* Low Stock Items Table */}
        <div className="mt-4 sm:mt-6">
          <LowStockItems threshold={90} />
        </div>

        {/* ✅ Top Promo Codes - Full Width */}
        <div className="mt-4 sm:mt-6 w-full">
          <TopPerformingPromoCodesTable className="h-full" />
        </div>
      </div>
    </div>
  );
};

export default DashboardProducts;
