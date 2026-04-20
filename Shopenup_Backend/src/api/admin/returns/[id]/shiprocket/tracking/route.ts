import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from "@shopenup/framework"
import ShiprocketReturnModuleService from "src/modules/shiprocket-returns/service"
import { SHIPROCKET_RETURN_MODULE } from "src/modules/shiprocket-returns"
import { getAuthenticatedClient } from 'src/modules/shiprocket/utils/shiprocket-client';
import { isMockModeEnabled, generateMockTracking } from 'src/modules/shiprocket/utils/mock-mode';

/**
 * Get return order tracking from Shiprocket
 * GET /admin/returns/:id/shiprocket/tracking
 */
export async function GET(
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse
) {
  const { id: returnId } = req.params
  const logger = req.scope.resolve("logger") as any

  try {
    const query = req.scope.resolve("query") as any

    /* --------------------------------------------------
     * 1️⃣ Load Shiprocket return from DB (PRIMARY)
     * -------------------------------------------------- */
    let shiprocketReturn: any = null

    try {
      const shiprocketReturnService =
        req.scope.resolve<ShiprocketReturnModuleService>(
          SHIPROCKET_RETURN_MODULE
        )

      shiprocketReturn =
        await shiprocketReturnService.getByReturnId(returnId)
        console.log('shiprocketReturn', shiprocketReturn);
    } catch {
      logger.warn(
        "[Return Tracking] ShiprocketReturn service not available, falling back to metadata"
      )
    }

    /* --------------------------------------------------
     * 2️⃣ Load return metadata (FALLBACK)
     * -------------------------------------------------- */
    let metadataShiprocket: any = null
    console.log('metadataShiprocket', shiprocketReturn);
    if (!shiprocketReturn) {
      const { data: returns } = await query.graph({
        entity: "return",
        filters: { id: returnId },
        fields: ["id", "metadata"],
      })

      const returnOrder = returns?.[0]
      if (!returnOrder) {
        return res.status(404).json({
          success: false,
          error: "Return order not found",
        })
      }

      metadataShiprocket = (returnOrder.metadata as any)?.shiprocket || null
    }

    /* --------------------------------------------------
     * 3️⃣ Resolve identifiers
     * -------------------------------------------------- */
    const awbCode =
      shiprocketReturn?.awb_code || metadataShiprocket?.awb_code
    console.log('awbCode', awbCode);
    const returnOrderId =
      shiprocketReturn?.shiprocket_return_id ||
      metadataShiprocket?.return_order_id
    console.log('returnOrderId', returnOrderId);
    if (!awbCode && !returnOrderId) {
      // Return success with empty data instead of error - UI will show placeholder
      return res.json({
        success: true,
        awb_code: null,
        tracking_url: null,
        return_order_id: null,
        current_status: "Unknown",
        scans: [],
      })
    }

    /* --------------------------------------------------
     * 4️⃣ Try Shiprocket LIVE tracking
     * -------------------------------------------------- */
    let trackingData: any = null

    let shiprocketConfig: any
    try {
      shiprocketConfig = req.scope.resolve("shiprocketConfig") as any
    } catch {
      shiprocketConfig = {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
        baseUrl:
          process.env.SHIPROCKET_BASE_URL ||
          "https://apiv2.shiprocket.in/v1/external",
      }
    }
console.log('shiprocketConfig', shiprocketConfig);
    /** ✅ CALL LIVE API ONLY IF CREDENTIALS EXIST AND NOT IN MOCK MODE */
    if (shiprocketConfig?.email && shiprocketConfig?.password && !isMockModeEnabled()) {
      try {
        const shiprocket = await getAuthenticatedClient({
          email: shiprocketConfig.email,
          password: shiprocketConfig.password,
          baseUrl: shiprocketConfig.baseUrl,
        })

        if (awbCode) {
          trackingData = await shiprocket.tracking.trackByAwb(awbCode)
          console.log('shipment_track', trackingData.data.tracking_data.shipment_track);
          console.log('shipment_track_activities', trackingData.data.tracking_data.shipment_track_activities);

          logger.info(
            "[Return Tracking] Live tracking fetched from Shiprocket"
          )
        }
      } catch (err: any) {
        logger.warn(
          `[Return Tracking] Live Shiprocket tracking failed: ${err?.message}`
        )
      }
    } else if (isMockModeEnabled() && awbCode) {
      console.log('[Return Tracking] ⚠️ USING MOCK DATA (USE_SHIPROCKET_MOCK=true)');
      trackingData = generateMockTracking(awbCode);
      logger.info("[Return Tracking] Using mock tracking data");
    }

    /* --------------------------------------------------
     * 5️⃣ Fallback to stored scans (DB / metadata)
     * -------------------------------------------------- */
    if (!trackingData) {
      const scans =
        shiprocketReturn?.metadata?.scans ||
        metadataShiprocket?.scans ||
        []

      trackingData = {
        tracking_data: {
          shipment_status:
            shiprocketReturn?.shipment_status ||
            metadataShiprocket?.status ||
            "Unknown",
          shipment_track_activities: scans.map((scan: any) => ({
            date: scan.date || scan.timestamp || new Date().toISOString(),
            status: scan.status || "",
            activity: scan.activity || scan.status || "",
            location: scan.location || "",
            'sr-status': scan['sr-status'] || "",
            'sr-status-label': scan['sr-status-label'] || "",
          })),
        },
      }

      logger.info(
        "[Return Tracking] Using stored metadata tracking"
      )
    }

    /* --------------------------------------------------
     * 6️⃣ Normalize response (UI-safe, Amazon-style)
     * -------------------------------------------------- */
    const tracking =
      trackingData?.data?.tracking_data || trackingData || {}

      console.log('tracking', tracking);

    const scans =
      tracking.shipment_track_activities?.map((activity: any) => ({
        date: activity.date || new Date().toISOString(),
        status: activity.status || "",
        activity: activity.activity || "",
        location: activity.location || "",
        'sr-status': activity['sr-status'] || "",
        'sr-status-label': activity['sr-status-label'] || "",
      }))
        .sort((a: any, b: any) => {
          // Sort by date descending (latest first)
          const dateA = new Date(a.date).getTime()
          const dateB = new Date(b.date).getTime()
          return dateB - dateA
        }) || []


    const currentStatus =
      tracking.shipment_status ||
      shiprocketReturn?.shipment_status ||
      metadataShiprocket?.status ||
      "Unknown"

    const trackingUrl =
      tracking.track_url || tracking.tracking_url || (awbCode ? `https://shiprocket.co/tracking/${awbCode}` : null)

    /* --------------------------------------------------
     * 7️⃣ Final response
     * -------------------------------------------------- */
    return res.json({
      success: true,
      awb_code: awbCode,
      tracking_url: trackingUrl,
      return_order_id: returnOrderId,
      current_status: currentStatus,
      scans: scans, // already sorted by date descending (latest first)
    })
  } catch (error: any) {
    logger.error(
      `[Return Tracking] Error fetching tracking for return ${returnId}:`,
      error
    )
    return res.status(500).json({
      success: false,
      error: "Failed to fetch tracking data",
      message: error?.message || "Unknown error",
    })
  }
}
