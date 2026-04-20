import { Migration } from "@mikro-orm/migrations"

export class Migration20250101000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS return_item_defect (
        id VARCHAR(255) PRIMARY KEY,
        return_item_id VARCHAR(255) NOT NULL,
        defective_quantity INTEGER NOT NULL DEFAULT 1,
        image_url TEXT NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_return_item_defect_return_item_id 
      ON return_item_defect(return_item_id);
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS idx_return_item_defect_return_item_id;`)
    this.addSql(`DROP TABLE IF EXISTS return_item_defect;`)
  }
}

