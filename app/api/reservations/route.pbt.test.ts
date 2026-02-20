import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import { prisma } from '@/lib/prisma';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { generateJWT } from '@/lib/auth';

// ============================================================================
// Test Helpers
// ============================================================================

// Helper to create a mock NextRequest with authentication
function createMockRequest(body: any, token?: string): NextRequest {
  const cookies = new Map();
  if (token) {
    cookies.set('auth-token', { value: token });
  }

  return {
    json: async () => body,
    cookies: {
      get: (name: string) => cookies.get(name),
    },
  } as any;
}

// Helper to generate valid CUID-like IDs
function generateCuid(): fc.Arbitrary<string> {
  return fc.stringMatching(/^c[a-z0-9]{24}$/);
}

// Helper to create test user
async function createTestUser(role: 'PATIENT' | 'PHARMACY' | 'ADMIN' = 'PATIENT') {
  const email = `test-${Date.now()}-${Math.random()}@example.com`;
  const user = await prisma.user.create({
    data: {
      email,
      password: '$2b$10$abcdefghijklmnopqrstuvwxyz123456', // Mock bcrypt hash
      name: 'Test User',
      role,
    },
  });
  return user;
}

// Helper to create test pharmacy
async function createTestPharmacy(isApproved: boolean = true) {
  const user = await createTestUser('PHARMACY');
  const pharmacy = await prisma.pharmacy.create({
    data: {
      userId: user.id,
      name: 'Test Pharmacy',
      address: '123 Test St',
      phone: '+1234567890',
      latitude: 40.7128,
      longitude: -74.0060,
      workingHours: '9AM-9PM',
      isApproved,
    },
  });
  return { user, pharmacy };
}

// Helper to create test medicine
async function createTestMedicine() {
  const medicine = await prisma.medicine.create({
    data: {
      name: `Test Medicine ${Date.now()}`,
      activeIngredient: 'Test Ingredient',
      dosage: '500mg',
      prescriptionRequired: false,
      category: 'Pain Relief',
      priceRange: '$10-$20',
    },
  });
  return medicine;
}

// Helper to create test inventory
async function createTestInventory(pharmacyId: string, medicineId: string, quantity: number) {
  const status = quantity === 0 ? 'OUT_OF_STOCK' : quantity <= 10 ? 'LOW_STOCK' : 'IN_STOCK';
  const inventory = await prisma.inventory.create({
    data: {
      pharmacyId,
      medicineId,
      quantity,
      status,
    },
  });
  return inventory;
}

// Cleanup helper
async function cleanupTestData(userIds: string[], medicineIds: string[], pharmacyIds: string[]) {
  // Delete in correct order due to foreign key constraints
  await prisma.reservation.deleteMany({
    where: {
      OR: [
        { userId: { in: userIds } },
        { pharmacyId: { in: pharmacyIds } },
        { medicineId: { in: medicineIds } },
      ],
    },
  });
  
  await prisma.notification.deleteMany({
    where: { userId: { in: userIds } },
  });
  
  await prisma.inventory.deleteMany({
    where: { pharmacyId: { in: pharmacyIds } },
  });
  
  await prisma.pharmacy.deleteMany({
    where: { id: { in: pharmacyIds } },
  });
  
  await prisma.medicine.deleteMany({
    where: { id: { in: medicineIds } },
  });
  
  await prisma.user.deleteMany({
    where: { id: { in: userIds } },
  });
}

// ============================================================================
// Property 36: Guest reservation restriction
// Feature: medifind-fullstack-migration, Property 36: Guest reservation restriction
// Validates: Requirements 10.11
// ============================================================================

