import { Context } from "@shopenup/framework/types"

interface RestockSubscription {
  id: string
  variant_id: string
  sales_channel_id?: string
  email: string
  customer_id?: string
  created_at?: Date
  updated_at?: Date
}

interface RestockModuleOptions {
  // Options can be added here if needed in the future
}

class RestockModuleService {
  private container: any

  constructor(container: any, options?: RestockModuleOptions) {
    this.container = container
    // Initialize database table
    this.initializeTable()
  }

  private async initializeTable() {
    try {
      const manager = this.container.resolve("manager")
      if (!manager) {
        console.warn("[restock-module] Manager not available, table will be created on first use")
        return
      }

      // Create table if it doesn't exist
      await this.createTableIfNotExists()
    } catch (error: any) {
      console.warn("[restock-module] Error initializing table:", error.message)
      // Table will be created on first query if it doesn't exist
    }
  }

  private async getDatabaseConnection() {
    try {
      // Try to get manager for database connection
      const manager = this.container.resolve("manager")
      if (manager && manager.getConnection) {
        return manager.getConnection()
      }
      
      // Fallback: use query service's underlying connection
      const query = this.container.resolve("query")
      if (query && query.connection) {
        return query.connection
      }
      
      // Last resort: use pg directly with connection string
      return null
    } catch (error) {
      return null
    }
  }

  private async executeQuery(sql: string, params: any[] = []) {
    try {
      // Use PostgreSQL directly with DATABASE_URL
      const pg = await import("pg")
      const connectionString = process.env.DATABASE_URL
      
      if (!connectionString) {
        throw new Error("DATABASE_URL not found in environment variables")
      }

      const client = new pg.Client({ connectionString })
      await client.connect()
      
      try {
        const result = await client.query(sql, params)
        return result.rows || result
      } finally {
        await client.end()
      }
    } catch (error: any) {
      console.error("[restock-module] Query execution error:", error.message)
      console.error("[restock-module] SQL:", sql)
      console.error("[restock-module] Params:", params)
      throw error
    }
  }

