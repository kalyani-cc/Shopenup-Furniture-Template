import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Dynamic imports for ES modules
let SmsIndiaHubClient: any;
let buildTemplatedMessage: any;
let describeSmsIndiaHubError: any;

// Initialize dynamic imports
async function initializeImports() {
  if (!SmsIndiaHubClient) {
    const smsModule = await import('@shopenup/smsindiahub');
    const templatesModule = await import('@shopenup/smsindiahub/templates');
    const errorsModule = await import('@shopenup/smsindiahub/errors');
    
    SmsIndiaHubClient = smsModule.SmsIndiaHubClient;
    buildTemplatedMessage = templatesModule.buildTemplatedMessage;
    describeSmsIndiaHubError = errorsModule.describeSmsIndiaHubError;
  }
}

// SMS Template Types
export type SMSTemplate = 
  | 'ORDER_CONFIRMATION'
  | 'ORDER_SHIPPED' 
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'CUSTOM';

// SMS Data Interface
export interface SMSData {
  orderId: string;
  orderAmount: string;
  storeName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  customerName?: string;
}

// SMS Service Class
export class SMSService {
  private smsClient: any;

  constructor() {
    // Initialize will be called when needed
  }

  private async ensureInitialized() {
    await initializeImports();
    if (!this.smsClient) {
      this.smsClient = new SmsIndiaHubClient({
        apiKey: process.env.SMSINDIAHUB_API_KEY,
        user: process.env.SMSINDIAHUB_USER,
        password: process.env.SMSINDIAHUB_PASSWORD,
        baseUrl: process.env.SMSINDIAHUB_BASE_URL || 'http://cloud.smsindiahub.in'
      });
    }
  }

  /**
   * Format phone number to Indian format (91XXXXXXXXXX)
   */
  private formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Remove +91 if present, remove 91 if present
    let formattedPhone = phone.replace(/^\+91/, '').replace(/^91/, '');
    
    // Add 91 if not present
    if (!formattedPhone.startsWith('91')) {
      formattedPhone = '91' + formattedPhone;
    }
    
    return formattedPhone;
  }

  /**
   * Build SMS message based on template type
   */
  private async buildSMSMessage(template: SMSTemplate, data: SMSData): Promise<{ text: string; dcs: string; templateId: string | null }> {
    try {
      await this.ensureInitialized();
      
      // Try to use DLT template first
      const { text, dcs, templateId } = buildTemplatedMessage(template, [
        data.orderId,
        data.trackingUrl || '',
        data.orderAmount,
        data.storeName || 'Akshar Ayurved',
        data.trackingNumber || ''
      ].filter(Boolean));

      return { text, dcs: dcs || '0', templateId };
    } catch (error) {
      console.warn(`DLT template failed for ${template}, using fallback:`, error.message);
      
      // Fallback to simple message
    //   return this.buildFallbackMessage(template, data);
    }
  }

  /**
   * Build fallback message when DLT template fails
   */
//   private buildFallbackMessage(template: SMSTemplate, data: SMSData): { text: string; dcs: string; templateId: null } {
//     const storeName = data.storeName || 'Akshar Ayurved';
//     const customerName = data.customerName ? `Hi ${data.customerName}, ` : '';

//     switch (template) {
//       case 'ORDER_CONFIRMATION':
//         return {
//           text: `${customerName}Thanks for your order! Your order ${data.orderId} for ${data.orderAmount} has been confirmed and getting ready to ship. We'll keep you posted! ${storeName}`,
//           dcs: '0',
//           templateId: null
//         };

//       case 'ORDER_SHIPPED':
//         const trackingInfo = data.trackingNumber ? ` Track your order: ${data.trackingUrl || `https://track.example.com/${data.trackingNumber}`}` : '';
//         return {
//           text: `${customerName}Great news! Your order ${data.orderId} has been shipped and is on its way.${trackingInfo} ${storeName}`,
//           dcs: '0',
//           templateId: null
//         };

//       case 'ORDER_DELIVERED':
//         return {
//           text: `${customerName}Your order ${data.orderId} has been delivered successfully! Thank you for choosing ${storeName}. Enjoy your purchase!`,
//           dcs: '0',
//           templateId: null
//         };

//       case 'ORDER_CANCELLED':
//         return {
//           text: `${customerName}Your order ${data.orderId} has been cancelled. If you have any questions, please contact our support team. ${storeName}`,
//           dcs: '0',
//           templateId: null
//         };

