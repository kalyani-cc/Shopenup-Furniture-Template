import { ShopenupRequest, ShopenupResponse } from "@shopenup/framework/http"
import { createRestockSubscriptionWorkflow } from "../../../../workflows/create-restock-subscription"

type PostStoreCreateRestockSubscription = {
  variant_id: string
  email?: string
  sales_channel_id?: string
}

export async function POST(
  req: ShopenupRequest<PostStoreCreateRestockSubscription>,
  res: ShopenupResponse
) {
  try {
    const body = req.body as PostStoreCreateRestockSubscription

    if (!body.variant_id) {
      return res.status(400).json({
        success: false,
        error: "variant_id is required"
      })
    }

    // Get email from body - required
    const email = body.email

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required"
      })
    }

    // Try to get customer ID if authenticated (optional)
    let customerId: string | undefined
    try {
      // Try to access auth context - may not exist for unauthenticated requests
      const authContext = (req as any).auth_context
      customerId = authContext?.actor_id || undefined
    } catch (e) {
      // Not authenticated, continue without customer ID
      customerId = undefined
    }

    // If customer is authenticated but no email provided, we might need to fetch it
    // For now, we'll require email in the request

    const { result } = await createRestockSubscriptionWorkflow(req.scope)
      .run({
        input: {
          variant_id: body.variant_id,
          sales_channel_id: body.sales_channel_id,
          customer: {
            email: email,
            customer_id: customerId,
          },
        },
      })

    return res.status(201).json({
      success: true,
      subscription: result,
    })
  } catch (error: any) {
    console.error("Error creating restock subscription:", error)
    
    if (error.type === "INVALID_DATA") {
      return res.status(400).json({
        success: false,
        error: error.message,
      })
    }

    if (error.type === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        error: error.message,
      })
    }

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create restock subscription",
    })
  }
}

