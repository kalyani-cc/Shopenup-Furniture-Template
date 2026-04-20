import { FetchError } from "@shopenup/js-sdk"
import {
  QueryKey,
  UseQueryOptions,
  useQuery,
} from "@tanstack/react-query"
import { backendUrl } from "../../lib/client/client"
import { queryKeysFactory } from "../../lib/query-key-factory"
import { useDashboardFilter } from "../../providers/dashboard-filter-provider"


const DASHBOARD_QUERY_KEY = "dashboard" as const
export const dashboardQueryKeys = queryKeysFactory(DASHBOARD_QUERY_KEY)

const NEW_VS_RETURNING_CUSTOMERS_QUERY_KEY = "new-vs-returning-customers" as const
export const newVsReturningCustomersQueryKeys = queryKeysFactory(NEW_VS_RETURNING_CUSTOMERS_QUERY_KEY)

const REPEAT_PURCHASE_RATE_QUERY_KEY = "repeat-purchase-rate" as const
export const repeatPurchaseRateQueryKeys = queryKeysFactory(REPEAT_PURCHASE_RATE_QUERY_KEY)

const TOP_CUSTOMER_LOCATIONS_QUERY_KEY = "top-customer-locations" as const
export const topCustomerLocationsQueryKeys = queryKeysFactory(TOP_CUSTOMER_LOCATIONS_QUERY_KEY)

const CUSTOMER_LIFETIME_VALUE_QUERY_KEY = "customer-lifetime-value" as const
export const customerLifetimeValueQueryKeys = queryKeysFactory(CUSTOMER_LIFETIME_VALUE_QUERY_KEY)

const BEST_SELLING_PRODUCTS_QUERY_KEY = "best-selling-products" as const
export const bestSellingProductsQueryKeys = queryKeysFactory(BEST_SELLING_PRODUCTS_QUERY_KEY)

const LOW_STOCK_ITEMS_QUERY_KEY = "low-stock-items" as const
export const lowStockItemsQueryKeys = queryKeysFactory(LOW_STOCK_ITEMS_QUERY_KEY)

const OUT_OF_STOCK_ITEMS_QUERY_KEY = "out-of-stock-items" as const
export const outOfStockItemsQueryKeys = queryKeysFactory(OUT_OF_STOCK_ITEMS_QUERY_KEY)

// const PAYMENT_SUCCESS_RATE_QUERY_KEY = "payment-success-rate" as const
// export const paymentSuccessRateQueryKeys = queryKeysFactory(PAYMENT_SUCCESS_RATE_QUERY_KEY)

export interface DashboardResponse {
  success: boolean
  data: {
    totals: {
      orders: number
      customers: number
      products: number
      revenue: number
    }
    analytics: {
      dailyRevenue: Record<string, number>
      topProducts: Array<{
        title: string
        quantity_sold: string
      }>
    }
  }
}

export const useDashboard = (
  options?: Omit<
    UseQueryOptions<DashboardResponse, FetchError, DashboardResponse, QueryKey>,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: dashboardQueryKeys.all,
    queryFn: async () => {
      try {
        const response = await fetch(`${backendUrl}/admin/dashboard`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          let errorData: any = {}
          
          try {
            errorData = JSON.parse(errorText)
          } catch {
            // If parsing fails, use the text as message
          }

          const error = new FetchError(
            errorData.message || `Dashboard API error: ${response.statusText}`
          )
          ;(error as any).status = response.status
          ;(error as any).response = errorData
          throw error
        }

        const data = await response.json()
        return data as DashboardResponse
      } catch (error: any) {
        // SDK might throw FetchError automatically
        if (error instanceof FetchError) {
          throw error
        }
        
        // Otherwise wrap it
        throw new FetchError(
          error?.message || `Dashboard API error: ${error}`
        )
      }
    },
    ...options,
  })

  return { ...data, ...rest }
}

export interface BestSellingProductsResponse {
  products: Array<{
    name: string
    sold_number: number
  }>
  count: number
}

export interface BestSellingProductsByRevenueResponse {
  products: Array<{
    name: string
    revenue: number
  }>
  count: number
}

export interface LowStockItemsResponse {
  items: Array<{
    product_id: string
    product_name: string
    variant_id: string
    variant_title: string
    sku: string | null
    location_id: string
    location_name: string
    stocked_quantity: number
    reserved_quantity: number
    available_quantity: number
  }>
  count: number
  threshold: number
}

export interface OutOfStockItemsResponse {
  items: Array<{
    product_id: string
    product_name: string
    variant_id: string
    variant_title: string
    sku: string | null
    location_id: string
    location_name: string
    available_quantity: number
    estimated_revenue_impact: number
  }>
  total_count: number
  estimated_revenue_impact: number
}

