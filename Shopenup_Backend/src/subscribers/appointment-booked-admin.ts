import { SubscriberArgs, SubscriberConfig } from "@shopenup/framework"

interface AppointmentBookedData {
  id: string
  appointment?: {
    id: string
    fullName: string
    gender?: string
    dateOfBirth?: string | Date
    age?: number
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
    symptoms?: string
    durationOfSymptoms?: string
    existingConditions?: string
    currentMedications?: string
    allergies?: string
  }
}

export default async function appointmentBookedAdminHandler({
  event: { data },
  container,
}: SubscriberArgs<AppointmentBookedData>) {
  console.log("🔔 [Admin Subscriber] Subscriber triggered!", {
    eventData: data,
    hasAppointment: !!data.appointment,
    appointmentId: data.id
  });

  try {
    const notificationModuleService = container.resolve("notification")
    console.log("📧 [Admin Subscriber] Notification service resolved:", !!notificationModuleService);

    // Get admin email from environment variables
    const adminEmail = process.env.ADMIN_EMAIL || process.env.DEFAULT_REPLY_TO || "admin@aksharayurved.com"
    console.log("📬 [Admin Subscriber] Admin email:", adminEmail);

    // Get appointment data from event
    let appointment = data.appointment
    console.log("📋 [Admin Subscriber] Appointment data from event:", {
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
      console.error("❌ [Admin Subscriber] Appointment not found for admin email notification:", data.id)
      return
    }

    console.log("✅ [Admin Subscriber] Appointment validated:", {
      appointmentId: appointment.id,
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

    // Format date of birth if available
    let formattedDOB = "N/A"
    if (appointment.dateOfBirth) {
      const dob = new Date(appointment.dateOfBirth)
      formattedDOB = dob.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    }

    // Get time slot
    const startTime = appointment.slot?.startTime || "N/A"
    const endTime = appointment.slot?.endTime || "N/A"

    // Check if health information exists
    const hasHealthInfo =
      appointment.symptoms ||
      appointment.durationOfSymptoms ||
      appointment.existingConditions ||
      appointment.currentMedications ||
      appointment.allergies

    // Format gender
    const gender =
      appointment.gender
        ? appointment.gender.charAt(0).toUpperCase() + appointment.gender.slice(1)
        : "N/A"

    const emailData = {
      subject: `New Appointment Booking - ${appointment.fullName}`,
      appointmentId: appointment.id,
      fullName: appointment.fullName,
      gender: gender,
      dateOfBirth: formattedDOB,
      age: appointment.age || "N/A",
      email: appointment.email,
      mobileNumber: appointment.mobileNumber || "N/A",
      state: appointment.state || "",
      city: appointment.city || "",
      address: appointment.address || "",
      pincode: appointment.pincode || "",
      appointmentDate: formattedDate,
      startTime: startTime,
      endTime: endTime,
      status: appointment.status || "pending",
      symptoms: appointment.symptoms || "",
      durationOfSymptoms: appointment.durationOfSymptoms || "",
      existingConditions: appointment.existingConditions || "",
      currentMedications: appointment.currentMedications || "",
      allergies: appointment.allergies || "",
      hasHealthInfo: hasHealthInfo,
      store_name: process.env.STORE_NAME || "Akshar Ayurved",
      store_url: process.env.STOREFRONT_URL || "",
    };

    console.log("📨 [Admin Subscriber] Sending email with data:", {
      to: adminEmail,
      template: "appointment-admin-notification",
      hasSubject: !!emailData.subject,
      hasFullName: !!emailData.fullName
    });

    // Send notification email to admin
    await notificationModuleService.createNotifications({
      to: adminEmail,
      template: "appointment-admin-notification",
      channel: "email",
      data: emailData,
    })

    console.log("✅ [Admin Subscriber] Appointment notification email sent to admin:", adminEmail)
  } catch (error: any) {
    console.error("❌ [Admin Subscriber] Error sending appointment notification email to admin:", {
      error: error.message || error,
      stack: error.stack,
      appointmentId: data.id
    })
  }
}

export const config: SubscriberConfig = {
  event: "appointment.booked",
}

