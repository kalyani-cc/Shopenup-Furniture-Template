import { ShopenupResponse, ShopenupStoreRequest } from "@shopenup/framework";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_API_KEY);

export const GET = async (req: ShopenupStoreRequest, res: ShopenupResponse) => {
  try {
    const { id } = req.params;

    const paymentMethod = await stripe.paymentMethods.retrieve(id);
    res.status(200).json(paymentMethod);
  } catch (error) {
    console.error('Error retrieving payment method:', error);
    res.status(500).json({
      code: 'internal_error',
      message: (error as Error)?.message || 'Failed to retrieve payment method',
    });
  }
};