export interface PaymentSuccessRateResponse {
  success_rate: number
  authorized: number
  attempted: number
  percentage: number
}

export const useBestSellingProducts = (
  options?: Omit<
    UseQueryOptions<
      BestSellingProductsResponse,
      FetchError,
      BestSellingProductsResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { filters } = useDashboardFilter()

  // Format dates as ISO strings for the API
  const formatDateForAPI = (date: Date): string => {
    return date.toISOString().split("T")[0] // Returns YYYY-MM-DD format
  }

  // Build query parameters object
  const query: Record<string, string> = {}
  
  if (filters.dateRange.from) {
    query.dateFrom = formatDateForAPI(filters.dateRange.from)
  }
  
  if (filters.dateRange.to) {
    query.dateTo = formatDateForAPI(filters.dateRange.to)
  }
  
  if (filters.region) {
    query.region = filters.region
  }
  
  if (filters.state) {
    query.state = filters.state
  }
  
  if (filters.comparisonMode) {
    query.comparisonMode = "true"
  }

  const { data, ...rest } = useQuery({
    queryKey: [...bestSellingProductsQueryKeys.all, "sales", query],
    queryFn: async () => {
      try {
        // Build URL with query parameters (same approach as useDashboard)
        const path = `/admin/best-sales-products`
        const searchParams = new URLSearchParams()
        
        // Add query parameters
        Object.entries(query).forEach(([key, value]) => {
          searchParams.append(key, value)
        })
        
        const queryString = searchParams.toString()
        const fullUrl = queryString 
          ? `${backendUrl}${path}?${queryString}`
          : `${backendUrl}${path}`
        
        const response = await fetch(fullUrl, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          let errorData: any = {}
          
          try {
            errorData = JSON.parse(errorText)
          } catch {
            // If parsing fails, use the text as message
          }

          const error = new FetchError(
            errorData.message || `Best selling products API error: ${response.statusText}`
          )
          ;(error as any).status = response.status
          ;(error as any).response = errorData
          throw error
        }

        const responseData = await response.json()
        return responseData as BestSellingProductsResponse
      } catch (error: any) {
        console.error("❌ [useBestSellingProducts] Error:", error)
        // SDK might throw FetchError automatically
        if (error instanceof FetchError) {
          throw error
        }
        
        // Otherwise wrap it
        throw new FetchError(
          error?.message || `Best selling products API error: ${error}`
        )
      }
    },
    ...options,
  })

  return { data, ...rest }
}

export const useBestSellingProductsByRevenue = (
  options?: Omit<
    UseQueryOptions<
      BestSellingProductsByRevenueResponse,
      FetchError,
      BestSellingProductsByRevenueResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { filters } = useDashboardFilter()

  // Format dates as ISO strings for the API
  const formatDateForAPI = (date: Date): string => {
    return date.toISOString().split("T")[0] // Returns YYYY-MM-DD format
  }

  // Build query parameters object
  const query: Record<string, string> = {}
  
  if (filters.dateRange.from) {
    query.dateFrom = formatDateForAPI(filters.dateRange.from)
  }
  
  if (filters.dateRange.to) {
    query.dateTo = formatDateForAPI(filters.dateRange.to)
  }
  
  if (filters.region) {
    query.region = filters.region
  }
  
  if (filters.state) {
    query.state = filters.state
  }
  
  if (filters.comparisonMode) {
    query.comparisonMode = "true"
  }

  const { data, ...rest } = useQuery({
    queryKey: [...bestSellingProductsQueryKeys.all, "revenue", query],
    queryFn: async () => {
      try {
        // Build URL with query parameters (same approach as useDashboard)
        const path = `/admin/best-revenue-products`
        const searchParams = new URLSearchParams()
        
        // Add query parameters
        Object.entries(query).forEach(([key, value]) => {
          searchParams.append(key, value)
        })
        
        const queryString = searchParams.toString()
        const fullUrl = queryString 
          ? `${backendUrl}${path}?${queryString}`
          : `${backendUrl}${path}`
        
        const response = await fetch(fullUrl, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          let errorData: any = {}
          
          try {
            errorData = JSON.parse(errorText)
          } catch {
            // If parsing fails, use the text as message
          }

          const error = new FetchError(
            errorData.message || `Best selling products by revenue API error: ${response.statusText}`
          )
          ;(error as any).status = response.status
          ;(error as any).response = errorData
          throw error
        }

        const responseData = await response.json()
        return responseData as BestSellingProductsByRevenueResponse
      } catch (error: any) {
        console.error("❌ [useBestSellingProductsByRevenue] Error:", error)
        // SDK might throw FetchError automatically
        if (error instanceof FetchError) {
          throw error
        }
        
        // Otherwise wrap it
        throw new FetchError(
          error?.message || `Best selling products by revenue API error: ${error}`
        )
      }
    },
    ...options,
  })

  return { data, ...rest }
}

