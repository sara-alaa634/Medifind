/**
 * Test script to verify admin login functionality
 * Run with: npx tsx scripts/test-admin-login.ts
 */

import { prisma } from '../lib/prisma';
import { verifyPassword } from '../lib/auth';

async function testAdminLogin() {
  try {
    console.log('🔍 Testing admin login...\n');

    // 1. Check database connection
    console.log('1️⃣ Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully\n');

    // 2. Find admin user
    console.log('2️⃣ Looking for admin user...');
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!admin) {
      console.log('❌ No admin user found in database!');
      console.log('Run: npm run init-admin');
      process.exit(1);
    }

    console.log('✅ Admin user found:');
    console.log('   Email:', admin.email);
    console.log('   Name:', admin.name);
    console.log('   Role:', admin.role);
    console.log('   Created:', admin.createdAt);
    console.log('');

    // 3. Test password verification
    console.log('3️⃣ Testing password verification...');
    const testPassword = 'admin123456';
    const isValid = await verifyPassword(testPassword, admin.password);

    if (isValid) {
      console.log('✅ Password verification successful');
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Admin login should work with:');
      console.log('   Email:', admin.email);
      console.log('   Password:', testPassword);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      console.log('❌ Password verification failed!');
      console.log('The stored password hash does not match the default password.');
      console.log('You may need to recreate the admin user.');
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminLogin();
