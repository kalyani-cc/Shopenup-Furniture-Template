// "use client"

// import React, { useMemo, useState } from "react"
// import { Link } from "react-router-dom"
// import { useLowStockItems } from "../../../../../hooks/api/use-dashboard"
// import { ExclamationCircle } from "@shopenup/icons"

// const REORDER_THRESHOLD = 90 // Default threshold for low stock (matching backend default)

// interface LowStockItemsProps {
//   threshold?: number
//   showOnlyKPI?: boolean
//   hideKPI?: boolean
// }

// const LowStockItems: React.FC<LowStockItemsProps> = ({ threshold = REORDER_THRESHOLD, showOnlyKPI = false, hideKPI = false }) => {
//   // Fetch low stock items from backend
//   const { 
//     data, 
//     isLoading, 
//     isError, 
//     error 
//   } = useLowStockItems(threshold)

//   const lowStockItems = data?.items || []
//   const lowStockCount = data?.count || 0
//   const actualThreshold = data?.threshold || threshold

//   // Pagination (must be declared before any early returns to preserve hook order)
//   const pageSize = 8
//   const [page, setPage] = useState(0)
//   const total = lowStockCount || lowStockItems.length
//   const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1)
//   const paginatedItems = useMemo(() => {
//     const start = page * pageSize
//     const end = start + pageSize
//     return lowStockItems.slice(start, end)
//   }, [lowStockItems, page])
//   const canPrev = page > 0
//   const canNext = page < maxPage

//   // UI states
//   if (isLoading) {
//     return (
//       <div className="rounded-xl shadow-lg p-6 text-center text-black animate-pulse">
//         Loading low stock items...
//       </div>
//     )
//   }

//   if (isError) {
//     return (
//       <div className="bg-gradient-to-r from-red-500 via-pink-500 to-orange-500 rounded-xl shadow-lg p-6 text-center text-white">
//         <div>Failed to load data.</div>
//         {error && (
//           <div className="mt-2 text-xs opacity-80">
//             Error: {error?.message || JSON.stringify(error)}
//           </div>
//         )}
//       </div>
//     )
//   }

//   // Build link to inventory list with low stock filter
//   const inventoryListLink = "/inventory"

//   // KPI Tile Component
//   const KPITile = (
//     <Link
//       to={inventoryListLink}
//       className="block rounded-xl shadow-lg bg-white border border-blue-200 p-6 hover:shadow-xl hover:border-blue-300 transition-all duration-200 group"
//     >
//         <div className="flex items-center justify-between">
//           <div className="flex-1">
//             <div className="flex items-center gap-2 mb-2">
//               <ExclamationCircle className="h-5 w-5 text-blue-600" />
//               <h3 className="text-2xl font-medium text-blue-900 group-hover:text-blue-900">
//                 Low Stock Items
//               </h3>
//             </div>
//             <p className="text-xs text-blue-600 mb-3">
//               SKUs below reorder threshold ({actualThreshold} units)
//             </p>
            
//             <div className="flex items-baseline gap-2">
//               <span className="text-3xl font-bold text-black">
//                 {lowStockCount.toLocaleString("en-IN")}
//               </span>
//               <span className="text-sm text-black">
//                 {lowStockCount === 1 ? "item" : "items"}
//               </span>
//             </div>
            
//             {lowStockCount > 0 && (
//               <p className="text-xs text-blue-700 mt-2 font-medium">
//                 Action required
//               </p>
//             )}
//           </div>
          
//           <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
//             <svg
//               className="h-6 w-6 text-blue-500 group-hover:text-blue-700"
//               fill="none"
//               viewBox="0 0 24 24"
//               stroke="currentColor"
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M9 5l7 7-7 7"
//               />
//             </svg>
//           </div>
//         </div>
//       </Link>
//   )

//   // If only KPI is requested, return just the tile
//   if (showOnlyKPI) {
//     return <div className="w-full">{KPITile}</div>
//   }

