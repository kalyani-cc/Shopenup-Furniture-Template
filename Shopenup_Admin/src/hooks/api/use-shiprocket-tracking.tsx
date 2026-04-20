import { useQuery } from "@tanstack/react-query"
import { adminFetch } from "../../lib/fetch"

export interface ShiprocketTrackingData {
  awb_code: string
  courier_name?: string
  current_status: string
  last_status_at?: string
  tracking_url?: string
  scans: Array<{
    date: string
    activity: string
    location: string
  }>
  shipped_at?: string
  delivered_at?: string
  pickup_scheduled_date?: string
}

interface ShiprocketTrackingResponse {
  success: boolean
  data: ShiprocketTrackingData
}

/**
 * Hook to fetch live tracking information for a Shiprocket fulfillment
 */
export const useShiprocketTracking = (
  orderId: string,
  fulfillmentId: string,
  options?: {
    enabled?: boolean
    refetchInterval?: number
  }
) => {
  return useQuery<ShiprocketTrackingData, Error>({
    queryKey: ["shiprocket-tracking", orderId, fulfillmentId],
    queryFn: async () => {
      const response = await adminFetch<ShiprocketTrackingResponse>(
        `/admin/fulfillments/${fulfillmentId}/shiprocket/tracking`
      )
      return response.data
    },
    enabled: options?.enabled !== false,
    refetchInterval: options?.refetchInterval || 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data fresh for 10 seconds
  })
}