export const useLowStockItems = (
  threshold?: number,
  options?: Omit<
    UseQueryOptions<
      LowStockItemsResponse,
      FetchError,
      LowStockItemsResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { filters } = useDashboardFilter()

  // Format dates as ISO strings for the API
  const formatDateForAPI = (date: Date): string => {
    return date.toISOString().split("T")[0] // Returns YYYY-MM-DD format
  }

  // Build query parameters object
  const query: Record<string, string> = {}
  
  if (filters.dateRange.from) {
    query.dateFrom = formatDateForAPI(filters.dateRange.from)
  }
  
  if (filters.dateRange.to) {
    query.dateTo = formatDateForAPI(filters.dateRange.to)
  }
  
  if (filters.region) {
    query.region = filters.region
  }
  
  if (filters.state) {
    query.state = filters.state
  }
  
  // Add threshold parameter (default to 90 if not provided)
  if (threshold !== undefined) {
    query.threshold = threshold.toString()
  }

  const { data, ...rest } = useQuery({
    queryKey: [...lowStockItemsQueryKeys.all, query, threshold],
    queryFn: async () => {
      try {
        // Build URL with query parameters (same approach as useDashboard)
        const path = `/admin/low-stock-items`
        const searchParams = new URLSearchParams()
        
        // Add query parameters
        Object.entries(query).forEach(([key, value]) => {
          searchParams.append(key, value)
        })
        
        const queryString = searchParams.toString()
        const fullUrl = queryString 
          ? `${backendUrl}${path}?${queryString}`
          : `${backendUrl}${path}`
        
        const response = await fetch(fullUrl, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          let errorData: any = {}
          
          try {
            errorData = JSON.parse(errorText)
          } catch {
            // If parsing fails, use the text as message
          }

          const error = new FetchError(
            errorData.message || `Low stock items API error: ${response.statusText}`
          )
          ;(error as any).status = response.status
          ;(error as any).response = errorData
          throw error
        }

        const responseData = await response.json()
        return responseData as LowStockItemsResponse
      } catch (error: any) {
        console.error("❌ [useLowStockItems] Error:", error)
        // SDK might throw FetchError automatically
        if (error instanceof FetchError) {
          throw error
        }
        
        // Otherwise wrap it
        throw new FetchError(
          error?.message || `Low stock items API error: ${error}`
        )
      }
    },
    ...options,
  })

  return { data, ...rest }
}

export const useOutOfStockItems = (
  options?: Omit<
    UseQueryOptions<
      OutOfStockItemsResponse,
      FetchError,
      OutOfStockItemsResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { filters } = useDashboardFilter()

  // Format dates as ISO strings for the API
  const formatDateForAPI = (date: Date): string => {
    return date.toISOString().split("T")[0] // Returns YYYY-MM-DD format
  }

  // Build query parameters object
  const query: Record<string, string> = {}
  
  if (filters.dateRange.from) {
    query.dateFrom = formatDateForAPI(filters.dateRange.from)
  }
  
  if (filters.dateRange.to) {
    query.dateTo = formatDateForAPI(filters.dateRange.to)
  }
  
  if (filters.region) {
    query.region = filters.region
  }
  
  if (filters.state) {
    query.state = filters.state
  }

  const { data, ...rest } = useQuery({
    queryKey: [...outOfStockItemsQueryKeys.all, query],
    queryFn: async () => {
      try {
        // Build URL with query parameters (same approach as useDashboard)
        const path = `/admin/outof-stock-items`
        const searchParams = new URLSearchParams()
        
        // Add query parameters
        Object.entries(query).forEach(([key, value]) => {
          searchParams.append(key, value)
        })
        
        const queryString = searchParams.toString()
        const fullUrl = queryString 
          ? `${backendUrl}${path}?${queryString}`
          : `${backendUrl}${path}`
        
        const response = await fetch(fullUrl, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          let errorData: any = {}
          
          try {
            errorData = JSON.parse(errorText)
          } catch {
            // If parsing fails, use the text as message
          }

          const error = new FetchError(
            errorData.message || `Out-of-stock items API error: ${response.statusText}`
          )
          ;(error as any).status = response.status
          ;(error as any).response = errorData
          throw error
        }

        const responseData = await response.json()
        return responseData as OutOfStockItemsResponse
      } catch (error: any) {
        console.error("❌ [useOutOfStockItems] Error:", error)
        // SDK might throw FetchError automatically
        if (error instanceof FetchError) {
          throw error
        }
        
        // Otherwise wrap it
        throw new FetchError(
          error?.message || `Out-of-stock items API error: ${error}`
        )
      }
    },
    ...options,
  })

  return { data, ...rest }
}




