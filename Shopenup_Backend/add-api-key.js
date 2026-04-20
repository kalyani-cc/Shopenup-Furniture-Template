/**
 * Simple script to add the publishable API key to your database
 * Run this from your backend directory (shopenup/)
 */

const { PrismaClient } = require('@prisma/client');

async function addPublishableApiKey() {
  const prisma = new PrismaClient();
  
  try {
    
    // Check if the key already exists
    const existingKey = await prisma.apiKey.findFirst({
      where: {
        token: 'pk_03d087dc82a71a3723b4ebfc54024a1b7ad03ab5c58b15d27129f8c482bfac5f'
      }
    });
    
    if (existingKey) {
      return;
    }
    
    // Create the API key
    const apiKey = await prisma.apiKey.create({
      data: {
        token: 'pk_03d087dc82a71a3723b4ebfc54024a1b7ad03ab5c58b15d27129f8c482bfac5f',
        type: 'PUBLISHABLE',
        title: 'Frontend Publishable Key',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    
  } catch (error) {
    
    if (error.code === 'P2002') {
    } else if (error.message?.includes('Unknown column')) {
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
if (require.main === module) {
  addPublishableApiKey().catch((error) => {
    // Error handling without console
  });
}

module.exports = { addPublishableApiKey };

