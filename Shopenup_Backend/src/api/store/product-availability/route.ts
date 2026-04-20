import { ShopenupRequest, ShopenupResponse } from '@shopenup/framework/http';
import { checkProductAvailability } from 'src/modules/shiprocket/utils/stock-location-service';

interface AvailabilityRequest {
  user_pincode: string;
  variant_ids: string[];
  min_qty?: number;
}

export async function POST(req: ShopenupRequest, res: ShopenupResponse) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { user_pincode, variant_ids, min_qty = 1 }: AvailabilityRequest = body;

    if (!user_pincode || !variant_ids || !Array.isArray(variant_ids) || variant_ids.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'user_pincode and variant_ids (array) are required' 
      });
    }

    // Use the shared stock location service
    const availability = await checkProductAvailability({
      user_pincode,
      variant_ids,
      min_qty,
      scope: req.scope,
    });

    // Check if any product is not available
    // IsAvailable is false if ANY product has is_available = false
    const IsAvailable = availability.every((item: any) => item.is_available === true);

    return res.status(200).json({
      success: true,
      IsAvailable: IsAvailable,
      data: availability,
      pincode: user_pincode,
    });

  } catch (error) {
    console.error('❌ Product Availability API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check product availability',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

