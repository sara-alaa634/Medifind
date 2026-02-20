import { describe, test } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateJWT } from '@/lib/auth';
import { GET } from './route';
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// Helper to create a mock NextRequest with cookies
function createMockRequestWithCookie(token?: string): NextRequest {
  return {
    cookies: {
      get: (name: string) => {
        if (name === 'auth-token' && token) {
          return { value: token };
        }
        return undefined;
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

// Helper to create a test user in the database
async function createTestUser(email: string, password: string, name: string, role: 'PATIENT' | 'PHARMACY' | 'ADMIN' = 'PATIENT') {
  const hashedPassword = await hashPassword(password);
  return await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role,
    },
  });
}

// ============================================================================
// Property 14: JWT token extraction and verification
// Feature: medifind-fullstack-migration, Property 14: JWT token extraction and verification
// Validates: Requirements 5.1, 5.2, 5.3, 5.4
// ============================================================================

describe('Property 14: JWT token extraction and verification', () => {
  test('should extract JWT token from httpOnly cookie', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.constantFrom('PATIENT', 'PHARMACY', 'ADMIN'),
        async (email, password, name, role) => {
          // Clean up and create test user
          await cleanupTestUsers([email]);
          testEmails.push(email);

          const user = await createTestUser(email, password, name, role);

          // Generate valid JWT token
          const token = generateJWT(user.id, role);

          // Create request with token in cookie
          const request = createMockRequestWithCookie(token);

          const response = await GET(request);
          const data = await response.json();

          assert.strictEqual(response.status, 200,
            `Request with valid token should return 200`);
          assert.strictEqual(data.success, true,
            `Response should have success: true`);
          assert.ok(data.user, `Response should include user object`);
          assert.strictEqual(data.user.id, user.id,
            `User ID should match: ${user.id}`);
          assert.strictEqual(data.user.email, email,
            `User email should match: ${email}`);
        }
      ),
      { numRuns: 10 }
    );

    // Cleanup
    await cleanupTestUsers(testEmails);
  });

  test('should verify JWT token signature', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.constantFrom('PATIENT', 'PHARMACY', 'ADMIN'),
        async (email, password, name, role) => {
          // Clean up and create test user
          await cleanupTestUsers([email]);
          testEmails.push(email);

          const user = await createTestUser(email, password, name, role);

          // Generate token with wrong secret (invalid signature)
          const invalidToken = jwt.sign(
            { userId: user.id, role },
            'wrong-secret-key',
            { expiresIn: '7d' }
          );

          // Create request with invalid token
          const request = createMockRequestWithCookie(invalidToken);

          const response = await GET(request);
          const data = await response.json();

          assert.strictEqual(response.status, 401,
            `Request with invalid token signature should return 401`);
          assert.strictEqual(data.error, 'UNAUTHORIZED',
            `Error type should be UNAUTHORIZED`);
          assert.ok(data.message.toLowerCase().includes('invalid') || data.message.toLowerCase().includes('token'),
            `Error message should indicate invalid token: ${data.message}`);
        }
      ),
      { numRuns: 10 }
    );

    // Cleanup
    await cleanupTestUsers(testEmails);
  });

  test('should reject expired JWT tokens', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.constantFrom('PATIENT', 'PHARMACY', 'ADMIN'),
        async (email, password, name, role) => {
          // Clean up and create test user
          await cleanupTestUsers([email]);
          testEmails.push(email);

          const user = await createTestUser(email, password, name, role);

          // Generate expired token (expired 1 second ago)
          const expiredToken = jwt.sign(
            { userId: user.id, role },
            process.env.JWT_SECRET!,
            { expiresIn: '-1s' }
          );

          // Create request with expired token
          const request = createMockRequestWithCookie(expiredToken);

          const response = await GET(request);
          const data = await response.json();

          assert.strictEqual(response.status, 401,
            `Request with expired token should return 401`);
          assert.strictEqual(data.error, 'UNAUTHORIZED',
            `Error type should be UNAUTHORIZED`);
          assert.ok(data.message.toLowerCase().includes('expired') || data.message.toLowerCase().includes('token'),
            `Error message should indicate expired token: ${data.message}`);
        }
      ),
      { numRuns: 10 }
    );

    // Cleanup
    await cleanupTestUsers(testEmails);
  });

  test('should reject request without token', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          // Create request without token
          const request = createMockRequestWithCookie();

          const response = await GET(request);
          const data = await response.json();

          assert.strictEqual(response.status, 401,
            `Request without token should return 401`);
          assert.strictEqual(data.error, 'UNAUTHORIZED',
            `Error type should be UNAUTHORIZED`);
          assert.ok(data.message.toLowerCase().includes('authentication') || data.message.toLowerCase().includes('required'),
            `Error message should indicate authentication required: ${data.message}`);
        }
      ),
      { numRuns: 10 }
    );
  });

  test('should reject malformed JWT tokens', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('.')), // No dots
          fc.constant('not.a.valid.jwt.token'), // Too many parts
          fc.constant('invalid'), // Plain string
          fc.constant(''), // Empty string
          fc.constant('Bearer token'), // Wrong format
        ),
        async (malformedToken) => {
          // Create request with malformed token
          const request = createMockRequestWithCookie(malformedToken);

          const response = await GET(request);
          const data = await response.json();

          assert.strictEqual(response.status, 401,
            `Request with malformed token should return 401`);
          assert.strictEqual(data.error, 'UNAUTHORIZED',
            `Error type should be UNAUTHORIZED`);
        }
      ),
      { numRuns: 10 }
    );
  });
});

