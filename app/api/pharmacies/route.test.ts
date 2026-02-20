import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import { prisma } from '@/lib/prisma';
import { GET } from './route';
import { POST as approvePharmacy } from './[id]/approve/route';
import { PUT as updatePharmacy, DELETE as deletePharmacy } from './[id]/route';
import { NextRequest } from 'next/server';
import { generateJWT } from '@/lib/jwt';
import { hashPassword } from '@/lib/auth';

// Helper to create a mock NextRequest
function createMockRequest(url: string, options?: { cookies?: Record<string, string> }): NextRequest {
  const request = {
    url,
    cookies: {
      get: (name: string) => {
        const value = options?.cookies?.[name];
        return value ? { value } : undefined;
      },
    },
  } as NextRequest;
  return request;
}

// Helper to create a mock NextRequest with body
function createMockRequestWithBody(url: string, body: any, options?: { cookies?: Record<string, string> }): NextRequest {
  return {
    url,
    json: async () => body,
    cookies: {
      get: (name: string) => {
        const value = options?.cookies?.[name];
        return value ? { value } : undefined;
      },
    },
  } as NextRequest;
}

// Helper to generate valid email addresses
function generateValidEmail(): fc.Arbitrary<string> {
  return fc.tuple(
    fc.stringMatching(/^[a-z0-9]+$/),
    fc.stringMatching(/^[a-z0-9]+$/),
    fc.constantFrom('com', 'org', 'net', 'edu', 'io')
  ).map(([local, domain, tld]) => `${local}@${domain}.${tld}`);
}

// Helper to create a test user
async function createTestUser(email: string, role: 'PATIENT' | 'PHARMACY' | 'ADMIN' = 'PATIENT') {
  const password = await hashPassword('testpassword123');
  return await prisma.user.create({
    data: {
      email,
      password,
      name: 'Test User',
      role,
    },
  });
}

// Helper to create a test pharmacy
async function createTestPharmacy(userId: string, isApproved: boolean = false) {
  return await prisma.pharmacy.create({
    data: {
      userId,
      name: 'Test Pharmacy',
      address: '123 Test St',
      phone: '1234567890',
      latitude: 40.7128,
      longitude: -74.0060,
      rating: 4.5,
      workingHours: '9AM-5PM',
      isApproved,
    },
  });
}

// Helper to clean up test data
async function cleanupTestData(emails: string[]) {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: emails,
      },
    },
  });
}

// ============================================================================
// Property 24: Pharmacy approval workflow
// Feature: medifind-fullstack-migration, Property 24: Pharmacy approval workflow
// Validates: Requirements 8.2, 8.3
// ============================================================================

