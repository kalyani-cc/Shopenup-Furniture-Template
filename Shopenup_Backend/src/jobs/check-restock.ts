import { ShopenupContainer } from "@shopenup/framework/types"
import { sendRestockNotificationsWorkflow } from "../workflows/send-restock-notifications"

export default async function checkRestockJob(container: ShopenupContainer) {
  try {
    await sendRestockNotificationsWorkflow(container).run({})

  } catch (error) {
    console.error("[check-restock-job] Error checking for restocked items:", error)
    throw error
  }
}

export const config = {
  name: "check-restock",
  schedule: "0 0 * * *", // Every day at midnight - change to "* * * * *" for testing (every minute)
}

