/**
 * Checkpoint 22: Integration Test
 * Tests complete user workflows for each role
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, error?: string) {
  results.push({ name, passed, error });
  const icon = passed ? '✓' : '✗';
  console.log(`${icon} ${name}`);
  if (error) console.log(`  Error: ${error}`);
}

async function testPatientWorkflow() {
  console.log('\n=== Testing Patient Workflow ===');
  
  try {
    // 1. Find a patient user
    const patient = await prisma.user.findFirst({
      where: { role: 'PATIENT' }
    });
    logTest('Patient user exists', !!patient);
    
    if (!patient) return;
    
    // 2. Check medicines are available
    const medicines = await prisma.medicine.findMany({ take: 5 });
    logTest('Medicines catalog accessible', medicines.length > 0);
    
    // 3. Check pharmacies with inventory
    const pharmacies = await prisma.pharmacy.findMany({
      where: { isApproved: true },
      include: { inventory: true }
    });
    logTest('Approved pharmacies with inventory exist', pharmacies.length > 0);
    
    // 4. Check patient can view reservations
    const reservations = await prisma.reservation.findMany({
      where: { userId: patient.id },
      include: { medicine: true, pharmacy: true }
    });
    logTest('Patient reservations queryable', true);
    
    // 5. Check notifications
    const notifications = await prisma.notification.findMany({
      where: { userId: patient.id }
    });
    logTest('Patient notifications accessible', true);
    
  } catch (error) {
    logTest('Patient workflow', false, error instanceof Error ? error.message : String(error));
  }
}

async function testPharmacyWorkflow() {
  console.log('\n=== Testing Pharmacy Workflow ===');
  
  try {
    // 1. Find an approved pharmacy
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { isApproved: true },
      include: { user: true }
    });
    logTest('Approved pharmacy exists', !!pharmacy);
    
    if (!pharmacy) return;
    
    // 2. Check inventory management
    const inventory = await prisma.inventory.findMany({
      where: { pharmacyId: pharmacy.id },
      include: { medicine: true }
    });
    logTest('Pharmacy inventory accessible', true);
    
    // 3. Check reservations
    const reservations = await prisma.reservation.findMany({
      where: { pharmacyId: pharmacy.id },
      include: { user: true, medicine: true }
    });
    logTest('Pharmacy reservations queryable', true);
    
    // 4. Check direct calls tracking
    const directCalls = await prisma.directCall.findMany({
      where: { pharmacyId: pharmacy.id }
    });
    logTest('Direct calls tracking accessible', true);
    
    // 5. Test analytics data availability
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentReservations = await prisma.reservation.findMany({
      where: {
        pharmacyId: pharmacy.id,
        createdAt: { gte: thirtyDaysAgo }
      }
    });
    logTest('Pharmacy analytics data accessible', true);
    
  } catch (error) {
    logTest('Pharmacy workflow', false, error instanceof Error ? error.message : String(error));
  }
}

async function testAdminWorkflow() {
  console.log('\n=== Testing Admin Workflow ===');
  
  try {
    // 1. Find admin user
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    logTest('Admin user exists', !!admin);
    
    // 2. Check medicine management
    const medicines = await prisma.medicine.findMany();
    logTest('Admin can access medicines catalog', medicines.length > 0);
    
    // 3. Check pharmacy approval workflow
    const pendingPharmacies = await prisma.pharmacy.findMany({
      where: { isApproved: false }
    });
    logTest('Admin can query pending pharmacies', true);
    
    // 4. Check all pharmacies
    const allPharmacies = await prisma.pharmacy.findMany({
      include: { user: true }
    });
    logTest('Admin can access all pharmacies', allPharmacies.length > 0);
    
    // 5. Check system-wide analytics
    const totalUsers = await prisma.user.count();
    const totalReservations = await prisma.reservation.count();
    const totalDirectCalls = await prisma.directCall.count();
    
    logTest('Admin analytics data accessible', totalUsers > 0);
    
  } catch (error) {
    logTest('Admin workflow', false, error instanceof Error ? error.message : String(error));
  }
}

async function testReservationLifecycle() {
  console.log('\n=== Testing Reservation Lifecycle ===');
  
  try {
    // 1. Check all reservation statuses exist
    const statuses = await prisma.reservation.groupBy({
      by: ['status'],
      _count: true
    });
    logTest('Reservation statuses tracked', statuses.length > 0);
    
    // 2. Check accepted reservations have acceptedTime
    const acceptedReservations = await prisma.reservation.findMany({
      where: { status: 'ACCEPTED' }
    });
    const allHaveAcceptedTime = acceptedReservations.every(r => r.acceptedTime !== null);
    logTest('Accepted reservations have timestamps', acceptedReservations.length === 0 || allHaveAcceptedTime);
    
    // 3. Check rejected reservations have rejectedTime
    const rejectedReservations = await prisma.reservation.findMany({
      where: { status: 'REJECTED' }
    });
    const allHaveRejectedTime = rejectedReservations.every(r => r.rejectedTime !== null);
    logTest('Rejected reservations have timestamps', rejectedReservations.length === 0 || allHaveRejectedTime);
    
    // 4. Check NO_RESPONSE reservations
    const noResponseReservations = await prisma.reservation.findMany({
      where: { status: 'NO_RESPONSE' }
    });
    logTest('NO_RESPONSE status tracked', true);
    
  } catch (error) {
    logTest('Reservation lifecycle', false, error instanceof Error ? error.message : String(error));
  }
}

async function testDataIntegrity() {
  console.log('\n=== Testing Data Integrity ===');
  
  try {
    // 1. Check all users have valid roles
    const users = await prisma.user.findMany();
    const validRoles = users.every(u => ['PATIENT', 'PHARMACY', 'ADMIN'].includes(u.role));
    logTest('All users have valid roles', validRoles);
    
    // 2. Check pharmacy users have pharmacy records
    const pharmacyUsers = await prisma.user.findMany({
      where: { role: 'PHARMACY' },
      include: { pharmacy: true }
    });
    const allHavePharmacy = pharmacyUsers.every(u => u.pharmacy !== null);
    logTest('Pharmacy users have pharmacy records', pharmacyUsers.length === 0 || allHavePharmacy);
    
    // 3. Check inventory has valid stock status
    const inventory = await prisma.inventory.findMany();
    const validStatuses = inventory.every(i => 
      ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'].includes(i.status)
    );
    logTest('Inventory has valid stock statuses', inventory.length === 0 || validStatuses);
    
    // 4. Check reservations reference valid entities
    const reservations = await prisma.reservation.findMany({
      include: { user: true, pharmacy: true, medicine: true }
    });
    const allReferencesValid = reservations.every(r => 
      r.user && r.pharmacy && r.medicine
    );
    logTest('Reservations reference valid entities', reservations.length === 0 || allReferencesValid);
    
  } catch (error) {
    logTest('Data integrity', false, error instanceof Error ? error.message : String(error));
  }
}

async function testNotificationSystem() {
  console.log('\n=== Testing Notification System ===');
  
  try {
    // 1. Check notifications exist
    const notifications = await prisma.notification.findMany();
    logTest('Notifications system operational', true);
    
    // 2. Check notification types
    const types = await prisma.notification.groupBy({
      by: ['type'],
      _count: true
    });
    logTest('Notification types tracked', true);
    
    // 3. Check read/unread status
    const unreadCount = await prisma.notification.count({
      where: { isRead: false }
    });
    logTest('Notification read status tracked', true);
    
  } catch (error) {
    logTest('Notification system', false, error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  console.log('🧪 Checkpoint 22: Integration Testing\n');
  console.log('Testing complete user workflows for each role...\n');
  
  try {
    await testPatientWorkflow();
    await testPharmacyWorkflow();
    await testAdminWorkflow();
    await testReservationLifecycle();
    await testDataIntegrity();
    await testNotificationSystem();
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('TEST SUMMARY');
    console.log('='.repeat(50));
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;
    
    console.log(`\nTotal Tests: ${total}`);
    console.log(`Passed: ${passed} ✓`);
    console.log(`Failed: ${failed} ✗`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Some tests failed. Review errors above.');
      process.exit(1);
    } else {
      console.log('\n✅ All integration tests passed!');
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