//Inventory Movement
const INVENTORY_MOVEMENT_QUERY_KEY = "inventory-movement" as const
export const inventoryMovementQueryKeys = queryKeysFactory(INVENTORY_MOVEMENT_QUERY_KEY)

export interface InventoryMovementResponse {
  items: Array<{
    layers: any
    product_id: string
    product_name: string
    variant_id: string
    variant_title: string
    sku: string | null
    location_id: string
    location_name: string
    total_inventory: number // Full stack bar height (sold + remaining)
    sold_quantity: number // Sold portion (part of stack)
    remaining_to_sell: number // Remaining portion (part of stack)
  }>
  count: number
  date_range: {
    from: string
    to: string
  }
}

export const useInventoryMovement = (
  options?: Omit<
    UseQueryOptions<
      InventoryMovementResponse,
      FetchError,
      InventoryMovementResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { filters } = useDashboardFilter()

  // Format date helper
  const formatDateForAPI = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}


  // Build query parameters
  const query: Record<string, string> = {}

  if (filters.dateRange.from) {
    query.dateFrom = formatDateForAPI(filters.dateRange.from)
  }

  if (filters.dateRange.to) {
    query.dateTo = formatDateForAPI(filters.dateRange.to)
  }

  if (filters.region) {
    query.region = filters.region
  }

  if (filters.state) {
    query.state = filters.state
  }

  const { data, ...rest } = useQuery({
    queryKey: [...inventoryMovementQueryKeys.all, query],
    queryFn: async () => {
      try {
        const path = `/admin/inventory-movement`
        const searchParams = new URLSearchParams()

        Object.entries(query).forEach(([key, value]) => {
          searchParams.append(key, value)
        })

        const queryString = searchParams.toString()
        const fullUrl = queryString
          ? `${backendUrl}${path}?${queryString}`
          : `${backendUrl}${path}`

        const response = await fetch(fullUrl, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          let errorData: any = {}
          try {
            errorData = JSON.parse(errorText)
          } catch {
            // Ignore parsing error
          }

          const error = new FetchError(
            errorData.message ||
              `Inventory movement API error: ${response.statusText}`
          )
          ;(error as any).status = response.status
          ;(error as any).response = errorData
          throw error
        }

        const responseData = await response.json()
        return responseData as InventoryMovementResponse
      } catch (error: any) {
        console.error("❌ [useInventoryMovement] Error:", error)
        if (error instanceof FetchError) throw error
        throw new FetchError(
          error?.message || `Inventory movement API error: ${error}`
        )
      }
    },
    ...options,
  })

  return { data, ...rest }
}

const PAYMENT_SUCCESS_RATE_QUERY_KEY = "payment-success-rate" as const
export const paymentSuccessRateQueryKeys = queryKeysFactory(PAYMENT_SUCCESS_RATE_QUERY_KEY)

export interface PaymentSuccessRateResponse {
  success_rate: number
  authorized: number
  attempted: number
  percentage: number
  comparison?: {
    previous_period: {
      success_rate: number
      authorized: number
      attempted: number
    }
    changes: {
      success_rate_change: number
      authorized_change: number
      attempted_change: number
    }
  } | null
}

export const usePaymentSuccessRate = (
  options?: Omit<
    UseQueryOptions<
      PaymentSuccessRateResponse,
      FetchError,
      PaymentSuccessRateResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { filters } = useDashboardFilter()

  // Helper to format date to yyyy-mm-dd
  const formatDateForAPI = (date: Date): string => date.toISOString().split("T")[0]

  // Build query params
  const query: Record<string, string> = {}

  if (filters.dateRange.from) query.dateFrom = formatDateForAPI(filters.dateRange.from)
  if (filters.dateRange.to) query.dateTo = formatDateForAPI(filters.dateRange.to)
  if (filters.region) query.region = filters.region
  if (filters.state) query.state = filters.state
  if (filters.comparisonMode) query.comparisonMode = "true" // ✅ add this flag

  const { data, ...rest } = useQuery({
    queryKey: [...paymentSuccessRateQueryKeys.all, query],
    queryFn: async () => {
      try {
        const path = `/admin/payment-success-rate`
        const searchParams = new URLSearchParams(Object.entries(query))
        const fullUrl = `${backendUrl}${path}?${searchParams.toString()}`

        const response = await fetch(fullUrl, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        })

        if (!response.ok) {
          const text = await response.text()
          let json: any = {}
          try {
            json = JSON.parse(text)
          } catch {}
          const error = new FetchError(
            json.message || `Payment success rate API error: ${response.statusText}`
          )
          ;(error as any).status = response.status
          ;(error as any).response = json
          throw error
        }

        const json = await response.json()
        return json as PaymentSuccessRateResponse
      } catch (err: any) {
        console.error("❌ [usePaymentSuccessRate] Error:", err)
        if (err instanceof FetchError) throw err
        throw new FetchError(err?.message || `Payment success rate API error: ${err}`)
      }
    },
    ...options,
  })

  return { data, ...rest }
}




