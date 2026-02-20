import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { providePhoneSchema } from '@/lib/validation';
import { createNotification, NotificationType } from '@/services/notificationService';
import { z } from 'zod';

/**
 * PUT /api/reservations/[id]/provide-phone
 * Provide phone number for NO_RESPONSE reservation (Patient only)
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
          message: 'Only patients can provide phone numbers',
          statusCode: 403,
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    let validatedData;
    try {
      validatedData = providePhoneSchema.parse(body);
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

    const { phone } = validatedData;
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
        pharmacy: {
          select: {
            name: true,
            user: {
              select: {
                id: true,
              },
            },
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

    // Verify reservation status is NO_RESPONSE
    if (reservation.status !== 'NO_RESPONSE') {
      return NextResponse.json(
        {
          error: 'CONFLICT',
          message: 'Phone number can only be provided for NO_RESPONSE reservations',
          statusCode: 409,
        },
        { status: 409 }
      );
    }

    // Update reservation with patient phone
    const updatedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        patientPhone: phone,
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

    // Send notification to pharmacy with patient phone number
    await createNotification(
      reservation.pharmacy.user.id,
      NotificationType.RESERVATION_NO_RESPONSE,
      'Patient Phone Number Provided',
      `${reservation.user.name} has provided their phone number (${phone}) for the ${reservation.medicine.name} reservation. Please contact them to complete the reservation.`
    );

    return NextResponse.json({
      reservation: updatedReservation,
      message: 'Phone number provided successfully',
    });
  } catch (error) {
    console.error('Error providing phone number:', error);
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
