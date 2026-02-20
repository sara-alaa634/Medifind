
export enum UserRole {
  PATIENT = 'PATIENT',
  PHARMACY = 'PHARMACY',
  ADMIN = 'ADMIN'
}

export enum ReservationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  NO_RESPONSE = 'NO_RESPONSE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum StockStatus {
  IN_STOCK = 'IN_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK'
}

export interface Medicine {
  id: string;
  name: string;
  activeIngredient: string;
  dosage: string;
  prescriptionRequired: boolean;
  category: string;
  priceRange?: string;
}

export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  phone: string;
  distance: number;
  rating: number;
  workingHours: string;
  isApproved: boolean;
}

export interface InventoryItem {
  id: string;
  pharmacyId: string;
  medicineId: string;
  quantity: number;
  status: StockStatus;
}

export interface Reservation {
  id: string;
  userId: string;
  userName: string;
  pharmacyId: string;
  pharmacyName: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  status: ReservationStatus;
  requestTime: number;
  acceptedTime?: number;
  note?: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  avatar?: string;
}