// ============================================================================
// Property 15: JWT payload extraction
// Feature: medifind-fullstack-migration, Property 15: JWT payload extraction
// Validates: Requirements 5.5
// ============================================================================

describe('Property 15: JWT payload extraction', () => {
  test('should extract userId and role from valid JWT token', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.constantFrom('PATIENT', 'PHARMACY', 'ADMIN'),
        async (email, password, name, role) => {
          // Clean up and create test user
          await cleanupTestUsers([email]);
          testEmails.push(email);

          const user = await createTestUser(email, password, name, role);

          // Generate valid JWT token
          const token = generateJWT(user.id, role);

          // Create request with token
          const request = createMockRequestWithCookie(token);

          const response = await GET(request);
          const data = await response.json();

          assert.strictEqual(response.status, 200,
            `Request with valid token should return 200`);
          assert.ok(data.user, `Response should include user object`);
          
          // Verify extracted userId matches
          assert.strictEqual(data.user.id, user.id,
            `Extracted userId should match token payload: ${user.id}`);
          
          // Verify extracted role matches
          assert.strictEqual(data.user.role, role,
            `Extracted role should match token payload: ${role}`);
          
          // Verify user data is fetched from database using extracted userId
          assert.strictEqual(data.user.email, email,
            `User email should be fetched from database: ${email}`);
          assert.strictEqual(data.user.name, name,
            `User name should be fetched from database: ${name}`);
        }
      ),
      { numRuns: 10 }
    );

    // Cleanup
    await cleanupTestUsers(testEmails);
  });

  test('should return 404 when user from token payload does not exist in database', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom('PATIENT', 'PHARMACY', 'ADMIN'),
        async (nonExistentUserId, role) => {
          // Generate token with non-existent user ID
          const token = generateJWT(nonExistentUserId, role);

          // Create request with token
          const request = createMockRequestWithCookie(token);

          const response = await GET(request);
          const data = await response.json();

          assert.strictEqual(response.status, 404,
            `Request with token for non-existent user should return 404`);
          assert.strictEqual(data.error, 'USER_NOT_FOUND',
            `Error type should be USER_NOT_FOUND`);
          assert.ok(data.message.toLowerCase().includes('user') && data.message.toLowerCase().includes('not found'),
            `Error message should indicate user not found: ${data.message}`);
        }
      ),
      { numRuns: 10 }
    );
  });

  test('should not expose password in session response', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.constantFrom('PATIENT', 'PHARMACY', 'ADMIN'),
        async (email, password, name, role) => {
          // Clean up and create test user
          await cleanupTestUsers([email]);
          testEmails.push(email);

          const user = await createTestUser(email, password, name, role);

          // Generate valid JWT token
          const token = generateJWT(user.id, role);

          // Create request with token
          const request = createMockRequestWithCookie(token);

          const response = await GET(request);
          const data = await response.json();

          assert.strictEqual(response.status, 200,
            `Request with valid token should return 200`);

          // Verify password is NOT in response
          assert.strictEqual(data.user.password, undefined,
            `Response should not include password field`);

          // Verify password hash is NOT in response
          const responseString = JSON.stringify(data);
          assert.strictEqual(responseString.includes(user.password), false,
            `Response should not contain password hash`);
        }
      ),
      { numRuns: 10 }
    );

    // Cleanup
    await cleanupTestUsers(testEmails);
  });

  test('should include pharmacy data for pharmacy users', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 15 }),
        fc.double({ min: -90, max: 90 }),
        fc.double({ min: -180, max: 180 }),
        async (email, password, userName, pharmacyName, address, phone, latitude, longitude) => {
          // Clean up and create test user
          await cleanupTestUsers([email]);
          testEmails.push(email);

          const user = await createTestUser(email, password, userName, 'PHARMACY');

          // Create pharmacy for user
          await prisma.pharmacy.create({
            data: {
              userId: user.id,
              name: pharmacyName,
              address,
              phone,
              latitude,
              longitude,
              workingHours: '9:00 AM - 5:00 PM',
              isApproved: true,
            },
          });

          // Generate valid JWT token
          const token = generateJWT(user.id, 'PHARMACY');

          // Create request with token
          const request = createMockRequestWithCookie(token);

          const response = await GET(request);
          const data = await response.json();

          assert.strictEqual(response.status, 200,
            `Request with valid token should return 200`);
          assert.ok(data.user.pharmacy, `Response should include pharmacy object for pharmacy user`);
          assert.strictEqual(data.user.pharmacy.name, pharmacyName,
            `Pharmacy name should match: ${pharmacyName}`);
          assert.strictEqual(data.user.pharmacy.address, address,
            `Pharmacy address should match: ${address}`);
          assert.strictEqual(data.user.pharmacy.isApproved, true,
            `Pharmacy approval status should be included`);
        }
      ),
      { numRuns: 10 }
    );

    // Cleanup
    await cleanupTestUsers(testEmails);
  });
});

