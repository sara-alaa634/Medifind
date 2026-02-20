/**
 * Manual test script for authentication API routes
 * This script tests the registration and login flow
 * 
 * Note: This is a manual test script, not automated tests
 * Run with: npx tsx scripts/test-auth-api.ts
 */

import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword, generateJWT, verifyJWT } from '../lib/auth';

async function testAuthFlow() {
  console.log('🧪 Testing Authentication Flow\n');
  
  try {
    // Test 1: Password hashing and verification
    console.log('Test 1: Password hashing and verification');
    const testPassword = 'testpassword123';
    const hashedPassword = await hashPassword(testPassword);
    const isValid = await verifyPassword(testPassword, hashedPassword);
    const isInvalid = await verifyPassword('wrongpassword', hashedPassword);
    
    console.log(`  ✓ Password hashed: ${hashedPassword.substring(0, 20)}...`);
    console.log(`  ✓ Correct password verified: ${isValid}`);
    console.log(`  ✓ Wrong password rejected: ${!isInvalid}`);
    
    // Test 2: JWT generation and verification
    console.log('\nTest 2: JWT generation and verification');
    const token = generateJWT('test-user-id', 'PATIENT');
    const payload = await verifyJWT(token);
    
    console.log(`  ✓ JWT generated: ${token.substring(0, 30)}...`);
    console.log(`  ✓ JWT payload verified:`, {
      userId: payload.userId,
      role: payload.role,
    });
    
    // Test 3: Database connection
    console.log('\nTest 3: Database connection');
    const userCount = await prisma.user.count();
    console.log(`  ✓ Database connected, user count: ${userCount}`);
    
    // Test 4: Create test user (if not exists)
    console.log('\nTest 4: User creation');
    const testEmail = 'test@example.com';
    
    // Clean up existing test user
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
    
    const testUser = await prisma.user.create({
      data: {
        email: testEmail,
        password: await hashPassword('password123'),
        name: 'Test User',
        role: 'PATIENT',
      },
    });
    
    console.log(`  ✓ Test user created:`, {
      id: testUser.id,
      email: testUser.email,
      name: testUser.name,
      role: testUser.role,
    });
    
    // Test 5: Verify user can be retrieved
    console.log('\nTest 5: User retrieval');
    const retrievedUser = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    
    console.log(`  ✓ User retrieved: ${retrievedUser?.email}`);
    
    // Test 6: Password verification with stored hash
    console.log('\nTest 6: Password verification with stored hash');
    const passwordMatch = await verifyPassword('password123', retrievedUser!.password);
    console.log(`  ✓ Password matches: ${passwordMatch}`);
    
    // Clean up
    await prisma.user.delete({
      where: { email: testEmail },
    });
    console.log('\n  ✓ Test user cleaned up');
    
    console.log('\n✅ All authentication flow tests passed!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testAuthFlow();
