import { SubscriberArgs, SubscriberConfig } from "@shopenup/framework"

interface AppointmentCancelledData {
  id: string
  appointment?: {
    id: string
    fullName: string
    email: string
    mobileNumber?: string
    appointmentDate: string | Date
    status: string
    slot?: {
      startTime: string
      endTime: string
    }
    address?: string
    city?: string
    state?: string
    pincode?: string
  }
  previousStatus?: string
  cancellationReason?: string
}

export default async function appointmentCancelledHandler({
  event: { data },
  container,
}: SubscriberArgs<AppointmentCancelledData>) {
  console.log("🔔 [Cancellation Subscriber] Subscriber triggered!", {
    eventData: data,
    hasAppointment: !!data.appointment,
    appointmentId: data.id,
    cancellationReason: data.cancellationReason
  });

  try {
    const notificationModuleService = container.resolve("notification")
    console.log("📧 [Cancellation Subscriber] Notification service resolved:", !!notificationModuleService);

    // Get appointment data from event
    let appointment = data.appointment

    // If appointment data is not in event, try to fetch it
    if (!appointment) {
      try {
        const appointmentsService = container.resolve("appointmentsModuleService")
        if (appointmentsService) {
          appointment = await appointmentsService.retrieveAppointment(data.id, {
            relations: ["slot"],
          })
        }
      } catch (serviceError) {
        console.error("Could not resolve appointments service:", serviceError)
      }
    }

    // Validate appointment exists
    if (!appointment) {
      console.error("❌ [Cancellation Subscriber] Appointment not found for email notification:", data.id)
      return
    }

    // Validate email exists
    if (!appointment.email) {
      console.log("⚠️ [Cancellation Subscriber] No email address found for appointment:", appointment.id)
      return
    }

    console.log("✅ [Cancellation Subscriber] Appointment validated:", {
      appointmentId: appointment.id,
      email: appointment.email,
      fullName: appointment.fullName
    });

    // Format appointment date
    const appointmentDate = new Date(appointment.appointmentDate)
    const formattedDate = appointmentDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    // Get time slot
    const startTime = appointment.slot?.startTime || "N/A"
    const endTime = appointment.slot?.endTime || "N/A"

    // Generate reschedule link
    const storefrontUrl = process.env.STOREFRONT_URL || process.env.NEXT_PUBLIC_STOREFRONT_URL || ""
    const rescheduleUrl = storefrontUrl ? `${storefrontUrl}/appointment-booking` : "/appointment-booking"

    const emailData = {
      subject: "Appointment Cancelled - Akshar Ayurved",
      appointmentId: appointment.id,
      fullName: appointment.fullName,
      email: appointment.email,
      mobileNumber: appointment.mobileNumber || "N/A",
      appointmentDate: formattedDate,
      startTime: startTime,
      endTime: endTime,
      cancellationReason: data.cancellationReason || "Appointment cancelled",
      rescheduleUrl: rescheduleUrl,
      address: appointment.address || "",
      city: appointment.city || "",
      state: appointment.state || "",
      pincode: appointment.pincode || "",
      store_name: process.env.STORE_NAME || "Akshar Ayurved",
      store_url: storefrontUrl,
    };

    console.log("📨 [Cancellation Subscriber] Sending email with data:", {
      to: appointment.email,
      template: "appointment-cancelled",
      hasSubject: !!emailData.subject,
      hasRescheduleUrl: !!emailData.rescheduleUrl
    });

    // Send cancellation email to patient
    await notificationModuleService.createNotifications({
      to: appointment.email,
      template: "appointment-cancelled",
      channel: "email",
      data: emailData,
    })

    console.log("✅ [Cancellation Subscriber] Appointment cancellation email sent to patient:", appointment.email)
  } catch (error: any) {
    console.error("❌ [Cancellation Subscriber] Error sending appointment cancellation email to patient:", {
      error: error.message || error,
      stack: error.stack,
      appointmentId: data.id
    })
  }
}

export const config: SubscriberConfig = {
  event: "appointment.cancelled",
}

