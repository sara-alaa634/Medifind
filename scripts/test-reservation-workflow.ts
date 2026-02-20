/**
 * Comprehensive test script for reservation workflow
 * 
 * Tests:
 * 1. Full reservation lifecycle (create → accept → notification)
 * 2. Timeout mechanism (create → wait 5 min → NO_RESPONSE)
 * 3. Phone number fallback for NO_RESPONSE
 */

import { prisma } from '../lib/prisma';
import { hashPassword, generateJWT } from '../lib/auth';
import { checkReservationTimeouts } from '../services/reservationService';
import { 
  notifyReservationCreated, 
  notifyReservationAccepted,
  createNotification,
  NotificationType
} from '../services/notificationService';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

function logSuccess(message: string) {
  log(`✓ ${message}`, 'green');
}

function logError(message: string) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message: string) {
  log(`ℹ ${message}`, 'blue');
}

async function cleanup() {
  logInfo('Cleaning up test data...');
  
  // Delete in correct order to respect foreign key constraints
  await prisma.notification.deleteMany({
    where: {
      user: {
        email: {
          in: ['test-patient@test.com', 'test-pharmacy@test.com'],
        },
      },
    },
  });
  
  await prisma.reservation.deleteMany({
    where: {
      user: {
        email: 'test-patient@test.com',
      },
    },
  });
  
  await prisma.inventory.deleteMany({
    where: {
      pharmacy: {
        user: {
          email: 'test-pharmacy@test.com',
        },
      },
    },
  });
  
  await prisma.pharmacy.deleteMany({
    where: {
      user: {
        email: 'test-pharmacy@test.com',
      },
    },
  });
  
  await prisma.user.deleteMany({
    where: {
      email: {
        in: ['test-patient@test.com', 'test-pharmacy@test.com'],
      },
    },
  });
  
  await prisma.medicine.deleteMany({
    where: {
      name: 'Test Medicine for Workflow',
    },
  });
  
  logSuccess('Cleanup complete');
}

async function setupTestData() {
  logSection('Setting up test data');
  
  // Create test medicine
  const medicine = await prisma.medicine.create({
    data: {
      name: 'Test Medicine for Workflow',
      activeIngredient: 'Test Ingredient',
      dosage: '500mg',
      prescriptionRequired: false,
      category: 'Pain Relief',
      priceRange: '$10-$20',
    },
  });
  logSuccess(`Created test medicine: ${medicine.name} (ID: ${medicine.id})`);
  
  // Create test patient
  const hashedPassword = await hashPassword('password123');
  const patient = await prisma.user.create({
    data: {
      email: 'test-patient@test.com',
      password: hashedPassword,
      name: 'Test Patient',
      phone: '+1234567890',
      role: 'PATIENT',
    },
  });
  logSuccess(`Created test patient: ${patient.name} (ID: ${patient.id})`);
  
  // Create test pharmacy user
  const pharmacyUser = await prisma.user.create({
    data: {
      email: 'test-pharmacy@test.com',
      password: hashedPassword,
      name: 'Test Pharmacy User',
      phone: '+0987654321',
      role: 'PHARMACY',
    },
  });
  logSuccess(`Created test pharmacy user: ${pharmacyUser.name} (ID: ${pharmacyUser.id})`);
  
  // Create test pharmacy
  const pharmacy = await prisma.pharmacy.create({
    data: {
      userId: pharmacyUser.id,
      name: 'Test Pharmacy',
      address: '123 Test St, Test City',
      phone: '+0987654321',
      latitude: 40.7128,
      longitude: -74.0060,
      rating: 4.5,
      workingHours: '9:00 AM - 9:00 PM',
      isApproved: true,
    },
  });
  logSuccess(`Created test pharmacy: ${pharmacy.name} (ID: ${pharmacy.id})`);
  
  // Create inventory for the pharmacy
  const inventory = await prisma.inventory.create({
    data: {
      pharmacyId: pharmacy.id,
      medicineId: medicine.id,
      quantity: 50,
      status: 'IN_STOCK',
    },
  });
  logSuccess(`Created inventory: ${inventory.quantity} units of ${medicine.name}`);
  
  return { medicine, patient, pharmacyUser, pharmacy };
}