//   return (
//     <div className="w-full">
//       {/* KPI Tile - hide if hideKPI is true */}
//       {!hideKPI && <div className="mb-6">{KPITile}</div>}

//       {/* Table */}
//       {lowStockCount > 0 && (
//         <div className="bg-white rounded-xl shadow-lg border border-indigo-200 p-6 mt-6">
//           <div className="p-4 bg-gradient-to-r from-indigo-50 via-blue-50 to-violet-50 mb-4 rounded-lg">
//             <h2 className="text-lg font-semibold text-blue-800">
//               Low Stock Items ({lowStockCount} items)
//             </h2>
//           </div>
//           <div className="overflow-x-auto">
//             <table className="min-w-full">
//               <thead className="bg-gray-50">
//                 <tr>
//                   <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">#</th>
//                   <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Product Name</th>
//                   <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Variant</th>
//                   <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">SKU</th>
//                   <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Location</th>
//                   <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Stocked</th>
//                   <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Reserved</th>
//                   <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Available</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {paginatedItems.map((item, index) => (
//                   <tr key={`${item.product_id}-${item.variant_id}-${item.location_id}-${index}`} className="border-b hover:bg-gray-50">
//                     <td className="px-4 py-3 text-gray-600">{page * pageSize + index + 1}</td>
//                     <td className="px-4 py-3 font-medium text-gray-900">{item.product_name}</td>
//                     <td className="px-4 py-3 text-gray-700">{item.variant_title}</td>
//                     <td className="px-4 py-3 text-gray-700">{item.sku || "N/A"}</td>
//                     <td className="px-4 py-3 text-gray-700">{item.location_name}</td>
//                     <td className="px-4 py-3 text-right text-gray-600">{item.stocked_quantity.toLocaleString("en-IN")}</td>
//                     <td className="px-4 py-3 text-right text-gray-600">{item.reserved_quantity.toLocaleString("en-IN")}</td>
//                     <td className="px-4 py-3 text-right font-semibold text-orange-600">
//                       {item.available_quantity.toLocaleString("en-IN")}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

  
//      {/* Pagination controls */}
// {total > pageSize && (
//   <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-2 sm:gap-0">
//     <div className="flex flex-col md:flex-row">
//          <div className="text-sm text-gray-600">
//       Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
//     </div>


//         {/* Go to page input */}
//       {/* <div className="flex items-center gap-1 ml-2">
//         <input
//           type="number"
//           min={1}
//           max={maxPage + 1}
//           className="w-16 px-2 py-1 border rounded text-sm text-gray-700"
//           placeholder="Page"
//           onKeyDown={(e) => {
//             if (e.key === "Enter") {
//               const value = Number((e.target as HTMLInputElement).value)
//               if (!isNaN(value) && value >= 1 && value <= maxPage + 1) {
//                 setPage(value - 1)
//               }
//             }
//           }}
//         />
//         <button
//           className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
//           onClick={(e) => {
//             const input = (e.currentTarget.previousSibling as HTMLInputElement)
//             const value = Number(input.value)
//             if (!isNaN(value) && value >= 1 && value <= maxPage + 1) {
//               setPage(value - 1)
//               input.value = ""
//             }
//           }}
//         >
//           Go
//         </button>
//       </div> */}
//     </div>
  


    

//     <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
//       {/* Previous */}
//       <button
//         className={`px-3 py-1.5 rounded border ${
//           canPrev ? "text-gray-700 border-gray-300 hover:bg-gray-50" : "text-gray-400 border-gray-200 cursor-not-allowed"
//         }`}
//         onClick={() => canPrev && setPage(page - 1)}
//         disabled={!canPrev}
//         aria-label="Previous page"
//       >
//         ‹
//       </button>

//       {/* Pages: current ±2 */}
//       {Array.from({ length: maxPage + 1 }, (_, i) => {
//         if (i >= page - 2 && i <= page + 2) {
//           return (
//             <button
//               key={i}
//               className={`px-3 py-1.5 rounded border ${
//                 i === page
//                   ? "bg-blue-600 text-white border-blue-600"
//                   : "text-gray-700 border-gray-300 hover:bg-gray-50"
//               }`}
//               onClick={() => setPage(i)}
//             >
//               {i + 1}
//             </button>
//           )
//         }
//         return null
//       })}

