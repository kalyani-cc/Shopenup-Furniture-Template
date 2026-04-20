"use client"

import React from "react"
import { useBestSellingProductsByRevenue, useBestSellingProducts } from "../../../../../hooks/api/use-dashboard"

const BestSellingProducts: React.FC = () => {
  const { 
    data: revenueData, 
    isLoading: isLoadingRevenue, 
    isError: isErrorRevenue, 
    error: errorRevenue 
  } = useBestSellingProductsByRevenue()

  const { 
    data: salesData, 
    isLoading: isLoadingSales, 
    isError: isErrorSales, 
    error: errorSales 
  } = useBestSellingProducts()

  const isLoading = isLoadingRevenue || isLoadingSales
  const isError = isErrorRevenue || isErrorSales

  if (isLoading) {
    return (
      <div className="rounded-xl shadow-lg p-6 text-center text-black animate-pulse">
        Loading best-selling products...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-gradient-to-r from-red-500 via-pink-500 to-orange-500 rounded-xl shadow-lg p-6 text-center text-white">
        <div>Failed to load data.</div>
        {(errorRevenue || errorSales) && (
          <div className="mt-2 text-xs opacity-80">
            Error: {(errorRevenue || errorSales)?.message || JSON.stringify(errorRevenue || errorSales)}
          </div>
        )}
      </div>
    )
  }

  const formatCurrency = (amount: number, currencyCode: string = "INR") => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Map backend response to component format for revenue
  const topProductsByRevenue = revenueData?.products?.map((product, index) => ({
    productId: `revenue-product-${index}`,
    productName: product.name,
    revenue: product.revenue,
  })) || []

  // Map backend response to component format for sales
  const topProductsBySales = salesData?.products?.map((product, index) => ({
    productId: `sales-product-${index}`,
    productName: product.name,
    soldNumber: product.sold_number,
  })) || []

  const hasRevenueData = revenueData && revenueData.products && revenueData.products.length > 0
  const hasSalesData = salesData && salesData.products && salesData.products.length > 0

  if (!hasRevenueData && !hasSalesData) {
    return (
      <div className="mt-4 text-center text-sm text-indigo-700 bg-indigo-50 p-4 rounded-lg border border-indigo-200">
        No top best-selling product data found.
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-blue-800 mb-4">
          Top Best-Selling Products
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products by Revenue */}
        {hasRevenueData && (
          <div className="rounded-2xl overflow-hidden shadow-xl bg-white border border-indigo-200">
            <div className="p-4 bg-gradient-to-r from-indigo-50 via-blue-50 to-violet-50">
              <h3 className="text-lg font-semibold text-blue-800">
                Top Products by Revenue
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">#</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Product Name</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProductsByRevenue.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                        No data available
                      </td>
                    </tr>
                  ) : (
                    topProductsByRevenue.map((product, index) => (
                      <tr key={product.productId} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{product.productName}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {formatCurrency(product.revenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Top Products by Units Sold */}
        {hasSalesData && (
          <div className="rounded-2xl overflow-hidden shadow-xl bg-white border border-indigo-200">
            <div className="p-4 bg-gradient-to-r from-indigo-50 via-blue-50 to-violet-50">
              <h3 className="text-lg font-semibold text-blue-800">
                Top Products by Units Sold
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">#</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Product Name</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Units Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {topProductsBySales.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                        No data available
                      </td>
                    </tr>
                  ) : (
                    topProductsBySales.map((product, index) => (
                      <tr key={product.productId} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{product.productName}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {product.soldNumber.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BestSellingProducts
