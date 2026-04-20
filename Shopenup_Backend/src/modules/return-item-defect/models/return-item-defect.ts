import { Entity, PrimaryKey, Property, Index } from "@mikro-orm/core"

@Entity({ tableName: "return_item_defect" })
@Index({ properties: ["return_item_id"], name: "idx_return_item_defect_return_item_id" })
export class ReturnItemDefect {
  @PrimaryKey({ type: "varchar", length: 255 })
  id!: string

  @Property({ type: "varchar", length: 255 })
  @Index()
  return_item_id!: string

  @Property({ type: "integer", default: 1 })
  defective_quantity!: number

  @Property({ type: "text" })
  image_url!: string

  @Property({ type: "text", nullable: true })
  note?: string

  @Property({ type: "timestamp", default: "now()" })
  created_at!: Date
}

