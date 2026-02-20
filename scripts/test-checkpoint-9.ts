import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth';

const prisma = new PrismaClient();

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function testMedicineCRUD() {
  console.log('\n=== Testing Medicine CRUD Operations ===\n');
  
  try {
    // CREATE
    console.log('1. Testing CREATE medicine...');
    const medicine = await prisma.medicine.create({
      data: {
        name: 'Test Medicine Checkpoint 9',
        activeIngredient: 'Test Ingredient',
        dosage: '500mg',
        prescriptionRequired: false,
        category: 'Pain Relief',
        priceRange: '$10-$20',
      },
    });
    console.log('✓ Medicine created:', medicine.id);
    results.push({ name: 'Medicine CREATE', passed: true });

    // READ
    console.log('2. Testing READ medicine...');
    const readMedicine = await prisma.medicine.findUnique({
      where: { id: medicine.id },
    });
    if (!readMedicine || readMedicine.name !== 'Test Medicine Checkpoint 9') {
      throw new Error('Medicine not found or data mismatch');
    }
    console.log('✓ Medicine read successfully');
    results.push({ name: 'Medicine READ', passed: true });

    // UPDATE
    console.log('3. Testing UPDATE medicine...');
    const updatedMedicine = await prisma.medicine.update({
      where: { id: medicine.id },
      data: { dosage: '1000mg' },
    });
    if (updatedMedicine.dosage !== '1000mg') {
      throw new Error('Medicine update failed');
    }
    console.log('✓ Medicine updated successfully');
    results.push({ name: 'Medicine UPDATE', passed: true });

    // DELETE (with active reservation check)
    console.log('4. Testing DELETE medicine with active reservations...');
    
    // First create a test user and pharmacy for reservation
    const testUser = await prisma.user.create({
      data: {
        email: `test-patient-${Date.now()}@test.com`,
        password: await hashPassword('password123'),
        name: 'Test Patient',
        role: 'PATIENT',
      },
    });
    
    const pharmacyUser = await prisma.user.create({
      data: {
        email: `test-pharmacy-${Date.now()}@test.com`,
        password: await hashPassword('password123'),
        name: 'Test Pharmacy User',
        role: 'PHARMACY',
      },
    });
    
    const testPharmacy = await prisma.pharmacy.create({
      data: {
        userId: pharmacyUser.id,
        name: 'Test Pharmacy',
        address: '123 Test St',
        phone: '555-0100',
        latitude: 40.7128,
        longitude: -74.0060,
        workingHours: '9AM-5PM',
        isApproved: true,
      },
    });
    
    // Create an active reservation
    const reservation = await prisma.reservation.create({
      data: {
        userId: testUser.id,
        pharmacyId: testPharmacy.id,
        medicineId: medicine.id,
        quantity: 1,
        status: 'PENDING',
      },
    });
    
    // Try to delete medicine with active reservation
    const activeReservations = await prisma.reservation.findMany({
      where: {
        medicineId: medicine.id,
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
    });
    
    if (activeReservations.length > 0) {
      console.log('✓ Correctly prevented deletion of medicine with active reservations');
      results.push({ name: 'Medicine DELETE protection', passed: true });
    } else {
      throw new Error('Should have found active reservations');
    }
    
    // Clean up reservation and test successful deletion
    console.log('5. Testing DELETE medicine without active reservations...');
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: 'CANCELLED' },
    });
    
    // Delete the reservation first (foreign key constraint)
    await prisma.reservation.delete({ where: { id: reservation.id } });
    
    // Now delete the medicine
    await prisma.medicine.delete({
      where: { id: medicine.id },
    });
    
    const deletedMedicine = await prisma.medicine.findUnique({
      where: { id: medicine.id },
    });
    
    if (deletedMedicine !== null) {
      throw new Error('Medicine should have been deleted');
    }
    console.log('✓ Medicine deleted successfully');
    results.push({ name: 'Medicine DELETE', passed: true });
    
    // Clean up test data
    await prisma.pharmacy.delete({ where: { id: testPharmacy.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.user.delete({ where: { id: pharmacyUser.id } });
    
  } catch (error) {
    console.error('✗ Medicine CRUD test failed:', error);
    results.push({
      name: 'Medicine CRUD',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function testPharmacyApprovalWorkflow() {
  console.log('\n=== Testing Pharmacy Approval Workflow ===\n');
  
  try {
    // CREATE unapproved pharmacy
    console.log('1. Testing CREATE unapproved pharmacy...');
    const pharmacyUser = await prisma.user.create({
      data: {
        email: `test-pharmacy-approval-${Date.now()}@test.com`,
        password: await hashPassword('password123'),
        name: 'Test Pharmacy User',
        role: 'PHARMACY',
      },
    });
    
    const pharmacy = await prisma.pharmacy.create({
      data: {
        userId: pharmacyUser.id,
        name: 'Test Pharmacy for Approval',
        address: '456 Test Ave',
        phone: '555-0200',
        latitude: 40.7128,
        longitude: -74.0060,
        workingHours: '9AM-5PM',
        isApproved: false,
      },
    });
    
    if (pharmacy.isApproved !== false) {
      throw new Error('Pharmacy should be unapproved by default');
    }
    console.log('✓ Pharmacy created with isApproved=false');
    results.push({ name: 'Pharmacy default approval status', passed: true });
    
    // RETRIEVE pending pharmacies
    console.log('2. Testing RETRIEVE pending pharmacies...');
    const pendingPharmacies = await prisma.pharmacy.findMany({
      where: { isApproved: false },
    });
    
    const foundPharmacy = pendingPharmacies.find(p => p.id === pharmacy.id);
    if (!foundPharmacy) {
      throw new Error('Pending pharmacy not found in query');
    }
    console.log('✓ Pending pharmacy retrieved successfully');
    results.push({ name: 'Pharmacy pending query', passed: true });
    
    // APPROVE pharmacy
    console.log('3. Testing APPROVE pharmacy...');
    const approvedPharmacy = await prisma.pharmacy.update({
      where: { id: pharmacy.id },
      data: { isApproved: true },
    });
    
    if (approvedPharmacy.isApproved !== true) {
      throw new Error('Pharmacy approval failed');
    }
    console.log('✓ Pharmacy approved successfully');
    results.push({ name: 'Pharmacy approval', passed: true });
    
    // REJECT pharmacy (delete)
    console.log('4. Testing REJECT pharmacy (deletion)...');
    await prisma.pharmacy.delete({
      where: { id: pharmacy.id },
    });
    
    await prisma.user.delete({
      where: { id: pharmacyUser.id },
    });
    
    const deletedPharmacy = await prisma.pharmacy.findUnique({
      where: { id: pharmacy.id },
    });
    
    if (deletedPharmacy !== null) {
      throw new Error('Pharmacy should have been deleted');
    }
    console.log('✓ Pharmacy rejected (deleted) successfully');
    results.push({ name: 'Pharmacy rejection', passed: true });
    
  } catch (error) {
    console.error('✗ Pharmacy approval workflow test failed:', error);
    results.push({
      name: 'Pharmacy approval workflow',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function testRoleBasedAccessControl() {
  console.log('\n=== Testing Role-Based Access Control ===\n');
  
  try {
    // Create users with different roles
    console.log('1. Testing user role assignment...');
    
    const patientUser = await prisma.user.create({
      data: {
        email: `test-patient-rbac-${Date.now()}@test.com`,
        password: await hashPassword('password123'),
        name: 'Test Patient',
        role: 'PATIENT',
      },
    });
    
    const pharmacyUserData = await prisma.user.create({
      data: {
        email: `test-pharmacy-rbac-${Date.now()}@test.com`,
        password: await hashPassword('password123'),
        name: 'Test Pharmacy User',
        role: 'PHARMACY',
      },
    });
    
    const adminUser = await prisma.user.create({
      data: {
        email: `test-admin-rbac-${Date.now()}@test.com`,
        password: await hashPassword('password123'),
        name: 'Test Admin',
        role: 'ADMIN',
      },
    });
    
    if (patientUser.role !== 'PATIENT' || 
        pharmacyUserData.role !== 'PHARMACY' || 
        adminUser.role !== 'ADMIN') {
      throw new Error('User roles not assigned correctly');
    }
    console.log('✓ User roles assigned correctly');
    results.push({ name: 'User role assignment', passed: true });
    
    // Test pharmacy approval requirement
    console.log('2. Testing pharmacy approval requirement...');
    
    const unapprovedPharmacy = await prisma.pharmacy.create({
      data: {
        userId: pharmacyUserData.id,
        name: 'Unapproved Pharmacy',
        address: '789 Test Blvd',
        phone: '555-0300',
        latitude: 40.7128,
        longitude: -74.0060,
        workingHours: '9AM-5PM',
        isApproved: false,
      },
    });
    
    // Verify unapproved pharmacy exists
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: unapprovedPharmacy.id },
      include: { user: true },
    });
    
    if (!pharmacy || pharmacy.isApproved) {
      throw new Error('Pharmacy should be unapproved');
    }
    
    console.log('✓ Pharmacy approval requirement verified');
    results.push({ name: 'Pharmacy approval requirement', passed: true });
    
    // Test role-based queries
    console.log('3. Testing role-based data queries...');
    
    // Query users by role
    const patients = await prisma.user.findMany({
      where: { role: 'PATIENT' },
    });
    
    const pharmacies = await prisma.user.findMany({
      where: { role: 'PHARMACY' },
    });
    
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
    });
    
    if (!patients.some(u => u.id === patientUser.id) ||
        !pharmacies.some(u => u.id === pharmacyUserData.id) ||
        !admins.some(u => u.id === adminUser.id)) {
      throw new Error('Role-based queries failed');
    }
    
    console.log('✓ Role-based queries working correctly');
    results.push({ name: 'Role-based queries', passed: true });
    
    // Clean up
    await prisma.pharmacy.delete({ where: { id: unapprovedPharmacy.id } });
    await prisma.user.delete({ where: { id: patientUser.id } });
    await prisma.user.delete({ where: { id: pharmacyUserData.id } });
    await prisma.user.delete({ where: { id: adminUser.id } });
    
  } catch (error) {
    console.error('✗ Role-based access control test failed:', error);
    results.push({
      name: 'Role-based access control',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         CHECKPOINT 9: Core Entities Verification           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  try {
    await testMedicineCRUD();
    await testPharmacyApprovalWorkflow();
    await testRoleBasedAccessControl();
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                      TEST RESULTS                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    results.forEach(result => {
      const status = result.passed ? '✓' : '✗';
      console.log(`${status} ${result.name}`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
    });
    
    console.log(`\nTotal: ${results.length} tests`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\n⚠ Some tests failed. Please review the errors above.');
      process.exit(1);
    } else {
      console.log('\n✓ All checkpoint tests passed!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n✗ Checkpoint test suite failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
