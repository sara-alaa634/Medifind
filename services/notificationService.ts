import { prisma } from '@/lib/prisma';

/**
 * Notification types
 */
export enum NotificationType {
  RESERVATION_CREATED = 'reservation_created',
  RESERVATION_ACCEPTED = 'reservation_accepted',
  RESERVATION_REJECTED = 'reservation_rejected',
  RESERVATION_NO_RESPONSE = 'reservation_no_response',
  PHARMACY_APPROVED = 'pharmacy_approved',
}

/**
 * Create a notification for a user
 * @param userId - User ID to send notification to
 * @param type - Type of notification
 * @param title - Notification title
 * @param message - Notification message
 * @returns Created notification
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string
) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      isRead: false,
    },
  });
}

/**
 * Send notification when a reservation is created
 * @param pharmacyUserId - Pharmacy user ID
 * @param patientName - Patient name
 * @param medicineName - Medicine name
 * @param quantity - Quantity requested
 */
export async function notifyReservationCreated(
  pharmacyUserId: string,
  patientName: string,
  medicineName: string,
  quantity: number
) {
  return createNotification(
    pharmacyUserId,
    NotificationType.RESERVATION_CREATED,
    'New Reservation Request',
    `${patientName} has requested ${quantity} unit(s) of ${medicineName}. Please respond within 5 minutes.`
  );
}

/**
 * Send notification when a reservation is accepted
 * @param patientUserId - Patient user ID
 * @param pharmacyName - Pharmacy name
 * @param medicineName - Medicine name
 * @param note - Optional note from pharmacy
 */
export async function notifyReservationAccepted(
  patientUserId: string,
  pharmacyName: string,
  medicineName: string,
  note?: string
) {
  const message = note
    ? `${pharmacyName} has accepted your reservation for ${medicineName}. Note: ${note}. Please pick up within 30 minutes.`
    : `${pharmacyName} has accepted your reservation for ${medicineName}. Please pick up within 30 minutes.`;

  return createNotification(
    patientUserId,
    NotificationType.RESERVATION_ACCEPTED,
    'Reservation Accepted',
    message
  );
}

/**
 * Send notification when a reservation is rejected
 * @param patientUserId - Patient user ID
 * @param pharmacyName - Pharmacy name
 * @param medicineName - Medicine name
 * @param reason - Optional rejection reason
 */
export async function notifyReservationRejected(
  patientUserId: string,
  pharmacyName: string,
  medicineName: string,
  reason?: string
) {
  const message = reason
    ? `${pharmacyName} has rejected your reservation for ${medicineName}. Reason: ${reason}`
    : `${pharmacyName} has rejected your reservation for ${medicineName}.`;

  return createNotification(
    patientUserId,
    NotificationType.RESERVATION_REJECTED,
    'Reservation Rejected',
    message
  );
}

/**
 * Send notification when a reservation times out (NO_RESPONSE)
 * @param patientUserId - Patient user ID
 * @param pharmacyName - Pharmacy name
 * @param medicineName - Medicine name
 */
export async function notifyReservationNoResponse(
  patientUserId: string,
  pharmacyName: string,
  medicineName: string
) {
  return createNotification(
    patientUserId,
    NotificationType.RESERVATION_NO_RESPONSE,
    'Pharmacy Response Needed',
    `${pharmacyName} hasn't responded to your reservation for ${medicineName} yet. Please provide your phone number so they can contact you.`
  );
}

/**
 * Send notification when pharmacy is approved
 * @param pharmacyUserId - Pharmacy user ID
 * @param pharmacyName - Pharmacy name
 */
export async function notifyPharmacyApproved(
  pharmacyUserId: string,
  pharmacyName: string
) {
  return createNotification(
    pharmacyUserId,
    NotificationType.PHARMACY_APPROVED,
    'Pharmacy Approved',
    `Congratulations! ${pharmacyName} has been approved and can now start managing inventory and reservations.`
  );
}
