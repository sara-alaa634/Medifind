import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

/**
 * PUT /api/reservations/[id]/cancel
 * Cancel a reservation (Patient only)
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

    // Verify user is a patient
    if (payload.role !== 'PATIENT') {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Only patients can cancel reservations',
          statusCode: 403,
        },
        { status: 403 }
      );
    }

    const reservationId = params.id;

    // Get reservation
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
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

    // Verify reservation belongs to this patient
    if (reservation.userId !== payload.userId) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'This reservation does not belong to you',
          statusCode: 403,
        },
        { status: 403 }
      );
    }

    // Verify reservation status is PENDING, ACCEPTED, or NO_RESPONSE
    if (
      reservation.status !== 'PENDING' &&
      reservation.status !== 'ACCEPTED' &&
      reservation.status !== 'NO_RESPONSE'
    ) {
      return NextResponse.json(
        {
          error: 'CONFLICT',
          message: `Cannot cancel reservation with status ${reservation.status}`,
          statusCode: 409,
        },
        { status: 409 }
      );
    }

    // Update reservation to CANCELLED
    const updatedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: 'CANCELLED',
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

    return NextResponse.json({
      reservation: updatedReservation,
      message: 'Reservation cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
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