//payment method distribution

const PAYMENT_METHOD_DISTRIBUTION_QUERY_KEY =
  "payment-method-distribution" as const;
export const paymentMethodDistributionQueryKeys = queryKeysFactory(
  PAYMENT_METHOD_DISTRIBUTION_QUERY_KEY
);

export interface PaymentMethodDistributionResponse {
  total_orders: number;
  payment_methods: Array<{
    method: string;
    count: number;
    percentage: number;
  }>;
}

export const usePaymentMethodDistribution = (
  options?: Omit<
    UseQueryOptions<
      PaymentMethodDistributionResponse,
      FetchError,
      PaymentMethodDistributionResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { filters } = useDashboardFilter();

  // Helper: convert Date → yyyy-mm-dd
  const formatDateForAPI = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}


  // Build query params object
  const query: Record<string, string> = {};

  if (filters.dateRange.from) {
    query.dateFrom = formatDateForAPI(filters.dateRange.from);
  }

  if (filters.dateRange.to) {
    query.dateTo = formatDateForAPI(filters.dateRange.to);
  }

  if (filters.region) {
    query.region = filters.region;
  }

  if (filters.state) {
    query.state = filters.state;
  }

  const { data, ...rest } = useQuery({
    queryKey: [...paymentMethodDistributionQueryKeys.all, query],

    queryFn: async () => {
      try {
        const path = `/admin/payment-method-distribution`;

        const searchParams = new URLSearchParams();
        Object.entries(query).forEach(([key, value]) => {
          searchParams.append(key, value);
        });

        const qs = searchParams.toString();
        const fullUrl = qs
          ? `${backendUrl}${path}?${qs}`
          : `${backendUrl}${path}`;

        const response = await fetch(fullUrl, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData: any = {};
          try {
            errorData = JSON.parse(errorText);
          } catch {}

          const error = new FetchError(
            errorData.message ||
              `Payment method distribution API error: ${response.statusText}`
          );
          (error as any).status = response.status;
          (error as any).response = errorData;
          throw error;
        }

        const json = await response.json();
        return json as PaymentMethodDistributionResponse;
      } catch (err: any) {
        console.error("❌ [usePaymentMethodDistribution] Error:", err);
        if (err instanceof FetchError) throw err;

        throw new FetchError(
          err?.message || `Payment method distribution API error: ${err}`
        );
      }
    },

    ...options,
  });

  return { data, ...rest };
};



//Refund Volume

// import { UseQueryOptions, QueryKey, useQuery } from "@tanstack/react-query";
// import { FetchError } from "../../lib/fetch-error";
// import { useDashboardFilter } from "../../context/dashboard-filter-context";
// import { backendUrl } from "../../lib/constants"
// import { queryKeysFactory } from "../../lib/query-keys-factory";

const REFUND_VOLUME_QUERY_KEY = "refund-volume" as const;

export const refundVolumeQueryKeys = queryKeysFactory(REFUND_VOLUME_QUERY_KEY);

export interface RefundVolumeResponse {
  // Normal mode
  count?: number;
  total_refunded_amount?: number;
  avg_refund_time_hours?: number;
  timeline: Array<{
    date: string;
    count: number;
    amount: number;
  }>;

  // Comparison mode
  comparisonMode?: boolean;
  summary?: {
    refunds: {
      current: number;
      previous: number;
      growth: number;
    };
    refunded_amount: {
      current: number;
      previous: number;
      growth: number;
    };
    avg_refund_time_hours: {
      current: number;
      previous: number;
      growth: number;
    };
  };
}