describe('Property 24: Pharmacy approval workflow', () => {
  test('should approve pharmacy and send notification', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 15 }).filter(s => s.trim().length > 0),
        async (pharmacyEmail, pharmacyName, address, phone) => {
          // Create admin user
          const adminEmail = `admin_${Date.now()}_${Math.random()}@test.com`;
          testEmails.push(adminEmail, pharmacyEmail);
          
          const adminUser = await createTestUser(adminEmail, 'ADMIN');
          const adminToken = generateJWT(adminUser.id, 'ADMIN');

          // Create pharmacy user
          const pharmacyUser = await createTestUser(pharmacyEmail, 'PHARMACY');
          const pharmacy = await createTestPharmacy(pharmacyUser.id, false);

          // Update pharmacy with test data
          await prisma.pharmacy.update({
            where: { id: pharmacy.id },
            data: {
              name: pharmacyName,
              address,
              phone,
            },
          });

          // Verify pharmacy is not approved initially
          const beforeApproval = await prisma.pharmacy.findUnique({
            where: { id: pharmacy.id },
          });
          assert.strictEqual(beforeApproval?.isApproved, false,
            'Pharmacy should not be approved initially');

          // Approve pharmacy
          const request = createMockRequest(
            `http://localhost:3000/api/pharmacies/${pharmacy.id}/approve`,
            { cookies: { 'auth-token': adminToken } }
          );

          const response = await approvePharmacy(request, { params: { id: pharmacy.id } });
          const data = await response.json();

          // Verify response
          assert.strictEqual(response.status, 200,
            'Approval should succeed with status 200');
          assert.strictEqual(data.success, true,
            'Response should have success: true');
          assert.ok(data.pharmacy, 'Response should include pharmacy object');
          assert.strictEqual(data.pharmacy.isApproved, true,
            'Pharmacy should be approved in response');

          // Verify pharmacy is approved in database
          const afterApproval = await prisma.pharmacy.findUnique({
            where: { id: pharmacy.id },
          });
          assert.strictEqual(afterApproval?.isApproved, true,
            'Pharmacy should be approved in database');

          // Verify notification was created
          const notification = await prisma.notification.findFirst({
            where: {
              userId: pharmacyUser.id,
              type: 'pharmacy_approved',
            },
          });

          assert.ok(notification, 'Notification should be created');
          assert.strictEqual(notification.isRead, false,
            'Notification should be unread initially');
          assert.ok(notification.title.toLowerCase().includes('approved'),
            `Notification title should mention approval: ${notification.title}`);
          assert.ok(notification.message.includes(pharmacyName),
            `Notification message should include pharmacy name: ${notification.message}`);
        }
      ),
      { numRuns: 5 }
    );

    // Cleanup
    await cleanupTestData(testEmails);
  });

  test('should prevent double approval', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        async (pharmacyEmail) => {
          // Create admin user
          const adminEmail = `admin_${Date.now()}_${Math.random()}@test.com`;
          testEmails.push(adminEmail, pharmacyEmail);
          
          const adminUser = await createTestUser(adminEmail, 'ADMIN');
          const adminToken = generateJWT(adminUser.id, 'ADMIN');

          // Create pharmacy user
          const pharmacyUser = await createTestUser(pharmacyEmail, 'PHARMACY');
          const pharmacy = await createTestPharmacy(pharmacyUser.id, false);

          // First approval
          const request1 = createMockRequest(
            `http://localhost:3000/api/pharmacies/${pharmacy.id}/approve`,
            { cookies: { 'auth-token': adminToken } }
          );

          const response1 = await approvePharmacy(request1, { params: { id: pharmacy.id } });
          assert.strictEqual(response1.status, 200,
            'First approval should succeed');

          // Second approval attempt
          const request2 = createMockRequest(
            `http://localhost:3000/api/pharmacies/${pharmacy.id}/approve`,
            { cookies: { 'auth-token': adminToken } }
          );

          const response2 = await approvePharmacy(request2, { params: { id: pharmacy.id } });
          const data2 = await response2.json();

          assert.strictEqual(response2.status, 409,
            'Second approval should return 409 Conflict');
          assert.strictEqual(data2.error, 'CONFLICT',
            'Error should be CONFLICT');
          assert.ok(data2.message.toLowerCase().includes('already approved'),
            `Error message should mention already approved: ${data2.message}`);
        }
      ),
      { numRuns: 5 }
    );

    // Cleanup
    await cleanupTestData(testEmails);
  });
});

// ============================================================================
// Property 25: Pharmacy rejection cleanup
// Feature: medifind-fullstack-migration, Property 25: Pharmacy rejection cleanup
// Validates: Requirements 8.4
// ============================================================================

describe('Property 25: Pharmacy rejection cleanup', () => {
  test('should delete both Pharmacy and User records when rejecting', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        async (pharmacyEmail) => {
          // Create admin user
          const adminEmail = `admin_${Date.now()}_${Math.random()}@test.com`;
          testEmails.push(adminEmail, pharmacyEmail);
          
          const adminUser = await createTestUser(adminEmail, 'ADMIN');
          const adminToken = generateJWT(adminUser.id, 'ADMIN');

          // Create pharmacy user
          const pharmacyUser = await createTestUser(pharmacyEmail, 'PHARMACY');
          const pharmacy = await createTestPharmacy(pharmacyUser.id, false);

          // Verify both records exist before deletion
          const userBefore = await prisma.user.findUnique({
            where: { id: pharmacyUser.id },
          });
          const pharmacyBefore = await prisma.pharmacy.findUnique({
            where: { id: pharmacy.id },
          });

          assert.ok(userBefore, 'User should exist before deletion');
          assert.ok(pharmacyBefore, 'Pharmacy should exist before deletion');

          // Delete pharmacy (rejection)
          const request = createMockRequest(
            `http://localhost:3000/api/pharmacies/${pharmacy.id}`,
            { cookies: { 'auth-token': adminToken } }
          );

          const response = await deletePharmacy(request, { params: { id: pharmacy.id } });
          const data = await response.json();

          assert.strictEqual(response.status, 200,
            'Deletion should succeed with status 200');
          assert.strictEqual(data.success, true,
            'Response should have success: true');

          // Verify both records are deleted
          const userAfter = await prisma.user.findUnique({
            where: { id: pharmacyUser.id },
          });
          const pharmacyAfter = await prisma.pharmacy.findUnique({
            where: { id: pharmacy.id },
          });

          assert.strictEqual(userAfter, null,
            'User should be deleted');
          assert.strictEqual(pharmacyAfter, null,
            'Pharmacy should be deleted');
        }
      ),
      { numRuns: 5 }
    );

    // Cleanup
    await cleanupTestData(testEmails);
  });
});

