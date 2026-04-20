import { ExecArgs } from '@shopenup/framework/types';

/**
 * Script to check if payment refunded notifications exist in database
 * and verify they're being returned by the API
 */
export default async function checkRefundedNotifications({ container }: ExecArgs) {
  console.log('🔍 Checking payment refunded notifications...\n');

  try {
    const query = container.resolve('query');
    const pg = await import("pg");
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      console.error('❌ DATABASE_URL not found');
      return;
    }

    const client = new pg.Client({ connectionString });
    await client.connect();

    try {
      // Check refunded notifications in database
      console.log('📋 Step 1: Checking database for refunded notifications...');
      const dbResult = await client.query(`
        SELECT 
          id,
          template,
          channel,
          resource_type,
          resource_id,
          data->>'notification_type' as notification_type,
          data->>'title' as title,
          created_at
        FROM notification 
        WHERE deleted_at IS NULL 
          AND (
            resource_type = 'payment' 
            OR data->>'resource_type' = 'payment'
          )
          AND (
            data->>'notification_type' = 'payment_refunded'
            OR template = 'payment-refunded'
            OR (template = 'admin-ui' AND data->>'notification_type' = 'payment_refunded')
          )
        ORDER BY created_at DESC
        LIMIT 10
      `);

      console.log(`✅ Found ${dbResult.rows.length} refunded notifications in database:`);
      dbResult.rows.forEach((row, idx) => {
        console.log(`  ${idx + 1}. ID: ${row.id}`);
        console.log(`     Template: ${row.template}, Channel: ${row.channel}`);
        console.log(`     Notification Type: ${row.notification_type}`);
        console.log(`     Title: ${row.title}`);
        console.log(`     Created: ${row.created_at}`);
        console.log('');
      });

      // Check API response
      console.log('📋 Step 2: Checking API response...');
      const { data: apiNotifications } = await query.graph({
        entity: 'notification',
        fields: [
          'id',
          'template',
          'channel',
          'resource_type',
          'data',
        ],
        filters: {
          deleted_at: null,
          resource_type: 'payment',
        },
      });

      const refundedFromApi = apiNotifications?.filter((n: any) => {
        const data = n.data || {};
        const notificationType = data.notification_type || '';
        const template = n.template || '';
        return (
          notificationType === 'payment_refunded' ||
          (template === 'admin-ui' && notificationType === 'payment_refunded')
        );
      }) || [];

      console.log(`✅ Found ${refundedFromApi.length} refunded notifications from API:`);
      refundedFromApi.forEach((n: any, idx: number) => {
        const data = n.data || {};
        console.log(`  ${idx + 1}. ID: ${n.id}`);
        console.log(`     Template: ${n.template}, Channel: ${n.channel}`);
        console.log(`     Notification Type: ${data.notification_type}`);
        console.log(`     Title: ${data.title || 'N/A'}`);
        console.log('');
      });

      // Summary
      console.log('\n📊 Summary:');
      console.log(`  Database: ${dbResult.rows.length} refunded notifications`);
      console.log(`  API: ${refundedFromApi.length} refunded notifications`);
      
      if (dbResult.rows.length > 0 && refundedFromApi.length === 0) {
        console.log('\n⚠️  WARNING: Notifications exist in database but not returned by API!');
        console.log('   This suggests a filtering issue in the API endpoint.');
      } else if (dbResult.rows.length === 0) {
        console.log('\n⚠️  WARNING: No refunded notifications found in database!');
        console.log('   Run the create-missing-payment-notifications script to create them.');
      } else {
        console.log('\n✅ Notifications are being returned correctly by the API.');
      }

    } finally {
      await client.end();
    }
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

