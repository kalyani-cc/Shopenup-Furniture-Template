import { ExecArgs } from "@shopenup/framework/types";
import { ContainerRegistrationKeys } from "@shopenup/framework/utils";

export default async function debugCartShippingProfiles({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const cartId = process.env.CART_ID;
  if (!cartId) {
    throw new Error("CART_ID env var is required. Example: CART_ID=cart_xxx");
  }

  const { data: carts } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "sales_channel_id",
      "items.id",
      "items.title",
      "items.product_id",
      "items.variant_id",
      "shipping_methods.id",
      "shipping_methods.shipping_option_id",
    ],
    filters: { id: cartId },
  });

  const cart = carts?.[0];
  if (!cart) {
    throw new Error(`Cart not found: ${cartId}`);
  }

  logger.info(`Cart: ${cart.id}`);
  logger.info(`Sales channel: ${cart.sales_channel_id}`);

  const productIds = [...new Set((cart.items || []).map((i: any) => i.product_id).filter(Boolean))];
  const shippingOptionIds = [
    ...new Set((cart.shipping_methods || []).map((m: any) => m.shipping_option_id).filter(Boolean)),
  ];

  const { data: products } = productIds.length
    ? await query.graph({
        entity: "product",
        fields: ["id", "title", "shipping_profile_id"],
        filters: { id: { $in: productIds } },
      })
    : { data: [] as any[] };

  const { data: shippingOptions } = shippingOptionIds.length
    ? await query.graph({
        entity: "shipping_option",
        fields: ["id", "name", "shipping_profile_id"],
        filters: { id: { $in: shippingOptionIds } },
      })
    : { data: [] as any[] };

  const productMap = new Map((products || []).map((p: any) => [p.id, p]));
  const optionMap = new Map((shippingOptions || []).map((o: any) => [o.id, o]));

  logger.info("Items -> required shipping profiles:");
  for (const item of cart.items || []) {
    const product = productMap.get(item.product_id);
    const profileId = product?.shipping_profile_id || "N/A";
    logger.info(
      `- item ${item.id} | ${item.title} | product ${item.product_id} | variant ${item.variant_id} | profile ${profileId}`,
    );
  }

  logger.info("Shipping methods -> provided shipping profiles:");
  for (const method of cart.shipping_methods || []) {
    const option = optionMap.get(method.shipping_option_id);
    const profileId = option?.shipping_profile_id || "N/A";
    logger.info(
      `- method ${method.id} | option ${method.shipping_option_id} (${option?.name || "N/A"}) | profile ${profileId}`,
    );
  }
}
