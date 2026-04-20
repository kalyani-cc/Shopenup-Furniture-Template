import {
    AuthenticatedShopenupRequest,
    ShopenupResponse,
  } from "@shopenup/framework"
  import ShiprocketReturnModuleService from "src/modules/shiprocket-returns/service"
  import { SHIPROCKET_RETURN_MODULE } from "src/modules/shiprocket-returns"
  
  /**
   * Get Shiprocket return data by return ID
   * GET /admin/returns/:id/shiprocket
   */
  export async function GET(
    req: AuthenticatedShopenupRequest,
    res: ShopenupResponse
  ) {
    const { id: returnId } = req.params
    const logger = req.scope.resolve("logger") as any
  
    try {
      logger.info(
        `[Get Shiprocket Return] 🔍 Fetching Shiprocket return data for return ${returnId}`
      )
  
      // Resolve service
      const shiprocketReturnService =
        req.scope.resolve<ShiprocketReturnModuleService>(
          SHIPROCKET_RETURN_MODULE
        )
  
      if (!shiprocketReturnService) {
        logger.warn(
          `[Get Shiprocket Return] ⚠️ ShiprocketReturnService not available`
        )
        return res.status(500).json({
          success: false,
          error: "Shiprocket return service not available",
        })
      }
  
      // Fetch by return_id
      const shiprocketReturn =
        await shiprocketReturnService.getByReturnId(returnId)
  
      if (!shiprocketReturn) {
        logger.info(
          `[Get Shiprocket Return] ℹ️ No Shiprocket return found for return ${returnId}`
        )
        return res.status(404).json({
          success: false,
          error: "Shiprocket return data not found",
        })
      }
  
      logger.info(
        `[Get Shiprocket Return] ✅ Shiprocket return data found for return ${returnId}`
      )
  
      return res.json({
        success: true,
        data: shiprocketReturn,
      })
    } catch (error: any) {
      logger.error(
        `[Get Shiprocket Return] ❌ Error fetching Shiprocket return for ${returnId}:`,
        error
      )
  
      return res.status(500).json({
        success: false,
        error: "Failed to fetch Shiprocket return data",
        message: error.message || "Unknown error",
        stack: error.stack,
      })
    }
  }
  