//       {/* Next */}
//       <button
//         className={`px-3 py-1.5 rounded border ${
//           canNext ? "text-gray-700 border-gray-300 hover:bg-gray-50" : "text-gray-400 border-gray-200 cursor-not-allowed"
//         }`}
//         onClick={() => canNext && setPage(page + 1)}
//         disabled={!canNext}
//         aria-label="Next page"
//       >
//         ›
//       </button>

    
//     </div>
//   </div>
// )}



//         </div>
//       )}

//       {lowStockCount === 0 && !isLoading && (
//         <div className="mt-4 text-center text-sm text-indigo-700 bg-indigo-50 p-4 rounded-lg border border-indigo-200">
//           No low stock items found. All items are above the reorder threshold ({actualThreshold} units).
//         </div>
//       )}
//     </div>
//   )
// }

// export default LowStockItems


"use client"

import React, { useMemo, useState } from "react"
import { useLowStockItems } from "../../../../../hooks/api/use-dashboard"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const REORDER_THRESHOLD = 90

interface LowStockItemsProps {
  threshold?: number
}

type LowStockItem = {
  product_id: string;
  product_name: string;
  variant_id: string;
  variant_title: string;
  sku: string | null;
  location_id: string;
  location_name: string;
  stocked_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
};

type SortField = keyof LowStockItem;

