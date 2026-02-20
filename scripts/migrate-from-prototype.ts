import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// This script is designed to run once during initial deployment
// It imports medicines and pharmacies from the React prototype constants

interface PrototypeMedicine {
  id: string;
  name: string;
  activeIngredient: string;
  dosage: string;
  prescriptionRequired: boolean;
  category: string;
  priceRange: string;
}

interface PrototypePharmacy {
  id: string;
  name: string;
  address: string;
  phone: string;
  distance: number;
  rating: number;
  workingHours: string;
  isApproved: boolean;
}

// Parse the constants.tsx file to extract medicines and pharmacies
function parseConstantsFile(): { medicines: PrototypeMedicine[], pharmacies: PrototypePharmacy[] } {
  const constantsPath = path.join(process.cwd(), 'constants.tsx');
  
  if (!fs.existsSync(constantsPath)) {
    throw new Error(`Constants file not found at: ${constantsPath}`);
  }
  
  const fileContent = fs.readFileSync(constantsPath, 'utf-8');
  
  // Extract MOCK_MEDICINES array
  const medicinesMatch = fileContent.match(/export const MOCK_MEDICINES: Medicine\[\] = \[([\s\S]*?)\];/);
  if (!medicinesMatch) {
    throw new Error('Could not find MOCK_MEDICINES in constants.tsx');
  }
  
  // Extract MOCK_PHARMACIES array
  const pharmaciesMatch = fileContent.match(/export const MOCK_PHARMACIES: Pharmacy\[\] = \[([\s\S]*?)\];/);
  if (!pharmaciesMatch) {
    throw new Error('Could not find MOCK_PHARMACIES in constants.tsx');
  }
  
  // Parse medicines
  const medicinesStr = medicinesMatch[1];
  const medicineObjects = medicinesStr.match(/\{[^}]+\}/g) || [];
  const medicines: PrototypeMedicine[] = medicineObjects.map(obj => {
    const id = obj.match(/id: '([^']+)'/)?.[1] || '';
    const name = obj.match(/name: '([^']+)'/)?.[1] || '';
    const activeIngredient = obj.match(/activeIngredient: '([^']+)'/)?.[1] || '';
    const dosage = obj.match(/dosage: '([^']+)'/)?.[1] || '';
    const prescriptionRequired = obj.includes('prescriptionRequired: true');
    const category = obj.match(/category: '([^']+)'/)?.[1] || '';
    const priceRange = obj.match(/priceRange: '([^']+)'/)?.[1] || '';
    
    return { id, name, activeIngredient, dosage, prescriptionRequired, category, priceRange };
  });
  
  // Parse pharmacies
  const pharmaciesStr = pharmaciesMatch[1];
  const pharmacyObjects = pharmaciesStr.match(/\{[^}]+\}/g) || [];
  const pharmacies: PrototypePharmacy[] = pharmacyObjects.map(obj => {
    const id = obj.match(/id: '([^']+)'/)?.[1] || '';
    const name = obj.match(/name: '([^']+)'/)?.[1] || '';
    const address = obj.match(/address: '([^']+)'/)?.[1] || '';
    const phone = obj.match(/phone: '([^']+)'/)?.[1] || '';
    const distance = parseFloat(obj.match(/distance: ([\d.]+)/)?.[1] || '0');
    const rating = parseFloat(obj.match(/rating: ([\d.]+)/)?.[1] || '0');
    const workingHours = obj.match(/workingHours: '([^']+)'/)?.[1] || '';
    const isApproved = obj.includes('isApproved: true');
    
    return { id, name, address, phone, distance, rating, workingHours, isApproved };
  });
  
  return { medicines, pharmacies };
}

