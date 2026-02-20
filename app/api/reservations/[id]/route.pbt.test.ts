import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fc from 'fast-check';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateJWT } from '@/lib/auth';
import { PUT as acceptReservation } from './accept/route';
import { PUT as rejectReservation } from './reject/route';
import { PUT as cancelReservation } from './cancel/route';
import { PUT as providePhone } from './provide-phone/route';

// Helper to create mock NextRequest
function createMockRequest(body: any, token?: string): NextRequest {
  const request = new NextRequest('http://localhost:3000/api/reservations/test-id', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Cookie: `auth-token=${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (token) {
    request.cookies.set('auth-token', token);
  }

  return request;
}

// Helper to generate valid CUID-like strings
function generateCuid(): fc.Arbitrary<string> {
  return fc.string({ minLength: 25, maxLength: 25 }).map(s => 'c' + s.slice(1));
}

// Test data factories
async function createTestUser(role: 'PATIENT' | 'PHARMACY' | 'ADMIN' = 'PATIENT') {
  return prisma.user.create({
    data: {
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      password: '$2b$10$abcdefghijklmnopqrstuvwxyz123456', // Mock bcrypt hash
      name: 'Test User',
      role,
    },
  });
}

async function createTestPharmacy(isApproved: boolean = true) {
  const user = await createTestUser('PHARMACY');
  return prisma.pharmacy.create({
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
}

async function createTestMedicine() {
  return prisma.medicine.create({
    data: {
      name: `Test Medicine ${Date.now()}`,
      activeIngredient: 'Test Ingredient',
      dosage: '500mg',
      prescriptionRequired: false,
      category: 'Pain Relief',
      priceRange: '$10-$20',
    },
  });
}

async function createTestInventory(pharmacyId: string, medicineId: string, quantity: number) {
  return prisma.inventory.create({
    data: {
      pharmacyId,
      medicineId,
      quantity,
      status: quantity === 0 ? 'OUT_OF_STOCK' : quantity <= 10 ? 'LOW_STOCK' : 'IN_STOCK',
    },
  });
}

async function createTestReservation(
  userId: string,
  pharmacyId: string,
  medicineId: string,
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'NO_RESPONSE' = 'PENDING'
) {
  return prisma.reservation.create({
    data: {
      userId,
      pharmacyId,
      medicineId,
      quantity: 2,
      status,
      requestTime: new Date(),
      ...(status === 'ACCEPTED' && { acceptedTime: new Date() }),
      ...(status === 'REJECTED' && { rejectedTime: new Date() }),
      ...(status === 'NO_RESPONSE' && { noResponseTime: new Date() }),
    },
  });
}

// Cleanup function
async function cleanupTestData() {
  await prisma.notification.deleteMany({});
  await prisma.directCall.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.pharmacy.deleteMany({});
  await prisma.medicine.deleteMany({});
  await prisma.user.deleteMany({});
}

beforeAll(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData();
});

describe('Reservation Management Property-Based Tests', () => {
  /**
   * Property 42: Reservation acceptance
   * For any pharmacy accepting a reservation, the system should validate the reservation exists
   * and status is PENDING or NO_RESPONSE, then update status to ACCEPTED, set acceptedTime,
   * optionally store a note, and send a notification to the patient.
   * Validates: Requirements 12.3, 12.4, 12.5, 12.6, 12.7, 12.8
   */
  test('Property 42: Reservation acceptance', async () => {
    // Feature: medifind-fullstack-migration, Property 42: Reservation acceptance
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('PENDING', 'NO_RESPONSE'),
        fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
        async (initialStatus, note) => {
          // Setup
          const patient = await createTestUser('PATIENT');
          const pharmacy = await createTestPharmacy(true);
          const medicine = await createTestMedicine();
          await createTestInventory(pharmacy.id, medicine.id, 20);

          const reservation = await createTestReservation(
            patient.id,
            pharmacy.id,
            medicine.id,
            initialStatus as 'PENDING' | 'NO_RESPONSE'
          );

          // Get pharmacy user for token
          const pharmacyUser = await prisma.user.findUnique({
            where: { id: pharmacy.userId },
          });

          const token = generateJWT(pharmacyUser!.id, 'PHARMACY');
          const request = createMockRequest({ note }, token);

          // Act
          const response = await acceptReservation(request, { params: { id: reservation.id } });
          const data = await response.json();

          // Assert
          expect(response.status).toBe(200);
          expect(data.reservation.status).toBe('ACCEPTED');
          expect(data.reservation.acceptedTime).toBeDefined();
          if (note) {
            expect(data.reservation.note).toBe(note);
          }

          // Verify notification was sent to patient
          const notifications = await prisma.notification.findMany({
            where: { userId: patient.id },
          });
          expect(notifications.length).toBeGreaterThan(0);
          expect(notifications.some(n => n.type === 'reservation_accepted')).toBe(true);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 43: Reservation rejection
   * For any pharmacy rejecting a reservation, the system should update status to REJECTED,
   * set rejectedTime, optionally store a rejection reason, and send a notification to the patient.
   * Validates: Requirements 12.9, 12.10, 12.11, 12.12
   */
  test('Property 43: Reservation rejection', async () => {
    // Feature: medifind-fullstack-migration, Property 43: Reservation rejection
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('PENDING', 'NO_RESPONSE'),
        fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
        async (initialStatus, reason) => {
          // Setup
          const patient = await createTestUser('PATIENT');
          const pharmacy = await createTestPharmacy(true);
          const medicine = await createTestMedicine();
          await createTestInventory(pharmacy.id, medicine.id, 20);

          const reservation = await createTestReservation(
            patient.id,
            pharmacy.id,
            medicine.id,
            initialStatus as 'PENDING' | 'NO_RESPONSE'
          );

          // Get pharmacy user for token
          const pharmacyUser = await prisma.user.findUnique({
            where: { id: pharmacy.userId },
          });

          const token = generateJWT(pharmacyUser!.id, 'PHARMACY');
          const request = createMockRequest({ reason }, token);

          // Act
          const response = await rejectReservation(request, { params: { id: reservation.id } });
          const data = await response.json();

          // Assert
          expect(response.status).toBe(200);
          expect(data.reservation.status).toBe('REJECTED');
          expect(data.reservation.rejectedTime).toBeDefined();
          if (reason) {
            expect(data.reservation.note).toBe(reason);
          }

          // Verify notification was sent to patient
          const notifications = await prisma.notification.findMany({
            where: { userId: patient.id },
          });
          expect(notifications.length).toBeGreaterThan(0);
          expect(notifications.some(n => n.type === 'reservation_rejected')).toBe(true);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 44: NO_RESPONSE phone number handling
   * For any patient providing a phone number for a NO_RESPONSE reservation, the system should
   * update the patientPhone field and send a notification to the pharmacy with the phone number.
   * Validates: Requirements 12.15
   */
  test('Property 44: NO_RESPONSE phone number handling', async () => {
    // Feature: medifind-fullstack-migration, Property 44: NO_RESPONSE phone number handling
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 15 }).filter(s => /^\+?\d+$/.test(s)),
        async (phone) => {
          // Setup
          const patient = await createTestUser('PATIENT');
          const pharmacy = await createTestPharmacy(true);
          const medicine = await createTestMedicine();
          await createTestInventory(pharmacy.id, medicine.id, 20);

          const reservation = await createTestReservation(
            patient.id,
            pharmacy.id,
            medicine.id,
            'NO_RESPONSE'
          );

          const token = generateJWT(patient.id, 'PATIENT');
          const request = createMockRequest({ phone }, token);

          // Act
          const response = await providePhone(request, { params: { id: reservation.id } });
          const data = await response.json();

          // Assert
          expect(response.status).toBe(200);
          expect(data.reservation.patientPhone).toBe(phone);

          // Verify notification was sent to pharmacy
          const pharmacyUser = await prisma.user.findUnique({
            where: { id: pharmacy.userId },
          });
          const notifications = await prisma.notification.findMany({
            where: { userId: pharmacyUser!.id },
          });
          expect(notifications.length).toBeGreaterThan(0);
          expect(notifications.some(n => n.message.includes(phone))).toBe(true);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 45: NO_RESPONSE status transitions
   * For any pharmacy responding to a NO_RESPONSE reservation, the system should allow
   * updating status to either ACCEPTED or REJECTED.
   * Validates: Requirements 12.16
   */
  test('Property 45: NO_RESPONSE status transitions', async () => {
    // Feature: medifind-fullstack-migration, Property 45: NO_RESPONSE status transitions
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('accept', 'reject'),
        async (action) => {
          // Setup
          const patient = await createTestUser('PATIENT');
          const pharmacy = await createTestPharmacy(true);
          const medicine = await createTestMedicine();
          await createTestInventory(pharmacy.id, medicine.id, 20);

          const reservation = await createTestReservation(
            patient.id,
            pharmacy.id,
            medicine.id,
            'NO_RESPONSE'
          );

          // Get pharmacy user for token
          const pharmacyUser = await prisma.user.findUnique({
            where: { id: pharmacy.userId },
          });

          const token = generateJWT(pharmacyUser!.id, 'PHARMACY');
          const request = createMockRequest({}, token);

          // Act
          const response =
            action === 'accept'
              ? await acceptReservation(request, { params: { id: reservation.id } })
              : await rejectReservation(request, { params: { id: reservation.id } });
          const data = await response.json();

          // Assert
          expect(response.status).toBe(200);
          expect(data.reservation.status).toBe(action === 'accept' ? 'ACCEPTED' : 'REJECTED');
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 46: Reservation query operations
   * For any reservation query (patient or pharmacy), the system should return the appropriate
   * reservations, support filtering by status, and support sorting by request time.
   * Validates: Requirements 12.1, 12.17, 13.1, 13.10, 13.11
   */
  test('Property 46: Reservation query operations', async () => {
    // Feature: medifind-fullstack-migration, Property 46: Reservation query operations
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('PATIENT', 'PHARMACY'),
        fc.integer({ min: 2, max: 5 }),
        async (role, numReservations) => {
          // Setup
          const patient = await createTestUser('PATIENT');
          const pharmacy = await createTestPharmacy(true);
          const medicine = await createTestMedicine();
          await createTestInventory(pharmacy.id, medicine.id, 50);

          // Create multiple reservations
          const reservations = [];
          for (let i = 0; i < numReservations; i++) {
            const status = ['PENDING', 'ACCEPTED', 'REJECTED'][i % 3] as any;
            const res = await createTestReservation(patient.id, pharmacy.id, medicine.id, status);
            reservations.push(res);
            // Add small delay to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Get user for token
          const user = role === 'PATIENT' ? patient : await prisma.user.findUnique({ where: { id: pharmacy.userId } });
          const token = generateJWT(user!.id, role);

          // Act - Query all reservations
          const request = new NextRequest('http://localhost:3000/api/reservations', {
            method: 'GET',
            headers: { Cookie: `auth-token=${token}` },
          });
          request.cookies.set('auth-token', token);

          const { GET } = await import('../route');
          const response = await GET(request);
          const data = await response.json();

          // Assert
          expect(response.status).toBe(200);
          expect(data.reservations).toBeDefined();
          expect(data.reservations.length).toBe(numReservations);

          // Verify sorting by requestTime (descending)
          for (let i = 0; i < data.reservations.length - 1; i++) {
            const current = new Date(data.reservations[i].requestTime);
            const next = new Date(data.reservations[i + 1].requestTime);
            expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 47: Reservation cancellation
   * For any patient cancelling a reservation, the system should validate the status is
   * PENDING, ACCEPTED, or NO_RESPONSE, then update status to CANCELLED.
   * Validates: Requirements 13.8, 13.9
   */
  test('Property 47: Reservation cancellation', async () => {
    // Feature: medifind-fullstack-migration, Property 47: Reservation cancellation
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('PENDING', 'ACCEPTED', 'NO_RESPONSE'),
        async (initialStatus) => {
          // Setup
          const patient = await createTestUser('PATIENT');
          const pharmacy = await createTestPharmacy(true);
          const medicine = await createTestMedicine();
          await createTestInventory(pharmacy.id, medicine.id, 20);

          const reservation = await createTestReservation(
            patient.id,
            pharmacy.id,
            medicine.id,
            initialStatus as 'PENDING' | 'ACCEPTED' | 'NO_RESPONSE'
          );

          const token = generateJWT(patient.id, 'PATIENT');
          const request = createMockRequest({}, token);

          // Act
          const response = await cancelReservation(request, { params: { id: reservation.id } });
          const data = await response.json();

          // Assert
          expect(response.status).toBe(200);
          expect(data.reservation.status).toBe('CANCELLED');

          // Verify in database
          const updatedReservation = await prisma.reservation.findUnique({
            where: { id: reservation.id },
          });
          expect(updatedReservation!.status).toBe('CANCELLED');
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Additional test: Verify invalid status transitions are rejected
   */
  test('Property 42/43: Invalid status transitions are rejected', async () => {
    // Feature: medifind-fullstack-migration, Property 42/43: Invalid status transitions
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('ACCEPTED', 'REJECTED', 'CANCELLED'),
        fc.constantFrom('accept', 'reject'),
        async (initialStatus, action) => {
          // Setup
          const patient = await createTestUser('PATIENT');
          const pharmacy = await createTestPharmacy(true);
          const medicine = await createTestMedicine();
          await createTestInventory(pharmacy.id, medicine.id, 20);

          const reservation = await createTestReservation(
            patient.id,
            pharmacy.id,
            medicine.id,
            initialStatus as any
          );

          // Get pharmacy user for token
          const pharmacyUser = await prisma.user.findUnique({
            where: { id: pharmacy.userId },
          });

          const token = generateJWT(pharmacyUser!.id, 'PHARMACY');
          const request = createMockRequest({}, token);

          // Act
          const response =
            action === 'accept'
              ? await acceptReservation(request, { params: { id: reservation.id } })
              : await rejectReservation(request, { params: { id: reservation.id } });

          // Assert - Should return conflict error
          expect(response.status).toBe(409);
          const data = await response.json();
          expect(data.error).toBe('CONFLICT');
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Additional test: Verify authorization checks
   */
  test('Property 42/43/47: Authorization checks prevent unauthorized actions', async () => {
    // Feature: medifind-fullstack-migration, Property 42/43/47: Authorization checks
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('accept', 'reject', 'cancel'),
        async (action) => {
          // Setup
          const patient = await createTestUser('PATIENT');
          const pharmacy = await createTestPharmacy(true);
          const otherPharmacy = await createTestPharmacy(true);
          const medicine = await createTestMedicine();
          await createTestInventory(pharmacy.id, medicine.id, 20);

          const reservation = await createTestReservation(
            patient.id,
            pharmacy.id,
            medicine.id,
            'PENDING'
          );

          // Try to act as wrong user
          let wrongUser;
          let expectedRole;
          if (action === 'cancel') {
            // Try to cancel as pharmacy
            wrongUser = await prisma.user.findUnique({ where: { id: pharmacy.userId } });
            expectedRole = 'PHARMACY';
          } else {
            // Try to accept/reject as different pharmacy
            wrongUser = await prisma.user.findUnique({ where: { id: otherPharmacy.userId } });
            expectedRole = 'PHARMACY';
          }

          const token = generateJWT(wrongUser!.id, expectedRole as any);
          const request = createMockRequest({}, token);

          // Act
          let response;
          if (action === 'accept') {
            response = await acceptReservation(request, { params: { id: reservation.id } });
          } else if (action === 'reject') {
            response = await rejectReservation(request, { params: { id: reservation.id } });
          } else {
            response = await cancelReservation(request, { params: { id: reservation.id } });
          }

          // Assert - Should return forbidden error
          expect(response.status).toBe(403);
          const data = await response.json();
          expect(data.error).toBe('FORBIDDEN');
        }
      ),
      { numRuns: 10 }
    );
  });
});
