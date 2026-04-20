import { SubscriberArgs, SubscriberConfig } from "@shopenup/framework"

interface AppointmentBookedData {
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
}

export default async function appointmentBookedPatientHandler({
  event: { data },
  container,
}: SubscriberArgs<AppointmentBookedData>) {
  console.log("🔔 [Patient Subscriber] Subscriber triggered!", {
    eventData: data,
    hasAppointment: !!data.appointment,
    appointmentId: data.id
  });

  try {
    const notificationModuleService = container.resolve("notification")
    console.log("📧 [Patient Subscriber] Notification service resolved:", !!notificationModuleService);

    // Get appointment data from event
    let appointment = data.appointment
    console.log("📋 [Patient Subscriber] Appointment data from event:", {
      hasAppointment: !!appointment,
      appointmentId: appointment?.id,
      appointmentEmail: appointment?.email
    });

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
      console.error("❌ [Patient Subscriber] Appointment not found for email notification:", data.id)
      return
    }

    // Validate email exists
    if (!appointment.email) {
      console.log("⚠️ [Patient Subscriber] No email address found for appointment:", appointment.id)
      return
    }

    console.log("✅ [Patient Subscriber] Appointment validated:", {
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

    const emailData = {
      subject: "Appointment Confirmation - Akshar Ayurved",
      appointmentId: appointment.id,
      fullName: appointment.fullName,
      email: appointment.email,
      mobileNumber: appointment.mobileNumber || "N/A",
      appointmentDate: formattedDate,
      startTime: startTime,
      endTime: endTime,
      status: appointment.status || "pending",
      address: appointment.address || "",
      city: appointment.city || "",
      state: appointment.state || "",
      pincode: appointment.pincode || "",
      store_name: process.env.STORE_NAME || "Akshar Ayurved",
      store_url: process.env.STOREFRONT_URL || "",
    };

    console.log("📨 [Patient Subscriber] Sending email with data:", {
      to: appointment.email,
      template: "appointment-confirmation",
      hasSubject: !!emailData.subject,
      hasFullName: !!emailData.fullName
    });

    // Send confirmation email to patient
    await notificationModuleService.createNotifications({
      to: appointment.email,
      template: "appointment-confirmation",
      channel: "email",
      data: emailData,
    })

    console.log("✅ [Patient Subscriber] Appointment confirmation email sent to patient:", appointment.email)
  } catch (error: any) {
    console.error("❌ [Patient Subscriber] Error sending appointment confirmation email to patient:", {
      error: error.message || error,
      stack: error.stack,
      appointmentId: data.id
    })
  }
}

export const config: SubscriberConfig = {
  event: "appointment.booked",
}

