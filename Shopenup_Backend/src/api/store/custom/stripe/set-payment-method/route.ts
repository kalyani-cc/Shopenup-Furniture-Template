import { ShopenupResponse, ShopenupStoreRequest } from "@shopenup/framework";
import { IPaymentModuleService } from "@shopenup/framework/types";
import { Modules } from "@shopenup/framework/utils";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_API_KEY);

export const POST = async (
  req: ShopenupStoreRequest<{
    session_id: string;
    token: string;
  }>,
  res: ShopenupResponse
) => {
  try {
    const paymentModuleService: IPaymentModuleService = req.scope.resolve(
      Modules.PAYMENT
    );

    const session = await paymentModuleService.retrievePaymentSession(
      req.body.session_id
    );

    if (!req.body.token) {
      await paymentModuleService.updatePaymentSession({
        ...session,
        data: {
          ...session.data,
          payment_method_id: null,
        },
      });
      res.status(200).json({ success: true });
      return;
    }

    const paymentMethod = await stripe.paymentMethods.create({
      type: "card",
      card: { token: req.body.token },
    });

    await stripe.paymentIntents.update(session.data.id as string, {
      payment_method: paymentMethod.id,
    });
    await paymentModuleService.updatePaymentSession({
      ...session,
      data: {
        ...session.data,
        payment_method_id: paymentMethod.id,
      },
    });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error setting payment method:', error);
    res.status(500).json({
      code: 'internal_error',
      message: (error as Error)?.message || 'Failed to set payment method',
    });
  }
};
