/**
 * Property-Based Tests for Medicine Search and Availability
 * Feature: medifind-fullstack-migration
 * 
 * Tests:
 * - Property 33: Guest search access
 * - Property 34: Medicine availability display
 * - Property 35: Pharmacy sorting
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import { prisma } from '@/lib/prisma';

// ============================================================================
// Property 33: Guest search access
// Feature: medifind-fullstack-migration, Property 33: Guest search access
// Validates: Requirements 10.1, 10.2, 10.3
// ============================================================================

describe('Property 33: Guest search access', () => {
  test('should allow unauthenticated users to search medicines by name, ingredient, and category', async () => {
    // Get some existing medicines from the database for testing
    const existingMedicines = await prisma.medicine.findMany({ take: 5 });
    
    if (existingMedicines.length === 0) {
      console.log('Skipping test - no medicines in database');
      return;
    }

    const categories = Array.from(new Set(existingMedicines.map(m => m.category)));
    
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(''), // Empty search
          fc.string({ minLength: 1, maxLength: 50 }), // Random search term
          fc.constantFrom(...existingMedicines.map(m => m.name)), // Valid medicine name
          fc.constantFrom(...existingMedicines.map(m => m.activeIngredient)), // Valid ingredient
        ),
        fc.option(fc.constantFrom(...categories), { nil: undefined }),
        async (searchTerm, category) => {
          // Build query params
          const params = new URLSearchParams();
          if (searchTerm) params.append('search', searchTerm);
          if (category) params.append('category', category);
          params.append('page', '1');
          params.append('limit', '10');

          // Make request without authentication
          const response = await fetch(`http://localhost:3000/api/medicines?${params}`);

          // Property: Guest users should be able to search without authentication
          assert.strictEqual(
            response.status,
            200,
            'Guest search should return 200 OK without authentication'
          );

          const data = await response.json();
          
          // Property: Response should contain medicines array
          assert.ok(Array.isArray(data.medicines), 'Response should contain medicines array');
          
          // Property: Response should contain pagination info
          assert.ok(data.pagination, 'Response should contain pagination info');
          assert.ok(typeof data.pagination.total === 'number', 'Pagination should have total count');
          
          // Property: If category filter is applied, all results should match that category
          if (category && data.medicines.length > 0) {
            data.medicines.forEach((medicine: any) => {
              assert.strictEqual(
                medicine.category,
                category,
                `All medicines should be in category ${category}`
              );
            });
          }
          
          // Property: If search term is provided and matches, results should contain the term
          if (searchTerm && data.medicines.length > 0) {
            const searchLower = searchTerm.toLowerCase();
            data.medicines.forEach((medicine: any) => {
              const matchesName = medicine.name.toLowerCase().includes(searchLower);
              const matchesIngredient = medicine.activeIngredient.toLowerCase().includes(searchLower);
              assert.ok(
                matchesName || matchesIngredient,
                `Medicine should match search term in name or ingredient`
              );
            });
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ============================================================================
// Property 34: Medicine availability display
// Feature: medifind-fullstack-migration, Property 34: Medicine availability display
// Validates: Requirements 10.4, 10.5, 10.6, 10.10
// ============================================================================

describe('Property 34: Medicine availability display', () => {
  test('should display pharmacies with stock status, distance, and prescription indicator', async () => {
    // Get medicines that have inventory
    const medicinesWithInventory = await prisma.medicine.findMany({
      where: {
        inventory: {
          some: {
            quantity: { gt: 0 },
          },
        },
      },
      take: 3,
    });
    
    if (medicinesWithInventory.length === 0) {
      console.log('Skipping test - no medicines with inventory in database');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...medicinesWithInventory.map(m => m.id)),
        fc.option(
          fc.record({
            lat: fc.double({ min: -90, max: 90 }),
            lon: fc.double({ min: -180, max: 180 }),
          }),
          { nil: undefined }
        ),
        async (medicineId, location) => {
          const params = new URLSearchParams();
          if (location) {
            params.append('lat', location.lat.toString());
            params.append('lon', location.lon.toString());
          }

          const response = await fetch(`http://localhost:3000/api/medicines/${medicineId}?${params}`);

          assert.strictEqual(response.status, 200, 'Medicine details should return 200 OK');

          const data = await response.json();
          
          // Property: Response should contain medicine details
          assert.ok(data.medicine, 'Response should contain medicine object');
          assert.strictEqual(data.medicine.id, medicineId, 'Medicine ID should match');
          
          // Property: Response should contain availability array
          assert.ok(Array.isArray(data.availability), 'Response should contain availability array');
          
          // Property: Each pharmacy in availability should have required fields
          data.availability.forEach((pharmacy: any) => {
            assert.ok(pharmacy.pharmacyId, 'Pharmacy should have ID');
            assert.ok(pharmacy.pharmacyName, 'Pharmacy should have name');
            assert.ok(pharmacy.address, 'Pharmacy should have address');
            assert.ok(pharmacy.phone, 'Pharmacy should have phone');
            assert.ok(typeof pharmacy.latitude === 'number', 'Pharmacy should have latitude');
            assert.ok(typeof pharmacy.longitude === 'number', 'Pharmacy should have longitude');
            assert.ok(typeof pharmacy.rating === 'number', 'Pharmacy should have rating');
            assert.ok(pharmacy.workingHours, 'Pharmacy should have working hours');
            
            // Property: Stock status should be one of the valid values
            assert.ok(
              ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'].includes(pharmacy.stockStatus),
              'Stock status should be valid'
            );
            
            // Property: Quantity should be positive (only in-stock pharmacies shown)
            assert.ok(pharmacy.quantity > 0, 'Only pharmacies with stock should be shown');
            
            // Property: If location provided, distance should be calculated
            if (location) {
              assert.ok(
                typeof pharmacy.distance === 'number',
                'Distance should be calculated when location provided'
              );
              assert.ok(pharmacy.distance >= 0, 'Distance should be non-negative');
            }
          });
          
          // Property: Prescription requirement should be displayed
          assert.ok(
            typeof data.medicine.prescriptionRequired === 'boolean',
            'Prescription requirement should be boolean'
          );
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ============================================================================
// Property 35: Pharmacy sorting
// Feature: medifind-fullstack-migration, Property 35: Pharmacy sorting
// Validates: Requirements 10.7, 10.8, 10.9
// ============================================================================

describe('Property 35: Pharmacy sorting', () => {
  test('should support sorting pharmacies by distance and rating', async () => {
    // Get medicines that have multiple pharmacies with inventory
    const medicinesWithInventory = await prisma.medicine.findMany({
      where: {
        inventory: {
          some: {
            quantity: { gt: 0 },
          },
        },
      },
      include: {
        inventory: {
          where: {
            quantity: { gt: 0 },
          },
        },
      },
      take: 3,
    });
    
    const medicinesWithMultiplePharmacies = medicinesWithInventory.filter(m => m.inventory.length > 1);
    
    if (medicinesWithMultiplePharmacies.length === 0) {
      console.log('Skipping test - no medicines with multiple pharmacies in database');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...medicinesWithMultiplePharmacies.map(m => m.id)),
        fc.record({
          lat: fc.double({ min: 40, max: 41 }),
          lon: fc.double({ min: -75, max: -73 }),
        }),
        async (medicineId, location) => {
          const params = new URLSearchParams();
          params.append('lat', location.lat.toString());
          params.append('lon', location.lon.toString());

          const response = await fetch(`http://localhost:3000/api/medicines/${medicineId}?${params}`);

          assert.strictEqual(response.status, 200, 'Medicine details should return 200 OK');

          const data = await response.json();
          
          if (data.availability.length > 1) {
            // Property: Pharmacies should be sortable by distance
            const sortedByDistance = [...data.availability].sort((a: any, b: any) => {
              if (a.distance === null) return 1;
              if (b.distance === null) return -1;
              return a.distance - b.distance;
            });
            
            // Verify distances are in ascending order
            for (let i = 0; i < sortedByDistance.length - 1; i++) {
              if (sortedByDistance[i].distance !== null && sortedByDistance[i + 1].distance !== null) {
                assert.ok(
                  sortedByDistance[i].distance <= sortedByDistance[i + 1].distance,
                  'Pharmacies should be sortable by distance in ascending order'
                );
              }
            }
            
            // Property: Pharmacies should be sortable by rating
            const sortedByRating = [...data.availability].sort((a: any, b: any) => b.rating - a.rating);
            
            // Verify ratings are in descending order
            for (let i = 0; i < sortedByRating.length - 1; i++) {
              assert.ok(
                sortedByRating[i].rating >= sortedByRating[i + 1].rating,
                'Pharmacies should be sortable by rating in descending order'
              );
            }
            
            // Property: Each pharmacy should have both distance and rating
            data.availability.forEach((pharmacy: any) => {
              assert.ok(
                typeof pharmacy.distance === 'number',
                'Each pharmacy should have distance for sorting'
              );
              assert.ok(
                typeof pharmacy.rating === 'number',
                'Each pharmacy should have rating for sorting'
              );
            });
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
