import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateJWT } from '@/lib/auth';

const TEST_BASE_URL = 'http://localhost:3001';

describe('Inventory API Routes', () => {
  let pharmacyUserId: string;
  let pharmacyId: string;
  let pharmacyToken: string;
  let medicineId: string;
  let inventoryId: string;
  let patientToken: string;

  before(async () => {
    // Clean up any existing test data
    await prisma.inventory.deleteMany({
      where: {
        pharmacy: {
          user: {
            email: { in: ['test-pharmacy-inv@example.com', 'test-patient-inv@example.com'] }
          }
        }
      }
    });
    await prisma.pharmacy.deleteMany({
      where: {
        user: {
          email: 'test-pharmacy-inv@example.com'
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ['test-pharmacy-inv@example.com', 'test-patient-inv@example.com'] }
      }
    });
    await prisma.medicine.deleteMany({
      where: {
        name: 'Test Medicine for Inventory'
      }
    });

    // Create test pharmacy user
    const hashedPassword = await hashPassword('password123');
    const pharmacyUser = await prisma.user.create({
      data: {
        email: 'test-pharmacy-inv@example.com',
        password: hashedPassword,
        name: 'Test Pharmacy',
        role: 'PHARMACY',
      },
    });
    pharmacyUserId = pharmacyUser.id;

    // Create pharmacy
    const pharmacy = await prisma.pharmacy.create({
      data: {
        userId: pharmacyUserId,
        name: 'Test Pharmacy',
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

    // Create test patient user for authorization tests
    const patientUser = await prisma.user.create({
      data: {
        email: 'test-patient-inv@example.com',
        password: hashedPassword,
        name: 'Test Patient',
        role: 'PATIENT',
      },
    });
    patientToken = generateJWT(patientUser.id, 'PATIENT');

    // Create test medicine
    const medicine = await prisma.medicine.create({
      data: {
        name: 'Test Medicine for Inventory',
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
            email: { in: ['test-pharmacy-inv@example.com', 'test-patient-inv@example.com'] }
          }
        }
      }
    });
    await prisma.pharmacy.deleteMany({
      where: {
        user: {
          email: 'test-pharmacy-inv@example.com'
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ['test-pharmacy-inv@example.com', 'test-patient-inv@example.com'] }
      }
    });
    await prisma.medicine.deleteMany({
      where: {
        name: 'Test Medicine for Inventory'
      }
    });
  });

  describe('POST /api/inventory', () => {
    it('should create inventory item with IN_STOCK status for quantity > 10', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${pharmacyToken}`,
        },
        body: JSON.stringify({
          medicineId,
          quantity: 50,
        }),
      });

      assert.strictEqual(response.status, 201);
      const data = await response.json();
      assert.ok(data.inventory);
      assert.strictEqual(data.inventory.quantity, 50);
      assert.strictEqual(data.inventory.status, 'IN_STOCK');
      assert.strictEqual(data.inventory.medicine.name, 'Test Medicine for Inventory');
      
      inventoryId = data.inventory.id;
    });

    it('should reject inventory creation without authentication', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          medicineId,
          quantity: 10,
        }),
      });

      assert.strictEqual(response.status, 401);
    });

    it('should reject inventory creation for non-pharmacy user', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${patientToken}`,
        },
        body: JSON.stringify({
          medicineId,
          quantity: 10,
        }),
      });

      assert.strictEqual(response.status, 403);
    });

    it('should reject negative quantity', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${pharmacyToken}`,
        },
        body: JSON.stringify({
          medicineId,
          quantity: -5,
        }),
      });

      assert.strictEqual(response.status, 400);
    });
  });

  describe('GET /api/inventory', () => {
    it('should retrieve pharmacy inventory', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/inventory`, {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${pharmacyToken}`,
        },
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.ok(data.inventory);
      assert.ok(Array.isArray(data.inventory));
      assert.ok(data.inventory.length > 0);
      assert.ok(data.total > 0);
    });

    it('should filter inventory by stock status', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/inventory?status=IN_STOCK`, {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${pharmacyToken}`,
        },
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.ok(data.inventory);
      data.inventory.forEach((item: any) => {
        assert.strictEqual(item.status, 'IN_STOCK');
      });
    });

    it('should search inventory by medicine name', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/inventory?search=Test`, {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${pharmacyToken}`,
        },
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.ok(data.inventory);
    });

    it('should reject inventory retrieval without authentication', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/inventory`, {
        method: 'GET',
      });

      assert.strictEqual(response.status, 401);
    });
  });

  describe('PUT /api/inventory/[id]', () => {
    it('should update inventory quantity to LOW_STOCK (1-10)', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/inventory/${inventoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${pharmacyToken}`,
        },
        body: JSON.stringify({
          quantity: 5,
        }),
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.strictEqual(data.inventory.quantity, 5);
      assert.strictEqual(data.inventory.status, 'LOW_STOCK');
    });

    it('should update inventory quantity to OUT_OF_STOCK (0)', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/inventory/${inventoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${pharmacyToken}`,
        },
        body: JSON.stringify({
          quantity: 0,
        }),
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.strictEqual(data.inventory.quantity, 0);
      assert.strictEqual(data.inventory.status, 'OUT_OF_STOCK');
    });

    it('should update inventory quantity to IN_STOCK (>10)', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/inventory/${inventoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${pharmacyToken}`,
        },
        body: JSON.stringify({
          quantity: 100,
        }),
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.strictEqual(data.inventory.quantity, 100);
      assert.strictEqual(data.inventory.status, 'IN_STOCK');
    });

    it('should reject negative quantity update', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/inventory/${inventoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${pharmacyToken}`,
        },
        body: JSON.stringify({
          quantity: -10,
        }),
      });

      assert.strictEqual(response.status, 400);
    });

    it('should reject update without authentication', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/inventory/${inventoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: 50,
        }),
      });

      assert.strictEqual(response.status, 401);
    });
  });

  describe('DELETE /api/inventory/[id]', () => {
    it('should delete inventory item', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/inventory/${inventoryId}`, {
        method: 'DELETE',
        headers: {
          'Cookie': `auth-token=${pharmacyToken}`,
        },
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.strictEqual(data.success, true);

      // Verify deletion
      const verifyResponse = await fetch(`${TEST_BASE_URL}/api/inventory`, {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${pharmacyToken}`,
        },
      });
      const verifyData = await verifyResponse.json();
      const deletedItem = verifyData.inventory.find((item: any) => item.id === inventoryId);
      assert.strictEqual(deletedItem, undefined);
    });

    it('should reject deletion without authentication', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/inventory/fake-id`, {
        method: 'DELETE',
      });

      assert.strictEqual(response.status, 401);
    });

    it('should return 404 for non-existent inventory item', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/inventory/non-existent-id`, {
        method: 'DELETE',
        headers: {
          'Cookie': `auth-token=${pharmacyToken}`,
        },
      });

      assert.strictEqual(response.status, 404);
    });
  });
});
