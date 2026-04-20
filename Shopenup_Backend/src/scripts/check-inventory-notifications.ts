/**
 * Script to check inventory notifications in database
 * 
 * Run with: npx shopenup exec ./src/scripts/check-inventory-notifications.ts
 */

import { ExecArgs } from '@shopenup/framework/types';

export default async function checkInventoryNotifications({ container }: ExecArgs) {
  console.log('🔍 Checking inventory notifications in database...\n');

  try {
    // Get database connection
    const pg = await import("pg");
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      console.error('❌ DATABASE_URL not found in environment variables');
      return;
    }

    const client = new pg.Client({ connectionString });
    await client.connect();

    try {
      // Check notification table exists
      console.log('📋 Step 1: Checking if notification table exists...');
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'notification'
        );
      `);

      if (!tableCheck.rows[0].exists) {
        console.log('❌ Notification table does not exist in database');
        return;
      }

      console.log('✅ Notification table exists\n');

      // Get total notification count
      console.log('📋 Step 2: Getting total notification count...');
      const totalCount = await client.query(`
        SELECT COUNT(*) as total FROM notification WHERE deleted_at IS NULL
      `);
      console.log(`   Total notifications: ${totalCount.rows[0].total}\n`);

      // Check for inventory notifications
      console.log('📋 Step 3: Checking for inventory notifications...');
      
      // Method 1: Check by resource_type
      const inventoryByResource = await client.query(`
        SELECT COUNT(*) as count 
        FROM notification 
        WHERE deleted_at IS NULL 
        AND (resource_type = 'inventory' OR data->>'resource_type' = 'inventory')
      `);
      console.log(`   Notifications with resource_type='inventory': ${inventoryByResource.rows[0].count}`);

      // Method 2: Check by notification_type in data
      const inventoryByType = await client.query(`
        SELECT COUNT(*) as count 
        FROM notification 
        WHERE deleted_at IS NULL 
        AND (data->>'notification_type' = 'inventory_low_stock' OR data->>'notification_type' = 'variant_restock')
      `);
      console.log(`   Notifications with notification_type='inventory_low_stock' or 'variant_restock': ${inventoryByType.rows[0].count}`);

      // Method 3: Check by template
      const inventoryByTemplate = await client.query(`
        SELECT COUNT(*) as count 
        FROM notification 
        WHERE deleted_at IS NULL 
        AND template IN ('inventory-low-stock', 'variant-restock')
      `);
      console.log(`   Notifications with template='inventory-low-stock' or 'variant-restock': ${inventoryByTemplate.rows[0].count}`);

      // Get recent inventory notifications
      console.log('\n📋 Step 4: Getting recent inventory notifications (last 10)...');
      const recentInventory = await client.query(`
        SELECT 
          id,
          to as recipient,
          channel,
          template,
          status,
          data->>'notification_type' as notification_type,
          data->>'resource_type' as resource_type,
          data->>'product_title' as product_title,
          data->>'variant_sku' as variant_sku,
          data->>'current_quantity' as current_quantity,
          created_at
        FROM notification 
        WHERE deleted_at IS NULL 
        AND (
          resource_type = 'inventory' 
          OR data->>'resource_type' = 'inventory'
          OR data->>'notification_type' = 'inventory_low_stock'
          OR data->>'notification_type' = 'variant_restock'
          OR template IN ('inventory-low-stock', 'variant-restock')
        )
        ORDER BY created_at DESC
        LIMIT 10
      `);

      if (recentInventory.rows.length === 0) {
        console.log('   ⚠️  No inventory notifications found');
      } else {
        console.log(`   Found ${recentInventory.rows.length} recent inventory notifications:\n`);
        recentInventory.rows.forEach((notif, index) => {
          console.log(`   ${index + 1}. ID: ${notif.id}`);
          console.log(`      Template: ${notif.template}`);
          console.log(`      Type: ${notif.notification_type || notif.resource_type || 'N/A'}`);
          console.log(`      Product: ${notif.product_title || 'N/A'}`);
          console.log(`      SKU: ${notif.variant_sku || 'N/A'}`);
          console.log(`      Quantity: ${notif.current_quantity || 'N/A'}`);
          console.log(`      Status: ${notif.status}`);
          console.log(`      Created: ${new Date(notif.created_at).toLocaleString()}`);
          console.log('');
        });
      }

      // Check for restock subscriptions
      console.log('📋 Step 5: Checking restock_subscription table...');
      const subscriptionTableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'restock_subscription'
        );
      `);

      if (subscriptionTableCheck.rows[0].exists) {
        const subscriptionCount = await client.query(`
          SELECT COUNT(*) as count FROM restock_subscription
        `);
        console.log(`   ✅ restock_subscription table exists`);
        console.log(`   Total subscriptions: ${subscriptionCount.rows[0].count}`);

        if (subscriptionCount.rows[0].count > 0) {
          const recentSubs = await client.query(`
            SELECT * FROM restock_subscription 
            ORDER BY created_at DESC 
            LIMIT 5
          `);
          console.log(`   Recent subscriptions:\n`);
          recentSubs.rows.forEach((sub, index) => {
            console.log(`   ${index + 1}. Variant: ${sub.variant_id}`);
            console.log(`      Email: ${sub.email}`);
            console.log(`      Created: ${new Date(sub.created_at).toLocaleString()}`);
            console.log('');
          });
        }
      } else {
        console.log('   ⚠️  restock_subscription table does not exist yet');
      }

      console.log('\n✅ Database check completed!');

    } finally {
      await client.end();
    }
  } catch (error: any) {
    console.error('\n❌ Error checking database:', error.message);
    console.error('   Stack:', error.stack);
  }
}