export const useRefundVolume = (
  options?: Omit<
    UseQueryOptions<
      RefundVolumeResponse,
      FetchError,
      RefundVolumeResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { filters } = useDashboardFilter();

  // ✅ Format date to yyyy-mm-dd
  const formatDateForAPI = (date: Date) => date.toISOString().split("T")[0];

  // ✅ Build query object
  const query: Record<string, string> = {};

  if (filters.dateRange.from) {
    query["dateRange[from]"] = formatDateForAPI(filters.dateRange.from);
  }
  if (filters.dateRange.to) {
    query["dateRange[to]"] = formatDateForAPI(filters.dateRange.to);
  }

  // comparisonMode flag
  if (filters.comparisonMode) {
    query.comparisonMode = "true";

    if (filters.previousDateRange?.from) {
      query["previousDateRange[from]"] = formatDateForAPI(
        filters.previousDateRange.from
      );
    }
    if (filters.previousDateRange?.to) {
      query["previousDateRange[to]"] = formatDateForAPI(
        filters.previousDateRange.to
      );
    }
  }

  // optional filters
  if (filters.region) query.region = filters.region;
  if (filters.state) query.state = filters.state;

  const { data, ...rest } = useQuery({
    queryKey: [...refundVolumeQueryKeys.all, query],

    queryFn: async () => {
      try {
        const path = `/admin/refund-volume`;

        const searchParams = new URLSearchParams();
        Object.entries(query).forEach(([key, value]) => {
          searchParams.append(key, value);
        });

        const qs = searchParams.toString();
        const fullUrl = qs
          ? `${backendUrl}${path}?${qs}`
          : `${backendUrl}${path}`;

        const response = await fetch(fullUrl, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const text = await response.text();
          let json: any = {};
          try {
            json = JSON.parse(text);
          } catch {}

          const error = new FetchError(
            json.message || `Refund volume API error: ${response.statusText}`
          );
          (error as any).status = response.status;
          (error as any).response = json;
          throw error;
        }

        const json = await response.json();
        return json as RefundVolumeResponse;
      } catch (err: any) {
        console.error("❌ [useRefundVolume] Error:", err);

        if (err instanceof FetchError) throw err;
        throw new FetchError(
          err?.message || `Refund volume API error: ${err}`
        );
      }
    },

    ...options,
  });

  return { data, ...rest };
};
export interface NewVsReturningCustomersResponse {
  success: boolean
  filters: {
    dateFrom: string | null
    dateTo: string | null
    region: string | null
    state: string | null
  }
  data: {
    newCustomers: number
    returningCustomers: number
    totalCustomers: number
  }
}
export const useNewVsReturningCustomers = ( 
  options?: Omit<
    UseQueryOptions<NewVsReturningCustomersResponse, Error, NewVsReturningCustomersResponse, QueryKey>,
    "queryFn" | "queryKey"
  >
) => {
  const { filters } = useDashboardFilter()

  // Build filter object for API (matches backend POST body format)
  const filterParams: {
    dateRange?: { from: string; to: string }
    dateFrom?: string
    dateTo?: string
    region?: string
    state?: string
  } = {}

  if (filters.dateRange.from && filters.dateRange.to) {
    // Debug: Log the raw dates before conversion
    
    // Use dateRange format (preferred for POST)
    filterParams.dateRange = {
      from: filters.dateRange.from.toISOString(),
      to: filters.dateRange.to.toISOString(),
    }
  } else {
    // Fallback to individual date params
    if (filters.dateRange.from) {
      filterParams.dateFrom = filters.dateRange.from.toISOString()
    }
    if (filters.dateRange.to) {
      filterParams.dateTo = filters.dateRange.to.toISOString()
    }
  }

  if (filters.region) {
    filterParams.region = filters.region
  }
  if (filters.state) {
    filterParams.state = filters.state
  }

  // Create query key from filter params
  const queryKey = [...newVsReturningCustomersQueryKeys.all, filterParams]

  const { data, ...rest } = useQuery({
    queryKey,
    queryFn: async () => {
      const path = `/admin/new-ve-returning`
      
      // Debug: Log what we're sending
      
      // Use POST method with body (matches backend POST handler)
      const response = await fetch(`${backendUrl}${path}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(filterParams),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `Failed to fetch new vs returning customers: ${response.statusText}`
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorMessage
        } catch {
          // If parsing fails, use default message
        }
        const error = new Error(errorMessage)
        ;(error as any).status = response.status
        throw error
      }

      const responseData = await response.json() as NewVsReturningCustomersResponse
      
      // Debug: Log what we received
      
      return responseData
    },
    ...options,
  })

  return { data, ...rest }
}

export interface RepeatPurchaseRateResponse {
  success: boolean
  filters: {
    dateFrom: string | null
    dateTo: string | null
    previousDateFrom?: string | null
    previousDateTo?: string | null
    comparisonMode?: boolean
    region: string | null
    state: string | null
  }
  data:
    | {
        // Normal mode
        repeatPurchaseRate: number
        returningCustomers: number
        totalCustomers: number
      }
    | {
        // Comparison mode
        repeatPurchaseRate: {
          current: number
          previous: number
          growth: number
        }
        returningCustomers: {
          current: number
          previous: number
          growth: number
        }
        totalCustomers: {
          current: number
          previous: number
          growth: number
        }
      }
}

export const useRepeatPurchaseRate = (
  options?: Omit<
    UseQueryOptions<RepeatPurchaseRateResponse, Error, RepeatPurchaseRateResponse, QueryKey>,
    "queryFn" | "queryKey"
  >
) => {
  const { filters } = useDashboardFilter()

  const filterParams: {
    dateRange?: { from: string; to: string }
    previousDateRange?: { from: string; to: string }
    dateFrom?: string
    dateTo?: string
    previousDateFrom?: string
    previousDateTo?: string
    comparisonMode?: boolean
    region?: string
    state?: string
  } = {}

  // ✅ Handle date range (current + previous)
  if (filters.dateRange.from && filters.dateRange.to) {
    filterParams.dateRange = {
      from: filters.dateRange.from.toISOString(),
      to: filters.dateRange.to.toISOString(),
    }
  }

  if (filters.previousDateRange?.from && filters.previousDateRange?.to) {
    filterParams.previousDateRange = {
      from: filters.previousDateRange.from.toISOString(),
      to: filters.previousDateRange.to.toISOString(),
    }
    filterParams.comparisonMode = true
  } else {
    filterParams.comparisonMode = false
  }

  if (filters.region) filterParams.region = filters.region
  if (filters.state) filterParams.state = filters.state

  const queryKey = [...repeatPurchaseRateQueryKeys.all, filterParams]

  const { data, ...rest } = useQuery({
    queryKey,
    queryFn: async () => {
      const path = `/admin/repeat-purchase-rate`

      const response = await fetch(`${backendUrl}${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filterParams),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `Failed to fetch repeat purchase rate: ${response.statusText}`
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorMessage
        } catch {}
        const error = new Error(errorMessage)
        ;(error as any).status = response.status
        throw error
      }

      const responseData = (await response.json()) as RepeatPurchaseRateResponse
      return responseData
    },
    ...options,
  })

  return { data, ...rest }
}


