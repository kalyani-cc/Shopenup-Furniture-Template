import { SubscriberArgs, SubscriberConfig } from "@shopenup/framework"
import { subjects } from "src/modules/resend/emails"

interface SubscriberData {
  email: string
  name: string
}

export default async function newsletterSubscriber({
  event: { data },
  container,
}: SubscriberArgs<SubscriberData>) {
  try {
    const notificationService = container.resolve("notification")

    // Send welcome email to subscriber
    await notificationService.createNotifications({
      to: data.email,
      channel: "email",
      template: "newsletter-subscription", // your HBS template
      data: {
        subject: `🎉 Welcome to ${process.env.STORE_NAME}`,
        name: data.email,
        store_name: process.env.STORE_NAME,
        store_url: process.env.STOREFRONT_URL,
      },
    })

    // Notify admin about new subscription
    const adminEmail = process.env.DEFAULT_REPLY_TO
    
    if (adminEmail) {
      await notificationService.createNotifications({
        to: adminEmail,
        channel: "email",
        template: "admin-newsletter-subscription", // admin notification template
        data: {
          subject: `📧 New Subscriber - ${process.env.STORE_NAME}`,
          subscriber_email: data.email,
          subscriber_name: data.name,
          store_name: process.env.STORE_NAME,
          store_url: process.env.STOREFRONT_URL,
          subscription_date: new Date().toLocaleString(),
        },
      })
    } else {
      console.warn("Admin email not configured. Skipping admin notification for newsletter subscription.")
    }
  } catch (error) {
    console.error("Error in newsletter subscriber handler:", error);
    // Don't throw - subscribers should fail gracefully
  }
}

export const config: SubscriberConfig = {
  event: "newsletter.subscribed",
}
