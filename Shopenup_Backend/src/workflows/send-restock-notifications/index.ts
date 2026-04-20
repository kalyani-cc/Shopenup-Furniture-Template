import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@shopenup/framework/workflows-sdk"
import { getDistinctSubscriptionsStep } from "./steps/get-distinct-subscriptions"
import { getRestockedStep } from "./steps/get-restocked"
import { getFullSubscriptionsStep } from "./steps/get-full-subscriptions"
import { sendRestockNotificationStep } from "./steps/send-restock-notification"
import { deleteRestockSubscriptionStep } from "./steps/delete-restock-subscriptions"

export const sendRestockNotificationsWorkflow = createWorkflow(
  "send-restock-notifications",
  () => {
    // Get distinct subscriptions (variant_id, sales_channel_id pairs)
    const distinctSubscriptions = getDistinctSubscriptionsStep()

    // Filter to only variants that are now in stock
    const restockedDistinct = getRestockedStep(distinctSubscriptions)

    // Get full subscription details (with emails) for restocked variants
    const fullSubscriptions = getFullSubscriptionsStep(restockedDistinct)

    // Send notifications to all subscribers
    sendRestockNotificationStep(fullSubscriptions)

    // Delete subscriptions after notifications are sent
    deleteRestockSubscriptionStep(fullSubscriptions)

    return new WorkflowResponse({
      subscriptions: fullSubscriptions,
    })
  }
)

export default sendRestockNotificationsWorkflow