const LowStockItems: React.FC<LowStockItemsProps> = ({ threshold = REORDER_THRESHOLD }) => {
  const { data, isLoading, isError, error, refetch } = useLowStockItems(threshold)

  const lowStockItems = data?.items || []
  const lowStockCount = data?.count || 0
  const outOfStockCount = lowStockItems.filter(i => i.available_quantity === 0).length

  /** ===========================
   *  SORTING WITH ARROWS
   *  =========================== */
  const [sort, setSort] = useState<{ field: SortField; order: "asc" | "desc" }>({
  field: "product_name",
  order: "asc"
});


  /** ===========================
   *  FIXED SORTING WITH NULL SAFE COMPARISON
   *  =========================== */
  const sortedItems = useMemo(() => {
    if (!sort.field) return lowStockItems;

    return [...lowStockItems].sort((a, b) => {
      const field = sort.field;

      let A: any = a[field];
      let B: any = b[field];

      // Normalize null values
      if (A === null) A = typeof B === "number" ? 0 : "";
      if (B === null) B = typeof A === "number" ? 0 : "";

      // String comparison
      if (typeof A === "string" && typeof B === "string") {
        return sort.order === "asc" ? A.localeCompare(B) : B.localeCompare(A);
      }

      // Number comparison
      if (typeof A === "number" && typeof B === "number") {
        return sort.order === "asc" ? A - B : B - A;
      }

      return 0;
    });
  }, [lowStockItems, sort]);


  /** Pagination */
  const pageSize = 10
  const [page, setPage] = useState(0)
  const paginatedItems = sortedItems.slice(page * pageSize, page * pageSize + pageSize)
  const maxPage = Math.max(0, Math.ceil(sortedItems.length / pageSize) - 1)

  /** PDF EXPORT */
  const downloadPDF = () => {
    const doc = new jsPDF()
    doc.text("Stock Report", 14, 15)

    autoTable(doc, {
      startY: 25,
      head: [["Product", "Variant", "SKU", "Location", "Stocked", "Reserved", "Available"]],
      body: sortedItems.map(i => [
        i.product_name,
        i.variant_title,
        i.sku || "-",
        i.location_name,
        i.stocked_quantity,
        i.reserved_quantity,
        i.available_quantity,
      ]),
    })

    doc.save("low_stock_items.pdf")
  }

  /** Loading & Error */
  if (isLoading) return <div className="p-6 text-center">Loading...</div>
  if (isError) return <div className="p-6 text-center text-red-600">{error?.message}</div>

  /** Arrow click handler */
  const handleSort = (field: SortField) => {
    setSort(prev => ({
      field,
      order: prev.field === field && prev.order === "asc" ? "desc" : "asc"
    }));
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-xl p-6 border shadow-md">

        {/* HEADER WITH COUNTS */}
        <div className="flex md:flex-row flex-col  justify-between items-center mb-6">

          <div className="flex flex-row gap-2">
            <div className="text-base bg-gray-100 font-bold text-black flex items-center gap-1 px-2 rounded-md">
              Low Stock Items:
              <span className=" text-blue-900  py-1 rounded-full text-lg font-bold">
                {lowStockCount - outOfStockCount}
              </span>
            </div>

            <div className="text-base bg-gray-100 font-bold text-black flex items-center gap-1 px-2 rounded-md">
              Out of Stock Items:
              <span className="text-blue-900 py-1 rounded-full text-lg font-bold">
                {outOfStockCount}
              </span>
            </div>
          </div>

          <div className="flex gap-2 sm:mt-4">
            <button
              onClick={() => refetch()}
              className="px-3 py-1 text-sm bg-gray-100 text-black rounded-md hover:bg-gray-200"
            >
              Refresh 🔄
            </button>

            <button
              onClick={downloadPDF}
              className="px-3 py-1 text-sm bg-gray-100 text-black rounded-md hover:bg-gray-200"
            >
              Download PDF
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-50">
              <tr>

                <th className="px-4 py-3 text-left">Sr.</th>

                {/* PRODUCT NAME COLUMN WITH ARROWS */}
                <th className="px-4 py-3 text-left">
                  <div className="flex items-center gap-2">
                    Product
                    <button
                      onClick={() => handleSort("product_name")}
                      className="w-5 h-5 flex items-center justify-center border rounded bg-gray-50 hover:bg-gray-200"
                    >
                      {sort.field === "product_name"
                        ? (sort.order === "asc" ? "↑" : "↓")
                        : "↕"}
                    </button>
                  </div>
                </th>

                <th className="px-4 py-3 text-left">Variant</th>
                <th className="px-4 py-3 text-left">SKU</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">Stocked</th>
                <th className="px-4 py-3 text-left">Reserved</th>

                {/* AVAILABLE QTY COLUMN WITH ARROWS */}
                <th className="px-4 py-3 text-left">
                  <div className="flex justify-end items-center gap-2">
                    Available
                    <button
                      onClick={() => handleSort("available_quantity")}
                      className="w-5 h-5 flex items-center justify-center border rounded bg-gray-50 hover:bg-gray-200"
                    >
                      {sort.field === "available_quantity"
                        ? (sort.order === "asc" ? "↑" : "↓")
                        : "↕"}
                    </button>
                  </div>
                </th>

              </tr>
            </thead>

            <tbody>
              {paginatedItems.map((item, index) => {
                const out = item.available_quantity === 0

                return (
                  <tr
                    key={index}
                    className={`border-b ${out ? "bg-red-100" : "hover:bg-gray-50"}`}
                  >
                    <td className="px-4 py-3">{page * pageSize + index + 1}</td>
                    <td className="px-4 py-3">{item.product_name}</td>
                    <td className="px-4 py-3">{item.variant_title}</td>
                    <td className="px-4 py-3">{item.sku || "-"}</td>
                    <td className="px-4 py-3">{item.location_name}</td>
                    <td className="px-4 py-3 text-left">{item.stocked_quantity}</td>
                    <td className="px-4 py-3 text-left">{item.reserved_quantity}</td>

                    <td className={`px-4 py-3 text-center font-semibold ${out ? "text-red-600" : "text-orange-600"}`}>
                      {item.available_quantity}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex justify-center gap-2 mt-4">
          <button
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 border rounded disabled:opacity-30"
          >
            Prev
          </button>

          <button
            disabled={page >= maxPage}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 border rounded disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

export default LowStockItems
