const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInventory() {
  try {
    // Get pharmacy1
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { 
        user: { email: 'pharmacy1@example.com' }
      },
      include: {
        user: true
      }
    });
    
    if (!pharmacy) {
      console.log('✗ Pharmacy not found');
      return;
    }
    
    console.log('✓ Pharmacy found:', pharmacy.name);
    console.log('  ID:', pharmacy.id);
    console.log('  Approved:', pharmacy.isApproved);
    
    // Get inventory for this pharmacy
    const inventory = await prisma.inventory.findMany({
      where: { pharmacyId: pharmacy.id },
      include: {
        medicine: true
      }
    });
    
    console.log('\n📦 Inventory items:', inventory.length);
    
    if (inventory.length > 0) {
      console.log('\nFirst 5 items:');
      inventory.slice(0, 5).forEach(item => {
        console.log(`  - ${item.medicine.name} (${item.medicine.activeIngredient})`);
        console.log(`    Quantity: ${item.quantity}, Status: ${item.status}`);
      });
    }
    
    // Test a specific medicine search
    const testMedicine = inventory[0]?.medicine;
    if (testMedicine) {
      console.log(`\n🔍 Testing search for: ${testMedicine.name}`);
      
      const searchResult = await prisma.inventory.findMany({
        where: {
          medicineId: testMedicine.id,
          pharmacy: {
            isApproved: true
          }
        },
        include: {
          medicine: true,
          pharmacy: true
        }
      });
      
      console.log(`  Found ${searchResult.length} pharmacies with this medicine`);
      searchResult.forEach(result => {
        console.log(`    - ${result.pharmacy.name}: ${result.quantity} units (${result.status})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkInventory();
