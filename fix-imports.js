const fs = require('fs');
const path = require('path');

const files = [
  'app/(pharmacy)/reservations/page.tsx',
  'app/(pharmacy)/inventory/page.tsx',
  'app/(patient)/reservations/page.tsx',
  'app/(admin)/analytics/page.tsx',
  'app/(admin)/medicines/page.tsx',
  'app/(admin)/pharmacies/page.tsx',
  'components/ProfileForm.tsx',
];

files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    
    // Remove the import line
    content = content.replace(/import\s+\{[^}]*fetch(Pharmacy|Admin|Patient)[^}]*\}\s+from\s+['"]@\/lib\/fetchWithAuth['"];?\s*/g, '');
    
    // Replace fetchPharmacy, fetchAdmin, fetchPatient with fetch
    content = content.replace(/fetchPharmacy\(/g, 'fetch(');
    content = content.replace(/fetchAdmin\(/g, 'fetch(');
    content = content.replace(/fetchPatient\(/g, 'fetch(');
    
    // Add credentials: 'include' to fetch calls that don't have it
    // This is a simple regex - might need manual review
    content = content.replace(/fetch\(([^,)]+)\s*,\s*\{/g, (match, url) => {
      return `fetch(${url}, {\n        credentials: 'include',`;
    });
    
    // For fetch calls without options
    content = content.replace(/fetch\(([^)]+)\);/g, (match, url) => {
      if (url.includes('{')) return match; // Already has options
      return `fetch(${url}, { credentials: 'include' });`;
    });
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✓ Fixed ${file}`);
  } catch (err) {
    console.error(`✗ Error fixing ${file}:`, err.message);
  }
});

console.log('\nDone! Please review the changes.');