export interface TopLocation {
  state: string
  countryCode: string
  orderCount: number
  cities: Array<{
    city: string
    orderCount: number
  }>
}
export interface TopCustomerLocationsResponse {
  success: boolean
  filters: {
    dateFrom: string | null
    dateTo: string | null
    region: string | null
    state: string | null
  }
  data: {
    topLocations: TopLocation[]
    totalOrders: number
  }
}
export const useTopCustomerLocations = (
  options?: Omit<
    UseQueryOptions<TopCustomerLocationsResponse, Error, TopCustomerLocationsResponse, QueryKey>,
    "queryFn" | "queryKey"
  >
) => {
  const { filters } = useDashboardFilter()

  // Build filter object for API (matches backend POST body format)
  const filterParams: {
    dateRange?: { from: string; to: string }
    dateFrom?: string
    dateTo?: string
    region?: string
    state?: string
  } = {}

  if (filters.dateRange.from && filters.dateRange.to) {
    // Use dateRange format (preferred for POST)
    filterParams.dateRange = {
      from: filters.dateRange.from.toISOString(),
      to: filters.dateRange.to.toISOString(),
    }
  } else {
    // Fallback to individual date params
    if (filters.dateRange.from) {
      filterParams.dateFrom = filters.dateRange.from.toISOString()
    }
    if (filters.dateRange.to) {
      filterParams.dateTo = filters.dateRange.to.toISOString()
    }
  }

  if (filters.region) {
    filterParams.region = filters.region
  }
  if (filters.state) {
    filterParams.state = filters.state
  }

  // Create query key from filter params
  const queryKey = [...topCustomerLocationsQueryKeys.all, filterParams]

  const { data, ...rest } = useQuery({
    queryKey,
    queryFn: async () => {
      const path = `/admin/top-customer-locations`
      
      // Use POST method with body (matches backend POST handler)
      const response = await fetch(`${backendUrl}${path}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(filterParams),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `Failed to fetch top customer locations: ${response.statusText}`
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorMessage
        } catch {
          // If parsing fails, use default message
        }
        const error = new Error(errorMessage)
        ;(error as any).status = response.status
        throw error
      }

      const responseData = await response.json() as TopCustomerLocationsResponse
      return responseData
    },
    ...options,
  })

  return { data, ...rest }
}

export interface CustomerLifetimeValueResponse {
  success: boolean
  filters: {
    dateFrom: string | null
    dateTo: string | null
    previousDateFrom?: string | null
    previousDateTo?: string | null
    comparisonMode?: boolean
    region: string | null
    state: string | null
  }
  data: {
    totalRevenue: number
    totalCustomers: number
    averageCLV: number
    previousTotalRevenue?: number
    previousTotalCustomers?: number
    previousCLV?: number
    growth?: number
  }
}

export const useCustomerLifetimeValue = (
  options?: Omit<
    UseQueryOptions<CustomerLifetimeValueResponse, Error, CustomerLifetimeValueResponse, QueryKey>,
    "queryFn" | "queryKey"
  >
) => {
  const { filters } = useDashboardFilter()

  const filterParams: {
    dateRange?: { from: string; to: string }
    dateFrom?: string
    dateTo?: string
    region?: string
    state?: string
    comparisonMode?: boolean
  } = {}

  if (filters.dateRange.from && filters.dateRange.to) {
    filterParams.dateRange = {
      from: filters.dateRange.from.toISOString(),
      to: filters.dateRange.to.toISOString(),
    }
  } else {
    if (filters.dateRange.from)
      filterParams.dateFrom = filters.dateRange.from.toISOString()
    if (filters.dateRange.to)
      filterParams.dateTo = filters.dateRange.to.toISOString()
  }

  if (filters.region) filterParams.region = filters.region
  if (filters.state) filterParams.state = filters.state
  if (filters.comparisonMode) filterParams.comparisonMode = true

  const queryKey = [...customerLifetimeValueQueryKeys.all, filterParams]

  const { data, ...rest } = useQuery({
    queryKey,
    queryFn: async () => {
      const path = `/admin/customer-lifetime-value`
      const response = await fetch(`${backendUrl}${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filterParams),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let message = `Failed to fetch CLV: ${response.statusText}`
        try {
          const json = JSON.parse(errorText)
          message = json.message || message
        } catch {}
        throw new Error(message)
      }

      return (await response.json()) as CustomerLifetimeValueResponse
    },
    ...options,
  })

  return { data, ...rest }
}

