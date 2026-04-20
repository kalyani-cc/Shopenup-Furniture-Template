// // src/subscribers/user-created.ts
// import { SubscriberArgs, type SubscriberConfig } from "@shopenup/shopenup"

// export default async function userCreatedHandler({
//   event: { data },
//   container,
// }: SubscriberArgs<{ id: string }>) {
//     const query = container.resolve("query")
//     const notificationModuleService = container.resolve("notification")
//   const { data: [customer] } = await query.graph({
//     entity: "customer",
//     fields: ["*"],
//     filters: { id: data.id },
//   })

  
//   await notificationModuleService.createNotifications({
//     to: customer.email,
//     channel: "email",
//     template: process.env.SENDGRID_CUSTOM_USER_CREATED_TEMP_ID, 
//     data: {
//         store_name: process.env.STORE_NAME,
//         first_name: customer.first_name,
//         email: customer.email,
//         store_url: `${process.env.STOREFRONT_URL}/profile`,
//     },
//   })
// }

// export const config: SubscriberConfig = {
//   event: "customer.created",
// }



// src/subscribers/customer-created.ts
import { SubscriberArgs, SubscriberConfig } from "@shopenup/framework"

export default async function customerCreatedEmailHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    const query = container.resolve("query")
    const notificationModuleService = container.resolve("notification")

    // Retrieve customer details
    const { data: [customer] } = await query.graph({
      entity: "customer",
      fields: ["id", "email", "first_name", "last_name"],
      filters: { id: data.id },
    })

    if (!customer?.email) {
      return
    }

    // Send welcome email
    await notificationModuleService.createNotifications({
      to: customer.email,
      channel: "email",
      template: "customer-welcome", // Your Handlebars or HTML template file (e.g., customer-welcome.hbs)
      data: {
        subject: `Welcome to Shopenup! 🎉`,
        store_name: process.env.STORE_NAME,
        first_name: customer.first_name,
        email: customer.email,
        store_url: `${process.env.STOREFRONT_URL}/profile`,
      },
    })
  } catch (error) {
    console.error("Error in customer welcome handler:", error);
    // Don't throw - subscribers should fail gracefully
  }
}

// export const config: SubscriberConfig = {
//   event: "customer.created",
// }
