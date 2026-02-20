/**
 * Script to verify database connection
 * Run with: npx tsx scripts/verify-db-connection.ts
 */

import { prisma } from '../lib/prisma';

async function verifyConnection() {
  try {
    console.log('Testing database connection...');
    
    // Try to query the database
    await prisma.$queryRaw`SELECT 1`;
    
    console.log('✓ Database connection successful');
    
    // Check if tables exist
    const userCount = await prisma.user.count();
    const medicineCount = await prisma.medicine.count();
    const pharmacyCount = await prisma.pharmacy.count();
    
    console.log('\nDatabase statistics:');
    console.log(`  Users: ${userCount}`);
    console.log(`  Medicines: ${medicineCount}`);
    console.log(`  Pharmacies: ${pharmacyCount}`);
    
    console.log('\n✓ All checks passed!');
    
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyConnection();
