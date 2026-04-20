import { Entity, PrimaryKey, Property, Index } from "@mikro-orm/core"

@Entity({ tableName: "shiprocket_returns" })
@Index({ properties: ["order_id"], name: "idx_shiprocket_returns_order_id" })
@Index({ properties: ["return_id"], name: "uq_shiprocket_returns_return_id" })
@Index({ properties: ["awb_code"], name: "idx_shiprocket_returns_awb_code" })
export class ShiprocketReturn {
  @PrimaryKey({ type: "varchar", length: 255 })
  id!: string

  // Medusa references
  @Property({ type: "varchar", length: 255 })
  order_id!: string

  @Property({ type: "varchar", length: 255 })
  return_id!: string

  // Shiprocket identifiers
  @Property({ type: "varchar", length: 255, nullable: true })
  shiprocket_return_id?: string

  @Property({ type: "varchar", length: 255, nullable: true })
  shiprocket_shipment_id?: string

  @Property({ type: "varchar", length: 255, nullable: true })
  awb_code?: string

  @Property({ type: "varchar", length: 255, nullable: true })
  courier_company?: string

  @Property({ type: "varchar", length: 255, nullable: true })
  courier_company_id?: string

  // Status tracking
  @Property({ type: "varchar", length: 50, nullable: true })
  return_status?: string   // created | awb_generated | cancelled

  @Property({ type: "varchar", length: 50, nullable: true })
  pickup_status?: string   // scheduled | picked | failed

  @Property({ type: "varchar", length: 50, nullable: true })
  shipment_status?: string // in_transit | delivered | rto

  // Dates
  @Property({ type: "timestamp", nullable: true })
  pickup_scheduled_date?: Date

  @Property({ type: "timestamp", nullable: true })
  shipped_at?: Date

  @Property({ type: "timestamp", nullable: true })
  delivered_at?: Date

  // URLs
  @Property({ type: "text", nullable: true })
  label_url?: string

  @Property({ type: "text", nullable: true })
  invoice_url?: string

  @Property({ type: "text", nullable: true })
  tracking_url?: string

  // Payloads
  @Property({ type: "json", nullable: true })
  create_payload?: Record<string, any>

  @Property({ type: "json", nullable: true })
  create_response?: Record<string, any>

  @Property({ type: "json", nullable: true })
  webhook_payloads?: Record<string, any>

  @Property({ type: "json", nullable: true })
  metadata?: Record<string, any>

  // Error & retry
  @Property({ type: "text", nullable: true })
  error_message?: string

  @Property({ type: "integer", default: 0 })
  retry_count!: number
}
