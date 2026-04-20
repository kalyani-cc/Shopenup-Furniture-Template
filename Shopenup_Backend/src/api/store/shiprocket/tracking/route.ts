import {
    AuthenticatedShopenupRequest,
    ShopenupResponse,
  } from "@shopenup/framework"
  import { getAuthenticatedClient } from 'src/modules/shiprocket/utils/shiprocket-client';
  import { isMockModeEnabled, generateMockTracking } from 'src/modules/shiprocket/utils/mock-mode';
  
  export async function GET(
    req: AuthenticatedShopenupRequest,
    res: ShopenupResponse
  ) {
    const { id: returnId } = req.params
  
    try {
      const shiprocketReturnService = req.scope.resolve(
        "shiprocketReturnService"
      ) as any
  
      // 1️⃣ Load return data (DB)
      const returnData = await shiprocketReturnService.getByReturnId(returnId)
  
      if (!returnData?.awb_code) {
        return res.status(404).json({
          success: false,
          error: "AWB not found for return",
        })
      }
  
      // 2️⃣ Check if mock mode is enabled
      let result: any;

      if (isMockModeEnabled()) {
        console.log('[Store Shiprocket Tracking] ⚠️ USING MOCK DATA (USE_SHIPROCKET_MOCK=true)');
        result = generateMockTracking(returnData.awb_code);
      } else {
        // Authenticate Shiprocket
        const shiprocketConfig = req.scope.resolve("shiprocketConfig") as any

        const shiprocket = await getAuthenticatedClient({
          email: shiprocketConfig.email,
          password: shiprocketConfig.password,
          baseUrl: shiprocketConfig.baseUrl,
        })

        // Call tracking API
        result = await shiprocket.tracking.trackByAwb(
          returnData.awb_code
        )

        if (!result.success || !result.data) {
          throw new Error("Shiprocket tracking failed")
        }
      }
  
      const tracking = result.data.tracking_data || result.data
      const shipment = tracking.shipment_track?.[0] || {}
      const activities = tracking.shipment_track_activities || []
  
      // 4️⃣ Normalize status
      // const statusInfo = normalizeShiprocketStatus(
      //   tracking.shipment_status,
      //   shipment.current_status
      // )
  
      // 5️⃣ Format scans
      const scans = activities.map((a: any) => ({
        date: a.date,
        activity: a.activity,
        location: a.location,
      }))
  
      return res.json({
        success: true,
        data: {
          awb_code: returnData.awb_code,
          courier_name: shipment.courier_name,
          shipment_status: tracking.shipment_status,
          current_status: shipment.current_status,
          status_category: shipment.category,
          tracking_url: tracking.track_url,
          scans,
        },
      })
    } catch (error) {
      console.error("[Return Tracking] ❌", error)
      return res.status(500).json({
        success: false,
        error: "Failed to fetch return tracking",
      })
    }
  }
  