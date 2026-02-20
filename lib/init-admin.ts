/**
 * Auto-initialize default admin account
 * 
 * This module automatically checks for and creates a default admin account
 * when the application starts. It's safe and idempotent - will only create
 * the admin if none exists.
 */

import { prisma } from './prisma';
import { hashPassword } from './auth';

// Default admin credentials
const DEFAULT_ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@medifind.com',
  password: process.env.ADMIN_PASSWORD || 'admin123456',
  name: process.env.ADMIN_NAME || 'System Administrator',
};

let isInitialized = false;

/**
 * Initialize default admin account if none exists
 * Safe to call multiple times - will only create once
 */
export async function ensureAdminExists(): Promise<void> {
  // Only run once per application lifecycle
  if (isInitialized) {
    return;
  }

  try {
    // Check if any admin exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      console.log('✅ Admin account exists:', existingAdmin.email);
      isInitialized = true;
      return;
    }

    // No admin exists, create default admin
    console.log('⚠️  No admin account found. Creating default admin...');

    const hashedPassword = await hashPassword(DEFAULT_ADMIN.password);

    const admin = await prisma.user.create({
      data: {
        email: DEFAULT_ADMIN.email,
        password: hashedPassword,
        name: DEFAULT_ADMIN.name,
        role: 'ADMIN',
      },
    });

    console.log('✅ Default admin account created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', DEFAULT_ADMIN.email);
    console.log('🔑 Password:', DEFAULT_ADMIN.password);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  SECURITY: Change the default password after first login!');
    console.log('');

    isInitialized = true;
  } catch (error) {
    console.error('❌ Error initializing admin account:', error);
    // Don't throw - allow app to continue even if admin init fails
  }
}

/**
 * Reset initialization flag (for testing)
 */
export function resetInitialization(): void {
  isInitialized = false;
}
