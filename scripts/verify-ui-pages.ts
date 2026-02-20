/**
 * UI Pages Verification
 * Verifies all UI pages exist and are properly organized
 */

import * as fs from 'fs';
import * as path from 'path';

interface PageCheck {
  route: string;
  filePath: string;
  exists: boolean;
  role?: string;
  description: string;
}

const pages: PageCheck[] = [];

function checkPage(route: string, filePath: string, role: string | undefined, description: string) {
  const fullPath = path.join(process.cwd(), filePath);
  const exists = fs.existsSync(fullPath);
  pages.push({ route, filePath, exists, role, description });
  
  const icon = exists ? '✓' : '✗';
  const roleLabel = role ? `[${role}]` : '[PUBLIC]';
  console.log(`${icon} ${route.padEnd(35)} ${roleLabel.padEnd(12)} ${description}`);
  
  return exists;
}

console.log('🎨 UI Pages Verification\n');
console.log('='.repeat(80));
console.log('Checking all UI pages exist and are accessible...\n');

console.log('Public Pages:');
console.log('-'.repeat(80));
checkPage('/', 'app/page.tsx', undefined, 'Landing page');
checkPage('/login', 'app/(auth)/login/page.tsx', undefined, 'Login page');
checkPage('/register', 'app/(auth)/register/page.tsx', undefined, 'Registration page');

console.log('\nPublic Search (Guest Access):');
console.log('-'.repeat(80));
checkPage('/search', 'app/(public)/search/page.tsx', undefined, 'Medicine search (guest)');

console.log('\nPatient Pages:');
console.log('-'.repeat(80));
checkPage('/patient/search', 'app/(public)/search/page.tsx', 'PATIENT', 'Medicine search');
checkPage('/patient/reservations', 'app/(patient)/reservations/page.tsx', 'PATIENT', 'My reservations');
checkPage('/patient/profile', 'app/(patient)/profile/page.tsx', 'PATIENT', 'User profile');

console.log('\nPharmacy Pages:');
console.log('-'.repeat(80));
checkPage('/pharmacy/dashboard', 'app/(pharmacy)/dashboard/page.tsx', 'PHARMACY', 'Analytics dashboard');
checkPage('/pharmacy/inventory', 'app/(pharmacy)/inventory/page.tsx', 'PHARMACY', 'Inventory management');
checkPage('/pharmacy/reservations', 'app/(pharmacy)/reservations/page.tsx', 'PHARMACY', 'Reservation requests');
checkPage('/pharmacy/profile', 'app/(pharmacy)/profile/page.tsx', 'PHARMACY', 'Pharmacy profile');

console.log('\nAdmin Pages:');
console.log('-'.repeat(80));
checkPage('/admin/analytics', 'app/(admin)/analytics/page.tsx', 'ADMIN', 'System analytics');
checkPage('/admin/medicines', 'app/(admin)/medicines/page.tsx', 'ADMIN', 'Medicine management');
checkPage('/admin/pharmacies', 'app/(admin)/pharmacies/page.tsx', 'ADMIN', 'Pharmacy approvals');

console.log('\nLayouts:');
console.log('-'.repeat(80));
checkPage('Root Layout', 'app/layout.tsx', undefined, 'Root layout');
checkPage('Patient Layout', 'app/(patient)/layout.tsx', 'PATIENT', 'Patient navigation');
checkPage('Pharmacy Layout', 'app/(pharmacy)/layout.tsx', 'PHARMACY', 'Pharmacy navigation');
checkPage('Admin Layout', 'app/(admin)/layout.tsx', 'ADMIN', 'Admin navigation');
checkPage('Public Layout', 'app/(public)/layout.tsx', undefined, 'Public layout');

console.log('\n' + '='.repeat(80));

const total = pages.length;
const existing = pages.filter(p => p.exists).length;
const missing = pages.filter(p => !p.exists).length;

console.log(`\nTotal Pages: ${total}`);
console.log(`Existing: ${existing} ✓`);
console.log(`Missing: ${missing} ✗`);

if (missing > 0) {
  console.log('\n❌ Some pages are missing:');
  pages.filter(p => !p.exists).forEach(p => {
    console.log(`  - ${p.route}: ${p.filePath}`);
  });
  process.exit(1);
} else {
  console.log('\n✅ All UI pages exist and are properly organized!');
}
