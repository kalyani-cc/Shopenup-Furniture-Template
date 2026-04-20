/**
 * Comprehensive script to fix the publishable API key issue
 * This script will:
 * 1. Create the API key in the database
 * 2. Link it to your sales channel
 * 3. Ensure it's properly configured
 */
const { PrismaClient } = require('@prisma/client');
async function fixPublishableApiKey() {
  const prisma = new PrismaClient();
  try {
    // Step 1: Check if the key already exists
    const existingKey = await prisma.apiKey.findFirst({
      where: {
        token: 'pk_03d087dc82a71a3723b4ebfc54024a1b7ad03ab5c58b15d27129f8c482bfac5f'
      },
      include: {
        sales_channels_link: true
      }
    });
    if (existingKey) {
      // Check if it's linked to sales channels
    }
    // Step 2: Get or create a sales channel
    let salesChannel = await prisma.salesChannel.findFirst({
      where: {
        name: 'Default Sales Channel'
      }
    });
    if (!salesChannel) {
      salesChannel = await prisma.salesChannel.create({
        data: {
          name: 'Default Sales Channel',
          description: 'Default sales channel for the store',
          is_disabled: false
        }
      });
    } else {
    }
    // Step 3: Create the API key if it doesn't exist
    let apiKey;
    if (!existingKey) {
      apiKey = await prisma.apiKey.create({
        data: {
          token: 'pk_03d087dc82a71a3723b4ebfc54024a1b7ad03ab5c58b15d27129f8c482bfac5f',
          type: 'PUBLISHABLE',
          title: 'Frontend Publishable Key',
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    } else {
      apiKey = existingKey;
    }
    // Step 4: Link API key to sales channel
    const existingLink = await prisma.apiKeySalesChannelLink.findFirst({
      where: {
        api_key_id: apiKey.id,
        sales_channel_id: salesChannel.id
      }
    });
    if (!existingLink) {
      await prisma.apiKeySalesChannelLink.create({
        data: {
          api_key_id: apiKey.id,
          sales_channel_id: salesChannel.id
        }
      });
    } else {
    }
    // Step 5: Verify the setup
    const finalKey = await prisma.apiKey.findFirst({
      where: {
        id: apiKey.id
      },
      include: {
        sales_channels_link: {
          include: {
            sales_channel: true
          }
        }
      }
    });
  } catch (error) {
    console.error(':x: Error fixing API key:', error);
    if (error.code === 'P2002') {
    } else if (error.message?.includes('Unknown column')) {
    }
  } finally {
    await prisma.$disconnect();
  }
}
// Alternative: Manual SQL commands if Prisma fails
// Run the function
if (require.main === module) {
  fixPublishableApiKey().catch(console.error);
  showManualSQL();
}
module.exports = { fixPublishableApiKey };