// ============================================================================
// Property 26: Pharmacy query operations
// Feature: medifind-fullstack-migration, Property 26: Pharmacy query operations
// Validates: Requirements 8.1, 8.5, 8.6, 8.7
// ============================================================================

describe('Property 26: Pharmacy query operations', () => {
  test('should filter pharmacies by approval status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(true),
        async (_) => {
          // Query approved pharmacies
          const approvedRequest = createMockRequest(
            'http://localhost:3000/api/pharmacies?isApproved=true&limit=100'
          );
          const approvedResponse = await GET(approvedRequest);
          const approvedData = await approvedResponse.json();

          assert.strictEqual(approvedResponse.status, 200,
            'Query for approved pharmacies should succeed');
          assert.ok(Array.isArray(approvedData.pharmacies),
            'Response should include pharmacies array');
          
          // Verify all returned pharmacies are approved (if any exist)
          if (approvedData.pharmacies.length > 0) {
            assert.ok(approvedData.pharmacies.every((p: any) => p.isApproved === true),
              'All returned pharmacies should be approved');
          }

          // Query unapproved pharmacies
          const unapprovedRequest = createMockRequest(
            'http://localhost:3000/api/pharmacies?isApproved=false&limit=100'
          );
          const unapprovedResponse = await GET(unapprovedRequest);
          const unapprovedData = await unapprovedResponse.json();

          assert.strictEqual(unapprovedResponse.status, 200,
            'Query for unapproved pharmacies should succeed');
          assert.ok(Array.isArray(unapprovedData.pharmacies),
            'Response should include pharmacies array');
          
          // Verify all returned pharmacies are unapproved (if any exist)
          if (unapprovedData.pharmacies.length > 0) {
            assert.ok(unapprovedData.pharmacies.every((p: any) => p.isApproved === false),
              'All returned pharmacies should be unapproved');
          }

          // Query all pharmacies (no filter)
          const allRequest = createMockRequest(
            'http://localhost:3000/api/pharmacies?limit=100'
          );
          const allResponse = await GET(allRequest);
          const allData = await allResponse.json();

          assert.strictEqual(allResponse.status, 200,
            'Query for all pharmacies should succeed');
          assert.ok(Array.isArray(allData.pharmacies),
            'Response should include pharmacies array');
        }
      ),
      { numRuns: 3 }
    );
  });

  test('should search pharmacies by name', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-zA-Z0-9]{5,15}$/),
        fc.stringMatching(/^[a-zA-Z0-9]{5,15}$/),
        async (searchTerm, otherName) => {
          // Ensure search term and other name are different
          if (searchTerm.toLowerCase() === otherName.toLowerCase()) {
            otherName = otherName + 'XYZ';
          }

          // Create pharmacy with searchable name
          const email1 = `search_${Date.now()}_1_${Math.random()}@test.com`;
          testEmails.push(email1);
          const user1 = await createTestUser(email1, 'PHARMACY');
          const pharmacy1 = await createTestPharmacy(user1.id, true);
          await prisma.pharmacy.update({
            where: { id: pharmacy1.id },
            data: { name: `Pharmacy ${searchTerm} Store` },
          });

          // Create pharmacy with different name
          const email2 = `search_${Date.now()}_2_${Math.random()}@test.com`;
          testEmails.push(email2);
          const user2 = await createTestUser(email2, 'PHARMACY');
          const pharmacy2 = await createTestPharmacy(user2.id, true);
          await prisma.pharmacy.update({
            where: { id: pharmacy2.id },
            data: { name: `Pharmacy ${otherName} Store` },
          });

          // Small delay to ensure database commits
          await new Promise(resolve => setTimeout(resolve, 100));

          // Search by term
          const request = createMockRequest(
            `http://localhost:3000/api/pharmacies?search=${encodeURIComponent(searchTerm)}&limit=100`
          );
          const response = await GET(request);
          const data = await response.json();

          assert.strictEqual(response.status, 200,
            'Search should succeed');
          assert.ok(Array.isArray(data.pharmacies),
            'Response should include pharmacies array');

          // Verify search results
          const foundPharmacy1 = data.pharmacies.find((p: any) => p.id === pharmacy1.id);
          assert.ok(foundPharmacy1,
            `Should find pharmacy with name containing "${searchTerm}"`);
          assert.ok(foundPharmacy1.name.toLowerCase().includes(searchTerm.toLowerCase()),
            `Found pharmacy name should contain search term`);
        }
      ),
      { numRuns: 3 }
    );

    // Cleanup
    await cleanupTestData(testEmails);
  });

  test('should search pharmacies by address', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-zA-Z0-9]{5,15}$/),
        async (searchTerm) => {
          // Create pharmacy with searchable address
          const email = `address_${Date.now()}_${Math.random()}@test.com`;
          testEmails.push(email);
          const user = await createTestUser(email, 'PHARMACY');
          const pharmacy = await createTestPharmacy(user.id, true);
          await prisma.pharmacy.update({
            where: { id: pharmacy.id },
            data: { address: `123 ${searchTerm} Street, City` },
          });

          // Small delay to ensure database commits
          await new Promise(resolve => setTimeout(resolve, 100));

          // Search by term
          const request = createMockRequest(
            `http://localhost:3000/api/pharmacies?search=${encodeURIComponent(searchTerm)}&limit=100`
          );
          const response = await GET(request);
          const data = await response.json();

          assert.strictEqual(response.status, 200,
            'Search should succeed');

          // Verify search results
          const foundPharmacy = data.pharmacies.find((p: any) => p.id === pharmacy.id);
          assert.ok(foundPharmacy,
            `Should find pharmacy with address containing "${searchTerm}"`);
          assert.ok(foundPharmacy.address.toLowerCase().includes(searchTerm.toLowerCase()),
            `Found pharmacy address should contain search term`);
        }
      ),
      { numRuns: 3 }
    );

    // Cleanup
    await cleanupTestData(testEmails);
  });

  test('should support pagination', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 10 }),
        fc.integer({ min: 2, max: 4 }),
        async (totalCount, pageSize) => {
          // Create multiple pharmacies
          for (let i = 0; i < totalCount; i++) {
            const email = `page_${Date.now()}_${i}_${Math.random()}@test.com`;
            testEmails.push(email);
            const user = await createTestUser(email, 'PHARMACY');
            await createTestPharmacy(user.id, true);
          }

          // Get first page
          const request1 = createMockRequest(
            `http://localhost:3000/api/pharmacies?page=1&limit=${pageSize}`
          );
          const response1 = await GET(request1);
          const data1 = await response1.json();

          assert.strictEqual(response1.status, 200,
            'First page query should succeed');
          assert.ok(data1.pagination,
            'Response should include pagination info');
          assert.strictEqual(data1.pagination.page, 1,
            'Page number should be 1');
          assert.strictEqual(data1.pagination.limit, pageSize,
            `Limit should be ${pageSize}`);
          assert.ok(data1.pagination.total >= totalCount,
            `Total should be at least ${totalCount}`);
          assert.ok(data1.pharmacies.length <= pageSize,
            `Should return at most ${pageSize} pharmacies per page`);

          // Get second page if there are enough records
          if (data1.pagination.totalPages > 1) {
            const request2 = createMockRequest(
              `http://localhost:3000/api/pharmacies?page=2&limit=${pageSize}`
            );
            const response2 = await GET(request2);
            const data2 = await response2.json();

            assert.strictEqual(response2.status, 200,
              'Second page query should succeed');
            assert.strictEqual(data2.pagination.page, 2,
              'Page number should be 2');

            // Verify no overlap between pages
            const page1Ids = data1.pharmacies.map((p: any) => p.id);
            const page2Ids = data2.pharmacies.map((p: any) => p.id);
            const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
            assert.strictEqual(overlap.length, 0,
              'Pages should not have overlapping pharmacies');
          }
        }
      ),
      { numRuns: 2 }
    );

    // Cleanup
    await cleanupTestData(testEmails);
  });
});

