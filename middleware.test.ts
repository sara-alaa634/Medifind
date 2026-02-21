import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import { NextRequest, NextResponse } from 'next/server';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

import { middleware } from './middleware';
import { generateJWT } from './lib/auth';
import { prisma } from './lib/prisma';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock NextRequest with the given path and optional auth token
 */
function createMockRequest(path: string, token?: string): NextRequest {
  const url = `http://localhost:3000${path}`;
  const request = new NextRequest(url);
  
  if (token) {
    // Set the auth-token cookie
    request.cookies.set('auth-token', token);
  }
  
  return request;
}

/**
 * Extract status code from NextResponse
 */
function getResponseStatus(response: NextResponse): number {
  return response.status;
}

/**
 * Extract JSON body from NextResponse
 */
async function getResponseJson(response: NextResponse): Promise<any> {
  try {
    const text = await response.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Check if response is a redirect
 */
function isRedirect(response: NextResponse): boolean {
  return response.status >= 300 && response.status < 400;
}

// ============================================================================
// Property 17: Role-based access control
// Feature: medifind-fullstack-migration, Property 17: Role-based access control
// Validates: Requirements 6.1, 6.2, 6.3, 6.8
// ============================================================================

describe('Property 17: Role-based access control', () => {
  test('should deny PATIENT access to PHARMACY routes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          '/pharmacy/dashboard',
          '/pharmacy/inventory',
          '/pharmacy/reservations',
          '/api/inventory',
          '/api/analytics/pharmacy'
        ),
        async (pharmacyRoute) => {
          // Create a PATIENT user token
          const patientToken = generateJWT('patient-user-id', 'PATIENT');
          
          // Attempt to access pharmacy route
          const request = createMockRequest(pharmacyRoute, patientToken);
          const response = await middleware(request);
          
          const status = getResponseStatus(response);
          
          // For page routes, middleware redirects to login (307)
          // For API routes, middleware returns 403
          if (pharmacyRoute.startsWith('/api/')) {
            assert.strictEqual(status, 403,
              `PATIENT should be denied access to ${pharmacyRoute} with 403 status`);
            
            const body = await getResponseJson(response);
            assert.strictEqual(body.error, 'FORBIDDEN',
              `Error should be FORBIDDEN for ${pharmacyRoute}`);
            assert.strictEqual(body.statusCode, 403,
              `Status code in body should be 403 for ${pharmacyRoute}`);
          } else {
            // Page routes redirect to login
            assert.ok(isRedirect(response),
              `PATIENT should be redirected from ${pharmacyRoute}`);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should deny PATIENT access to ADMIN routes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          '/analytics',
          '/medicines',
          '/pharmacies',
          '/api/analytics/admin'
        ),
        async (adminRoute) => {
          // Create a PATIENT user token
          const patientToken = generateJWT('patient-user-id', 'PATIENT');
          
          // Attempt to access admin route
          const request = createMockRequest(adminRoute, patientToken);
          const response = await middleware(request);
          
          const status = getResponseStatus(response);
          
          // For page routes, middleware redirects to login (307)
          // For API routes, middleware returns 403
          if (adminRoute.startsWith('/api/')) {
            assert.strictEqual(status, 403,
              `PATIENT should be denied access to ${adminRoute} with 403 status`);
            
            const body = await getResponseJson(response);
            assert.strictEqual(body.error, 'FORBIDDEN',
              `Error should be FORBIDDEN for ${adminRoute}`);
            assert.strictEqual(body.statusCode, 403,
              `Status code in body should be 403 for ${adminRoute}`);
          } else {
            // Page routes redirect to login
            assert.ok(isRedirect(response),
              `PATIENT should be redirected from ${adminRoute}`);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should deny PHARMACY access to ADMIN routes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          '/analytics',
          '/medicines',
          '/pharmacies',
          '/api/analytics/admin'
        ),
        async (adminRoute) => {
          // Create a PHARMACY user token
          const pharmacyToken = generateJWT('pharmacy-user-id', 'PHARMACY');
          
          // Attempt to access admin route
          const request = createMockRequest(adminRoute, pharmacyToken);
          const response = await middleware(request);
          
          const status = getResponseStatus(response);
          
          // For page routes, middleware redirects to login (307)
          // For API routes, middleware returns 403
          if (adminRoute.startsWith('/api/')) {
            assert.strictEqual(status, 403,
              `PHARMACY should be denied access to ${adminRoute} with 403 status`);
            
            const body = await getResponseJson(response);
            assert.strictEqual(body.error, 'FORBIDDEN',
              `Error should be FORBIDDEN for ${adminRoute}`);
            assert.strictEqual(body.statusCode, 403,
              `Status code in body should be 403 for ${adminRoute}`);
          } else {
            // Page routes redirect to login
            assert.ok(isRedirect(response),
              `PHARMACY should be redirected from ${adminRoute}`);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should allow access when role matches route requirement', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          { role: 'PATIENT' as const, route: '/h' },
          { role: 'PATIENT' as const, route: '/reservations' },
          { role: 'ADMIN' as const, route: '/analytics' },
          { role: 'ADMIN' as const, route: '/medicines' },
          { role: 'ADMIN' as const, route: '/api/analytics/admin' }
        ),
        async ({ role, route }) => {
          // Create a token with matching role
          const token = generateJWT(`${role.toLowerCase()}-user-id`, role);
          
          // Attempt to access route
          const request = createMockRequest(route, token);
          const response = await middleware(request);
          
          // Should allow access (200 or proceed to next middleware)
          const status = getResponseStatus(response);
          
          // Should not be 403 Forbidden
          assert.notStrictEqual(status, 403,
            `${role} should be allowed access to ${route}, but got 403`);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should return 403 with consistent error format for API routes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          { role: 'PATIENT' as const, route: '/api/inventory' },
          { role: 'PATIENT' as const, route: '/api/analytics/pharmacy' },
          { role: 'PATIENT' as const, route: '/api/analytics/admin' },
          { role: 'PHARMACY' as const, route: '/api/analytics/admin' }
        ),
        async ({ role, route }) => {
          // Create a token with wrong role
          const token = generateJWT(`${role.toLowerCase()}-user-id`, role);
          
          // Attempt to access route
          const request = createMockRequest(route, token);
          const response = await middleware(request);
          
          // Should return 403
          const status = getResponseStatus(response);
          assert.strictEqual(status, 403,
            `Should return 403 for ${role} accessing ${route}`);
          
          // Check error response format
          const body = await getResponseJson(response);
          assert.ok(body, 'Response should have JSON body');
          assert.strictEqual(body.error, 'FORBIDDEN',
            'Error field should be FORBIDDEN');
          assert.ok(body.message, 'Should have error message');
          assert.strictEqual(body.statusCode, 403,
            'Status code in body should be 403');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 18: Pharmacy approval enforcement
// Feature: medifind-fullstack-migration, Property 18: Pharmacy approval enforcement
// Validates: Requirements 6.4
// ============================================================================

describe('Property 18: Pharmacy approval enforcement', () => {
  // Clean up test data after each test
  afterEach(async () => {
    // Clean up test pharmacies and users
    await prisma.pharmacy.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test-pharmacy-'
          }
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test-pharmacy-'
        }
      }
    });
  });

  test('should deny unapproved pharmacy access to pharmacy routes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          '/pharmacy/dashboard',
          '/pharmacy/inventory',
          '/pharmacy/reservations',
          '/api/inventory',
          '/api/analytics/pharmacy'
        ),
        fc.integer({ min: 1, max: 1000000 }),
        async (pharmacyRoute, randomId) => {
          // Create an unapproved pharmacy user
          const email = `test-pharmacy-${randomId}-${Date.now()}@example.com`;
          const user = await prisma.user.create({
            data: {
              email,
              password: 'hashed-password',
              name: 'Test Pharmacy',
              role: 'PHARMACY',
            },
          });

          const pharmacy = await prisma.pharmacy.create({
            data: {
              userId: user.id,
              name: 'Test Pharmacy',
              address: '123 Test St',
              phone: '+1234567890',
              latitude: 40.7128,
              longitude: -74.0060,
              workingHours: '9AM-9PM',
              isApproved: false, // Not approved
            },
          });

          // Create token for unapproved pharmacy
          const token = generateJWT(user.id, 'PHARMACY');
          
          // Attempt to access pharmacy route
          const request = createMockRequest(pharmacyRoute, token);
          const response = await middleware(request);
          
          const status = getResponseStatus(response);
          
          // For page routes, middleware redirects to login (307)
          // For API routes, middleware returns 403
          if (pharmacyRoute.startsWith('/api/')) {
            assert.strictEqual(status, 403,
              `Unapproved pharmacy should be denied access to ${pharmacyRoute} with 403 status`);
            
            const body = await getResponseJson(response);
            assert.strictEqual(body.error, 'FORBIDDEN',
              `Error should be FORBIDDEN for ${pharmacyRoute}`);
            assert.ok(body.message.toLowerCase().includes('approved'),
              `Error message should mention approval status for ${pharmacyRoute}`);
            assert.strictEqual(body.statusCode, 403,
              `Status code in body should be 403 for ${pharmacyRoute}`);
          } else {
            // Page routes redirect to login
            assert.ok(isRedirect(response),
              `Unapproved pharmacy should be redirected from ${pharmacyRoute}`);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should allow approved pharmacy access to pharmacy routes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          '/pharmacy/dashboard',
          '/pharmacy/inventory',
          '/pharmacy/reservations',
          '/api/inventory',
          '/api/analytics/pharmacy'
        ),
        fc.integer({ min: 1, max: 1000000 }),
        async (pharmacyRoute, randomId) => {
          // Create an approved pharmacy user
          const email = `test-pharmacy-${randomId}-${Date.now()}@example.com`;
          const user = await prisma.user.create({
            data: {
              email,
              password: 'hashed-password',
              name: 'Test Pharmacy',
              role: 'PHARMACY',
            },
          });

          const pharmacy = await prisma.pharmacy.create({
            data: {
              userId: user.id,
              name: 'Test Pharmacy',
              address: '123 Test St',
              phone: '+1234567890',
              latitude: 40.7128,
              longitude: -74.0060,
              workingHours: '9AM-9PM',
              isApproved: true, // Approved
            },
          });

          // Create token for approved pharmacy
          const token = generateJWT(user.id, 'PHARMACY');
          
          // Attempt to access pharmacy route
          const request = createMockRequest(pharmacyRoute, token);
          const response = await middleware(request);
          
          // Should allow access (not 403)
          const status = getResponseStatus(response);
          assert.notStrictEqual(status, 403,
            `Approved pharmacy should be allowed access to ${pharmacyRoute}, but got 403`);
          
          // Should either proceed (200) or be handled by next middleware
          assert.ok(status === 200 || status < 300,
            `Approved pharmacy should get success status for ${pharmacyRoute}, got ${status}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should check approval status for every pharmacy request', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1000000 }),
        fc.boolean(),
        async (randomId, isApproved) => {
          // Create pharmacy with random approval status
          const email = `test-pharmacy-${randomId}-${Date.now()}@example.com`;
          const user = await prisma.user.create({
            data: {
              email,
              password: 'hashed-password',
              name: 'Test Pharmacy',
              role: 'PHARMACY',
            },
          });

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

          // Create token
          const token = generateJWT(user.id, 'PHARMACY');
          
          // Test access to pharmacy route (page route)
          const request = createMockRequest('/pharmacy/dashboard', token);
          const response = await middleware(request);
          
          const status = getResponseStatus(response);
          
          if (isApproved) {
            // Should allow access (not redirect)
            assert.notStrictEqual(status, 403,
              `Approved pharmacy should be allowed access`);
            assert.ok(!isRedirect(response) || status === 200,
              `Approved pharmacy should not be redirected to login`);
          } else {
            // Should deny access (redirect for page routes)
            assert.ok(isRedirect(response),
              `Unapproved pharmacy should be redirected`);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
