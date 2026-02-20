import { prisma } from '@/lib/prisma';
import { notifyReservationNoResponse } from './notificationService';

/**
 * Check for reservations that have timed out (5 minutes without pharmacy response)
 * and update their status to NO_RESPONSE
 * 
 * This function should be called periodically (e.g., via cron job or polling)
 * to ensure timely handling of unresponsive pharmacies.
 * 
 * @returns Array of reservation IDs that were updated to NO_RESPONSE status
 */
export async function checkReservationTimeouts(): Promise<string[]> {
  // Calculate the timestamp for 5 minutes ago
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  // Query reservations with status PENDING and requestTime > 5 minutes ago
  const timedOutReservations = await prisma.reservation.findMany({
    where: {
      status: 'PENDING',
      requestTime: {
        lte: fiveMinutesAgo,
      },
    },
    include: {
      user: true,
      pharmacy: true,
      medicine: true,
    },
  });

  const updatedReservationIds: string[] = [];

  // Update each timed-out reservation
  for (const reservation of timedOutReservations) {
    try {
      // Update status to NO_RESPONSE and set noResponseTime
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          status: 'NO_RESPONSE',
          noResponseTime: new Date(),
        },
      });

      // Send notification to patient prompting for phone number
      await notifyReservationNoResponse(
        reservation.userId,
        reservation.pharmacy.name,
        reservation.medicine.name
      );

      updatedReservationIds.push(reservation.id);
    } catch (error) {
      // Log error but continue processing other reservations
      console.error(
        `Failed to process timeout for reservation ${reservation.id}:`,
        error
      );
    }
  }

  return updatedReservationIds;
}
