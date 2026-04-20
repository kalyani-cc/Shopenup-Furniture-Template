import type { SubscriberArgs, SubscriberConfig } from '@shopenup/shopenup';
import { ContainerRegistrationKeys, Modules } from '@shopenup/framework/utils';
import type { CustomerDTO } from '@shopenup/framework/types';

export default async function sendCustomerWelcomeNotification({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const notificationModuleService = container.resolve(Modules.NOTIFICATION);

    const fields = [
      'id',
      'email',
      'first_name',
      'last_name',
    ] as const satisfies (keyof CustomerDTO)[];

    const { data: customers } = await query.graph({
      entity: 'customer',
      fields,
      filters: { id: data.id },
    });

    const customer = customers[0] as Pick<CustomerDTO, (typeof fields)[number]>;
    
    if (!customer?.email) {
      console.warn('Customer not found or has no email for welcome notification:', data.id)
      return
    }

    await notificationModuleService.createNotifications({
      to: customer.email,
      channel: 'email',
      template: 'customer-welcome',
      data: { customer },
    });
  } catch (error) {
    console.error("Error in customer welcome notification handler:", error);
    // Don't throw - subscribers should fail gracefully
  }
}

export const config: SubscriberConfig = {
  event: 'customer.welcome',
};
