/**
 * Script to create an admin user for testing
 * Run with: npx tsx scripts/create-admin.ts
 */

import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/auth';

async function createAdmin() {
  try {
    console.log('Creating admin user...');

    const email = 'admin@medifind.com';
    const password = 'admin123456'; // Change this to a secure password
    const name = 'Admin User';

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      console.log('❌ Admin user already exists with email:', email);
      console.log('   User ID:', existingAdmin.id);
      console.log('   Role:', existingAdmin.role);
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'ADMIN',
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log('  Email:', email);
    console.log('  Password:', password);
    console.log('');
    console.log('User details:');
    console.log('  ID:', admin.id);
    console.log('  Name:', admin.name);
    console.log('  Role:', admin.role);
    console.log('');
    console.log('You can now login at: http://localhost:3000/login');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
