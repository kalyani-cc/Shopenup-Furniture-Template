import { 
  AbstractNotificationProviderService,
} from "@shopenup/framework/utils"
import { Twilio } from "twilio"
import { 
  ProviderSendNotificationDTO, 
  ProviderSendNotificationResultsDTO,
} from "@shopenup/types"


type InjectedDependencies = {}

type TwilioSmsServiceOptions = {
  accountSid: string
  authToken: string
  from: string
}

export class TwilioSmsService extends AbstractNotificationProviderService {
  static readonly identifier = "twilio-sms"
  private readonly client: Twilio
  private readonly from: string

  constructor(container: InjectedDependencies, options: TwilioSmsServiceOptions) {
    super()

    this.client = new Twilio(options.accountSid, options.authToken)
    this.from = options.from
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const { to, content, template, data } = notification
    const contentText = content?.text || await this.getTemplateContent(
      template, data
    )

    const message = await this.client.messages.create({
      body: contentText,
      from: this.from,
      to,
    })

    return {
      id: message.sid,
    }
  }
  async getTemplateContent(
    template: string, 
    data?: Record<string, unknown> | null
  ): Promise<string> {
    switch (template) {
      case "otp-template":
        if (!data?.otp) throw new Error("OTP is required for OTP template")
        return `Your OTP is ${data.otp}`
  
      case "order-confirmation-sms":
        if (!data?.order_id) throw new Error("order_id is required")
        return `Thank you for your order! Your order - ${data.order_id} has been placed successfully. We’ll notify you once it’s shipped.`
  
      // case "order-shipped-sms":
      //   if (!data?.order_id || !data?.tracking_link) 
      //     throw new Error("order_id and tracking_link are required")
      //   return `Your order #${data.order_id} has been shipped! Track it here: ${data.tracking_link}`
  
      // case "order-delivered-sms":
      //   if (!data?.order_id) throw new Error("order_id is required")
      //   return `Good news! Your order #${data.order_id} has been delivered. Enjoy!`
  
      // case "order-cancelled-sms":
      //   if (!data?.order_id) throw new Error("order_id is required")
      //   return `Your order #${data.order_id} has been cancelled. If you have any questions, contact support.`
  
      default:
        throw new Error(`Template ${template} not found`)
  }
  }

  static validateOptions(options: Record<any, any>): void | never {
    if (!options.accountSid) {
      throw new Error("Account SID is required")
    }
    if (!options.authToken) {
      throw new Error("Auth token is required")
    }
    if (!options.from) {
      throw new Error("From is required")
    }
  }


}