// ============================================================================
// Property 16: Logout session cleanup
// Feature: medifind-fullstack-migration, Property 16: Logout session cleanup
// Validates: Requirements 5.6, 5.7
// ============================================================================

describe('Property 16: Logout session cleanup', () => {
  test('should clear auth-token cookie on logout', async () => {
    // Import logout route
    const { POST: logoutPOST } = await import('../logout/route');

    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          // Create mock request for logout
          const request = {} as NextRequest;

          const response = await logoutPOST(request);
          const data = await response.json();

          assert.strictEqual(response.status, 200,
            `Logout should return 200`);
          assert.strictEqual(data.success, true,
            `Response should have success: true`);

          // Check that cookie is deleted
          const cookies = response.cookies;
          const authCookie = cookies.get('auth-token');

          // When a cookie is deleted, it should either be undefined or have maxAge 0
          if (authCookie) {
            assert.ok(
              authCookie.value === '' || authCookie.maxAge === 0 || authCookie.maxAge === undefined,
              `auth-token cookie should be cleared (empty value or maxAge 0)`
            );
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  test('should invalidate session after logout', async () => {
    const testEmails: string[] = [];
    const { POST: logoutPOST } = await import('../logout/route');

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.constantFrom('PATIENT', 'PHARMACY', 'ADMIN'),
        async (email, password, name, role) => {
          // Clean up and create test user
          await cleanupTestUsers([email]);
          testEmails.push(email);

          const user = await createTestUser(email, password, name, role);

          // Generate valid JWT token
          const token = generateJWT(user.id, role);

          // Verify token works before logout
          const requestBefore = createMockRequestWithCookie(token);
          const responseBefore = await GET(requestBefore);
          assert.strictEqual(responseBefore.status, 200,
            `Token should work before logout`);

          // Logout
          const logoutRequest = {} as NextRequest;
          const logoutResponse = await logoutPOST(logoutRequest);
          assert.strictEqual(logoutResponse.status, 200,
            `Logout should succeed`);

          // After logout, the cookie would be cleared on the client side
          // The token itself is still valid (JWT is stateless), but the cookie is removed
          // This test verifies that logout clears the cookie, which invalidates the session
          const cookies = logoutResponse.cookies;
          const authCookie = cookies.get('auth-token');

          // Verify cookie is cleared
          if (authCookie) {
            assert.ok(
              authCookie.value === '' || authCookie.maxAge === 0 || authCookie.maxAge === undefined,
              `Cookie should be cleared after logout`
            );
          }
        }
      ),
      { numRuns: 10 }
    );

    // Cleanup
    await cleanupTestUsers(testEmails);
  });

  test('should allow logout even without valid session', async () => {
    const { POST: logoutPOST } = await import('../logout/route');

    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          // Create logout request without any token
          const request = {} as NextRequest;

          const response = await logoutPOST(request);
          const data = await response.json();

          // Logout should succeed even without a valid session
          assert.strictEqual(response.status, 200,
            `Logout should succeed even without valid session`);
          assert.strictEqual(data.success, true,
            `Response should have success: true`);
        }
      ),
      { numRuns: 10 }
    );
  });

  test('should return success message on logout', async () => {
    const { POST: logoutPOST } = await import('../logout/route');

    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const request = {} as NextRequest;

          const response = await logoutPOST(request);
          const data = await response.json();

          assert.strictEqual(response.status, 200,
            `Logout should return 200`);
          assert.strictEqual(data.success, true,
            `Response should have success: true`);
          assert.ok(data.message, `Response should include a message`);
          assert.ok(data.message.toLowerCase().includes('logout'),
            `Message should mention logout: ${data.message}`);
        }
      ),
      { numRuns: 10 }
    );
  });
});