const TOP_RATED_PRODUCTS_QUERY_KEY = "top-rated-products" as const
export const topRatedProductsQueryKeys = queryKeysFactory(TOP_RATED_PRODUCTS_QUERY_KEY)
export interface TopRatedProduct {
  product_id: string
  average_rating: number
  review_count: number
  name?: string // Optional, may be added by frontend
}
export interface TopRatedProductsResponse {
  success: boolean
  filters: {
    dateFrom: string | null
    dateTo: string | null
    region: string | null
    state: string | null
  }
  data: TopRatedProduct[] // data is an array directly
}
export const useTopRatedProducts = (
  options?: Omit<
    UseQueryOptions<TopRatedProductsResponse, Error, TopRatedProductsResponse, QueryKey>,
    "queryFn" | "queryKey"
  >
) => {
  const { filters } = useDashboardFilter()

  // ✅ Build filter params (same as Category Ratings)
  const filterParams: Record<string, any> = {}
  if (filters.dateRange.from)
    filterParams.dateFrom = filters.dateRange.from.toISOString()
  if (filters.dateRange.to)
    filterParams.dateTo = filters.dateRange.to.toISOString()
  if (filters.region) filterParams.region = filters.region
  if (filters.state) filterParams.state = filters.state

  const queryKey = [...topRatedProductsQueryKeys.all, filterParams]

  const { data, ...rest } = useQuery({
    queryKey,
    queryFn: async () => {
      const path = `/admin/top-rated-products`
      const response = await fetch(`${backendUrl}${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filterParams),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `Failed to fetch top-rated products: ${response.statusText}`
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorMessage
        } catch {}
        throw new Error(errorMessage)
      }

      const responseData = (await response.json()) as TopRatedProductsResponse
      return responseData
    },
    ...options,
  })

  return { data, ...rest }
}


const CATEGORY_RATINGS_QUERY_KEY = "category-ratings" as const
export const categoryRatingsQueryKeys = { all: [CATEGORY_RATINGS_QUERY_KEY] as const }

export interface CategoryRating {
  category: string
  average_rating: number
  review_count: number
  rating_1: number
  rating_2: number
  rating_3: number
  rating_4: number
  rating_5: number
  rating_1_products: string[]
  rating_2_products: string[]
  rating_3_products: string[]
  rating_4_products: string[]
  rating_5_products: string[]
}

export interface CategoryRatingsResponse {
  success: boolean
  filters: {
    dateFrom: string | null
    dateTo: string | null
    region: string | null
    state: string | null
  }
  data: CategoryRating[]
  count: number
}

export const useCategoryRatings = (
  options?: Omit<
    UseQueryOptions<CategoryRatingsResponse, Error, CategoryRatingsResponse, QueryKey>,
    "queryFn" | "queryKey"
  >
) => {
  const { filters } = useDashboardFilter()

  // ✅ Build flat filter params
  const filterParams: Record<string, any> = {}
  if (filters.dateRange.from)
    filterParams.dateFrom = filters.dateRange.from.toISOString()
  if (filters.dateRange.to)
    filterParams.dateTo = filters.dateRange.to.toISOString()
  if (filters.region) filterParams.region = filters.region
  if (filters.state) filterParams.state = filters.state

  const queryKey = [...categoryRatingsQueryKeys.all, filterParams]

  const { data, ...rest } = useQuery({
    queryKey,
    queryFn: async () => {
      const path = `/admin/topcategory-rated-products`
      const response = await fetch(`${backendUrl}${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filterParams),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `Failed to fetch category ratings: ${response.statusText}`
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorMessage
        } catch {}
        throw new Error(errorMessage)
      }

      const responseData = (await response.json()) as CategoryRatingsResponse
      return responseData
    },
    ...options,
  })

  return { data, ...rest }
}