import { z } from 'zod';

// ============================================================================
// Authentication Schemas
// ============================================================================

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .refine(val => val.trim().length > 0, {
      message: 'Password cannot be only whitespace',
    }),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  role: z.enum(['PATIENT', 'PHARMACY'], {
    errorMap: () => ({ message: 'Role must be either PATIENT or PHARMACY' })
  }).optional(),
  pharmacyData: z.object({
    name: z.string().min(1, 'Pharmacy name is required'),
    address: z.string().min(1, 'Address is required'),
    phone: z.string().min(1, 'Phone is required'),
    latitude: z.number(),
    longitude: z.number(),
    workingHours: z.string().min(1, 'Working hours are required'),
  }).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(1, 'Password is required')
    .refine(val => val.trim().length > 0, {
      message: 'Password cannot be only whitespace',
    }),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters')
    .refine(val => val.trim().length > 0, {
      message: 'New password cannot be only whitespace',
    }),
});

// ============================================================================
// Medicine Schemas
// ============================================================================

export const createMedicineSchema = z.object({
  name: z.string().min(1, 'Medicine name is required'),
  activeIngredient: z.string().min(1, 'Active ingredient is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  prescriptionRequired: z.boolean(),
  category: z.string().min(1, 'Category is required'),
  priceRange: z.string().min(1, 'Price range is required'),
});

export const updateMedicineSchema = z.object({
  name: z.string().min(1).optional(),
  activeIngredient: z.string().min(1).optional(),
  dosage: z.string().min(1).optional(),
  prescriptionRequired: z.boolean().optional(),
  category: z.string().min(1).optional(),
  priceRange: z.string().min(1).optional(),
});

export const medicineQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================================================
// Pharmacy Schemas
// ============================================================================

export const updatePharmacySchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  workingHours: z.string().min(1).optional(),
});

export const pharmacyQuerySchema = z.object({
  search: z.string().optional(),
  isApproved: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      if (val === 'true') return true;
      if (val === 'false') return false;
      throw new Error('isApproved must be "true" or "false"');
    }),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

// ============================================================================
// Inventory Schemas
// ============================================================================

export const createInventorySchema = z.object({
  medicineId: z.string().cuid('Invalid medicine ID'),
  quantity: z.number().int().min(0, 'Quantity must be non-negative'),
});

export const updateInventorySchema = z.object({
  quantity: z.number().int().min(0, 'Quantity must be non-negative'),
});

export const inventoryQuerySchema = z.object({
  status: z.enum(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

// ============================================================================
// Reservation Schemas
// ============================================================================

export const createReservationSchema = z.object({
  pharmacyId: z.string().cuid('Invalid pharmacy ID'),
  medicineId: z.string().cuid('Invalid medicine ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
});

export const acceptReservationSchema = z.object({
  note: z.string().optional(),
});

export const rejectReservationSchema = z.object({
  reason: z.string().optional(),
});

export const providePhoneSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
});

export const reservationQuerySchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'NO_RESPONSE']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

// ============================================================================
// Profile Schemas
// ============================================================================

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  phone: z.string().optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
});

// ============================================================================
// Direct Call Schema
// ============================================================================

export const createDirectCallSchema = z.object({
  pharmacyId: z.string().cuid('Invalid pharmacy ID'),
  medicineId: z.string().cuid('Invalid medicine ID'),
});

// ============================================================================
// Notification Schemas
// ============================================================================

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

// ============================================================================
// Type Exports
// ============================================================================

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;
export type UpdateMedicineInput = z.infer<typeof updateMedicineSchema>;
export type MedicineQueryInput = z.infer<typeof medicineQuerySchema>;
export type UpdatePharmacyInput = z.infer<typeof updatePharmacySchema>;
export type PharmacyQueryInput = z.infer<typeof pharmacyQuerySchema>;
export type CreateInventoryInput = z.infer<typeof createInventorySchema>;
export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>;
export type InventoryQueryInput = z.infer<typeof inventoryQuerySchema>;
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type AcceptReservationInput = z.infer<typeof acceptReservationSchema>;
export type RejectReservationInput = z.infer<typeof rejectReservationSchema>;
export type ProvidePhoneInput = z.infer<typeof providePhoneSchema>;
export type ReservationQueryInput = z.infer<typeof reservationQuerySchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateDirectCallInput = z.infer<typeof createDirectCallSchema>;
export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
