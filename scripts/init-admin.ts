/**
 * Admin Initialization Script
 * 
 * This script ensures a default admin account exists in the database.
 * It's safe to run multiple times - it will only create the admin if it doesn't exist.
 * 
 * Usage:
 *   - Development: npx tsx scripts/init-admin.ts
 *   - Production: Add to deployment/startup scripts
 * 
 * Security:
 *   - Admin accounts can ONLY be created via this script
 *   - The registration API endpoint blocks admin role registration
 *   - Change the default password immediately after first login
 */

import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/auth';

// Default admin credentials
// IMPORTANT: Change the password after first login!
const DEFAULT_ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@medifind.com',
  password: process.env.ADMIN_PASSWORD || 'admin123456',
  name: process.env.ADMIN_NAME || 'System Administrator',
};

async function initializeAdmin() {
  try {
    console.log('🔍 Checking for admin account...');

    // Check if any admin exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      console.log('✅ Admin account already exists');
      console.log('   Email:', existingAdmin.email);
      console.log('   Name:', existingAdmin.name);
      console.log('   Created:', existingAdmin.createdAt);
      console.log('');
      console.log('💡 To change admin password, use the profile update endpoint after login.');
      return;
    }

    // No admin exists, create default admin
    console.log('⚠️  No admin account found. Creating default admin...');
    console.log('');

    // Hash password
    const hashedPassword = await hashPassword(DEFAULT_ADMIN.password);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email: DEFAULT_ADMIN.email,
        password: hashedPassword,
        name: DEFAULT_ADMIN.name,
        role: 'ADMIN',
      },
    });

    console.log('✅ Default admin account created successfully!');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', DEFAULT_ADMIN.email);
    console.log('🔑 Password:', DEFAULT_ADMIN.password);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('⚠️  SECURITY WARNING:');
    console.log('   Please change the default password immediately after first login!');
    console.log('');
    console.log('🌐 Login at: http://localhost:3000/login');
    console.log('');

  } catch (error) {
    console.error('❌ Error initializing admin account:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the initialization
initializeAdmin();