describe('Property 36: Guest reservation restriction', () => {
  test('should reject reservation attempts without authentication', async () => {
    const testData: { userIds: string[]; medicineIds: string[]; pharmacyIds: string[] } = {
      userIds: [],
      medicineIds: [],
      pharmacyIds: [],
    };

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (quantity) => {
            // Create test data
            const { pharmacy } = await createTestPharmacy(true);
            const medicine = await createTestMedicine();
            await createTestInventory(pharmacy.id, medicine.id, 20);

            testData.pharmacyIds.push(pharmacy.id);
            testData.medicineIds.push(medicine.id);

            // Attempt to create reservation without token (guest user)
            const request = createMockRequest({
              pharmacyId: pharmacy.id,
              medicineId: medicine.id,
              quantity,
            });

            const response = await POST(request);
            const data = await response.json();

            // Should return 401 Unauthorized
            assert.strictEqual(response.status, 401,
              'Guest user should receive 401 Unauthorized');
            assert.strictEqual(data.error, 'UNAUTHORIZED',
              'Error should be UNAUTHORIZED');
            assert.ok(data.message.toLowerCase().includes('authentication'),
              `Error message should mention authentication: ${data.message}`);

            // Verify no reservation was created
            const reservationCount = await prisma.reservation.count({
              where: {
                pharmacyId: pharmacy.id,
                medicineId: medicine.id,
              },
            });
            assert.strictEqual(reservationCount, 0,
              'No reservation should be created for guest user');
          }
        ),
        { numRuns: 10 }
      );
    } finally {
      await cleanupTestData(testData.userIds, testData.medicineIds, testData.pharmacyIds);
    }
  });

  test('should reject reservation attempts with invalid token', async () => {
    const testData: { userIds: string[]; medicineIds: string[]; pharmacyIds: string[] } = {
      userIds: [],
      medicineIds: [],
      pharmacyIds: [],
    };

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 100 }),
          fc.integer({ min: 1, max: 10 }),
          async (invalidToken, quantity) => {
            // Create test data
            const { pharmacy } = await createTestPharmacy(true);
            const medicine = await createTestMedicine();
            await createTestInventory(pharmacy.id, medicine.id, 20);

            testData.pharmacyIds.push(pharmacy.id);
            testData.medicineIds.push(medicine.id);

            // Attempt to create reservation with invalid token
            const request = createMockRequest({
              pharmacyId: pharmacy.id,
              medicineId: medicine.id,
              quantity,
            }, invalidToken);

            const response = await POST(request);
            const data = await response.json();

            // Should return 401 Unauthorized
            assert.strictEqual(response.status, 401,
              'Invalid token should receive 401 Unauthorized');
            assert.strictEqual(data.error, 'UNAUTHORIZED',
              'Error should be UNAUTHORIZED');
          }
        ),
        { numRuns: 10 }
      );
    } finally {
      await cleanupTestData(testData.userIds, testData.medicineIds, testData.pharmacyIds);
    }
  });

  test('should reject reservation attempts from non-patient roles', async () => {
    const testData: { userIds: string[]; medicineIds: string[]; pharmacyIds: string[] } = {
      userIds: [],
      medicineIds: [],
      pharmacyIds: [],
    };

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('PHARMACY', 'ADMIN'),
          fc.integer({ min: 1, max: 10 }),
          async (role, quantity) => {
            // Create test data
            const { pharmacy } = await createTestPharmacy(true);
            const medicine = await createTestMedicine();
            await createTestInventory(pharmacy.id, medicine.id, 20);
            const nonPatientUser = await createTestUser(role as any);

            testData.pharmacyIds.push(pharmacy.id);
            testData.medicineIds.push(medicine.id);
            testData.userIds.push(nonPatientUser.id);

            // Generate token for non-patient user
            const token = generateJWT(nonPatientUser.id, role as any);

            // Attempt to create reservation
            const request = createMockRequest({
              pharmacyId: pharmacy.id,
              medicineId: medicine.id,
              quantity,
            }, token);

            const response = await POST(request);
            const data = await response.json();

            // Should return 403 Forbidden
            assert.strictEqual(response.status, 403,
              `${role} user should receive 403 Forbidden`);
            assert.strictEqual(data.error, 'FORBIDDEN',
              'Error should be FORBIDDEN');
            assert.ok(data.message.toLowerCase().includes('patient'),
              `Error message should mention patient role: ${data.message}`);
          }
        ),
        { numRuns: 10 }
      );
    } finally {
      await cleanupTestData(testData.userIds, testData.medicineIds, testData.pharmacyIds);
    }
  });
});

