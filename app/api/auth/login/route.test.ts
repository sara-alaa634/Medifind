import { describe, test } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
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
// Property 10: Authentication credential validation
// Feature: medifind-fullstack-migration, Property 10: Authentication credential validation
// Validates: Requirements 4.3, 4.4
// ============================================================================

describe('Property 10: Authentication credential validation', () => {
  test('should reject login with non-existent email', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        async (email, password) => {
          // Ensure user doesn't exist
          await cleanupTestUsers([email]);
          testEmails.push(email);

          const request = createMockRequest({
            email,
            password,
          });

          const response = await POST(request);
          const data = await response.json();

          assert.strictEqual(response.status, 401,
            `Login with non-existent email ${email} should return 401`);
          assert.strictEqual(data.error, 'AUTHENTICATION_ERROR',
            `Error type should be AUTHENTICATION_ERROR`);
          assert.ok(data.message.toLowerCase().includes('invalid'),
            `Error message should indicate invalid credentials: ${data.message}`);
        }
      ),
      { numRuns: 10 }
    );

    // Cleanup
    await cleanupTestUsers(testEmails);
  });

  test('should reject login with incorrect password', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (email, correctPassword, wrongPassword, name) => {
          // Skip if passwords are the same
          if (correctPassword === wrongPassword) {
            return;
          }

          // Clean up and create test user
          await cleanupTestUsers([email]);
          testEmails.push(email);

          await createTestUser(email, correctPassword, name);

          // Try to login with wrong password
          const request = createMockRequest({
            email,
            password: wrongPassword,
          });

          const response = await POST(request);
          const data = await response.json();

          assert.strictEqual(response.status, 401,
            `Login with incorrect password should return 401`);
          assert.strictEqual(data.error, 'AUTHENTICATION_ERROR',
            `Error type should be AUTHENTICATION_ERROR`);
          assert.ok(data.message.toLowerCase().includes('invalid'),
            `Error message should indicate invalid credentials: ${data.message}`);
        }
      ),
      { numRuns: 10 }
    );

    // Cleanup
    await cleanupTestUsers(testEmails);
  });

  test('should reject login with invalid email format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.string().filter(s => !s.includes('@')), // No @ symbol
          fc.string().map(s => s + '@'), // Ends with @
          fc.string().map(s => '@' + s), // Starts with @
          fc.constant(''), // Empty string
          fc.constant('not-an-email'), // Plain string
        ),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        async (invalidEmail, password) => {
          const request = createMockRequest({
            email: invalidEmail,
            password,
          });

          const response = await POST(request);
          const data = await response.json();

          assert.strictEqual(response.status, 400,
            `Login with invalid email format should return 400`);
          assert.strictEqual(data.error, 'VALIDATION_ERROR',
            `Error type should be VALIDATION_ERROR`);
        }
      ),
      { numRuns: 10 }
    );
  });

  test('should reject login with empty password', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        async (email) => {
          const request = createMockRequest({
            email,
            password: '',
          });

          const response = await POST(request);
          const data = await response.json();

          assert.strictEqual(response.status, 400,
            `Login with empty password should return 400`);
          assert.strictEqual(data.error, 'VALIDATION_ERROR',
            `Error type should be VALIDATION_ERROR`);
        }
      ),
      { numRuns: 10 }
    );
  });
});

// ============================================================================
// Property 11: Password verification correctness
// Feature: medifind-fullstack-migration, Property 11: Password verification correctness
// Validates: Requirements 4.5
// ============================================================================

describe('Property 11: Password verification correctness', () => {
  test('should successfully authenticate with correct credentials', async () => {
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

          await createTestUser(email, password, name, role);

          // Try to login with correct credentials
          const request = createMockRequest({
            email,
            password,
          });

          const response = await POST(request);
          const data = await response.json();

          assert.strictEqual(response.status, 200,
            `Login with correct credentials should return 200`);
          assert.strictEqual(data.success, true,
            `Response should have success: true`);
          assert.ok(data.user, `Response should include user object`);
          assert.strictEqual(data.user.email, email,
            `User email should match: ${email}`);
          assert.strictEqual(data.user.name, name,
            `User name should match: ${name}`);
          assert.strictEqual(data.user.role, role,
            `User role should match: ${role}`);
          assert.ok(data.token, `Response should include JWT token`);
        }
      ),
      { numRuns: 10 }
    );

    // Cleanup
    await cleanupTestUsers(testEmails);
  });

  test('should verify password against bcrypt hash correctly', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (email, password, name) => {
          // Clean up and create test user
          await cleanupTestUsers([email]);
          testEmails.push(email);

          const user = await createTestUser(email, password, name);

          // Verify password is hashed in database
          assert.notStrictEqual(user.password, password,
            `Password should be hashed in database, not stored as plain text`);
          assert.ok(user.password.startsWith('$2'),
            `Password should be a bcrypt hash (starts with $2)`);

          // Login should still work with plain text password
          const request = createMockRequest({
            email,
            password,
          });

          const response = await POST(request);
          const data = await response.json();

          assert.strictEqual(response.status, 200,
            `Login should succeed with correct password despite hash in database`);
          assert.strictEqual(data.success, true,
            `Response should have success: true`);
        }
      ),
      { numRuns: 10 }
    );

    // Cleanup
    await cleanupTestUsers(testEmails);
  });
});

