import {
  ShopenupRequest,
  ShopenupResponse,
  AuthenticatedShopenupRequest,
} from "@shopenup/framework";
import { RETURN_ITEM_DEFECT_MODULE } from "../../../../modules/return-item-defect";

export async function POST(req: AuthenticatedShopenupRequest, res: ShopenupResponse) {
  try {
    const input = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (!input.return_item_id) {
      return res.status(400).json({
        title: "Response Error",
        code: "invalid_request_error",
        message: "return_item_id is required",
        type: "invalid_data",
      });
    }

    if (!input.image_url) {
      return res.status(400).json({
        title: "Response Error",
        code: "invalid_request_error",
        message: "image_url is required",
        type: "invalid_data",
      });
    }

    // Get defect service
    const defectService = req.scope.resolve(RETURN_ITEM_DEFECT_MODULE) as any;

    const defect = await defectService.createDefect({
      return_item_id: input.return_item_id,
      defective_quantity: input.defective_quantity || 1,
      image_url: input.image_url,
      note: input.note || null,
    });

    return res.json({
      defect,
    });
  } catch (error: any) {
    console.error("[POST /store/custom/return-item-defects] Error:", error);
    
    return res.status(400).json({
      title: "Response Error",
      code: "invalid_request_error",
      message: error?.message || "Failed to create defect",
      type: error?.type || "invalid_data",
    });
  }
}

export async function GET(req: AuthenticatedShopenupRequest, res: ShopenupResponse) {
  try {
    const url = new URL(req.url || "", "http://localhost");
    const searchParams = url.searchParams;
    const returnItemId = searchParams.get("return_item_id");
    const returnId = searchParams.get("return_id");

    if (!returnItemId && !returnId) {
      return res.status(400).json({
        title: "Response Error",
        code: "invalid_request_error",
        message: "return_item_id or return_id is required",
        type: "invalid_data",
      });
    }

    // Get defect service
    const defectService = req.scope.resolve(RETURN_ITEM_DEFECT_MODULE) as any;

    let defects;
    if (returnItemId) {
      defects = await defectService.getDefectsByReturnItemId(returnItemId);
    } else {
      // Pass container (req.scope) to access query service
      defects = await defectService.getDefectsByReturnId(returnId!, req.scope);
    }

    return res.json({
      defects,
    });
  } catch (error: any) {
    console.error("[GET /store/custom/return-item-defects] Error:", error);
    
    return res.status(400).json({
      title: "Response Error",
      code: "invalid_request_error",
      message: error?.message || "Failed to fetch defects",
      type: error?.type || "invalid_data",
    });
  }
}
