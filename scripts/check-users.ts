/**
 * Check Users in Database
 * Lists all users with their emails and roles
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking users in database...\n');
  
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (users.length === 0) {
      console.log('❌ No users found in database!');
      console.log('\nRun the seed script to create test users:');
      console.log('  npm run seed');
      return;
    }

    console.log(`✅ Found ${users.length} users:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.role} - ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${user.createdAt.toISOString()}`);
      console.log('');
    });

    // Check for admin specifically
    const admin = users.find(u => u.role === 'ADMIN');
    if (admin) {
      console.log('✅ Admin account found:');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Name: ${admin.name}`);
      console.log('\n💡 Try logging in with this email and the password from the seed script');
    } else {
      console.log('❌ No admin account found!');
      console.log('\n💡 Run the init-admin script to create an admin:');
      console.log('  npm run init-admin');
    }

  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
