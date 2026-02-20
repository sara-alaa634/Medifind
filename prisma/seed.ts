import { PrismaClient, UserRole, StockStatus, ReservationStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Environment check - refuse to run in production
function checkEnvironment() {
  const nodeEnv = process.env.NODE_ENV;
  
  if (nodeEnv === 'production') {
    console.error('❌ ERROR: Seed script cannot run in production environment!');
    console.error('This script is for development and testing only.');
    process.exit(1);
  }
  
  console.log(`✅ Environment check passed: ${nodeEnv || 'development'}`);
}

// Sample medicines from prototype constants
const MEDICINES = [
  { name: 'Panadol Advance', activeIngredient: 'Paracetamol', dosage: '500mg', prescriptionRequired: false, category: 'Painkillers', priceRange: '$2 - $5' },
  { name: 'Amoxicillin', activeIngredient: 'Amoxicillin', dosage: '250mg', prescriptionRequired: true, category: 'Antibiotics', priceRange: '$10 - $15' },
  { name: 'Augmentin', activeIngredient: 'Amoxicillin/Clavulanate', dosage: '625mg', prescriptionRequired: true, category: 'Antibiotics', priceRange: '$15 - $25' },
  { name: 'Centrum Adults', activeIngredient: 'Multivitamins', dosage: '1 Tablet', prescriptionRequired: false, category: 'Vitamins', priceRange: '$20 - $30' },
  { name: 'Lipitor', activeIngredient: 'Atorvastatin', dosage: '20mg', prescriptionRequired: true, category: 'Chronic', priceRange: '$40 - $60' },
  { name: 'Zyrtec', activeIngredient: 'Cetirizine', dosage: '10mg', prescriptionRequired: false, category: 'Allergy', priceRange: '$8 - $12' },
];

// Sample pharmacies from prototype constants
const PHARMACIES = [
  { name: 'HealthFirst Pharmacy', address: '123 Main St, Downtown', phone: '+1 555 1010', latitude: 40.7128, longitude: -74.0060, rating: 4.8, workingHours: '24/7' },
  { name: 'CureAll Drugs', address: '456 West Side Ave', phone: '+1 555 2020', latitude: 40.7580, longitude: -73.9855, rating: 4.5, workingHours: '08:00 - 22:00' },
  { name: 'Wellness Point', address: '789 Oak Lane', phone: '+1 555 3030', latitude: 40.7489, longitude: -73.9680, rating: 4.2, workingHours: '09:00 - 21:00' },
  { name: 'QuickMeds Express', address: '101 Pine Plaza', phone: '+1 555 4040', latitude: 40.7614, longitude: -73.9776, rating: 4.9, workingHours: '24/7' },
];

async function main() {
  console.log('🌱 Starting database seeding...\n');
  
  // Check environment
  checkEnvironment();
  
  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await prisma.notification.deleteMany();
  await prisma.directCall.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.pharmacy.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Existing data cleared\n');
  
  // Seed medicines
  console.log('💊 Seeding medicines...');
  const createdMedicines = [];
  for (const medicine of MEDICINES) {
    const created = await prisma.medicine.create({
      data: medicine,
    });
    createdMedicines.push(created);
    console.log(`  ✓ Created: ${created.name}`);
  }
  console.log(`✅ ${createdMedicines.length} medicines seeded\n`);
  
  // Seed sample users for each role
  console.log('👥 Seeding sample users...');
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  // Admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@medifind.com',
      password: hashedPassword,
      name: 'Admin User',
      phone: '+1 555 0000',
      role: UserRole.ADMIN,
    },
  });
  console.log(`  ✓ Created admin: ${adminUser.email}`);
  
  // Patient user
  const patientUser = await prisma.user.create({
    data: {
      email: 'patient@example.com',
      password: hashedPassword,
      name: 'John Patient',
      phone: '+1 555 1111',
      role: UserRole.PATIENT,
    },
  });
  console.log(`  ✓ Created patient: ${patientUser.email}`);
  
  console.log('✅ Sample users seeded\n');
  
  // Seed pharmacies with auto-approval
  console.log('🏥 Seeding pharmacies...');
  const createdPharmacies = [];
  for (let i = 0; i < PHARMACIES.length; i++) {
    const pharmacyData = PHARMACIES[i];
    
    // Create pharmacy user
    const pharmacyUser = await prisma.user.create({
      data: {
        email: `pharmacy${i + 1}@example.com`,
        password: hashedPassword,
        name: `${pharmacyData.name} Manager`,
        phone: pharmacyData.phone,
        role: UserRole.PHARMACY,
      },
    });
    
    // Create pharmacy with auto-approval
    const pharmacy = await prisma.pharmacy.create({
      data: {
        userId: pharmacyUser.id,
        name: pharmacyData.name,
        address: pharmacyData.address,
        phone: pharmacyData.phone,
        latitude: pharmacyData.latitude,
        longitude: pharmacyData.longitude,
        rating: pharmacyData.rating,
        workingHours: pharmacyData.workingHours,
        isApproved: true, // Auto-approve for development
      },
    });
    
    createdPharmacies.push(pharmacy);
    console.log(`  ✓ Created pharmacy: ${pharmacy.name} (approved)`);
  }
  console.log(`✅ ${createdPharmacies.length} pharmacies seeded\n`);
  
  // Seed sample inventory
  console.log('📦 Seeding inventory...');
  let inventoryCount = 0;
  for (const pharmacy of createdPharmacies) {
    // Each pharmacy gets a random selection of medicines
    const medicineCount = Math.floor(Math.random() * 3) + 3; // 3-5 medicines per pharmacy
    const selectedMedicines = createdMedicines
      .sort(() => Math.random() - 0.5)
      .slice(0, medicineCount);
    
    for (const medicine of selectedMedicines) {
      const quantity = Math.floor(Math.random() * 50) + 5; // 5-54 units
      let status: StockStatus;
      
      if (quantity === 0) {
        status = StockStatus.OUT_OF_STOCK;
      } else if (quantity <= 10) {
        status = StockStatus.LOW_STOCK;
      } else {
        status = StockStatus.IN_STOCK;
      }
      
      await prisma.inventory.create({
        data: {
          pharmacyId: pharmacy.id,
          medicineId: medicine.id,
          quantity,
          status,
        },
      });
      
      inventoryCount++;
    }
  }
  console.log(`✅ ${inventoryCount} inventory items seeded\n`);
  
  // Seed sample reservations
  console.log('📋 Seeding reservations...');
  const reservationStatuses = [
    ReservationStatus.PENDING,
    ReservationStatus.ACCEPTED,
    ReservationStatus.REJECTED,
    ReservationStatus.CANCELLED,
  ];
  
  // Create 5 sample reservations
  for (let i = 0; i < 5; i++) {
    const randomPharmacy = createdPharmacies[Math.floor(Math.random() * createdPharmacies.length)];
    const randomMedicine = createdMedicines[Math.floor(Math.random() * createdMedicines.length)];
    const randomStatus = reservationStatuses[Math.floor(Math.random() * reservationStatuses.length)];
    
    const reservationData: any = {
      userId: patientUser.id,
      pharmacyId: randomPharmacy.id,
      medicineId: randomMedicine.id,
      quantity: Math.floor(Math.random() * 3) + 1, // 1-3 units
      status: randomStatus,
      requestTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last 7 days
    };
    
    // Add timestamps based on status
    if (randomStatus === ReservationStatus.ACCEPTED) {
      reservationData.acceptedTime = new Date(reservationData.requestTime.getTime() + 3 * 60 * 1000); // 3 minutes after request
      reservationData.note = 'Your medicine is ready for pickup within 30 minutes.';
    } else if (randomStatus === ReservationStatus.REJECTED) {
      reservationData.rejectedTime = new Date(reservationData.requestTime.getTime() + 2 * 60 * 1000); // 2 minutes after request
      reservationData.note = 'Sorry, this medicine is currently out of stock.';
    }
    
    await prisma.reservation.create({
      data: reservationData,
    });
  }
  console.log(`✅ 5 sample reservations seeded\n`);
  
  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📝 Sample credentials:');
  console.log('  Admin:    admin@medifind.com / password123');
  console.log('  Patient:  patient@example.com / password123');
  console.log('  Pharmacy: pharmacy1@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
