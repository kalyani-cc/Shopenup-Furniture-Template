import { ExecArgs } from "@shopenup/framework/types";
import { ContainerRegistrationKeys } from "@shopenup/framework/utils";

export default async function debugShippingProfileMatch({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const productIdsRaw = process.env.PRODUCT_IDS || "";
  const shippingOptionId = (process.env.SHIPPING_OPTION_ID || "").trim();

  const productIds = productIdsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!productIds.length) {
    throw new Error("PRODUCT_IDS env var is required, comma-separated.");
  }
  if (!shippingOptionId) {
    throw new Error("SHIPPING_OPTION_ID env var is required.");
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "shipping_profile_id"],
    filters: { id: { $in: productIds } },
  });

  const { data: shippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "shipping_profile_id"],
    filters: { id: shippingOptionId },
  });

  const selectedOption = shippingOptions?.[0];
  if (!selectedOption) {
    throw new Error(`Shipping option not found: ${shippingOptionId}`);
  }

  logger.info(`Selected shipping option: ${selectedOption.id} (${selectedOption.name})`);
  logger.info(`Option shipping_profile_id: ${selectedOption.shipping_profile_id}`);

  const optionProfile = selectedOption.shipping_profile_id;
  const mismatches: string[] = [];

  for (const p of products || []) {
    const ok = p.shipping_profile_id === optionProfile;
    logger.info(
      `Product ${p.id} (${p.title}) -> shipping_profile_id=${p.shipping_profile_id} ${ok ? "✅" : "❌"}`,
    );
    if (!ok) {
      mismatches.push(`${p.id} (${p.title})`);
    }
  }

  if (mismatches.length) {
    logger.warn(`MISMATCH: ${mismatches.length} product(s) do not match selected shipping option profile.`);
  } else {
    logger.info("All products match the selected shipping option profile.");
  }
}
