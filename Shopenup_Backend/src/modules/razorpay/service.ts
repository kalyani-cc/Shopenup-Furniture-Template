import Razorpay from "razorpay";  

interface RazorpayOptions {
  key_id: string;
  key_secret: string;
  razorpay_account?: string;
  automatic_expiry_period?: number;
  manual_expiry_period?: number;
  refund_speed?: "normal" | "optimum";
  webhook_secret?: string;
}

class RazorpayService {
  static identifier = "razorpay";
  
  // Required by ShopenUp framework
  // static displayName = "Razorpay";
  static defaultOptions = {};
  private razorpay: Razorpay;
  private options: RazorpayOptions;
  private container: any;

  constructor(container: any, options: RazorpayOptions) {
    this.container = container;
    this.options = options;
    
    this.razorpay = new Razorpay({
      key_id: options.key_id,
      key_secret: options.key_secret,
    });
  }

  async createPayment(data: any): Promise<any> {
    try {
      const orderOptions = {
        amount: data.amount * 100, // Convert to paise
        currency: data.currency || "INR",
        receipt: data.receipt || `receipt_${Date.now()}`,
        notes: data.notes || {},
      };

      const order = await this.razorpay.orders.create(orderOptions);
      
      return {
        id: order.id,
        status: "pending",
        amount: data.amount,
        currency: data.currency || "INR",
        client_secret: order.id,
        data: {
          razorpay_order_id: order.id,
          razorpay_key_id: this.options.key_id,
        },
      };
    } catch (error) {
      throw new Error(`Razorpay payment creation failed: ${error.message}`);
    }
  }

  // Expected by ShopenUp payment module
  async initiatePayment(data: any): Promise<any> {
    return this.createPayment(data)
  }

