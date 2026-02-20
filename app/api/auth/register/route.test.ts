import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import { prisma } from '@/lib/prisma';
import { POST } from './route';
import { NextRequest } from 'next/server';

// Helper to create a mock NextRequest
function createMockRequest(body: any): NextRequest {
  return {
    json: async () => body,
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

// Helper to clean up test data
async function cleanupTestUsers(emails: string[]) {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: emails,
      },
    },
  });
}

// ============================================================================
// Property 3: Duplicate email prevention
// Feature: medifind-fullstack-migration, Property 3: Duplicate email prevention
// Validates: Requirements 3.3
// ============================================================================

describe('Property 3: Duplicate email prevention', () => {
  test('should prevent duplicate email registration', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (email, password, name) => {
          // Clean up before test to ensure fresh state
          await cleanupTestUsers([email]);
          
          testEmails.push(email);

          // First registration should succeed
          const request1 = createMockRequest({
            email,
            password,
            name,
          });

          const response1 = await POST(request1);
          const data1 = await response1.json();

          assert.strictEqual(response1.status, 201,
            `First registration with email ${email} should succeed`);
          assert.strictEqual(data1.success, true,
            `First registration should return success: true`);

          // Second registration with same email should fail
          const request2 = createMockRequest({
            email,
            password: password + '_different',
            name: name + ' Different',
          });

          const response2 = await POST(request2);
          const data2 = await response2.json();

          assert.strictEqual(response2.status, 400,
            `Duplicate registration with email ${email} should return 400`);
          assert.strictEqual(data2.error, 'EMAIL_EXISTS',
            `Duplicate registration should return EMAIL_EXISTS error`);
          assert.ok(data2.message.toLowerCase().includes('email'),
            `Error message should mention email: ${data2.message}`);
        }
      ),
      { numRuns: 10 }
    );

    // Cleanup
    await cleanupTestUsers(testEmails);
  });
});

// ============================================================================
// Property 5: User creation completeness
// Feature: medifind-fullstack-migration, Property 5: User creation completeness
// Validates: Requirements 3.5
// ============================================================================

describe('Property 5: User creation completeness', () => {
  test('should create user with all required fields', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.option(fc.string({ minLength: 10, maxLength: 15 }), { nil: undefined }),
        async (email, password, name, phone) => {
          // Clean up before test
          await cleanupTestUsers([email]);
          
          testEmails.push(email);

          const request = createMockRequest({
            email,
            password,
            name,
            phone,
          });

          const response = await POST(request);
          const data = await response.json();

          assert.strictEqual(response.status, 201,
            `Registration should succeed with status 201`);
          assert.strictEqual(data.success, true,
            `Response should have success: true`);
          assert.ok(data.user, `Response should include user object`);

          // Verify user was created in database
          const createdUser = await prisma.user.findUnique({
            where: { email },
          });

          assert.ok(createdUser, `User should exist in database`);
          assert.strictEqual(createdUser.email, email,
            `User email should match: ${email}`);
          assert.strictEqual(createdUser.name, name,
            `User name should match: ${name}`);
          assert.strictEqual(createdUser.phone, phone || null,
            `User phone should match: ${phone}`);
          assert.ok(createdUser.password, `User password should be stored`);
          assert.notStrictEqual(createdUser.password, password,
            `Password should be hashed, not stored in plain text`);
          assert.ok(createdUser.id, `User should have an ID`);
          assert.ok(createdUser.createdAt, `User should have createdAt timestamp`);
          assert.ok(createdUser.updatedAt, `User should have updatedAt timestamp`);
        }
      ),
      { numRuns: 10 }
    );

    // Cleanup
    await cleanupTestUsers(testEmails);
  });
});

// ============================================================================
// Property 6: Default role assignment
// Feature: medifind-fullstack-migration, Property 6: Default role assignment
// Validates: Requirements 3.6
// ============================================================================

