
import { Medicine, Pharmacy, StockStatus, UserRole } from './types';

export const MOCK_MEDICINES: Medicine[] = [
  { id: '1', name: 'Panadol Advance', activeIngredient: 'Paracetamol', dosage: '500mg', prescriptionRequired: false, category: 'Painkillers', priceRange: '$2 - $5' },
  { id: '2', name: 'Amoxicillin', activeIngredient: 'Amoxicillin', dosage: '250mg', prescriptionRequired: true, category: 'Antibiotics', priceRange: '$10 - $15' },
  { id: '3', name: 'Augmentin', activeIngredient: 'Amoxicillin/Clavulanate', dosage: '625mg', prescriptionRequired: true, category: 'Antibiotics', priceRange: '$15 - $25' },
  { id: '4', name: 'Centrum Adults', activeIngredient: 'Multivitamins', dosage: '1 Tablet', prescriptionRequired: false, category: 'Vitamins', priceRange: '$20 - $30' },
  { id: '5', name: 'Lipitor', activeIngredient: 'Atorvastatin', dosage: '20mg', prescriptionRequired: true, category: 'Chronic', priceRange: '$40 - $60' },
  { id: '6', name: 'Zyrtec', activeIngredient: 'Cetirizine', dosage: '10mg', prescriptionRequired: false, category: 'Allergy', priceRange: '$8 - $12' },
];

export const MOCK_PHARMACIES: Pharmacy[] = [
  { id: 'p1', name: 'HealthFirst Pharmacy', address: '123 Main St, Downtown', phone: '+1 555 1010', distance: 0.8, rating: 4.8, workingHours: '24/7', isApproved: true },
  { id: 'p2', name: 'CureAll Drugs', address: '456 West Side Ave', phone: '+1 555 2020', distance: 1.5, rating: 4.5, workingHours: '08:00 - 22:00', isApproved: true },
  { id: 'p3', name: 'Wellness Point', address: '789 Oak Lane', phone: '+1 555 3030', distance: 3.2, rating: 4.2, workingHours: '09:00 - 21:00', isApproved: true },
  { id: 'p4', name: 'QuickMeds Express', address: '101 Pine Plaza', phone: '+1 555 4040', distance: 0.4, rating: 4.9, workingHours: '24/7', isApproved: true },
];

export const CATEGORIES = [
  { name: 'Painkillers', icon: '💊' },
  { name: 'Antibiotics', icon: '🧫' },
  { name: 'Chronic', icon: '🫀' },
  { name: 'Vitamins', icon: '🍎' },
  { name: 'Allergy', icon: '🤧' }
];
