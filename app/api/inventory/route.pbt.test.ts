import { describe, test, before, after } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { generateJWT } from '@/lib/jwt';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { PUT, DELETE } from './[id]/route';

/**
 * Property-Based Tests for Inventory Management
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10
 */

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

describe('Inventory Management Property-Based Tests', () => {
  let pharmacyUserId: string;
  let pharmacyId: string;
  let pharmacyToken: string;
  let medicineId: string;

  before(async () => {
    // Clean up any existing test data
    await prisma.inventory.deleteMany({
      where: {
        pharmacy: {
          user: {
            email: 'test-pharmacy-pbt@example.com'
          }
        }
      }
    });
    await prisma.pharmacy.deleteMany({
      where: {
        user: {
          email: 'test-pharmacy-pbt@example.com'
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: 'test-pharmacy-pbt@example.com'
      }
    });
    await prisma.medicine.deleteMany({
      where: {
        name: 'Test Medicine PBT'
      }
    });

    // Create test pharmacy user
    const hashedPassword = await hashPassword('password123');
    const pharmacyUser = await prisma.user.create({
      data: {
        email: 'test-pharmacy-pbt@example.com',
        password: hashedPassword,
        name: 'Test Pharmacy PBT',
        role: 'PHARMACY',
      },
    });
    pharmacyUserId = pharmacyUser.id;

    // Create pharmacy
    const pharmacy = await prisma.pharmacy.create({
      data: {
        userId: pharmacyUserId,
        name: 'Test Pharmacy PBT',
        address: '123 Test St',
        phone: '555-0100',
        latitude: 40.7128,
        longitude: -74.0060,
        workingHours: '9AM-5PM',
        isApproved: true,
      },
    });
    pharmacyId = pharmacy.id;

    // Generate pharmacy token
    pharmacyToken = generateJWT(pharmacyUserId, 'PHARMACY');

    // Create test medicine
    const medicine = await prisma.medicine.create({
      data: {
        name: 'Test Medicine PBT',
        activeIngredient: 'Test Ingredient',
        dosage: '500mg',
        prescriptionRequired: false,
        category: 'Pain Relief',
        priceRange: '$10-$20',
      },
    });
    medicineId = medicine.id;
  });

  after(async () => {
    // Clean up test data
    await prisma.inventory.deleteMany({
      where: {
        pharmacy: {
          user: {
            email: 'test-pharmacy-pbt@example.com'
          }
        }
      }
    });
    await prisma.pharmacy.deleteMany({
      where: {
        user: {
          email: 'test-pharmacy-pbt@example.com'
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: 'test-pharmacy-pbt@example.com'
      }
    });
    await prisma.medicine.deleteMany({
      where: {
        name: 'Test Medicine PBT'
      }
    });
  });

  /**
   * Property 28: Inventory creation and deletion
   * Validates: Requirements 9.1, 9.7
   * 
   * For any valid quantity, creating an inventory item and then deleting it
   * should result in the item no longer existing in the database.
   */
  describe('Property 28: Inventory creation and deletion', () => {
    test('created inventory can be deleted and no longer exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1000 }),
          async (quantity) => {
            // Clean up any existing inventory for this medicine
            const existing = await prisma.inventory.findUnique({
              where: {
                pharmacyId_medicineId: {
                  pharmacyId,
                  medicineId,
                },
              },
            });

            if (existing) {
              await prisma.inventory.delete({
                where: { id: existing.id },
              });
            }

            // Create inventory item using route handler
            const createRequest = createMockRequestWithBody(
              `http://localhost:3001/api/inventory`,
              { medicineId, quantity },
              { cookies: { 'auth-token': pharmacyToken } }
            );

            const createResponse = await POST(createRequest);
            const createStatus = createResponse.status;

            if (createStatus !== 201) {
              // Skip if creation failed
              return true;
            }

            const createData = await createResponse.json();
            const inventoryId = createData.inventory.id;

            // Delete inventory item using route handler
            const deleteRequest = createMockRequest(
              `http://localhost:3001/api/inventory/${inventoryId}`,
              { cookies: { 'auth-token': pharmacyToken } }
            );

            const deleteResponse = await DELETE(deleteRequest, { params: { id: inventoryId } });
            assert.strictEqual(deleteResponse.status, 200);

            // Verify item no longer exists in database
            const deletedItem = await prisma.inventory.findUnique({
              where: { id: inventoryId },
            });
            assert.strictEqual(deletedItem, null);

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 29: Inventory quantity validation
   * Validates: Requirements 9.2
   * 
   * The system must validate that quantity is non-negative.
   * Any negative quantity should be rejected with a 400 error.
   */
  describe('Property 29: Inventory quantity validation', () => {
    test('should reject negative quantities', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: -1000, max: -1 }),
          async (negativeQuantity) => {
            const request = createMockRequestWithBody(
              `http://localhost:3001/api/inventory`,
              { medicineId, quantity: negativeQuantity },
              { cookies: { 'auth-token': pharmacyToken } }
            );

            const response = await POST(request);
            assert.strictEqual(response.status, 400);
            
            const data = await response.json();
            assert.strictEqual(data.error, 'VALIDATION_ERROR');

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should accept non-negative quantities', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1000 }),
          async (validQuantity) => {
            // Clean up any existing inventory for this medicine
            const existing = await prisma.inventory.findUnique({
              where: {
                pharmacyId_medicineId: {
                  pharmacyId,
                  medicineId,
                },
              },
            });

            if (existing) {
              await prisma.inventory.delete({
                where: { id: existing.id },
              });
            }

            const request = createMockRequestWithBody(
              `http://localhost:3001/api/inventory`,
              { medicineId, quantity: validQuantity },
              { cookies: { 'auth-token': pharmacyToken } }
            );

            const response = await POST(request);
            assert.strictEqual(response.status, 201);
            
            const data = await response.json();
            assert.strictEqual(data.inventory.quantity, validQuantity);

            // Clean up
            await prisma.inventory.delete({
              where: { id: data.inventory.id },
            });

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property 30: Stock status calculation
   * Validates: Requirements 9.3, 9.4, 9.5
   * 
   * Stock status must be calculated correctly based on quantity:
   * - quantity = 0 → OUT_OF_STOCK
   * - 1 <= quantity <= 10 → LOW_STOCK
   * - quantity > 10 → IN_STOCK
   */
  describe('Property 30: Stock status calculation', () => {
    test('quantity 0 should result in OUT_OF_STOCK', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(0),
          async (quantity) => {
            // Clean up any existing inventory
            const existing = await prisma.inventory.findUnique({
              where: {
                pharmacyId_medicineId: {
                  pharmacyId,
                  medicineId,
                },
              },
            });

            if (existing) {
              await prisma.inventory.delete({
                where: { id: existing.id },
              });
            }

            const request = createMockRequestWithBody(
              `http://localhost:3001/api/inventory`,
              { medicineId, quantity },
              { cookies: { 'auth-token': pharmacyToken } }
            );

            const response = await POST(request);
            assert.strictEqual(response.status, 201);
            
            const data = await response.json();
            assert.strictEqual(data.inventory.status, 'OUT_OF_STOCK');

            // Clean up
            await prisma.inventory.delete({
              where: { id: data.inventory.id },
            });

            return true;
          }
        ),
        { numRuns: 5 }
      );
    });

    test('quantity 1-10 should result in LOW_STOCK', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (quantity) => {
            // Clean up any existing inventory
            const existing = await prisma.inventory.findUnique({
              where: {
                pharmacyId_medicineId: {
                  pharmacyId,
                  medicineId,
                },
              },
            });

            if (existing) {
              await prisma.inventory.delete({
                where: { id: existing.id },
              });
            }

            const request = createMockRequestWithBody(
              `http://localhost:3001/api/inventory`,
              { medicineId, quantity },
              { cookies: { 'auth-token': pharmacyToken } }
            );

            const response = await POST(request);
            assert.strictEqual(response.status, 201);
            
            const data = await response.json();
            assert.strictEqual(data.inventory.status, 'LOW_STOCK');

            // Clean up
            await prisma.inventory.delete({
              where: { id: data.inventory.id },
            });

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    test('quantity > 10 should result in IN_STOCK', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 11, max: 1000 }),
          async (quantity) => {
            // Clean up any existing inventory
            const existing = await prisma.inventory.findUnique({
              where: {
                pharmacyId_medicineId: {
                  pharmacyId,
                  medicineId,
                },
              },
            });

            if (existing) {
              await prisma.inventory.delete({
                where: { id: existing.id },
              });
            }

            const request = createMockRequestWithBody(
              `http://localhost:3001/api/inventory`,
              { medicineId, quantity },
              { cookies: { 'auth-token': pharmacyToken } }
            );

            const response = await POST(request);
            assert.strictEqual(response.status, 201);
            
            const data = await response.json();
            assert.strictEqual(data.inventory.status, 'IN_STOCK');

            // Clean up
            await prisma.inventory.delete({
              where: { id: data.inventory.id },
            });

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    test('status updates correctly when quantity changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.integer({ min: 0, max: 1000 }),
            fc.integer({ min: 0, max: 1000 })
          ),
          async ([initialQuantity, newQuantity]) => {
            // Clean up any existing inventory
            const existing = await prisma.inventory.findUnique({
              where: {
                pharmacyId_medicineId: {
                  pharmacyId,
                  medicineId,
                },
              },
            });

            if (existing) {
              await prisma.inventory.delete({
                where: { id: existing.id },
              });
            }

            // Create inventory with initial quantity
            const createRequest = createMockRequestWithBody(
              `http://localhost:3001/api/inventory`,
              { medicineId, quantity: initialQuantity },
              { cookies: { 'auth-token': pharmacyToken } }
            );

            const createResponse = await POST(createRequest);
            const createData = await createResponse.json();
            const inventoryId = createData.inventory.id;

            // Update quantity
            const updateRequest = createMockRequestWithBody(
              `http://localhost:3001/api/inventory/${inventoryId}`,
              { quantity: newQuantity },
              { cookies: { 'auth-token': pharmacyToken } }
            );

            const updateResponse = await PUT(updateRequest, { params: { id: inventoryId } });
            assert.strictEqual(updateResponse.status, 200);
            
            const updateData = await updateResponse.json();

            // Verify status matches quantity
            const expectedStatus = 
              newQuantity === 0 ? 'OUT_OF_STOCK' :
              newQuantity <= 10 ? 'LOW_STOCK' :
              'IN_STOCK';

            assert.strictEqual(updateData.inventory.status, expectedStatus);
            assert.strictEqual(updateData.inventory.quantity, newQuantity);

            // Clean up
            await prisma.inventory.delete({
              where: { id: inventoryId },
            });

            return true;
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Property 31: Inventory timestamp tracking
   * Validates: Requirements 9.8
   * 
   * The lastUpdated timestamp must be updated whenever inventory changes.
   */
  describe('Property 31: Inventory timestamp tracking', () => {
    test('lastUpdated is set on creation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1000 }),
          async (quantity) => {
            // Clean up any existing inventory
            const existing = await prisma.inventory.findUnique({
              where: {
                pharmacyId_medicineId: {
                  pharmacyId,
                  medicineId,
                },
              },
            });

            if (existing) {
              await prisma.inventory.delete({
                where: { id: existing.id },
              });
            }

            const beforeCreate = new Date();

            const request = createMockRequestWithBody(
              `http://localhost:3001/api/inventory`,
              { medicineId, quantity },
              { cookies: { 'auth-token': pharmacyToken } }
            );

            const response = await POST(request);
            const afterCreate = new Date();
            const data = await response.json();
            const lastUpdated = new Date(data.inventory.lastUpdated);

            // Verify lastUpdated is within reasonable time range
            assert.ok(lastUpdated >= beforeCreate);
            assert.ok(lastUpdated <= afterCreate);

            // Clean up
            await prisma.inventory.delete({
              where: { id: data.inventory.id },
            });

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    test('lastUpdated is updated on quantity change', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.integer({ min: 0, max: 1000 }),
            fc.integer({ min: 0, max: 1000 })
          ),
          async ([initialQuantity, newQuantity]) => {
            // Clean up any existing inventory
            const existing = await prisma.inventory.findUnique({
              where: {
                pharmacyId_medicineId: {
                  pharmacyId,
                  medicineId,
                },
              },
            });

            if (existing) {
              await prisma.inventory.delete({
                where: { id: existing.id },
              });
            }

            // Create inventory
            const createRequest = createMockRequestWithBody(
              `http://localhost:3001/api/inventory`,
              { medicineId, quantity: initialQuantity },
              { cookies: { 'auth-token': pharmacyToken } }
            );

            const createResponse = await POST(createRequest);
            const createData = await createResponse.json();
            const inventoryId = createData.inventory.id;
            const initialLastUpdated = new Date(createData.inventory.lastUpdated);

            // Wait a bit to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 10));

            const beforeUpdate = new Date();

            // Update quantity
            const updateRequest = createMockRequestWithBody(
              `http://localhost:3001/api/inventory/${inventoryId}`,
              { quantity: newQuantity },
              { cookies: { 'auth-token': pharmacyToken } }
            );

            const updateResponse = await PUT(updateRequest, { params: { id: inventoryId } });
            const afterUpdate = new Date();
            const updateData = await updateResponse.json();
            const newLastUpdated = new Date(updateData.inventory.lastUpdated);

            // Verify lastUpdated was updated
            assert.ok(newLastUpdated >= beforeUpdate);
            assert.ok(newLastUpdated <= afterUpdate);
            assert.ok(newLastUpdated >= initialLastUpdated);

            // Clean up
            await prisma.inventory.delete({
              where: { id: inventoryId },
            });

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 32: Inventory query operations
   * Validates: Requirements 9.6, 9.9, 9.10
   * 
   * Filtering and searching inventory must return correct results.
   */
  describe('Property 32: Inventory query operations', () => {
    test('filtering by status returns only items with that status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'),
          async (status) => {
            const request = createMockRequest(
              `http://localhost:3001/api/inventory?status=${status}`,
              { cookies: { 'auth-token': pharmacyToken } }
            );

            const response = await GET(request);
            assert.strictEqual(response.status, 200);
            
            const data = await response.json();

            // All returned items must have the requested status
            data.inventory.forEach((item: any) => {
              assert.strictEqual(item.status, status);
            });

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    test('pagination returns correct number of items', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 5 }),
          async (limit, page) => {
            const request = createMockRequest(
              `http://localhost:3001/api/inventory?limit=${limit}&page=${page}`,
              { cookies: { 'auth-token': pharmacyToken } }
            );

            const response = await GET(request);
            assert.strictEqual(response.status, 200);
            
            const data = await response.json();

            // Returned items should not exceed limit
            assert.ok(data.inventory.length <= limit);
            assert.strictEqual(data.limit, limit);
            assert.strictEqual(data.page, page);

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    test('search returns items matching medicine name', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('Test', 'Medicine', 'PBT', 'NonExistent'),
          async (searchTerm) => {
            const request = createMockRequest(
              `http://localhost:3001/api/inventory?search=${encodeURIComponent(searchTerm)}`,
              { cookies: { 'auth-token': pharmacyToken } }
            );

            const response = await GET(request);
            assert.strictEqual(response.status, 200);
            
            const data = await response.json();

            // All returned items must have medicine name containing search term (case-insensitive)
            data.inventory.forEach((item: any) => {
              assert.ok(
                item.medicine.name.toLowerCase().includes(searchTerm.toLowerCase()),
                `Medicine name "${item.medicine.name}" should contain "${searchTerm}"`
              );
            });

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
