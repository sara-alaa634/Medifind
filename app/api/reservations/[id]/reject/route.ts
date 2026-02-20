import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { rejectReservationSchema } from '@/lib/validation';
import { notifyReservationRejected } from '@/services/notificationService';
import { z } from 'zod';

/**
 * PUT /api/reservations/[id]/reject
 * Reject a reservation (Pharmacy only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          statusCode: 401,
        },
        { status: 401 }
      );
    }

    let payload;
    try {
      payload = await verifyJWT(token);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
          statusCode: 401,
        },
        { status: 401 }
      );
    }

    // Verify user is a pharmacy
    if (payload.role !== 'PHARMACY') {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Only pharmacies can reject reservations',
          statusCode: 403,
        },
        { status: 403 }
      );
    }

    // Get pharmacy
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { userId: payload.userId },
    });

    if (!pharmacy) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: 'Pharmacy not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    let validatedData;
    try {
      validatedData = rejectReservationSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
            statusCode: 400,
          },
          { status: 400 }
        );
      }
      throw error;
    }

    const { reason } = validatedData;
    const reservationId = params.id;

    // Get reservation
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        medicine: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!reservation) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: 'Reservation not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Verify reservation belongs to this pharmacy
    if (reservation.pharmacyId !== pharmacy.id) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'This reservation does not belong to your pharmacy',
          statusCode: 403,
        },
        { status: 403 }
      );
    }

    // Verify reservation status is PENDING or NO_RESPONSE
    if (reservation.status !== 'PENDING' && reservation.status !== 'NO_RESPONSE') {
      return NextResponse.json(
        {
          error: 'CONFLICT',
          message: `Cannot reject reservation with status ${reservation.status}`,
          statusCode: 409,
        },
        { status: 409 }
      );
    }

    // Update reservation to REJECTED
    const updatedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: 'REJECTED',
        rejectedTime: new Date(),
        note: reason || null,
      },
      include: {
        medicine: {
          select: {
            id: true,
            name: true,
            activeIngredient: true,
            dosage: true,
            prescriptionRequired: true,
            category: true,
            priceRange: true,
          },
        },
        pharmacy: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            workingHours: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    // Send notification to patient
    await notifyReservationRejected(
      reservation.user.id,
      pharmacy.name,
      reservation.medicine.name,
      reason
    );

    return NextResponse.json({
      reservation: updatedReservation,
      message: 'Reservation rejected successfully',
    });
  } catch (error) {
    console.error('Error rejecting reservation:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