// ============================================================================
// Property 13: JWT cookie security
// Feature: medifind-fullstack-migration, Property 13: JWT cookie security
// Validates: Requirements 4.7
// ============================================================================

describe('Property 13: JWT cookie security', () => {
  test('should set httpOnly cookie on successful login', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (email, password, name) => {
          // Clean up and create test user
          await cleanupTestUsers([email]);
          testEmails.push(email);

          await createTestUser(email, password, name);

          // Login
          const request = createMockRequest({
            email,
            password,
          });

          const response = await POST(request);
          const data = await response.json();

          assert.strictEqual(response.status, 200,
            `Login should succeed`);

          // Check that cookie is set
          const cookies = response.cookies;
          const authCookie = cookies.get('auth-token');

          assert.ok(authCookie, `auth-token cookie should be set`);
          assert.ok(authCookie.value, `auth-token cookie should have a value`);
          assert.strictEqual(authCookie.httpOnly, true,
            `auth-token cookie should be httpOnly`);
          assert.strictEqual(authCookie.path, '/',
            `auth-token cookie should have path /`);
          assert.ok(authCookie.maxAge && authCookie.maxAge > 0,
            `auth-token cookie should have maxAge set`);
          
          // Verify maxAge is approximately 7 days (604800 seconds)
          const sevenDaysInSeconds = 60 * 60 * 24 * 7;
          assert.ok(authCookie.maxAge && Math.abs(authCookie.maxAge - sevenDaysInSeconds) < 10,
            `auth-token cookie maxAge should be approximately 7 days (${sevenDaysInSeconds}s), got ${authCookie.maxAge}s`);
        }
      ),
      { numRuns: 10 }
    );

    // Cleanup
    await cleanupTestUsers(testEmails);
  });

  test('should set secure flag in production environment', async () => {
    const testEmails: string[] = [];
    const originalNodeEnv = process.env.NODE_ENV;

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.constantFrom('production', 'development', 'test'),
        async (email, password, name, nodeEnv) => {
          // Clean up and create test user
          await cleanupTestUsers([email]);
          testEmails.push(email);

          await createTestUser(email, password, name);

          // Set NODE_ENV
          process.env.NODE_ENV = nodeEnv;

          // Login
          const request = createMockRequest({
            email,
            password,
          });

          const response = await POST(request);

          assert.strictEqual(response.status, 200,
            `Login should succeed`);

          // Check cookie security flag
          const cookies = response.cookies;
          const authCookie = cookies.get('auth-token');

          assert.ok(authCookie, `auth-token cookie should be set`);

          if (nodeEnv === 'production') {
            assert.strictEqual(authCookie.secure, true,
              `auth-token cookie should be secure in production`);
          } else {
            assert.strictEqual(authCookie.secure, false,
              `auth-token cookie should not be secure in ${nodeEnv}`);
          }
        }
      ),
      { numRuns: 10 }
    );

    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;

    // Cleanup
    await cleanupTestUsers(testEmails);
  });

  test('should set sameSite attribute to lax', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (email, password, name) => {
          // Clean up and create test user
          await cleanupTestUsers([email]);
          testEmails.push(email);

          await createTestUser(email, password, name);

          // Login
          const request = createMockRequest({
            email,
            password,
          });

          const response = await POST(request);

          assert.strictEqual(response.status, 200,
            `Login should succeed`);

          // Check cookie sameSite attribute
          const cookies = response.cookies;
          const authCookie = cookies.get('auth-token');

          assert.ok(authCookie, `auth-token cookie should be set`);
          assert.strictEqual(authCookie.sameSite, 'lax',
            `auth-token cookie should have sameSite=lax`);
        }
      ),
      { numRuns: 10 }
    );

    // Cleanup
    await cleanupTestUsers(testEmails);
  });

  test('should not expose password in login response', async () => {
    const testEmails: string[] = [];

    await fc.assert(
      fc.asyncProperty(
        generateValidEmail(),
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.trim().length >= 8),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (email, password, name) => {
          // Clean up and create test user
          await cleanupTestUsers([email]);
          testEmails.push(email);

          const user = await createTestUser(email, password, name);

          // Login
          const request = createMockRequest({
            email,
            password,
          });

          const response = await POST(request);
          const data = await response.json();

          assert.strictEqual(response.status, 200,
            `Login should succeed`);

          // Verify password is NOT in response
          assert.strictEqual(data.user.password, undefined,
            `Response should not include password field`);

          // Verify password hash is NOT in response
          const responseString = JSON.stringify(data);
          assert.strictEqual(responseString.includes(user.password), false,
            `Response should not contain password hash`);
          assert.strictEqual(responseString.includes(password), false,
            `Response should not contain plain text password`);
        }
      ),
      { numRuns: 10 }
    );

    // Cleanup
    await cleanupTestUsers(testEmails);
  });
});
