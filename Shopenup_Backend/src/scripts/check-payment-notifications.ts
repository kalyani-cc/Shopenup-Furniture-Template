/**
 * Script to check payment notifications in database
 * 
 * Run with: npx shopenup exec ./src/scripts/check-payment-notifications.ts
 */

import { ExecArgs } from '@shopenup/framework/types';

export default async function checkPaymentNotifications({ container }: ExecArgs) {
  console.log('🔍 Checking payment notifications in database...\n');

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

      // Check for payment notifications
      console.log('📋 Step 3: Checking for payment notifications...');
      
      // Method 1: Check by resource_type
      const paymentByResource = await client.query(`
        SELECT COUNT(*) as count 
        FROM notification 
        WHERE deleted_at IS NULL 
        AND (resource_type = 'payment' OR data->>'resource_type' = 'payment')
      `);
      console.log(`   Notifications with resource_type='payment': ${paymentByResource.rows[0].count}`);

      // Method 2: Check by notification_type in data
      const paymentByType = await client.query(`
        SELECT COUNT(*) as count 
        FROM notification 
        WHERE deleted_at IS NULL 
        AND (
          data->>'notification_type' = 'payment_failed' 
          OR data->>'notification_type' = 'payment_refunded'
          OR data->>'notification_type' = 'payment_collection_status_changed'
          OR data->>'notification_type' = 'payment_authorized'
        )
      `);
      console.log(`   Notifications with payment notification types: ${paymentByType.rows[0].count}`);

      // Method 3: Check by template
      const paymentByTemplate = await client.query(`
        SELECT COUNT(*) as count 
        FROM notification 
        WHERE deleted_at IS NULL 
        AND template IN ('payment-failed', 'payment-refunded', 'payment-collection-status-changed', 'payment-authorized')
      `);
      console.log(`   Notifications with payment templates: ${paymentByTemplate.rows[0].count}`);

      // Get recent payment notifications
      console.log('\n📋 Step 4: Getting recent payment notifications (last 10)...');
      const recentPayments = await client.query(`
        SELECT 
          id,
          to as recipient,
          channel,
          template,
          status,
          data->>'notification_type' as notification_type,
          data->>'resource_type' as resource_type,
          data->>'order_display_id' as order_display_id,
          data->>'customer_name' as customer_name,
          data->>'amount' as amount,
          data->>'currency_code' as currency_code,
          data->>'payment_status' as payment_status,
          data->>'alert_level' as alert_level,
          created_at
        FROM notification 
        WHERE deleted_at IS NULL 
        AND (
          resource_type = 'payment' 
          OR data->>'resource_type' = 'payment'
          OR data->>'notification_type' = 'payment_failed'
          OR data->>'notification_type' = 'payment_refunded'
          OR data->>'notification_type' = 'payment_collection_status_changed'
          OR data->>'notification_type' = 'payment_authorized'
          OR template IN ('payment-failed', 'payment-refunded', 'payment-collection-status-changed', 'payment-authorized')
        )
        ORDER BY created_at DESC
        LIMIT 10
      `);

      if (recentPayments.rows.length === 0) {
        console.log('   ⚠️  No payment notifications found');
      } else {
        console.log(`   Found ${recentPayments.rows.length} recent payment notifications:\n`);
        recentPayments.rows.forEach((notif, index) => {
          console.log(`   ${index + 1}. ID: ${notif.id}`);
          console.log(`      Template: ${notif.template}`);
          console.log(`      Type: ${notif.notification_type || notif.resource_type || 'N/A'}`);
          console.log(`      Order: #${notif.order_display_id || 'N/A'}`);
          console.log(`      Customer: ${notif.customer_name || 'N/A'}`);
          console.log(`      Amount: ${notif.currency_code || ''} ${notif.amount || 'N/A'}`);
          console.log(`      Status: ${notif.payment_status || notif.status || 'N/A'}`);
          console.log(`      Alert Level: ${notif.alert_level || 'N/A'}`);
          console.log(`      Created: ${new Date(notif.created_at).toLocaleString()}`);
          console.log('');
        });
      }

      // Get payment notifications by type
      console.log('📋 Step 5: Payment notifications by type...');
      const byType = await client.query(`
        SELECT 
          data->>'notification_type' as notification_type,
          COUNT(*) as count
        FROM notification 
        WHERE deleted_at IS NULL 
        AND (
          resource_type = 'payment' 
          OR data->>'resource_type' = 'payment'
        )
        GROUP BY data->>'notification_type'
        ORDER BY count DESC
      `);

      if (byType.rows.length > 0) {
        console.log('   Payment notifications breakdown:\n');
        byType.rows.forEach((row) => {
          console.log(`   ${row.notification_type || 'N/A'}: ${row.count}`);
        });
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

