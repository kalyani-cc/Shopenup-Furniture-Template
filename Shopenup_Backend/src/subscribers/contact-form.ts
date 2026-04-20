import { SubscriberArgs, SubscriberConfig } from "@shopenup/framework"

interface ContactFormData {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
}

export default async function contactFormHandler({
  event: { data },
  container,
}: SubscriberArgs<ContactFormData>) {
  try {
    const notificationService = container.resolve("notification")

    const adminEmail =
      process.env.CONTACT_INBOX_EMAIL?.trim() ||
      process.env.DEFAULT_REPLY_TO?.trim() ||
      process.env.SMTP_FROM?.trim() ||
      ""

    if (!adminEmail) {
      console.warn(
        "[contact-form] No CONTACT_INBOX_EMAIL, DEFAULT_REPLY_TO, or SMTP_FROM — skipping admin notification email."
      )
    } else {
      await notificationService.createNotifications({
        to: adminEmail,
        channel: "email",
        template: "contact-form-support",
        data: {
          subject: `New contact: ${data.subject}`,
          name: data.name,
          email: data.email,
          phone: data.phone || "N/A",
          message: data.message,
          store_name: process.env.STORE_NAME,
          store_url: process.env.STOREFRONT_URL,
        },
      })
    }

    // Send confirmation email to user
    await notificationService.createNotifications({
      to: data.email,
      channel: "email",
      template: "contact-form-user", // your HBS for user confirmation
      data: {
        subject: `We received your message: ${data.subject}`,
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message,
        store_name: process.env.STORE_NAME,
        store_url: process.env.STOREFRONT_URL,
      },
    })
  } catch (error) {
    console.error("Error in contact form handler:", error);
    // Don't throw - subscribers should fail gracefully
  }
}

export const config: SubscriberConfig = {
  event: "contact_form.submitted",
}
