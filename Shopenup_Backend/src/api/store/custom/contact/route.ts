import { ShopenupRequest, ShopenupResponse } from "@shopenup/framework/http"

interface ContactFormBody {
  name?: string
  email?: string
  message?: string
  phone?: string
  subject?: string
}

export async function POST(req: ShopenupRequest, res: ShopenupResponse) {
  const eventModuleService = req.scope.resolve("event_bus")

  try {
    const raw = req.body as ContactFormBody | string
    let body: ContactFormBody
    if (typeof raw === "string") {
      try {
        body = JSON.parse(raw) as ContactFormBody
      } catch {
        return res.status(400).json({ success: false, error: "Invalid JSON body" })
      }
    } else {
      body = raw
    }

    const email = typeof body.email === "string" ? body.email.trim() : ""
    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required" })
    }

    const message = typeof body.message === "string" ? body.message.trim() : ""
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const subject = typeof body.subject === "string" ? body.subject.trim() : ""

    // Contact form: any non-empty message (name/subject optional; storefront often omits subject).
    const isContactForm = message.length > 0

    if (isContactForm) {
      await eventModuleService.emit({
        name: "contact_form.submitted",
        data: {
          email,
          name: name || "Website visitor",
          message,
          phone: body.phone,
          subject: subject || "Website contact form",
        },
      })
    } else {
      await eventModuleService.emit({
        name: "newsletter.subscribed",
        data: {
          email,
          name: name || "Subscriber",
        },
      })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error("Error emitting event:", error)
    return res.status(500).json({ success: false, error: "Failed to send event" })
  }
}