// Generate approximate coordinates based on distance (for demo purposes)
// In production, you would use actual geocoding
function generateCoordinates(distance: number, index: number): { latitude: number, longitude: number } {
  // Base coordinates (New York City as example)
  const baseLat = 40.7128;
  const baseLng = -74.0060;
  
  // Approximate: 1 degree latitude ≈ 69 miles, 1 degree longitude ≈ 54 miles at NYC latitude
  const latOffset = (distance / 69) * Math.cos(index * Math.PI / 4);
  const lngOffset = (distance / 54) * Math.sin(index * Math.PI / 4);
  
  return {
    latitude: baseLat + latOffset,
    longitude: baseLng + lngOffset,
  };
}

async function main() {
  console.log('🚀 Starting one-time migration from prototype...\n');
  
  // Check if migration has already been run
  const existingMedicines = await prisma.medicine.count();
  const existingPharmacies = await prisma.pharmacy.count();
  
  if (existingMedicines > 0 || existingPharmacies > 0) {
    console.log('⚠️  WARNING: Database already contains data!');
    console.log(`   Medicines: ${existingMedicines}`);
    console.log(`   Pharmacies: ${existingPharmacies}`);
    console.log('\nThis migration script is designed to run once on an empty database.');
    console.log('Aborting to prevent duplicate data.\n');
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise<string>((resolve) => {
      readline.question('Do you want to continue anyway? This will add duplicate data. (yes/no): ', resolve);
    });
    
    readline.close();
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('Migration aborted.');
      process.exit(0);
    }
  }
  
  // Parse constants file
  console.log('📖 Reading prototype constants...');
  const { medicines, pharmacies } = parseConstantsFile();
  console.log(`   Found ${medicines.length} medicines`);
  console.log(`   Found ${pharmacies.length} pharmacies\n`);
  
  // Import medicines
  console.log('💊 Importing medicines...');
  const medicineIdMap = new Map<string, string>(); // old ID -> new ID
  
  for (const medicine of medicines) {
    const created = await prisma.medicine.create({
      data: {
        name: medicine.name,
        activeIngredient: medicine.activeIngredient,
        dosage: medicine.dosage,
        prescriptionRequired: medicine.prescriptionRequired,
        category: medicine.category,
        priceRange: medicine.priceRange,
      },
    });
    
    medicineIdMap.set(medicine.id, created.id);
    console.log(`   ✓ Imported: ${created.name}`);
  }
  console.log(`✅ ${medicines.length} medicines imported\n`);
  
  // Import pharmacies
  console.log('🏥 Importing pharmacies...');
  const bcrypt = require('bcrypt');
  const defaultPassword = await bcrypt.hash('pharmacy123', 10);
  
  for (let i = 0; i < pharmacies.length; i++) {
    const pharmacy = pharmacies[i];
    const coords = generateCoordinates(pharmacy.distance, i);
    
    // Create user for pharmacy
    const user = await prisma.user.create({
      data: {
        email: `${pharmacy.name.toLowerCase().replace(/\s+/g, '')}@migrated.com`,
        password: defaultPassword,
        name: `${pharmacy.name} Manager`,
        phone: pharmacy.phone,
        role: 'PHARMACY',
      },
    });
    
    // Create pharmacy
    const created = await prisma.pharmacy.create({
      data: {
        userId: user.id,
        name: pharmacy.name,
        address: pharmacy.address,
        phone: pharmacy.phone,
        latitude: coords.latitude,
        longitude: coords.longitude,
        rating: pharmacy.rating,
        workingHours: pharmacy.workingHours,
        isApproved: pharmacy.isApproved,
      },
    });
    
    console.log(`   ✓ Imported: ${created.name} (${user.email})`);
  }
  console.log(`✅ ${pharmacies.length} pharmacies imported\n`);
  
  console.log('🎉 Migration completed successfully!');
  console.log('\n📝 Notes:');
  console.log('   - All pharmacy accounts use password: pharmacy123');
  console.log('   - Email format: [pharmacyname]@migrated.com');
  console.log('   - Coordinates are approximated based on distance');
  console.log('   - All pharmacy information has been preserved');
  console.log('   - All medicine information has been preserved\n');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