// ============================================================================
// Property 37: Reservation creation validation
// Feature: medifind-fullstack-migration, Property 37: Reservation creation validation
// Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5
// ============================================================================

describe('Property 37: Reservation creation validation', () => {
  test('should reject reservation with non-existent medicine', async () => {
    const testData: { userIds: string[]; medicineIds: string[]; pharmacyIds: string[] } = {
      userIds: [],
      medicineIds: [],
      pharmacyIds: [],
    };

    try {
      await fc.assert(
        fc.asyncProperty(
          generateCuid(),
          fc.integer({ min: 1, max: 10 }),
          async (fakeMedicineId, quantity) => {
            // Create test data
            const patient = await createTestUser('PATIENT');
            const { pharmacy } = await createTestPharmacy(true);

            testData.userIds.push(patient.id);
            testData.pharmacyIds.push(pharmacy.id);

            const token = generateJWT(patient.id, 'PATIENT');

            // Attempt to create reservation with non-existent medicine
            const request = createMockRequest({
              pharmacyId: pharmacy.id,
              medicineId: fakeMedicineId,
              quantity,
            }, token);

            const response = await POST(request);
            const data = await response.json();

            // Should return 404 Not Found
            assert.strictEqual(response.status, 404,
              'Non-existent medicine should return 404');
            assert.strictEqual(data.error, 'NOT_FOUND',
              'Error should be NOT_FOUND');
            assert.ok(data.message.toLowerCase().includes('medicine'),
              `Error message should mention medicine: ${data.message}`);
          }
        ),
        { numRuns: 10 }
      );
    } finally {
      await cleanupTestData(testData.userIds, testData.medicineIds, testData.pharmacyIds);
    }
  });

  test('should reject reservation with non-existent pharmacy', async () => {
    const testData: { userIds: string[]; medicineIds: string[]; pharmacyIds: string[] } = {
      userIds: [],
      medicineIds: [],
      pharmacyIds: [],
    };

    try {
      await fc.assert(
        fc.asyncProperty(
          generateCuid(),
          fc.integer({ min: 1, max: 10 }),
          async (fakePharmacyId, quantity) => {
            // Create test data
            const patient = await createTestUser('PATIENT');
            const medicine = await createTestMedicine();

            testData.userIds.push(patient.id);
            testData.medicineIds.push(medicine.id);

            const token = generateJWT(patient.id, 'PATIENT');

            // Attempt to create reservation with non-existent pharmacy
            const request = createMockRequest({
              pharmacyId: fakePharmacyId,
              medicineId: medicine.id,
              quantity,
            }, token);

            const response = await POST(request);
            const data = await response.json();

            // Should return 404 Not Found
            assert.strictEqual(response.status, 404,
              'Non-existent pharmacy should return 404');
            assert.strictEqual(data.error, 'NOT_FOUND',
              'Error should be NOT_FOUND');
            assert.ok(data.message.toLowerCase().includes('pharmacy'),
              `Error message should mention pharmacy: ${data.message}`);
          }
        ),
        { numRuns: 10 }
      );
    } finally {
      await cleanupTestData(testData.userIds, testData.medicineIds, testData.pharmacyIds);
    }
  });

  test('should reject reservation when pharmacy does not have medicine in stock', async () => {
    const testData: { userIds: string[]; medicineIds: string[]; pharmacyIds: string[] } = {
      userIds: [],
      medicineIds: [],
      pharmacyIds: [],
    };

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (quantity) => {
            // Create test data
            const patient = await createTestUser('PATIENT');
            const { pharmacy } = await createTestPharmacy(true);
            const medicine = await createTestMedicine();
            // Note: NOT creating inventory for this pharmacy-medicine combination

            testData.userIds.push(patient.id);
            testData.pharmacyIds.push(pharmacy.id);
            testData.medicineIds.push(medicine.id);

            const token = generateJWT(patient.id, 'PATIENT');

            // Attempt to create reservation
            const request = createMockRequest({
              pharmacyId: pharmacy.id,
              medicineId: medicine.id,
              quantity,
            }, token);

            const response = await POST(request);
            const data = await response.json();

            // Should return 409 Conflict
            assert.strictEqual(response.status, 409,
              'Medicine not in pharmacy inventory should return 409');
            assert.strictEqual(data.error, 'CONFLICT',
              'Error should be CONFLICT');
            assert.ok(data.message.toLowerCase().includes('not available') || 
                     data.message.toLowerCase().includes('unavailable'),
              `Error message should mention availability: ${data.message}`);
          }
        ),
        { numRuns: 10 }
      );
    } finally {
      await cleanupTestData(testData.userIds, testData.medicineIds, testData.pharmacyIds);
    }
  });

  test('should reject reservation with non-positive quantity', async () => {
    const testData: { userIds: string[]; medicineIds: string[]; pharmacyIds: string[] } = {
      userIds: [],
      medicineIds: [],
      pharmacyIds: [],
    };

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ max: 0 }),
          async (invalidQuantity) => {
            // Create test data
            const patient = await createTestUser('PATIENT');
            const { pharmacy } = await createTestPharmacy(true);
            const medicine = await createTestMedicine();
            await createTestInventory(pharmacy.id, medicine.id, 20);

            testData.userIds.push(patient.id);
            testData.pharmacyIds.push(pharmacy.id);
            testData.medicineIds.push(medicine.id);

            const token = generateJWT(patient.id, 'PATIENT');

            // Attempt to create reservation with invalid quantity
            const request = createMockRequest({
              pharmacyId: pharmacy.id,
              medicineId: medicine.id,
              quantity: invalidQuantity,
            }, token);

            const response = await POST(request);
            const data = await response.json();

            // Should return 400 Bad Request
            assert.strictEqual(response.status, 400,
              'Non-positive quantity should return 400');
            assert.strictEqual(data.error, 'VALIDATION_ERROR',
              'Error should be VALIDATION_ERROR');
            assert.ok(data.message.toLowerCase().includes('invalid') ||
                     data.message.toLowerCase().includes('validation'),
              `Error message should mention validation: ${data.message}`);
          }
        ),
        { numRuns: 10 }
      );
    } finally {
      await cleanupTestData(testData.userIds, testData.medicineIds, testData.pharmacyIds);
    }
  });

  test('should reject reservation when quantity exceeds available stock', async () => {
    const testData: { userIds: string[]; medicineIds: string[]; pharmacyIds: string[] } = {
      userIds: [],
      medicineIds: [],
      pharmacyIds: [],
    };

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 1, max: 50 }),
          async (availableStock, excessQuantity) => {
            // Ensure excessQuantity is greater than availableStock
            const requestedQuantity = availableStock + excessQuantity;

            // Create test data
            const patient = await createTestUser('PATIENT');
            const { pharmacy } = await createTestPharmacy(true);
            const medicine = await createTestMedicine();
            await createTestInventory(pharmacy.id, medicine.id, availableStock);

            testData.userIds.push(patient.id);
            testData.pharmacyIds.push(pharmacy.id);
            testData.medicineIds.push(medicine.id);

            const token = generateJWT(patient.id, 'PATIENT');

            // Attempt to create reservation with quantity exceeding stock
            const request = createMockRequest({
              pharmacyId: pharmacy.id,
              medicineId: medicine.id,
              quantity: requestedQuantity,
            }, token);

            const response = await POST(request);
            const data = await response.json();

            // Should return 409 Conflict
            assert.strictEqual(response.status, 409,
              'Quantity exceeding stock should return 409');
            assert.strictEqual(data.error, 'CONFLICT',
              'Error should be CONFLICT');
            assert.ok(data.message.toLowerCase().includes('insufficient') ||
                     data.message.toLowerCase().includes('stock') ||
                     data.message.toLowerCase().includes('available'),
              `Error message should mention stock availability: ${data.message}`);
            assert.ok(data.message.includes(availableStock.toString()),
              `Error message should mention available quantity: ${data.message}`);
          }
        ),
        { numRuns: 10 }
      );
    } finally {
      await cleanupTestData(testData.userIds, testData.medicineIds, testData.pharmacyIds);
    }
  });
});