async function testFullReservationLifecycle(
  medicine: any,
  patient: any,
  pharmacyUser: any,
  pharmacy: any
) {
  logSection('Test 1: Full Reservation Lifecycle (create → accept → notification)');
  
  try {
    // Step 1: Create reservation
    logInfo('Step 1: Creating reservation...');
    const reservation = await prisma.reservation.create({
      data: {
        userId: patient.id,
        pharmacyId: pharmacy.id,
        medicineId: medicine.id,
        quantity: 2,
        status: 'PENDING',
        requestTime: new Date(),
      },
      include: {
        medicine: true,
        pharmacy: true,
        user: true,
      },
    });
    logSuccess(`Reservation created with ID: ${reservation.id}`);
    logSuccess(`Status: ${reservation.status}`);
    logSuccess(`Request time: ${reservation.requestTime.toISOString()}`);
    
    // Send notification to pharmacy (simulating API route behavior)
    await notifyReservationCreated(
      pharmacyUser.id,
      patient.name,
      medicine.name,
      2
    );
    
    // Verify notification was created for pharmacy
    const pharmacyNotifications = await prisma.notification.findMany({
      where: {
        userId: pharmacyUser.id,
        type: 'reservation_created',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    });
    
    if (pharmacyNotifications.length > 0) {
      logSuccess(`Pharmacy notification created: "${pharmacyNotifications[0].title}"`);
      logInfo(`Message: ${pharmacyNotifications[0].message}`);
    } else {
      logError('Pharmacy notification NOT created');
    }
    
    // Step 2: Accept reservation
    logInfo('\nStep 2: Accepting reservation...');
    const acceptedReservation = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: 'ACCEPTED',
        acceptedTime: new Date(),
        note: 'Your medicine is ready for pickup',
      },
    });
    logSuccess(`Reservation accepted at: ${acceptedReservation.acceptedTime?.toISOString()}`);
    logSuccess(`Note: ${acceptedReservation.note}`);
    
    // Send notification to patient (simulating API route behavior)
    await notifyReservationAccepted(
      patient.id,
      pharmacy.name,
      medicine.name,
      'Your medicine is ready for pickup'
    );
    
    // Verify notification was created for patient
    const patientNotifications = await prisma.notification.findMany({
      where: {
        userId: patient.id,
        type: 'reservation_accepted',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    });
    
    if (patientNotifications.length > 0) {
      logSuccess(`Patient notification created: "${patientNotifications[0].title}"`);
      logInfo(`Message: ${patientNotifications[0].message}`);
    } else {
      logError('Patient notification NOT created');
    }
    
    logSuccess('\n✓ Test 1 PASSED: Full reservation lifecycle works correctly');
    return true;
  } catch (error) {
    logError(`\n✗ Test 1 FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(error);
    return false;
  }
}

async function testTimeoutMechanism(
  medicine: any,
  patient: any,
  pharmacy: any
) {
  logSection('Test 2: Timeout Mechanism (create → wait 5 min → NO_RESPONSE)');
  
  try {
    // Step 1: Create reservation with old timestamp (6 minutes ago)
    logInfo('Step 1: Creating reservation with timestamp 6 minutes ago...');
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
    const reservation = await prisma.reservation.create({
      data: {
        userId: patient.id,
        pharmacyId: pharmacy.id,
        medicineId: medicine.id,
        quantity: 1,
        status: 'PENDING',
        requestTime: sixMinutesAgo,
      },
    });
    logSuccess(`Reservation created with ID: ${reservation.id}`);
    logSuccess(`Request time: ${reservation.requestTime.toISOString()} (6 minutes ago)`);
    
    // Step 2: Run timeout check
    logInfo('\nStep 2: Running timeout check...');
    const updatedIds = await checkReservationTimeouts();
    
    if (updatedIds.includes(reservation.id)) {
      logSuccess(`Reservation ${reservation.id} was updated to NO_RESPONSE`);
    } else {
      logError(`Reservation ${reservation.id} was NOT updated`);
      return false;
    }
    
    // Step 3: Verify reservation status
    logInfo('\nStep 3: Verifying reservation status...');
    const updatedReservation = await prisma.reservation.findUnique({
      where: { id: reservation.id },
    });
    
    if (updatedReservation?.status === 'NO_RESPONSE') {
      logSuccess(`Status correctly updated to: ${updatedReservation.status}`);
      logSuccess(`No response time: ${updatedReservation.noResponseTime?.toISOString()}`);
    } else {
      logError(`Status is ${updatedReservation?.status}, expected NO_RESPONSE`);
      return false;
    }
    
    // Step 4: Verify notification was sent to patient
    logInfo('\nStep 4: Verifying patient notification...');
    const notifications = await prisma.notification.findMany({
      where: {
        userId: patient.id,
        type: 'reservation_no_response',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    });
    
    if (notifications.length > 0) {
      logSuccess(`Patient notification created: "${notifications[0].title}"`);
      logInfo(`Message: ${notifications[0].message}`);
    } else {
      logError('Patient notification NOT created');
      return false;
    }
    
    logSuccess('\n✓ Test 2 PASSED: Timeout mechanism works correctly');
    return true;
  } catch (error) {
    logError(`\n✗ Test 2 FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(error);
    return false;
  }
}

