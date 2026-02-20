import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateJWT } from '@/lib/auth';

describe('Medicine API Routes', () => {
  let adminUser: any;
  let adminToken: string;
  let testMedicine: any;

  before(async () => {
    // Create admin user for testing
    adminUser = await prisma.user.create({
      data: {
        email: `admin-test-${Date.now()}@example.com`,
        password: await hashPassword('password123'),
        name: 'Admin Test User',
        role: 'ADMIN',
      },
    });
    
    adminToken = generateJWT(adminUser.id, 'ADMIN');
  });

  after(async () => {
    // Cleanup: Delete test data
    if (testMedicine) {
      await prisma.medicine.delete({ where: { id: testMedicine.id } }).catch(() => {});
    }
    if (adminUser) {
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    }
  });

  describe('POST /api/medicines', () => {
    it('should create a new medicine with valid admin credentials', async () => {
      const medicineData = {
        name: 'Test Medicine',
        activeIngredient: 'Test Ingredient',
        dosage: '500mg',
        prescriptionRequired: false,
        category: 'Painkillers',
        priceRange: '$5 - $10',
      };

      const response = await fetch('http://localhost:3000/api/medicines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${adminToken}`,
        },
        body: JSON.stringify(medicineData),
      });

      const data = await response.json();
      
      assert.strictEqual(response.status, 201);
      assert.strictEqual(data.success, true);
      assert.ok(data.medicine);
      assert.strictEqual(data.medicine.name, medicineData.name);
      
      testMedicine = data.medicine;
    });

    it('should reject creation without authentication', async () => {
      const medicineData = {
        name: 'Test Medicine 2',
        activeIngredient: 'Test Ingredient 2',
        dosage: '250mg',
        prescriptionRequired: true,
        category: 'Antibiotics',
        priceRange: '$10 - $15',
      };

      const response = await fetch('http://localhost:3000/api/medicines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(medicineData),
      });

      const data = await response.json();
      
      assert.strictEqual(response.status, 401);
      assert.strictEqual(data.error, 'UNAUTHORIZED');
    });

    it('should reject creation with invalid data', async () => {
      const invalidData = {
        name: '', // Empty name should fail validation
        activeIngredient: 'Test Ingredient',
        dosage: '500mg',
        prescriptionRequired: false,
        category: 'Painkillers',
        priceRange: '$5 - $10',
      };

      const response = await fetch('http://localhost:3000/api/medicines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${adminToken}`,
        },
        body: JSON.stringify(invalidData),
      });

      const data = await response.json();
      
      assert.strictEqual(response.status, 400);
      assert.strictEqual(data.error, 'VALIDATION_ERROR');
    });
  });

  describe('GET /api/medicines', () => {
    it('should return medicines without authentication (public endpoint)', async () => {
      const response = await fetch('http://localhost:3000/api/medicines');
      const data = await response.json();
      
      assert.strictEqual(response.status, 200);
      assert.ok(Array.isArray(data.medicines));
      assert.ok(data.pagination);
    });

    it('should support pagination', async () => {
      const response = await fetch('http://localhost:3000/api/medicines?page=1&limit=5');
      const data = await response.json();
      
      assert.strictEqual(response.status, 200);
      assert.ok(data.pagination);
      assert.strictEqual(data.pagination.page, 1);
      assert.strictEqual(data.pagination.limit, 5);
    });

    it('should support search by name', async () => {
      if (!testMedicine) {
        // Skip if no test medicine created
        return;
      }

      const response = await fetch(`http://localhost:3000/api/medicines?search=${encodeURIComponent(testMedicine.name)}`);
      const data = await response.json();
      
      assert.strictEqual(response.status, 200);
      assert.ok(data.medicines.some((m: any) => m.id === testMedicine.id));
    });

    it('should support filtering by category', async () => {
      const response = await fetch('http://localhost:3000/api/medicines?category=Painkillers');
      const data = await response.json();
      
      assert.strictEqual(response.status, 200);
      assert.ok(data.medicines.every((m: any) => m.category === 'Painkillers'));
    });
  });

  describe('GET /api/medicines/[id]', () => {
    it('should return medicine details with availability', async () => {
      if (!testMedicine) {
        // Skip if no test medicine created
        return;
      }

      const response = await fetch(`http://localhost:3000/api/medicines/${testMedicine.id}`);
      const data = await response.json();
      
      assert.strictEqual(response.status, 200);
      assert.ok(data.medicine);
      assert.strictEqual(data.medicine.id, testMedicine.id);
      assert.ok(Array.isArray(data.availability));
    });

    it('should return 404 for non-existent medicine', async () => {
      const response = await fetch('http://localhost:3000/api/medicines/non-existent-id');
      const data = await response.json();
      
      assert.strictEqual(response.status, 404);
      assert.strictEqual(data.error, 'NOT_FOUND');
    });
  });

  describe('PUT /api/medicines/[id]', () => {
    it('should update medicine with valid admin credentials', async () => {
      if (!testMedicine) {
        // Skip if no test medicine created
        return;
      }

      const updateData = {
        name: 'Updated Test Medicine',
        priceRange: '$8 - $12',
      };

      const response = await fetch(`http://localhost:3000/api/medicines/${testMedicine.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth-token=${adminToken}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.medicine.name, updateData.name);
      assert.strictEqual(data.medicine.priceRange, updateData.priceRange);
    });

    it('should reject update without authentication', async () => {
      if (!testMedicine) {
        return;
      }

      const response = await fetch(`http://localhost:3000/api/medicines/${testMedicine.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Should Fail' }),
      });

      const data = await response.json();
      
      assert.strictEqual(response.status, 401);
      assert.strictEqual(data.error, 'UNAUTHORIZED');
    });
  });

  describe('DELETE /api/medicines/[id]', () => {
    it('should delete medicine without active reservations', async () => {
      if (!testMedicine) {
        return;
      }

      const response = await fetch(`http://localhost:3000/api/medicines/${testMedicine.id}`, {
        method: 'DELETE',
        headers: {
          'Cookie': `auth-token=${adminToken}`,
        },
      });

      const data = await response.json();
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.success, true);
      
      // Clear testMedicine so cleanup doesn't try to delete it again
      testMedicine = null;
    });

    it('should reject deletion without authentication', async () => {
      // Create a temporary medicine for this test
      const tempMedicine = await prisma.medicine.create({
        data: {
          name: 'Temp Medicine',
          activeIngredient: 'Temp Ingredient',
          dosage: '100mg',
          prescriptionRequired: false,
          category: 'Test',
          priceRange: '$1 - $2',
        },
      });

      const response = await fetch(`http://localhost:3000/api/medicines/${tempMedicine.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      assert.strictEqual(response.status, 401);
      assert.strictEqual(data.error, 'UNAUTHORIZED');
      
      // Cleanup
      await prisma.medicine.delete({ where: { id: tempMedicine.id } });
    });
  });
});
