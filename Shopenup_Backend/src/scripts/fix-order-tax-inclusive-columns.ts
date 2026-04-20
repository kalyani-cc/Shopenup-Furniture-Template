import { ExecArgs } from "@shopenup/framework/types";
import { ContainerRegistrationKeys } from "@shopenup/framework/utils";

/**
 * One-time schema repair for environments where older order tables were created
 * without `is_tax_inclusive` and later migrations were skipped as "up-to-date".
 *
 * Run:
 *   npx shopenup exec ./src/scripts/fix-order-tax-inclusive-columns.ts
 */
export default async function fixOrderTaxInclusiveColumns({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const pgConnection = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any;

  const statements = [
    `ALTER TABLE IF EXISTS "order_line_item" ADD COLUMN IF NOT EXISTS "is_tax_inclusive" BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE IF EXISTS "order_line_item_adjustment" ADD COLUMN IF NOT EXISTS "is_tax_inclusive" BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE IF EXISTS "order_shipping_method" ADD COLUMN IF NOT EXISTS "is_tax_inclusive" BOOLEAN NOT NULL DEFAULT false;`,
    // Defensive additions for related tables that may be queried in older schemas.
    `ALTER TABLE IF EXISTS "cart_line_item" ADD COLUMN IF NOT EXISTS "is_tax_inclusive" BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE IF EXISTS "cart_shipping_method" ADD COLUMN IF NOT EXISTS "is_tax_inclusive" BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE IF EXISTS "cart_line_item_adjustment" ADD COLUMN IF NOT EXISTS "is_tax_inclusive" BOOLEAN NOT NULL DEFAULT false;`,
  ];

  for (const sql of statements) {
    logger.info(`Running: ${sql}`);
    if (typeof pgConnection?.execute === "function") {
      await pgConnection.execute(sql);
    } else if (typeof pgConnection?.raw === "function") {
      await pgConnection.raw(sql);
    } else if (typeof pgConnection?.query === "function") {
      await pgConnection.query(sql);
    } else {
      throw new Error("No executable pg connection method found.");
    }
  }

  logger.info("Schema repair completed for is_tax_inclusive columns.");
}
