import { Migration } from "@mikro-orm/migrations"

export class Migration20250123120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "shiprocket_returns" (
        "id" text not null,
        "order_id" text not null,
        "return_id" text not null,

        "shiprocket_return_id" text null,
        "shiprocket_shipment_id" text null,
        "awb_code" text null,

        "courier_company" text null,
        "courier_company_id" text null,

        "return_status" text null,
        "pickup_status" text null,
        "shipment_status" text null,

        "pickup_scheduled_date" timestamptz null,
        "shipped_at" timestamptz null,
        "delivered_at" timestamptz null,

        "label_url" text null,
        "invoice_url" text null,
        "tracking_url" text null,

        "create_payload" jsonb null,
        "create_response" jsonb null,
        "webhook_payloads" jsonb null,
        "metadata" jsonb null,

        "error_message" text null,
        "retry_count" int not null default 0,

        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,

        constraint "shiprocket_return_pkey" primary key ("id")
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_shiprocket_return_deleted_at"
      ON "shiprocket_returns" (deleted_at)
      WHERE deleted_at IS NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_shiprocket_return_order_id"
      ON "shiprocket_returns" (order_id)
      WHERE deleted_at IS NULL;
    `)

    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_shiprocket_return_return_id_unique"
      ON "shiprocket_returns" (return_id)
      WHERE deleted_at IS NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_shiprocket_return_awb_code"
      ON "shiprocket_returns" (awb_code)
      WHERE deleted_at IS NULL;
    `)

    this.addSql(`
      alter table if exists "shiprocket_returns"
      add constraint "shiprocket_return_order_id_foreign"
      foreign key ("order_id") references "order" ("id")
      on update cascade on delete cascade;
    `)

    this.addSql(`
      alter table if exists "shiprocket_returns"
      add constraint "shiprocket_return_return_id_foreign"
      foreign key ("return_id") references "return" ("id")
      on update cascade on delete cascade;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "shiprocket_returns" cascade;`)
  }

}
