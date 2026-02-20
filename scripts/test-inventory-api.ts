import { prisma } from '@/lib/prisma';
import { hashPassword, generateJWT } from '@/lib/auth';

const TEST_BASE_URL = 'http://localhost:3001';

async function testInventoryAPI() {
  console.log('🧪 Testing Inventory API...\n');

  let pharmacyUserId: string;
  let pharmacyToken: string;
  let medicineId: string;
  let inventoryId: string;

  try {
    // Clean up any existing test data
    console.log('🧹 Cleaning up test data...');
    await prisma.inventory.deleteMany({
      where: {
        pharmacy: {
          user: {
            email: 'test-pharmacy-inv@example.com'
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
        email: 'test-pharmacy-inv@example.com'
      }
    });
    await prisma.medicine.deleteMany({
      where: {
        name: 'Test Medicine for Inventory'
      }
    });

    // Create test pharmacy user
    console.log('👤 Creating test pharmacy user...');
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

    // Generate pharmacy token
    pharmacyToken = generateJWT(pharmacyUserId, 'PHARMACY');

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

    console.log('✅ Test data created\n');

    // Test 1: Create inventory item with IN_STOCK status
    console.log('📝 Test 1: POST /api/inventory (quantity > 10)');
    const createResponse = await fetch(`${TEST_BASE_URL}/api/inventory`, {
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

    if (createResponse.status === 201) {
      const data = await createResponse.json();
      inventoryId = data.inventory.id;
      console.log(`✅ Created inventory item: ${data.inventory.medicine.name}`);
      console.log(`   Quantity: ${data.inventory.quantity}, Status: ${data.inventory.status}`);
      if (data.inventory.status !== 'IN_STOCK') {
        console.log(`❌ Expected status IN_STOCK, got ${data.inventory.status}`);
      }
    } else {
      console.log(`❌ Failed with status ${createResponse.status}`);
      const error = await createResponse.json();
      console.log(`   Error: ${JSON.stringify(error)}`);
    }

    // Test 2: Get inventory
    console.log('\n📝 Test 2: GET /api/inventory');
    const getResponse = await fetch(`${TEST_BASE_URL}/api/inventory`, {
      method: 'GET',
      headers: {
        'Cookie': `auth-token=${pharmacyToken}`,
      },
    });

    if (getResponse.status === 200) {
      const data = await getResponse.json();
      console.log(`✅ Retrieved ${data.inventory.length} inventory items`);
      console.log(`   Total: ${data.total}, Page: ${data.page}`);
    } else {
      console.log(`❌ Failed with status ${getResponse.status}`);
    }

    // Test 3: Update to LOW_STOCK
    console.log('\n📝 Test 3: PUT /api/inventory/[id] (quantity 1-10)');
    const updateLowResponse = await fetch(`${TEST_BASE_URL}/api/inventory/${inventoryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${pharmacyToken}`,
      },
      body: JSON.stringify({
        quantity: 5,
      }),
    });

    if (updateLowResponse.status === 200) {
      const data = await updateLowResponse.json();
      console.log(`✅ Updated quantity to ${data.inventory.quantity}`);
      console.log(`   Status: ${data.inventory.status}`);
      if (data.inventory.status !== 'LOW_STOCK') {
        console.log(`❌ Expected status LOW_STOCK, got ${data.inventory.status}`);
      }
    } else {
      console.log(`❌ Failed with status ${updateLowResponse.status}`);
    }

    // Test 4: Update to OUT_OF_STOCK
    console.log('\n📝 Test 4: PUT /api/inventory/[id] (quantity 0)');
    const updateOutResponse = await fetch(`${TEST_BASE_URL}/api/inventory/${inventoryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${pharmacyToken}`,
      },
      body: JSON.stringify({
        quantity: 0,
      }),
    });

    if (updateOutResponse.status === 200) {
      const data = await updateOutResponse.json();
      console.log(`✅ Updated quantity to ${data.inventory.quantity}`);
      console.log(`   Status: ${data.inventory.status}`);
      if (data.inventory.status !== 'OUT_OF_STOCK') {
        console.log(`❌ Expected status OUT_OF_STOCK, got ${data.inventory.status}`);
      }
    } else {
      console.log(`❌ Failed with status ${updateOutResponse.status}`);
    }

    // Test 5: Update back to IN_STOCK
    console.log('\n📝 Test 5: PUT /api/inventory/[id] (quantity > 10)');
    const updateInResponse = await fetch(`${TEST_BASE_URL}/api/inventory/${inventoryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${pharmacyToken}`,
      },
      body: JSON.stringify({
        quantity: 100,
      }),
    });

    if (updateInResponse.status === 200) {
      const data = await updateInResponse.json();
      console.log(`✅ Updated quantity to ${data.inventory.quantity}`);
      console.log(`   Status: ${data.inventory.status}`);
      if (data.inventory.status !== 'IN_STOCK') {
        console.log(`❌ Expected status IN_STOCK, got ${data.inventory.status}`);
      }
    } else {
      console.log(`❌ Failed with status ${updateInResponse.status}`);
    }

    // Test 6: Filter by status
    console.log('\n📝 Test 6: GET /api/inventory?status=IN_STOCK');
    const filterResponse = await fetch(`${TEST_BASE_URL}/api/inventory?status=IN_STOCK`, {
      method: 'GET',
      headers: {
        'Cookie': `auth-token=${pharmacyToken}`,
      },
    });

    if (filterResponse.status === 200) {
      const data = await filterResponse.json();
      console.log(`✅ Retrieved ${data.inventory.length} IN_STOCK items`);
      const allInStock = data.inventory.every((item: any) => item.status === 'IN_STOCK');
      if (!allInStock) {
        console.log(`❌ Some items are not IN_STOCK`);
      }
    } else {
      console.log(`❌ Failed with status ${filterResponse.status}`);
    }

    // Test 7: Search by medicine name
    console.log('\n📝 Test 7: GET /api/inventory?search=Test');
    const searchResponse = await fetch(`${TEST_BASE_URL}/api/inventory?search=Test`, {
      method: 'GET',
      headers: {
        'Cookie': `auth-token=${pharmacyToken}`,
      },
    });

    if (searchResponse.status === 200) {
      const data = await searchResponse.json();
      console.log(`✅ Search returned ${data.inventory.length} items`);
    } else {
      console.log(`❌ Failed with status ${searchResponse.status}`);
    }

    // Test 8: Delete inventory item
    console.log('\n📝 Test 8: DELETE /api/inventory/[id]');
    const deleteResponse = await fetch(`${TEST_BASE_URL}/api/inventory/${inventoryId}`, {
      method: 'DELETE',
      headers: {
        'Cookie': `auth-token=${pharmacyToken}`,
      },
    });

    if (deleteResponse.status === 200) {
      const data = await deleteResponse.json();
      console.log(`✅ Deleted inventory item: ${data.message}`);
    } else {
      console.log(`❌ Failed with status ${deleteResponse.status}`);
    }

    // Test 9: Verify deletion
    console.log('\n📝 Test 9: Verify deletion');
    const verifyResponse = await fetch(`${TEST_BASE_URL}/api/inventory`, {
      method: 'GET',
      headers: {
        'Cookie': `auth-token=${pharmacyToken}`,
      },
    });

    if (verifyResponse.status === 200) {
      const data = await verifyResponse.json();
      const deletedItem = data.inventory.find((item: any) => item.id === inventoryId);
      if (!deletedItem) {
        console.log(`✅ Item successfully deleted from inventory`);
      } else {
        console.log(`❌ Item still exists in inventory`);
      }
    }

    console.log('\n✅ All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up test data...');
    await prisma.inventory.deleteMany({
      where: {
        pharmacy: {
          user: {
            email: 'test-pharmacy-inv@example.com'
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
        email: 'test-pharmacy-inv@example.com'
      }
    });
    await prisma.medicine.deleteMany({
      where: {
        name: 'Test Medicine for Inventory'
      }
    });
    console.log('✅ Cleanup complete');
  }
}

testInventoryAPI();