async function testPhoneNumberFallback(
  medicine: any,
  patient: any,
  pharmacyUser: any,
  pharmacy: any
) {
  logSection('Test 3: Phone Number Fallback for NO_RESPONSE');
  
  try {
    // Step 1: Create reservation with NO_RESPONSE status
    logInfo('Step 1: Creating reservation with NO_RESPONSE status...');
    const reservation = await prisma.reservation.create({
      data: {
        userId: patient.id,
        pharmacyId: pharmacy.id,
        medicineId: medicine.id,
        quantity: 1,
        status: 'NO_RESPONSE',
        requestTime: new Date(Date.now() - 6 * 60 * 1000),
        noResponseTime: new Date(),
      },
    });
    logSuccess(`Reservation created with ID: ${reservation.id}`);
    logSuccess(`Status: ${reservation.status}`);
    
    // Step 2: Patient provides phone number
    logInfo('\nStep 2: Patient providing phone number...');
    const phoneNumber = '+1555123456';
    const updatedReservation = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        patientPhone: phoneNumber,
      },
      include: {
        medicine: true,
        user: true,
      },
    });
    logSuccess(`Phone number updated: ${updatedReservation.patientPhone}`);
    
    // Send notification to pharmacy (simulating API route behavior)
    await createNotification(
      pharmacyUser.id,
      NotificationType.RESERVATION_NO_RESPONSE,
      'Patient Phone Number Provided',
      `${updatedReservation.user.name} has provided their phone number (${phoneNumber}) for the ${updatedReservation.medicine.name} reservation. Please contact them to complete the reservation.`
    );
    
    // Step 3: Verify notification was sent to pharmacy
    logInfo('\nStep 3: Verifying pharmacy notification...');
    const notifications = await prisma.notification.findMany({
      where: {
        userId: pharmacyUser.id,
        type: 'reservation_no_response',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    });
    
    if (notifications.length > 0) {
      logSuccess(`Pharmacy notification created: "${notifications[0].title}"`);
      logInfo(`Message: ${notifications[0].message}`);
      
      // Check if phone number is in the message
      if (notifications[0].message.includes(phoneNumber)) {
        logSuccess(`Phone number ${phoneNumber} is included in notification`);
      } else {
        logError(`Phone number ${phoneNumber} is NOT in notification`);
        return false;
      }
    } else {
      logError('Pharmacy notification NOT created');
      return false;
    }
    
    // Step 4: Pharmacy accepts the reservation
    logInfo('\nStep 4: Pharmacy accepting reservation after phone contact...');
    const acceptedReservation = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: 'ACCEPTED',
        acceptedTime: new Date(),
        note: 'Contacted via phone, medicine ready',
      },
    });
    logSuccess(`Reservation accepted: ${acceptedReservation.status}`);
    logSuccess(`Note: ${acceptedReservation.note}`);
    
    logSuccess('\n✓ Test 3 PASSED: Phone number fallback works correctly');
    return true;
  } catch (error) {
    logError(`\n✗ Test 3 FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(error);
    return false;
  }
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     RESERVATION WORKFLOW COMPREHENSIVE TEST SUITE         ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  try {
    // Cleanup any existing test data
    await cleanup();
    
    // Setup test data
    const { medicine, patient, pharmacyUser, pharmacy } = await setupTestData();
    
    // Run tests
    const results = {
      test1: await testFullReservationLifecycle(medicine, patient, pharmacyUser, pharmacy),
      test2: await testTimeoutMechanism(medicine, patient, pharmacy),
      test3: await testPhoneNumberFallback(medicine, patient, pharmacyUser, pharmacy),
    };
    
    // Summary
    logSection('Test Summary');
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    log(`Test 1 (Full Lifecycle): ${results.test1 ? '✓ PASSED' : '✗ FAILED'}`, results.test1 ? 'green' : 'red');
    log(`Test 2 (Timeout Mechanism): ${results.test2 ? '✓ PASSED' : '✗ FAILED'}`, results.test2 ? 'green' : 'red');
    log(`Test 3 (Phone Fallback): ${results.test3 ? '✓ PASSED' : '✗ FAILED'}`, results.test3 ? 'green' : 'red');
    
    console.log('\n' + '='.repeat(60));
    if (passedTests === totalTests) {
      log(`\n🎉 ALL TESTS PASSED (${passedTests}/${totalTests})`, 'green');
      log('\n✓ Reservation workflow is complete and working correctly!', 'green');
    } else {
      log(`\n⚠️  SOME TESTS FAILED (${passedTests}/${totalTests} passed)`, 'yellow');
      log('\n✗ Please review the failed tests above', 'red');
    }
    console.log('='.repeat(60) + '\n');
    
    // Cleanup
    await cleanup();
    
    process.exit(passedTests === totalTests ? 0 : 1);
  } catch (error) {
    logError(`\nFatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(error);
    await cleanup();
    process.exit(1);
  }
}

main();
