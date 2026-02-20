import { describe, test } from 'node:test';
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

// Cleanup helper
async function cleanupTestData(userIds: string[], medicineIds: string[], pharmacyIds: string[]) {
  // Delete in correct order due to foreign key constraints
  await prisma.directCall.deleteMany({
    where: {
      OR: [
        { userId: { in: userIds } },
        { pharmacyId: { in: pharmacyIds } },
        { medicineId: { in: medicineIds } },
      ],
    },
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
// Property 39: Direct call tracking
// Feature: medifind-fullstack-migration, Property 39: Direct call tracking
// Validates: Requirements 11A.3
// ============================================================================

describe('Property 39: Direct call tracking', () => {
  test('should record direct call action in database when patient calls pharmacy', async () => {
    const testData: { userIds: string[]; medicineIds: string[]; pharmacyIds: string[] } = {
      userIds: [],
      medicineIds: [],
      pharmacyIds: [],
    };

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 2 }),
          async (numCalls) => {
            // Create test data
            const patient = await createTestUser('PATIENT');
            const { pharmacy, user: pharmacyUser } = await createTestPharmacy(true);
            const medicine = await createTestMedicine();

            testData.userIds.push(patient.id, pharmacyUser.id);
            testData.pharmacyIds.push(pharmacy.id);
            testData.medicineIds.push(medicine.id);

            const token = generateJWT(patient.id, 'PATIENT');

            // Record the initial count of direct calls
            const initialCount = await prisma.directCall.count({
              where: {
                userId: patient.id,
                pharmacyId: pharmacy.id,
                medicineId: medicine.id,
              },
            });

            // Make multiple direct calls
            for (let i = 0; i < numCalls; i++) {
              const request = createMockRequest({
                pharmacyId: pharmacy.id,
                medicineId: medicine.id,
              }, token);

              const response = await POST(request);
              const data = await response.json();

              // Should return 200 OK
              assert.strictEqual(response.status, 200,
                'Direct call should return 200 OK');
              assert.strictEqual(data.success, true,
                'Response should indicate success');
              assert.ok(data.phoneNumber,
                'Response should include pharmacy phone number');
              assert.strictEqual(data.phoneNumber, pharmacy.phone,
                'Phone number should match pharmacy phone');
            }

            // Verify all direct calls were recorded in database
            const finalCount = await prisma.directCall.count({
              where: {
                userId: patient.id,
                pharmacyId: pharmacy.id,
                medicineId: medicine.id,
              },
            });

            assert.strictEqual(finalCount, initialCount + numCalls,
              `Should have recorded ${numCalls} direct calls in database`);

            // Verify direct call records have correct data
            const directCalls = await prisma.directCall.findMany({
              where: {
                userId: patient.id,
                pharmacyId: pharmacy.id,
                medicineId: medicine.id,
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: numCalls,
            });

            assert.strictEqual(directCalls.length, numCalls,
              `Should retrieve ${numCalls} direct call records`);

            for (const call of directCalls) {
              assert.strictEqual(call.userId, patient.id,
                'Direct call should be linked to patient');
              assert.strictEqual(call.pharmacyId, pharmacy.id,
                'Direct call should be linked to pharmacy');
              assert.strictEqual(call.medicineId, medicine.id,
                'Direct call should be linked to medicine');
              assert.ok(call.createdAt,
                'Direct call should have createdAt timestamp');
            }
          }
        ),
        { numRuns: 2 }
      );
    } finally {
      await cleanupTestData(testData.userIds, testData.medicineIds, testData.pharmacyIds);
    }
  });

  test('should return pharmacy phone number when direct call is recorded', async () => {
    const testData: { userIds: string[]; medicineIds: string[]; pharmacyIds: string[] } = {
      userIds: [],
      medicineIds: [],
      pharmacyIds: [],
    };

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 15 }).filter(s => /^\+?\d+$/.test(s)),
          async (phoneNumber) => {
            // Create test data with specific phone number
            const patient = await createTestUser('PATIENT');
            const pharmacyUser = await createTestUser('PHARMACY');
            const pharmacy = await prisma.pharmacy.create({
              data: {
                userId: pharmacyUser.id,
                name: 'Test Pharmacy',
                address: '123 Test St',
                phone: phoneNumber,
                latitude: 40.7128,
                longitude: -74.0060,
                workingHours: '9AM-9PM',
                isApproved: true,
              },
            });
            const medicine = await createTestMedicine();

            testData.userIds.push(patient.id, pharmacyUser.id);
            testData.pharmacyIds.push(pharmacy.id);
            testData.medicineIds.push(medicine.id);

            const token = generateJWT(patient.id, 'PATIENT');

            // Record direct call
            const request = createMockRequest({
              pharmacyId: pharmacy.id,
              medicineId: medicine.id,
            }, token);

            const response = await POST(request);
            const data = await response.json();

            // Should return pharmacy phone number
            assert.strictEqual(response.status, 200,
              'Direct call should return 200 OK');
            assert.strictEqual(data.phoneNumber, phoneNumber,
              'Response should include correct pharmacy phone number');
            assert.ok(data.message,
              'Response should include success message');
          }
        ),
        { numRuns: 2 }
      );
    } finally {
      await cleanupTestData(testData.userIds, testData.medicineIds, testData.pharmacyIds);
    }
  });

  test('should reject direct call from non-patient users', async () => {
    const testData: { userIds: string[]; medicineIds: string[]; pharmacyIds: string[] } = {
      userIds: [],
      medicineIds: [],
      pharmacyIds: [],
    };

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('PHARMACY', 'ADMIN'),
          async (role) => {
            // Create test data
            const nonPatientUser = await createTestUser(role as any);
            const { pharmacy, user: pharmacyUser } = await createTestPharmacy(true);
            const medicine = await createTestMedicine();

            testData.userIds.push(nonPatientUser.id, pharmacyUser.id);
            testData.pharmacyIds.push(pharmacy.id);
            testData.medicineIds.push(medicine.id);

            const token = generateJWT(nonPatientUser.id, role as any);

            // Attempt to record direct call
            const request = createMockRequest({
              pharmacyId: pharmacy.id,
              medicineId: medicine.id,
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

            // Verify no direct call was recorded
            const directCallCount = await prisma.directCall.count({
              where: {
                userId: nonPatientUser.id,
                pharmacyId: pharmacy.id,
                medicineId: medicine.id,
              },
            });
            assert.strictEqual(directCallCount, 0,
              'No direct call should be recorded for non-patient user');
          }
        ),
        { numRuns: 2 }
      );
    } finally {
      await cleanupTestData(testData.userIds, testData.medicineIds, testData.pharmacyIds);
    }
  });

  test('should reject direct call with non-existent pharmacy', async () => {
    const testData: { userIds: string[]; medicineIds: string[]; pharmacyIds: string[] } = {
      userIds: [],
      medicineIds: [],
      pharmacyIds: [],
    };

    try {
      await fc.assert(
        fc.asyncProperty(
          generateCuid(),
          async (fakePharmacyId) => {
            // Create test data
            const patient = await createTestUser('PATIENT');
            const medicine = await createTestMedicine();

            testData.userIds.push(patient.id);
            testData.medicineIds.push(medicine.id);

            const token = generateJWT(patient.id, 'PATIENT');

            // Attempt to record direct call with non-existent pharmacy
            const request = createMockRequest({
              pharmacyId: fakePharmacyId,
              medicineId: medicine.id,
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
        { numRuns: 2 }
      );
    } finally {
      await cleanupTestData(testData.userIds, testData.medicineIds, testData.pharmacyIds);
    }
  });

  test('should reject direct call with non-existent medicine', async () => {
    const testData: { userIds: string[]; medicineIds: string[]; pharmacyIds: string[] } = {
      userIds: [],
      medicineIds: [],
      pharmacyIds: [],
    };

    try {
      await fc.assert(
        fc.asyncProperty(
          generateCuid(),
          async (fakeMedicineId) => {
            // Create test data
            const patient = await createTestUser('PATIENT');
            const { pharmacy, user: pharmacyUser } = await createTestPharmacy(true);

            testData.userIds.push(patient.id, pharmacyUser.id);
            testData.pharmacyIds.push(pharmacy.id);

            const token = generateJWT(patient.id, 'PATIENT');

            // Attempt to record direct call with non-existent medicine
            const request = createMockRequest({
              pharmacyId: pharmacy.id,
              medicineId: fakeMedicineId,
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
        { numRuns: 2 }
      );
    } finally {
      await cleanupTestData(testData.userIds, testData.medicineIds, testData.pharmacyIds);
    }
  });
});

// ============================================================================
// Property 40: Direct call aggregation
// Feature: medifind-fullstack-migration, Property 40: Direct call aggregation
// Validates: Requirements 11A.4
// ============================================================================

describe('Property 40: Direct call aggregation', () => {
  test('should accurately track direct call count per pharmacy', async () => {
    const testData: { userIds: string[]; medicineIds: string[]; pharmacyIds: string[] } = {
      userIds: [],
      medicineIds: [],
      pharmacyIds: [],
    };

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 3 }),
          fc.integer({ min: 1, max: 2 }),
          async (numPharmacies, callsPerPharmacy) => {
            // Create test data
            const patient = await createTestUser('PATIENT');
            const medicine = await createTestMedicine();

            testData.userIds.push(patient.id);
            testData.medicineIds.push(medicine.id);

            const token = generateJWT(patient.id, 'PATIENT');

            // Create multiple pharmacies and record calls
            const pharmacyCallCounts = new Map<string, number>();

            for (let i = 0; i < numPharmacies; i++) {
              const { pharmacy, user: pharmacyUser } = await createTestPharmacy(true);
              testData.pharmacyIds.push(pharmacy.id);
              testData.userIds.push(pharmacyUser.id);

              // Record multiple calls to this pharmacy
              for (let j = 0; j < callsPerPharmacy; j++) {
                const request = createMockRequest({
                  pharmacyId: pharmacy.id,
                  medicineId: medicine.id,
                }, token);

                const response = await POST(request);
                assert.strictEqual(response.status, 200,
                  'Direct call should be recorded successfully');
              }

              pharmacyCallCounts.set(pharmacy.id, callsPerPharmacy);
            }

            // Verify call counts for each pharmacy
            for (const [pharmacyId, expectedCount] of pharmacyCallCounts) {
              const actualCount = await prisma.directCall.count({
                where: {
                  pharmacyId,
                },
              });

              assert.strictEqual(actualCount, expectedCount,
                `Pharmacy ${pharmacyId} should have ${expectedCount} direct calls`);
            }

            // Verify total call count
            const totalExpectedCalls = numPharmacies * callsPerPharmacy;
            const totalActualCalls = await prisma.directCall.count({
              where: {
                userId: patient.id,
                medicineId: medicine.id,
              },
            });

            assert.strictEqual(totalActualCalls, totalExpectedCalls,
              `Total direct calls should be ${totalExpectedCalls}`);
          }
        ),
        { numRuns: 2 }
      );
    } finally {
      await cleanupTestData(testData.userIds, testData.medicineIds, testData.pharmacyIds);
    }
  });

  test('should track direct calls from multiple patients to same pharmacy', async () => {
    const testData: { userIds: string[]; medicineIds: string[]; pharmacyIds: string[] } = {
      userIds: [],
      medicineIds: [],
      pharmacyIds: [],
    };

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 2 }),
          fc.integer({ min: 1, max: 2 }),
          async (numPatients, callsPerPatient) => {
            // Create test data
            const { pharmacy, user: pharmacyUser } = await createTestPharmacy(true);
            const medicine = await createTestMedicine();

            testData.pharmacyIds.push(pharmacy.id);
            testData.medicineIds.push(medicine.id);
            testData.userIds.push(pharmacyUser.id);

            // Create multiple patients and record calls
            for (let i = 0; i < numPatients; i++) {
              const patient = await createTestUser('PATIENT');
              testData.userIds.push(patient.id);

              const token = generateJWT(patient.id, 'PATIENT');

              // Record multiple calls from this patient
              for (let j = 0; j < callsPerPatient; j++) {
                const request = createMockRequest({
                  pharmacyId: pharmacy.id,
                  medicineId: medicine.id,
                }, token);

                const response = await POST(request);
                assert.strictEqual(response.status, 200,
                  'Direct call should be recorded successfully');
              }
            }

            // Verify total call count for pharmacy
            const totalExpectedCalls = numPatients * callsPerPatient;
            const totalActualCalls = await prisma.directCall.count({
              where: {
                pharmacyId: pharmacy.id,
              },
            });

            assert.strictEqual(totalActualCalls, totalExpectedCalls,
              `Pharmacy should have ${totalExpectedCalls} total direct calls from all patients`);

            // Verify each patient's call count
            const patients = testData.userIds.filter(id => id !== pharmacyUser.id);
            for (const patientId of patients) {
              const patientCallCount = await prisma.directCall.count({
                where: {
                  userId: patientId,
                  pharmacyId: pharmacy.id,
                },
              });

              assert.strictEqual(patientCallCount, callsPerPatient,
                `Patient ${patientId} should have ${callsPerPatient} direct calls`);
            }
          }
        ),
        { numRuns: 2 }
      );
    } finally {
      await cleanupTestData(testData.userIds, testData.medicineIds, testData.pharmacyIds);
    }
  });

  test('should track direct calls for different medicines separately', async () => {
    const testData: { userIds: string[]; medicineIds: string[]; pharmacyIds: string[] } = {
      userIds: [],
      medicineIds: [],
      pharmacyIds: [],
    };

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 2 }),
          async (numMedicines) => {
            // Create test data
            const patient = await createTestUser('PATIENT');
            const { pharmacy, user: pharmacyUser } = await createTestPharmacy(true);

            testData.userIds.push(patient.id, pharmacyUser.id);
            testData.pharmacyIds.push(pharmacy.id);

            const token = generateJWT(patient.id, 'PATIENT');

            // Create multiple medicines and record one call for each
            const medicineIds: string[] = [];
            for (let i = 0; i < numMedicines; i++) {
              const medicine = await createTestMedicine();
              medicineIds.push(medicine.id);
              testData.medicineIds.push(medicine.id);

              const request = createMockRequest({
                pharmacyId: pharmacy.id,
                medicineId: medicine.id,
              }, token);

              const response = await POST(request);
              assert.strictEqual(response.status, 200,
                'Direct call should be recorded successfully');
            }

            // Verify each medicine has exactly one direct call
            for (const medicineId of medicineIds) {
              const callCount = await prisma.directCall.count({
                where: {
                  userId: patient.id,
                  pharmacyId: pharmacy.id,
                  medicineId,
                },
              });

              assert.strictEqual(callCount, 1,
                `Medicine ${medicineId} should have exactly 1 direct call`);
            }

            // Verify total call count for pharmacy
            const totalCalls = await prisma.directCall.count({
              where: {
                pharmacyId: pharmacy.id,
              },
            });

            assert.strictEqual(totalCalls, numMedicines,
              `Pharmacy should have ${numMedicines} total direct calls`);
          }
        ),
        { numRuns: 2 }
      );
    } finally {
      await cleanupTestData(testData.userIds, testData.medicineIds, testData.pharmacyIds);
    }
  });

  test('should maintain accurate timestamps for direct call aggregation', async () => {
    const testData: { userIds: string[]; medicineIds: string[]; pharmacyIds: string[] } = {
      userIds: [],
      medicineIds: [],
      pharmacyIds: [],
    };

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 2 }),
          async (numCalls) => {
            // Create test data
            const patient = await createTestUser('PATIENT');
            const { pharmacy, user: pharmacyUser } = await createTestPharmacy(true);
            const medicine = await createTestMedicine();

            testData.userIds.push(patient.id, pharmacyUser.id);
            testData.pharmacyIds.push(pharmacy.id);
            testData.medicineIds.push(medicine.id);

            const token = generateJWT(patient.id, 'PATIENT');

            // Record multiple calls with slight delays
            for (let i = 0; i < numCalls; i++) {
              const request = createMockRequest({
                pharmacyId: pharmacy.id,
                medicineId: medicine.id,
              }, token);

              const response = await POST(request);
              assert.strictEqual(response.status, 200,
                'Direct call should be recorded successfully');

              // Small delay between calls
              await new Promise(resolve => setTimeout(resolve, 10));
            }

            // Verify all calls were recorded with correct timestamps
            const directCalls = await prisma.directCall.findMany({
              where: {
                userId: patient.id,
                pharmacyId: pharmacy.id,
                medicineId: medicine.id,
              },
              orderBy: {
                createdAt: 'asc',
              },
            });

            assert.strictEqual(directCalls.length, numCalls,
              `Should have ${numCalls} direct calls recorded`);

            // Verify timestamps are in chronological order
            for (let i = 1; i < directCalls.length; i++) {
              const prevTime = new Date(directCalls[i - 1].createdAt);
              const currTime = new Date(directCalls[i].createdAt);

              assert.ok(currTime >= prevTime,
                'Direct call timestamps should be in chronological order');
            }
          }
        ),
        { numRuns: 2 }
      );
    } finally {
      await cleanupTestData(testData.userIds, testData.medicineIds, testData.pharmacyIds);
    }
  });
});
