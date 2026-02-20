/**
 * Test Login Functionality
 * Tests if the admin login works with the seeded password
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Testing login functionality...\n');
  
  const email = 'admin@medifind.com';
  const password = 'password123';
  
  try {
    // Find user
    console.log(`1. Looking for user: ${email}`);
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user) {
      console.log('❌ User not found!');
      return;
    }
    
    console.log('✅ User found:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password hash: ${user.password.substring(0, 20)}...`);
    console.log('');
    
    // Test password
    console.log(`2. Testing password: "${password}"`);
    const isValid = await bcrypt.compare(password, user.password);
    
    if (isValid) {
      console.log('✅ Password is CORRECT!');
      console.log('\n✅ Login should work with:');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
    } else {
      console.log('❌ Password is INCORRECT!');
      console.log('\n🔧 The password hash in the database does not match "password123"');
      console.log('   This means the seed script may not have run correctly.');
      console.log('\n💡 Try running:');
      console.log('   npx prisma migrate reset');
      console.log('   npm run seed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
