import {
  AuthenticatedShopenupRequest,
  ShopenupResponse,
} from '@shopenup/framework';
import emitCustomerWelcomeEvent from '../../../../../workflows/emit-customer-welcome-event';

export const POST = async (
  req: AuthenticatedShopenupRequest,
  res: ShopenupResponse,
) => {
  try {
    const customerId = req.auth_context.actor_id;

    await emitCustomerWelcomeEvent(req.scope).run({
      input: {
        id: customerId,
      },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    res.status(500).json({
      code: 'internal_error',
      message: (error as Error)?.message || 'Failed to send welcome email',
    });
  }
};