// ============================================================================
// Property 38: Reservation creation success
// Feature: medifind-fullstack-migration, Property 38: Reservation creation success
// Validates: Requirements 11.6, 11.7, 11.8, 11.9
// ============================================================================

describe('Property 38: Reservation creation success', () => {
  test('should create reservation with PENDING status and current timestamp', async () => {
    const testData: { userIds: string[]; medicineIds: string[]; pharmacyIds: string[] } = {
      userIds: [],
      medicineIds: [],
      pharmacyIds: [],
    };

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 1, max: 10 }),
          async (availableStock, requestedQuantity) => {
            // Ensure requested quantity is within available stock
            const quantity = Math.min(requestedQuantity, availableStock);

            // Create test data
            const patient = await createTestUser('PATIENT');
            const { pharmacy, user: pharmacyUser } = await createTestPharmacy(true);
            const medicine = await createTestMedicine();
            await createTestInventory(pharmacy.id, medicine.id, availableStock);

            testData.userIds.push(patient.id, pharmacyUser.id);
            testData.pharmacyIds.push(pharmacy.id);
            testData.medicineIds.push(medicine.id);

            const token = generateJWT(patient.id, 'PATIENT');

            // Record time before request
            const beforeTime = new Date();

            // Create reservation
            const request = createMockRequest({
              pharmacyId: pharmacy.id,
              medicineId: medicine.id,
              quantity,
            }, token);

            const response = await POST(request);
            const data = await response.json();

            // Record time after request
            const afterTime = new Date();

            // Should return 201 Created
            assert.strictEqual(response.status, 201,
              'Valid reservation should return 201 Created');
            assert.ok(data.reservation,
              'Response should include reservation object');
            assert.ok(data.message,
              'Response should include success message');

            // Verify reservation in database
            const createdReservation = await prisma.reservation.findFirst({
              where: {
                userId: patient.id,
                pharmacyId: pharmacy.id,
                medicineId: medicine.id,
              },
            });

            assert.ok(createdReservation,
              'Reservation should exist in database');
            assert.strictEqual(createdReservation.status, 'PENDING',
              'Reservation status should be PENDING');
            assert.strictEqual(createdReservation.quantity, quantity,
              `Reservation quantity should be ${quantity}`);

            // Verify requestTime is set to current timestamp (within reasonable range)
            const requestTime = new Date(createdReservation.requestTime);
            assert.ok(requestTime >= beforeTime && requestTime <= afterTime,
              `Request time ${requestTime.toISOString()} should be between ${beforeTime.toISOString()} and ${afterTime.toISOString()}`);

            // Verify other timestamp fields are null for PENDING status
            assert.strictEqual(createdReservation.acceptedTime, null,
              'acceptedTime should be null for PENDING reservation');
            assert.strictEqual(createdReservation.rejectedTime, null,
              'rejectedTime should be null for PENDING reservation');
            assert.strictEqual(createdReservation.noResponseTime, null,
              'noResponseTime should be null for PENDING reservation');
          }
        ),
        { numRuns: 10 }
      );
    } finally {
      await cleanupTestData(testData.userIds, testData.medicineIds, testData.pharmacyIds);
    }
  });

  test('should send notification to pharmacy when reservation is created', async () => {
    const testData: { userIds: string[]; medicineIds: string[]; pharmacyIds: string[] } = {
      userIds: [],
      medicineIds: [],
      pharmacyIds: [],
    };

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (quantity) => {
            // Create test data
            const patient = await createTestUser('PATIENT');
            const { pharmacy, user: pharmacyUser } = await createTestPharmacy(true);
            const medicine = await createTestMedicine();
            await createTestInventory(pharmacy.id, medicine.id, 20);

            testData.userIds.push(patient.id, pharmacyUser.id);
            testData.pharmacyIds.push(pharmacy.id);
            testData.medicineIds.push(medicine.id);

            const token = generateJWT(patient.id, 'PATIENT');

            // Create reservation
            const request = createMockRequest({
              pharmacyId: pharmacy.id,
              medicineId: medicine.id,
              quantity,
            }, token);

            const response = await POST(request);
            const data = await response.json();

            assert.strictEqual(response.status, 201,
              'Reservation should be created successfully');

            // Verify notification was sent to pharmacy
            const notifications = await prisma.notification.findMany({
              where: {
                userId: pharmacyUser.id,
              },
              orderBy: {
                createdAt: 'desc',
              },
            });

            assert.ok(notifications.length > 0,
              'Pharmacy should receive at least one notification');

            const latestNotification = notifications[0];
            assert.ok(latestNotification.type.includes('reservation') ||
                     latestNotification.title.toLowerCase().includes('reservation') ||
                     latestNotification.message.toLowerCase().includes('reservation'),
              `Notification should be about reservation: ${latestNotification.type}, ${latestNotification.title}`);
            assert.strictEqual(latestNotification.isRead, false,
              'New notification should be unread');
          }
        ),
        { numRuns: 10 }
      );
    } finally {
      await cleanupTestData(testData.userIds, testData.medicineIds, testData.pharmacyIds);
    }
  });

  test('should return complete reservation details including medicine and pharmacy info', async () => {
    const testData: { userIds: string[]; medicineIds: string[]; pharmacyIds: string[] } = {
      userIds: [],
      medicineIds: [],
      pharmacyIds: [],
    };

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (quantity) => {
            // Create test data
            const patient = await createTestUser('PATIENT');
            const { pharmacy, user: pharmacyUser } = await createTestPharmacy(true);
            const medicine = await createTestMedicine();
            await createTestInventory(pharmacy.id, medicine.id, 20);

            testData.userIds.push(patient.id, pharmacyUser.id);
            testData.pharmacyIds.push(pharmacy.id);
            testData.medicineIds.push(medicine.id);

            const token = generateJWT(patient.id, 'PATIENT');

            // Create reservation
            const request = createMockRequest({
              pharmacyId: pharmacy.id,
              medicineId: medicine.id,
              quantity,
            }, token);

            const response = await POST(request);
            const data = await response.json();

            assert.strictEqual(response.status, 201,
              'Reservation should be created successfully');

            // Verify response includes complete reservation details
            assert.ok(data.reservation,
              'Response should include reservation object');
            assert.ok(data.reservation.id,
              'Reservation should have an ID');
            assert.strictEqual(data.reservation.userId, patient.id,
              'Reservation should be linked to patient');
            assert.strictEqual(data.reservation.pharmacyId, pharmacy.id,
              'Reservation should be linked to pharmacy');
            assert.strictEqual(data.reservation.medicineId, medicine.id,
              'Reservation should be linked to medicine');

            // Verify medicine details are included
            assert.ok(data.reservation.medicine,
              'Response should include medicine details');
            assert.strictEqual(data.reservation.medicine.id, medicine.id,
              'Medicine ID should match');
            assert.strictEqual(data.reservation.medicine.name, medicine.name,
              'Medicine name should match');

            // Verify pharmacy details are included
            assert.ok(data.reservation.pharmacy,
              'Response should include pharmacy details');
            assert.strictEqual(data.reservation.pharmacy.id, pharmacy.id,
              'Pharmacy ID should match');
            assert.strictEqual(data.reservation.pharmacy.name, pharmacy.name,
              'Pharmacy name should match');
            assert.ok(data.reservation.pharmacy.address,
              'Pharmacy address should be included');
            assert.ok(data.reservation.pharmacy.phone,
              'Pharmacy phone should be included');
          }
        ),
        { numRuns: 10 }
      );
    } finally {
      await cleanupTestData(testData.userIds, testData.medicineIds, testData.pharmacyIds);
    }
  });
});