describe('Property 6: Default role assignment', () => {
  test('should assign PATIENT role by default when no role specified', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (email, password, name) => {
          // Clean up before test
          await cleanupTestUsers([email]);
          
          testEmails.push(email);

          const request = createMockRequest({
            email,
            password,
            name,
            // No role specified
          });

          const response = await POST(request);
          const data = await response.json();

          assert.strictEqual(response.status, 201,
            `Registration should succeed`);
          assert.strictEqual(data.user.role, 'PATIENT',
            `Default role should be PATIENT when not specified`);

          // Verify in database
          const createdUser = await prisma.user.findUnique({
            where: { email },
          });

          assert.strictEqual(createdUser?.role, 'PATIENT',
            `User role in database should be PATIENT`);
        }
      ),
      { numRuns: 10 }
    );

    // Cleanup
    await cleanupTestUsers(testEmails);
  });

  test('should respect explicitly provided role', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.constantFrom('PATIENT', 'ADMIN'),
        async (email, password, name, role) => {
          // Clean up before test
          await cleanupTestUsers([email]);
          
          testEmails.push(email);

          const request = createMockRequest({
            email,
            password,
            name,
            role,
          });

          const response = await POST(request);
          const data = await response.json();

          assert.strictEqual(response.status, 201,
            `Registration should succeed with role ${role}`);
          assert.strictEqual(data.user.role, role,
            `User role should match provided role: ${role}`);

          // Verify in database
          const createdUser = await prisma.user.findUnique({
            where: { email },
          });

          assert.strictEqual(createdUser?.role, role,
            `User role in database should be ${role}`);
        }
      ),
      { numRuns: 10 }
    );

    // Cleanup
    await cleanupTestUsers(testEmails);
  });
});

// ============================================================================
// Property 7: Pharmacy registration atomicity
// Feature: medifind-fullstack-migration, Property 7: Pharmacy registration atomicity
// Validates: Requirements 3.7
// ============================================================================

describe('Property 7: Pharmacy registration atomicity', () => {
  test('should create both User and Pharmacy records atomically', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 15 }).filter(s => s.trim().length > 0),
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (email, password, userName, pharmacyName, address, phone, latitude, longitude, workingHours) => {
          // Clean up before test
          await cleanupTestUsers([email]);
          
          testEmails.push(email);

          const request = createMockRequest({
            email,
            password,
            name: userName,
            role: 'PHARMACY',
            pharmacyData: {
              name: pharmacyName,
              address,
              phone,
              latitude,
              longitude,
              workingHours,
            },
          });

          const response = await POST(request);
          const data = await response.json();

          assert.strictEqual(response.status, 201,
            `Pharmacy registration should succeed`);
          assert.strictEqual(data.success, true,
            `Response should have success: true`);
          assert.strictEqual(data.user.role, 'PHARMACY',
            `User role should be PHARMACY`);

          // Verify User was created
          const createdUser = await prisma.user.findUnique({
            where: { email },
            include: { pharmacy: true },
          });

          assert.ok(createdUser, `User should exist in database`);
          assert.strictEqual(createdUser.role, 'PHARMACY',
            `User role should be PHARMACY`);

          // Verify Pharmacy was created and linked
          assert.ok(createdUser.pharmacy, `Pharmacy should be created and linked to user`);
          assert.strictEqual(createdUser.pharmacy.name, pharmacyName,
            `Pharmacy name should match: ${pharmacyName}`);
          assert.strictEqual(createdUser.pharmacy.address, address,
            `Pharmacy address should match`);
          assert.strictEqual(createdUser.pharmacy.phone, phone,
            `Pharmacy phone should match`);
          assert.ok(Math.abs(createdUser.pharmacy.latitude - latitude) < 0.000001,
            `Pharmacy latitude should match (within tolerance)`);
          assert.ok(Math.abs(createdUser.pharmacy.longitude - longitude) < 0.000001,
            `Pharmacy longitude should match (within tolerance)`);
          assert.strictEqual(createdUser.pharmacy.workingHours, workingHours,
            `Pharmacy working hours should match`);
          assert.strictEqual(createdUser.pharmacy.userId, createdUser.id,
            `Pharmacy should be linked to user via userId`);
        }
      ),
      { numRuns: 10 }
    );

    // Cleanup
    await cleanupTestUsers(testEmails);
  });
});

// ============================================================================
// Property 8: Pharmacy approval default
// Feature: medifind-fullstack-migration, Property 8: Pharmacy approval default
// Validates: Requirements 3.8
// ============================================================================