  private async createTableIfNotExists() {
    try {
      await this.executeQuery(`
        CREATE TABLE IF NOT EXISTS restock_subscription (
          id VARCHAR(255) PRIMARY KEY,
          variant_id VARCHAR(255) NOT NULL,
          sales_channel_id VARCHAR(255),
          email VARCHAR(255) NOT NULL,
          customer_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Create unique constraint
      try {
        await this.executeQuery(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_restock_subscription_unique 
          ON restock_subscription(variant_id, COALESCE(sales_channel_id, ''), email)
        `)
      } catch (e) {
        // Index might already exist, ignore
      }

      // Create indexes for faster lookups
      await this.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_restock_subscription_variant 
        ON restock_subscription(variant_id)
      `)

      await this.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_restock_subscription_email 
        ON restock_subscription(email)
      `)
    } catch (error: any) {
      // Table might already exist or have different structure
    }
  }

  async createRestockSubscriptions(
    data: Omit<RestockSubscription, "id" | "created_at" | "updated_at">
  ): Promise<RestockSubscription> {
    // Ensure table exists
    await this.createTableIfNotExists()

    const id = `restock_sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date()

    try {
      // Check for existing subscription
      const existing = await this.executeQuery(
        `SELECT * FROM restock_subscription 
         WHERE variant_id = $1 
         AND email = $2 
         AND (sales_channel_id = $3 OR (sales_channel_id IS NULL AND $3 IS NULL))
         LIMIT 1`,
        [data.variant_id, data.email, data.sales_channel_id || null]
      )

      if (existing && existing.length > 0) {
        // Update existing subscription
        const updated = await this.executeQuery(
          `UPDATE restock_subscription 
           SET customer_id = COALESCE($1, customer_id),
               updated_at = $2
           WHERE id = $3
           RETURNING *`,
          [data.customer_id || null, now, existing[0].id]
        )
        return this.mapDbRowToSubscription(updated[0])
      }

      // Create new subscription
      const result = await this.executeQuery(
        `INSERT INTO restock_subscription 
         (id, variant_id, sales_channel_id, email, customer_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          id,
          data.variant_id,
          data.sales_channel_id || null,
          data.email,
          data.customer_id || null,
          now,
          now,
        ]
      )

      return this.mapDbRowToSubscription(result[0])
    } catch (error: any) {
      console.error("[restock-module] Error creating subscription:", error)
      throw error
    }
  }

  private mapDbRowToSubscription(row: any): RestockSubscription {
    return {
      id: row.id,
      variant_id: row.variant_id,
      sales_channel_id: row.sales_channel_id || undefined,
      email: row.email,
      customer_id: row.customer_id || undefined,
      created_at: row.created_at ? new Date(row.created_at) : new Date(),
      updated_at: row.updated_at ? new Date(row.updated_at) : new Date(),
    }
  }

  async retrieveRestockSubscription(id: string): Promise<RestockSubscription> {
    const result = await this.executeQuery(
      `SELECT * FROM restock_subscription WHERE id = $1 LIMIT 1`,
      [id]
    )

    if (!result || result.length === 0) {
      throw new Error(`Restock subscription with id ${id} not found`)
    }

    return this.mapDbRowToSubscription(result[0])
  }

  async updateRestockSubscriptions(
    data: Partial<RestockSubscription> & { id: string }
  ): Promise<RestockSubscription> {
    const updateFields: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (data.variant_id !== undefined) {
      updateFields.push(`variant_id = $${paramIndex++}`)
      values.push(data.variant_id)
    }
    if (data.sales_channel_id !== undefined) {
      updateFields.push(`sales_channel_id = $${paramIndex++}`)
      values.push(data.sales_channel_id || null)
    }
    if (data.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`)
      values.push(data.email)
    }
    if (data.customer_id !== undefined) {
      updateFields.push(`customer_id = $${paramIndex++}`)
      values.push(data.customer_id || null)
    }

    updateFields.push(`updated_at = $${paramIndex++}`)
    values.push(new Date())

    values.push(data.id)

    const result = await this.executeQuery(
      `UPDATE restock_subscription 
       SET ${updateFields.join(", ")} 
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    )

    if (!result || result.length === 0) {
      throw new Error(`Restock subscription with id ${data.id} not found`)
    }

    return this.mapDbRowToSubscription(result[0])
  }

  async deleteRestockSubscriptions(id: string | string[]): Promise<void> {
    const ids = Array.isArray(id) ? id : [id]
    
    if (ids.length === 0) return

    const placeholders = ids.map((_, index) => `$${index + 1}`).join(", ")
    
    await this.executeQuery(
      `DELETE FROM restock_subscription WHERE id IN (${placeholders})`,
      ids
    )
  }

  async getUniqueSubscriptions(): Promise<Array<{ variant_id: string; sales_channel_id?: string }>> {
    const result = await this.executeQuery(
      `SELECT DISTINCT variant_id, sales_channel_id 
       FROM restock_subscription`
    )

    return result.map((row: any) => ({
      variant_id: row.variant_id,
      sales_channel_id: row.sales_channel_id || undefined,
    }))
  }

  async listRestockSubscriptions(filters?: {
    variant_id?: string
    email?: string
    sales_channel_id?: string
  }): Promise<RestockSubscription[]> {
    let query = `SELECT * FROM restock_subscription WHERE 1=1`
    const values: any[] = []
    let paramIndex = 1

    if (filters) {
      if (filters.variant_id) {
        query += ` AND variant_id = $${paramIndex++}`
        values.push(filters.variant_id)
      }
      if (filters.email) {
        query += ` AND email = $${paramIndex++}`
        values.push(filters.email)
      }
      if (filters.sales_channel_id !== undefined) {
        query += ` AND (sales_channel_id = $${paramIndex} OR (sales_channel_id IS NULL AND $${paramIndex} IS NULL))`
        values.push(filters.sales_channel_id || null)
        paramIndex++
      }
    }

    query += ` ORDER BY created_at DESC`

    const result = await this.executeQuery(query, values)
    return result.map((row: any) => this.mapDbRowToSubscription(row))
  }
}

export default RestockModuleService

