const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'pharmacy1@example.com' },
      include: { pharmacy: true }
    });
    
    if (user) {
      console.log('✓ User found:');
      console.log('  Email:', user.email);
      console.log('  Role:', user.role);
      console.log('  Pharmacy:', user.pharmacy ? user.pharmacy.name : 'None');
      console.log('  Pharmacy Approved:', user.pharmacy ? user.pharmacy.isApproved : 'N/A');
    } else {
      console.log('✗ User NOT found with email: pharmacy1@example.com');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
