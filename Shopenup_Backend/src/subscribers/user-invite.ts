import { Config } from "@mikro-orm/core"
import { SubscriberArgs, type SubscriberConfig } from "@shopenup/framework"

export default async function inviteCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    const query = container.resolve("query")
    const notificationModuleService = container.resolve("notification")
    const config = container.resolve("configModule")

    const { data: [invite] } = await query.graph({
      entity: "invite",
      fields: ["email", "token", "first_name", "last_name"],
      filters: { id: data.id },
    })

    if (!invite) {
      console.warn('Invite not found for notification:', data.id)
      return
    }
    const subject = `Invite to ${process.env.STORE_NAME}🔒`;


    const backend_url = config.admin.backendUrl !== "/" ? config.admin.backendUrl : "http://localhost:9000"
    const adminPath = config.admin.path
    const resetUrl = `${backend_url}${adminPath}/invite?token=${invite.token}`

    await notificationModuleService.createNotifications({
      to: invite.email,
      template: "admin-password-reset", // Replace with your actual SendGrid template ID
      channel: "email",
      data: {
        subject,
        invite,
        store_name: process.env.STORE_NAME,
        store_url: resetUrl,
      },
      // data: {
      //   invite_url: `${backend_url}${adminPath}/invite?token=${invite.token}`,
      //   email: invite.email,
      // },
    })
  } catch (error) {
    console.error("Error in user invite handler:", error);
    // Don't throw - subscribers should fail gracefully
  }
}

export const config: SubscriberConfig = {
  event: [
    "invite.created",
    "invite.resent",
  ],
}