//       default:
//         return {
//           text: `${customerName}Update regarding your order ${data.orderId}: ${data.orderAmount}. ${storeName}`,
//           dcs: '0',
//           templateId: null
//         };
//     }
//   }

  /**
   * Check if SMS service is properly configured
   */
  private isConfigured(): boolean {
    return !!(process.env.SMSINDIAHUB_API_KEY || (process.env.SMSINDIAHUB_USER && process.env.SMSINDIAHUB_PASSWORD));
  }

  /**
   * Send SMS with template
   */
  async sendTemplateSMS(
    phone: string,
    template: SMSTemplate,
    data: SMSData
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    // Check if SMS service is configured
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'SMS service not configured. Please set SMSINDIAHUB_API_KEY or SMSINDIAHUB_USER/PASSWORD in environment variables.'
      };
    }

    try {
      await this.ensureInitialized();
      
      const formattedPhone = this.formatPhoneNumber(phone);
      
      if (!formattedPhone) {
        throw new Error('Invalid phone number provided');
      }

      const { text, dcs, templateId } = await this.buildSMSMessage(template, data);

      const result = await this.smsClient.sendSMS({
        number: formattedPhone,
        text,
        senderid: process.env.SMSINDIAHUB_SENDERID || 'CDCLPL',
        channel: 'Trans',
        DCS: dcs,
        flashsms: '0',
        route: '',
        PEId: process.env.PEID,
        TemplateId: templateId,
        DLT_TE_ID: templateId
      });

      return {
        success: true,
        result
      };

    } catch (error) {
      console.error(`Error sending ${template} SMS:`, error.message);
      
      // Try fallback SMS
    //   try {
    //     const fallbackResult = await this.sendFallbackSMS(phone, template, data);
    //     return fallbackResult;
    //   } catch (fallbackError) {
    //     return {
    //       success: false,
    //       error: `SMS failed: ${error.message}. Fallback also failed: ${fallbackError.message}`
    //     };
    //   }
    }
  }

  /**
   * Send fallback SMS without DLT template
   */
//   private async sendFallbackSMS(
//     phone: string,
//     template: SMSTemplate,
//     data: SMSData
//   ): Promise<{ success: boolean; result?: any; error?: string }> {
//     try {
//       await this.ensureInitialized();
      
//       const formattedPhone = this.formatPhoneNumber(phone);
//       const { text } = this.buildFallbackMessage(template, data);

//       const result = await this.smsClient.sendSMS({
//         number: formattedPhone,
//         text,
//         senderid: process.env.SMSINDIAHUB_SENDERID || 'CDCLPL',
//         channel: 'Trans',
//         DCS: '0',
//         flashsms: '0',
//         route: ''
//       });

//       console.log(`Fallback SMS sent successfully for ${template}:`, result);

//       return {
//         success: true,
//         result
//       };

//     } catch (error) {
//       return {
//         success: false,
//         error: `Fallback SMS failed: ${error.message}`
//       };
//     }
//   }

  /**
   * Send custom SMS message
   */
  async sendCustomSMS(
    phone: string,
    message: string
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    // Check if SMS service is configured
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'SMS service not configured. Please set SMSINDIAHUB_API_KEY or SMSINDIAHUB_USER/PASSWORD in environment variables.'
      };
    }

    try {
      await this.ensureInitialized();
      
      const formattedPhone = this.formatPhoneNumber(phone);
      
      if (!formattedPhone) {
        throw new Error('Invalid phone number provided');
      }

      const result = await this.smsClient.sendSMS({
        number: formattedPhone,
        text: message,
        senderid: process.env.SMSINDIAHUB_SENDERID || 'CDCLPL',
        channel: 'Trans',
        DCS: '0',
        flashsms: '0',
        route: ''
      });

      return {
        success: true,
        result
      };

    } catch (error) {
      console.error('Error sending custom SMS:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get phone number from order data
   */
  getPhoneFromOrder(order: any): string | null {
    return order.billing_address?.phone || 
           order.shipping_address?.phone || 
           order.customer?.phone || 
           null;
  }

  /**
   * Format order amount with currency
   */
  formatOrderAmount(total: number, currencySymbol: string): string {
    return `${currencySymbol}${total}`;
  }

  /**
   * Get order display ID or fallback to regular ID
   */
  getOrderDisplayId(order: any): string {
    return (order as any).display_id || order.id;
  }

  /**
   * Check if SMS service is configured (public method)
   */
  isServiceConfigured(): boolean {
    return this.isConfigured();
  }
}

// Export singleton instance
export const smsService = new SMSService();

// Export individual functions for convenience
export const sendOrderConfirmationSMS = (phone: string, data: SMSData) => 
  smsService.sendTemplateSMS(phone, 'ORDER_CONFIRMATION', data);

export const sendOrderShippedSMS = (phone: string, data: SMSData) => 
  smsService.sendTemplateSMS(phone, 'ORDER_SHIPPED', data);

export const sendOrderDeliveredSMS = (phone: string, data: SMSData) => 
  smsService.sendTemplateSMS(phone, 'ORDER_DELIVERED', data);

export const sendOrderCancelledSMS = (phone: string, data: SMSData) => 
  smsService.sendTemplateSMS(phone, 'ORDER_CANCELLED', data);

export const sendCustomSMS = (phone: string, message: string) => 
  smsService.sendCustomSMS(phone, message);