describe('Property 8: Pharmacy approval default', () => {
  test('should set isApproved to false by default for new pharmacies', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 15 }).filter(s => s.trim().length > 0),
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (email, password, userName, pharmacyName, address, phone, latitude, longitude, workingHours) => {
          // Clean up before test
          await cleanupTestUsers([email]);
          
          testEmails.push(email);

          const request = createMockRequest({
            email,
            password,
            name: userName,
            role: 'PHARMACY',
            pharmacyData: {
              name: pharmacyName,
              address,
              phone,
              latitude,
              longitude,
              workingHours,
            },
          });

          const response = await POST(request);
          const data = await response.json();

          assert.strictEqual(response.status, 201,
            `Pharmacy registration should succeed`);

          // Verify pharmacy isApproved is false
          const createdUser = await prisma.user.findUnique({
            where: { email },
            include: { pharmacy: true },
          });

          assert.ok(createdUser?.pharmacy, `Pharmacy should exist`);
          assert.strictEqual(createdUser.pharmacy.isApproved, false,
            `Pharmacy isApproved should default to false`);

          // Verify response message mentions approval
          assert.ok(data.message.toLowerCase().includes('approval'),
            `Response message should mention approval: ${data.message}`);
        }
      ),
      { numRuns: 10 }
    );

    // Cleanup
    await cleanupTestUsers(testEmails);
  });
});

// ============================================================================
// Property 9: Sensitive data exclusion
// Feature: medifind-fullstack-migration, Property 9: Sensitive data exclusion
// Validates: Requirements 3.9, 4.8
// ============================================================================

describe('Property 9: Sensitive data exclusion', () => {
  test('should not return password in registration response', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.option(fc.constantFrom('PATIENT', 'ADMIN', 'PHARMACY'), { nil: undefined }),
        async (email, password, name, role) => {
          // Clean up before test
          await cleanupTestUsers([email]);
          
          testEmails.push(email);

          const requestBody: any = {
            email,
            password,
            name,
          };

          if (role) {
            requestBody.role = role;
          }

          // Add pharmacy data if role is PHARMACY
          if (role === 'PHARMACY') {
            requestBody.pharmacyData = {
              name: 'Test Pharmacy',
              address: '123 Test St',
              phone: '1234567890',
              latitude: 40.7128,
              longitude: -74.0060,
              workingHours: '9AM-5PM',
            };
          }

          const request = createMockRequest(requestBody);

          const response = await POST(request);
          const data = await response.json();

          assert.strictEqual(response.status, 201,
            `Registration should succeed`);
          assert.ok(data.user, `Response should include user object`);

          // Verify password is NOT in response
          assert.strictEqual(data.user.password, undefined,
            `Response should not include password field`);
          assert.strictEqual(JSON.stringify(data).includes(password), false,
            `Response should not contain plain text password anywhere`);

          // Verify other expected fields are present
          assert.ok(data.user.id, `Response should include user id`);
          assert.strictEqual(data.user.email, email,
            `Response should include email`);
          assert.strictEqual(data.user.name, name,
            `Response should include name`);
          assert.ok(data.user.role, `Response should include role`);
        }
      ),
      { numRuns: 10 }
    );

    // Cleanup
    await cleanupTestUsers(testEmails);
  });

  test('should not expose password hash in any response field', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (email, password, name) => {
          // Clean up before test
          await cleanupTestUsers([email]);
          
          testEmails.push(email);

          const request = createMockRequest({
            email,
            password,
            name,
          });

          const response = await POST(request);
          const data = await response.json();

          assert.strictEqual(response.status, 201,
            `Registration should succeed`);

          // Get the actual password hash from database
          const createdUser = await prisma.user.findUnique({
            where: { email },
          });

          assert.ok(createdUser?.password, `Password hash should exist in database`);

          // Verify password hash is NOT in response
          const responseString = JSON.stringify(data);
          assert.strictEqual(responseString.includes(createdUser.password), false,
            `Response should not contain password hash`);
        }
      ),
      { numRuns: 10 }
    );

    // Cleanup
    await cleanupTestUsers(testEmails);
  });
});
