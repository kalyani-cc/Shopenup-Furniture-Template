import { useQuery } from "@tanstack/react-query"
import { adminFetch } from "../../lib/fetch"

export interface ReturnShiprocketTrackingData {
  awb_code?: string
  return_order_id?: number
  courier_name?: string
  current_status: string
  last_status_at?: string
  tracking_url?: string
  scans: Array<{
    date: string
    activity: string
    location: string
  }>
}

interface ReturnShiprocketTrackingResponse {
  success: boolean
  awb_code?: string
  return_order_id?: number
  current_status: string
  scans: Array<{
    date: string
    activity: string
    location: string
  }>
}

/**
 * Hook to fetch live tracking information for a Shiprocket return order
 */
export const useReturnShiprocketTracking = (
  returnId: string,
  options?: {
    enabled?: boolean
    refetchInterval?: number
  }
) => {
  return useQuery<ReturnShiprocketTrackingData, Error>({
    queryKey: ["return-shiprocket-tracking", returnId],
    queryFn: async () => {
      const response = await adminFetch<ReturnShiprocketTrackingResponse>(
        `/admin/returns/${returnId}/shiprocket/tracking`
      )
      return {
        awb_code: response.awb_code,
        tracking_url: (response as any).tracking_url,
        return_order_id: response.return_order_id,
        current_status: response.current_status,
        scans: response.scans || [],
      }
    },
    enabled: options?.enabled !== false,
    refetchInterval: options?.refetchInterval || 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data fresh for 10 seconds
  })
}