  async retrievePayment(paymentId: string): Promise<any> {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      
      return {
        id: payment.id,
        status: this.mapRazorpayStatus(payment.status),
        amount: Number(payment.amount) / 100, // Convert from paise
        currency: payment.currency,
        data: payment,
      };
    } catch (error) {
      throw new Error(`Failed to retrieve Razorpay payment: ${error.message}`);
    }
  }

  async updatePayment(paymentId: string, data: any): Promise<any> {
    // Razorpay doesn't support payment updates - return the existing payment
    //console.log(`Razorpay updatePayment called for payment: ${paymentId} - returning existing payment`);
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return {
        id: payment.id,
        status: this.mapRazorpayStatus(payment.status),
        amount: Number(payment.amount) / 100,
        currency: payment.currency,
        data: payment,
      };
    } catch (error) {
      console.error(`Razorpay updatePayment failed for payment ${paymentId}:`, error);
      throw new Error(`Failed to update Razorpay payment: ${error.message || 'Unknown error'}`);
    }
  }

  async authorizePayment(paymentId: string, context: any): Promise<any> {
    try {
      // Extract payment ID from object if needed
      let actualPaymentId = paymentId;
      let razorpayOrderId: string | null = null;
      
      if (typeof paymentId === 'object' && paymentId !== null) {
        actualPaymentId = (paymentId as any).provider_id || 
                         (paymentId as any).id || 
                         (paymentId as any).payment_id ||
                         (paymentId as any).data?.provider_id ||
                         (paymentId as any).data?.razorpay_payment_id;
        
        // Also extract order ID for fallback lookup
        razorpayOrderId = (paymentId as any).data?.razorpay_order_id || 
                         (paymentId as any).data?.razorpayOrder?.id ||
                         (paymentId as any).razorpay_order_id;
      }
      
      // If we don't have a payment ID but have an order ID, try to fetch payments for the order
      if ((!actualPaymentId || !actualPaymentId.startsWith('pay_')) && razorpayOrderId) {
        try {
          // Fetch payments for this order
          const payments = await this.razorpay.orders.fetchPayments(razorpayOrderId);
          
          if (payments.items && payments.items.length > 0) {
            // Find the most recent captured payment (or any payment if none captured)
            const payment = payments.items.find((p: any) => p.status === 'captured') || payments.items[0];
            actualPaymentId = payment.id;
          }
        } catch (orderError: any) {
          console.warn(`[Razorpay] Could not fetch payments for order ${razorpayOrderId}:`, orderError?.message || orderError);
        }
      }
      
      if (!actualPaymentId || typeof actualPaymentId !== 'string') {
        throw new Error("Valid payment ID is required for authorization. Payment ID not found in payment data or order.");
      }
      
      // STRICT: Only accept Razorpay payment IDs (pay_XXXX)
      if (!actualPaymentId.startsWith('pay_')) {
        throw new Error(`authorizePayment requires Razorpay payment ID (pay_XXXX), got: ${actualPaymentId}`);
      }
      
      // Fetch the actual payment from Razorpay
      const payment = await this.razorpay.payments.fetch(actualPaymentId);
      
      return {
        id: payment.id,
        status: this.mapRazorpayStatus(payment.status),
        amount: Number(payment.amount) / 100,
        currency: payment.currency,
        data: payment,
      };
    } catch (error: any) {
      console.error(`[Razorpay] Authorization failed:`, error);
      throw new Error(`Failed to authorize Razorpay payment: ${error.message || 'Unknown error'}`);
    }
  }

  async capturePayment(paymentId: string): Promise<any> {
    try {
      // Extract payment ID from object if needed
      let actualPaymentId = paymentId;
      if (typeof paymentId === 'object' && paymentId !== null) {
        // Check if it's already a Razorpay payment object with id in data
        if ((paymentId as any).data?.id?.startsWith('pay_')) {
          actualPaymentId = (paymentId as any).data.id;
        } else {
          actualPaymentId = (paymentId as any).provider_id || 
                           (paymentId as any).id || 
                           (paymentId as any).payment_id ||
                           (paymentId as any).data?.provider_id ||
                           (paymentId as any).data?.razorpay_payment_id ||
                           (paymentId as any).data?.id;
        }
      }
      
      if (!actualPaymentId || typeof actualPaymentId !== 'string') {
        throw new Error("Valid payment ID is required for capture");
      }
      
      // STRICT: Only accept Razorpay payment IDs (pay_XXXX)
      if (!actualPaymentId.startsWith('pay_')) {
        throw new Error(`capturePayment requires Razorpay payment ID (pay_XXXX), got: ${actualPaymentId}`);
      }
      
      // Fetch the payment first to check its status
      const payment = await this.razorpay.payments.fetch(actualPaymentId);
      
      // If already captured, return current status
      if (payment.status === "captured") {
        return {
          id: payment.id,
          status: "captured",
          amount: Number(payment.amount) / 100,
          currency: payment.currency,
          data: payment,
        };
      }
      
      // If not authorized, cannot capture
      if (payment.status !== "authorized") {
        throw new Error(`Payment ${actualPaymentId} is in ${payment.status} status and cannot be captured. Only authorized payments can be captured.`);
      }
      
      // Capture the payment (amount in paise, currency is optional)
      const captured = await this.razorpay.payments.capture(actualPaymentId, payment.amount, payment.currency);
      
      return {
        id: captured.id,
        status: "captured",
        amount: Number(captured.amount) / 100,
        currency: captured.currency,
        data: captured,
      };
    } catch (error: any) {
      console.error(`[Razorpay] Capture failed:`, error);
      throw new Error(`Failed to capture Razorpay payment: ${error.message || 'Unknown error'}`);
    }
  }

  async refundPayment(paymentId: string | any, amount?: number, reason?: string): Promise<any> {
    let actualPaymentId: string | null = null;
    
    try {
      // Extract amount and reason from paymentId object if not provided as parameters
      if (typeof paymentId === 'object' && paymentId !== null) {
        // Extract amount from paymentId.amount (could be { value: string, float: number } or number)
        if (amount === undefined && paymentId.amount !== undefined) {
          if (typeof paymentId.amount === 'number') {
            amount = paymentId.amount;
          } else if (paymentId.amount?.float !== undefined && paymentId.amount?.float !== null) {
            amount = paymentId.amount.float;
          } else if (paymentId.amount?.value !== undefined) {
            // Try to parse string value
            const parsed = parseFloat(String(paymentId.amount.value));
            if (!isNaN(parsed)) {
              amount = parsed;
            }
          }
        }
        
        // Extract reason/note from paymentId
        if (!reason && paymentId.note) {
          reason = paymentId.note;
        } else if (!reason && paymentId.reason) {
          reason = paymentId.reason;
        }
      }
      
      // STRICT: Extract Razorpay payment ID (pay_XXXX) only
      const extractPaymentId = (obj: any): string | null => {
        if (!obj) return null;
        
        // If it's a string and starts with pay_, use it directly
        if (typeof obj === "string" && obj.startsWith("pay_")) {
          return obj;
        }
        
        // Check data.id first (Razorpay payment objects store ID here)
        if (obj.data?.id?.startsWith("pay_")) {
          return obj.data.id;
        }
        
        // Check provider_id (most reliable for database records)
        if (obj.provider_id?.startsWith("pay_")) {
          return obj.provider_id;
        }
        
        // Check data.provider_id
        if (obj.data?.provider_id?.startsWith("pay_")) {
          return obj.data.provider_id;
        }
        
        // Check data.razorpay_payment_id
        if (obj.data?.razorpay_payment_id?.startsWith("pay_")) {
          return obj.data.razorpay_payment_id;
        }
        
        // Check id directly (fallback)
        if (obj.id?.startsWith("pay_")) {
          return obj.id;
        }
        
        return null;
      };
      
      actualPaymentId = extractPaymentId(paymentId);
      
      // Extract razorpay_order_id early so it's available for fallback lookup
      const razorpayOrderId = typeof paymentId === 'object' && paymentId !== null
        ? (paymentId?.data?.order_id || 
           paymentId?.data?.razorpay_order_id || 
           paymentId?.data?.razorpayOrder?.id)
        : null;
      
      // If we didn't find a pay_XXXX ID, try to fetch from database using direct PostgreSQL query
      if (!actualPaymentId) {
        // Extract internal payment ID - could be paymentId itself if it's a string, or paymentId.id if it's an object
        const internalId = typeof paymentId === 'string' 
          ? paymentId 
          : (paymentId?.id || paymentId?.data?.id || paymentId?.payment_id || paymentId?.data?.payment_id);
        
        // Use direct PostgreSQL query since container resolution is failing
        try {
          const pg = await import("pg");
          const connectionString = process.env.DATABASE_URL;
          
          if (!connectionString) {
            throw new Error('DATABASE_URL not configured');
          }
          
          const client = new pg.Client({ connectionString });
          await client.connect();
          
          try {
            // PRIORITY 1: If we have razorpay_order_id, use it first (most reliable)
            if (razorpayOrderId) {
              // Find payment session with this order_id in data JSONB field
              const sessionResult = await client.query(
                `SELECT id, data, payment_collection_id 
                 FROM payment_session 
                 WHERE (data->>'razorpay_order_id' = $1 OR data->'razorpayOrder'->>'id' = $1)
                 LIMIT 1`,
                [razorpayOrderId]
              );
              
              if (sessionResult.rows.length > 0) {
                const paymentCollectionId = sessionResult.rows[0].payment_collection_id;
                
                // Find payment for this collection
                const paymentResult = await client.query(
                  `SELECT id, provider_id, data 
                   FROM payment 
                   WHERE payment_collection_id = $1 
                   LIMIT 1`,
                  [paymentCollectionId]
                );
                
                if (paymentResult.rows.length > 0) {
                  const payment = paymentResult.rows[0];
                  
                  // Check if id is the Razorpay payment ID (convert to string to be safe)
                  const paymentIdStr = String(payment.id || '');
                  if (paymentIdStr.startsWith('pay_')) {
                    actualPaymentId = paymentIdStr;
                  }
                  // Also check data field for Razorpay payment ID
                  else if (payment.data?.provider_id?.startsWith('pay_')) {
                    actualPaymentId = String(payment.data.provider_id);
                  }
                  else if (payment.data?.razorpay_payment_id?.startsWith('pay_')) {
                    actualPaymentId = String(payment.data.razorpay_payment_id);
                  }
                  else {
                    console.warn(`[Razorpay] ⚠ Payment found but no Razorpay payment ID (pay_XXXX) detected in id or data fields`);
                  }
                }
              }
            }
            
            // PRIORITY 2: Try to find payment by internal ID if still not found
            if (!actualPaymentId && internalId) {
              const paymentResult = await client.query(
                `SELECT id, provider_id, data 
                 FROM payment 
                 WHERE id = $1 
                 LIMIT 1`,
                [internalId]
              );
              
              if (paymentResult.rows.length > 0) {
                const payment = paymentResult.rows[0];
                
                // Check if id is the Razorpay payment ID (convert to string to be safe)
                const paymentIdStr = String(payment.id || '');
                if (paymentIdStr.startsWith('pay_')) {
                  actualPaymentId = paymentIdStr;
                }
                // Also check data field for Razorpay payment ID
                else if (payment.data?.provider_id?.startsWith('pay_')) {
                  actualPaymentId = String(payment.data.provider_id);
                }
                else if (payment.data?.razorpay_payment_id?.startsWith('pay_')) {
                  actualPaymentId = String(payment.data.razorpay_payment_id);
                }
                else {
                  console.warn(`[Razorpay] ⚠ Payment found but no Razorpay payment ID (pay_XXXX) detected in id or data fields`);
                }
              }
            }
          } finally {
            await client.end();
          }
        } catch (dbError: any) {
          console.error(`[Razorpay] Database lookup error:`, dbError);
          console.error(`[Razorpay] Error message:`, dbError?.message);
          console.error(`[Razorpay] Error stack:`, dbError?.stack);
          console.warn(`[Razorpay] Could not fetch payment from database:`, dbError);
        }
      }
      
      if (!actualPaymentId) {
        console.error(`[Razorpay] Refund failed: Razorpay payment_id (pay_XXXX) not found.`);
        console.error(`[Razorpay] Payment object received:`, JSON.stringify(paymentId, null, 2));
        throw new Error(
          "Refund failed: Razorpay payment_id (pay_XXXX) not found. Refund requires a captured payment with provider_id."
        );
      }
      
      // Try to verify the payment exists and is refundable (optional - will proceed even if verification fails)
      let paymentVerified = false;
      try {
        const payment = await this.razorpay.payments.fetch(actualPaymentId);
        
        // Check if payment is already refunded
        if (payment.status === 'refunded') {
          throw new Error(`Payment ${actualPaymentId} has already been refunded`);
        }
        
        // Check if payment is captured (required for refund)
        // Razorpay requires payment to be in 'captured' status for refunds
        if (payment.status !== 'captured') {
          throw new Error(`Payment ${actualPaymentId} is in '${payment.status}' status and cannot be refunded. Only 'captured' payments can be refunded. Current status: ${payment.status}`);
        }
        
        paymentVerified = true;
      } catch (fetchError: any) {
        // If payment doesn't exist (400/404), try to find it via order ID as fallback
        if ((fetchError?.statusCode === 404 || fetchError?.statusCode === 400) && razorpayOrderId) {
          const errorDesc = fetchError?.error?.description || fetchError?.message || 'Unknown error';
          console.warn(`[Razorpay] ⚠ Payment ${actualPaymentId} not found in Razorpay (${errorDesc}). Trying to find payment via order ID: ${razorpayOrderId}`);
          
          try {
            // Try to fetch the order and get its payments
            const order = await this.razorpay.orders.fetch(razorpayOrderId);
            
            // Fetch payments for this order
            const payments = await this.razorpay.orders.fetchPayments(razorpayOrderId);
            
            if (payments.items && payments.items.length > 0) {
              // Find a captured payment
              const capturedPayment = payments.items.find((p: any) => p.status === 'captured' && !p.refunded);
              if (capturedPayment) {
                actualPaymentId = capturedPayment.id;
                paymentVerified = true;
                
                // Re-verify the new payment ID
                const payment = await this.razorpay.payments.fetch(actualPaymentId);
                if (payment.status === 'refunded') {
                  throw new Error(`Payment ${actualPaymentId} has already been refunded`);
                }
                if (payment.status !== 'captured') {
                  throw new Error(`Payment ${actualPaymentId} is in '${payment.status}' status and cannot be refunded`);
                }
              } else {
                console.warn(`[Razorpay] ⚠ No captured, non-refunded payment found for order ${razorpayOrderId}`);
              }
            }
          } catch (orderError: any) {
            console.warn(`[Razorpay] Could not fetch order/payments as fallback:`, orderError?.message || orderError);
          }
          
          // If still not found, log warning but continue - refund API will handle the error
          if (!paymentVerified) {
            console.warn(`[Razorpay] ⚠ Payment ${actualPaymentId} not found in Razorpay. Will attempt refund anyway - refund API will validate.`);
            console.warn(`[Razorpay] This could mean: 1) Test payment that was deleted, 2) Payment made with different Razorpay account, 3) Test/production key mismatch, 4) Payment ID in database is incorrect`);
          }
        } else {
          // For other errors (like already refunded or wrong status), throw immediately
          const fetchErrorMessage = fetchError?.message || fetchError?.error?.description || fetchError?.error?.reason || JSON.stringify(fetchError) || 'Unknown error';
          throw new Error(`Failed to verify payment for refund: ${fetchErrorMessage}`);
        }
      }
      const refundOptions: any = {};

      // Only add amount if provided (for partial refund)
      if (amount !== undefined && amount !== null) {
        refundOptions.amount = Math.round(amount * 100); // Convert to paise and round
      }

      // Only add notes if reason is provided and not empty
      if (reason && reason.trim()) {
        refundOptions.notes = { reason: reason.trim() };
      }

      // If refundOptions is empty, pass empty object for full refund
      try {
        const refund = await this.razorpay.payments.refund(actualPaymentId, refundOptions);
        
        return {
          id: refund.id,
          status: "succeeded",
          amount: Number(refund.amount) / 100,
          currency: refund.currency,
          data: refund,
        };
      } catch (refundError: any) {
        // Handle 404 specifically for refund call
        if (refundError?.statusCode === 404) {
          console.error(`[Razorpay] Refund API returned 404 for payment ${actualPaymentId}`);
          throw new Error(`Refund failed: Payment ${actualPaymentId} not found in Razorpay. This could mean: 1) The payment was deleted, 2) The payment was made with different Razorpay credentials, 3) You're using test keys with a production payment ID (or vice versa), or 4) The payment ID format is incorrect.`);
        }
        // Re-throw other errors to be handled by outer catch
        throw refundError;
      }
    } catch (error: any) {
      // Use actualPaymentId if available, otherwise use paymentId
      const errorPaymentId = actualPaymentId || (typeof paymentId === 'string' ? paymentId : JSON.stringify(paymentId));
      console.error(`[Razorpay] Refund failed for payment ${errorPaymentId}:`, error);
      console.error(`[Razorpay] Error details:`, {
        message: error?.message,
        error: error?.error,
        statusCode: error?.statusCode,
        code: error?.code,
        fullError: error
      });
      
      // Handle different error formats from Razorpay SDK
      let errorMessage = 'Unknown error';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error?.description) {
        errorMessage = error.error.description;
      } else if (error?.error?.reason) {
        errorMessage = error.error.reason;
      } else if (error?.error) {
        errorMessage = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = JSON.stringify(error);
      }
      
      throw new Error(`Failed to refund Razorpay payment: ${errorMessage}`);
    }
  }

  async cancelPayment(paymentId: string): Promise<any> {
    // Do not cancel payments - keep all existing payments
    //console.log(`Razorpay cancelPayment called for payment: ${paymentId} - keeping payment (no cancellation)`);
    return Promise.resolve();
  }

  async deletePayment(paymentId: string): Promise<any> {
    // Do not delete payments - keep all existing payments
    //console.log(`Razorpay deletePayment called for payment: ${paymentId} - keeping payment (no deletion)`);
    return Promise.resolve();
  }

  private mapRazorpayStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      created: "pending",
      authorized: "authorized",
      captured: "captured",
      refunded: "captured",
      failed: "error",
      cancelled: "canceled",
    };

    return statusMap[status] || "pending";
  }

  async getStatus(): Promise<{ status: string }> {
    return { status: "active" };
  }

  // Required by ShopenUp for account holder management
  async createAccountHolder(data: any): Promise<any> {
    // Razorpay doesn't require account holders for basic payments
    // Return a mock account holder ID
    return {
      id: `acc_${Date.now()}`,
      type: "individual",
      status: "active",
      data: data
    };
  }

  async updateAccountHolder(accountHolderId: string, data: any): Promise<any> {
    return {
      id: accountHolderId,
      ...data
    };
  }

  async deleteAccountHolder(accountHolderId: string): Promise<void> {
    // Razorpay doesn't require account holder deletion
    return;
  }

  // Required by ShopenUp for payment session management
  async createPaymentSession(data: any): Promise<any> {
    try {
      //console.log('Razorpay createPaymentSession called with data:', JSON.stringify(data, null, 2));
      
      // Handle different data structures that might be passed
      const amount = data.amount || data.total || 1000; // Default to 10 INR if no amount
      const currency = data.currency || data.currency_code || "INR";
      
      const orderOptions = {
        amount: Number(amount) * 100, // Convert to paise
        currency: currency,
        receipt: data.receipt || `receipt_${Date.now()}`,
        notes: data.notes || { source: 'shopenup' },
      };

      //console.log('Creating Razorpay order with options:', orderOptions);
      const order = await this.razorpay.orders.create(orderOptions);
      //console.log('Razorpay order created:', order);
      
      return {
        id: `payses_${Date.now()}`,
        status: "pending",
        amount: Number(amount),
        currency: currency,
        data: {
          razorpay_order_id: order.id,
          razorpay_key_id: this.options.key_id,
          razorpayOrder: {
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt
          }
        },
      };
    } catch (error) {
      console.error('Razorpay payment session creation failed:', error);
      throw new Error(`Razorpay payment session creation failed: ${error.message}`);
    }
  }

  async deletePaymentSession(sessionId: string): Promise<void> {
    // Do not delete payment sessions - keep all existing sessions
    //console.log(`Razorpay deletePaymentSession called for session: ${sessionId} - keeping session (no deletion)`);
    // Return successfully without actually deleting anything
    return Promise.resolve();
  }

  async updatePaymentSession(sessionId: string, data: any): Promise<any> {
    // Razorpay doesn't support session updates, return the existing session
    //console.log('Razorpay updatePaymentSession called - returning existing session');
    return {
      id: sessionId,
      status: "pending",
      data: data || {}
    };
  }

  async retrievePaymentSession(sessionId: string): Promise<any> {
    // Return mock session data
    return {
      id: sessionId,
      status: "pending",
      data: {}
    };
  }
}

export default RazorpayService;