// ============================================================================
// Property 27: Pharmacy profile update validation
// Feature: medifind-fullstack-migration, Property 27: Pharmacy profile update validation
// Validates: Requirements 8.8, 8.9
// ============================================================================

describe('Property 27: Pharmacy profile update validation', () => {
  test('should validate and update pharmacy profile fields', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 15 }).filter(s => s.trim().length > 0),
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (email, newName, newAddress, newPhone, newLat, newLng, newHours) => {
          testEmails.push(email);

          // Create pharmacy user
          const user = await createTestUser(email, 'PHARMACY');
          const pharmacy = await createTestPharmacy(user.id, true);
          const token = generateJWT(user.id, 'PHARMACY');

          // Update pharmacy profile
          const updateData = {
            name: newName,
            address: newAddress,
            phone: newPhone,
            latitude: newLat,
            longitude: newLng,
            workingHours: newHours,
          };

          const request = createMockRequestWithBody(
            `http://localhost:3000/api/pharmacies/${pharmacy.id}`,
            updateData,
            { cookies: { 'auth-token': token } }
          );

          const response = await updatePharmacy(request, { params: { id: pharmacy.id } });
          const data = await response.json();

          assert.strictEqual(response.status, 200,
            'Update should succeed with status 200');
          assert.strictEqual(data.success, true,
            'Response should have success: true');
          assert.ok(data.pharmacy,
            'Response should include updated pharmacy');

          // Verify all fields were updated
          assert.strictEqual(data.pharmacy.name, newName,
            `Name should be updated to "${newName}"`);
          assert.strictEqual(data.pharmacy.address, newAddress,
            `Address should be updated`);
          assert.strictEqual(data.pharmacy.phone, newPhone,
            `Phone should be updated`);
          assert.ok(Math.abs(data.pharmacy.latitude - newLat) < 0.000001,
            `Latitude should be updated (within tolerance)`);
          assert.ok(Math.abs(data.pharmacy.longitude - newLng) < 0.000001,
            `Longitude should be updated (within tolerance)`);
          assert.strictEqual(data.pharmacy.workingHours, newHours,
            `Working hours should be updated`);

          // Verify in database
          const updatedPharmacy = await prisma.pharmacy.findUnique({
            where: { id: pharmacy.id },
          });

          assert.ok(updatedPharmacy,
            'Pharmacy should exist in database');
          assert.strictEqual(updatedPharmacy.name, newName,
            'Name should be updated in database');
          assert.strictEqual(updatedPharmacy.address, newAddress,
            'Address should be updated in database');
          assert.strictEqual(updatedPharmacy.phone, newPhone,
            'Phone should be updated in database');
        }
      ),
      { numRuns: 5 }
    );

    // Cleanup
    await cleanupTestData(testEmails);
  });

  test('should reject invalid field values', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        async (email) => {
          testEmails.push(email);

          // Create pharmacy user
          const user = await createTestUser(email, 'PHARMACY');
          const pharmacy = await createTestPharmacy(user.id, true);
          const token = generateJWT(user.id, 'PHARMACY');

          // Try to update with empty name
          const invalidData = {
            name: '',
            address: 'Valid Address',
          };

          const request = createMockRequestWithBody(
            `http://localhost:3000/api/pharmacies/${pharmacy.id}`,
            invalidData,
            { cookies: { 'auth-token': token } }
          );

          const response = await updatePharmacy(request, { params: { id: pharmacy.id } });
          const data = await response.json();

          assert.strictEqual(response.status, 400,
            'Update with invalid data should return 400');
          assert.strictEqual(data.error, 'VALIDATION_ERROR',
            'Error should be VALIDATION_ERROR');
          assert.ok(data.details,
            'Response should include validation error details');
        }
      ),
      { numRuns: 5 }
    );

    // Cleanup
    await cleanupTestData(testEmails);
  });

  test('should only allow pharmacy owner to update their profile', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        generateValidEmail(),
        async (email1, email2) => {
          // Ensure emails are different
          if (email1 === email2) {
            email2 = 'different_' + email2;
          }

          testEmails.push(email1, email2);

          // Create two pharmacy users
          const user1 = await createTestUser(email1, 'PHARMACY');
          const pharmacy1 = await createTestPharmacy(user1.id, true);
          
          const user2 = await createTestUser(email2, 'PHARMACY');
          await createTestPharmacy(user2.id, true);
          const token2 = generateJWT(user2.id, 'PHARMACY');

          // Try to update pharmacy1 with user2's token
          const updateData = {
            name: 'Unauthorized Update',
          };

          const request = createMockRequestWithBody(
            `http://localhost:3000/api/pharmacies/${pharmacy1.id}`,
            updateData,
            { cookies: { 'auth-token': token2 } }
          );

          const response = await updatePharmacy(request, { params: { id: pharmacy1.id } });
          const data = await response.json();

          assert.strictEqual(response.status, 403,
            'Update by non-owner should return 403');
          assert.strictEqual(data.error, 'FORBIDDEN',
            'Error should be FORBIDDEN');
          assert.ok(data.message.toLowerCase().includes('own'),
            `Error message should mention ownership: ${data.message}`);

          // Verify pharmacy was not updated
          const unchangedPharmacy = await prisma.pharmacy.findUnique({
            where: { id: pharmacy1.id },
          });

          assert.notStrictEqual(unchangedPharmacy?.name, 'Unauthorized Update',
            'Pharmacy name should not be changed by unauthorized user');
        }
      ),
      { numRuns: 10 }
    );

    // Cleanup
    await cleanupTestData(testEmails);
  });
});
