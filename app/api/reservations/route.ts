import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { createReservationSchema, reservationQuerySchema } from '@/lib/validation';
import { notifyReservationCreated } from '@/services/notificationService';
import { z } from 'zod';

/**
 * POST /api/reservations
 * Create a new reservation (Patient only)
 */
export async function POST(request: NextRequest) {
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
          message: 'Only patients can create reservations',
          statusCode: 403,
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    let validatedData;
    try {
      validatedData = createReservationSchema.parse(body);
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

    const { pharmacyId, medicineId, quantity } = validatedData;

    // Validate medicine exists
    const medicine = await prisma.medicine.findUnique({
      where: { id: medicineId },
    });

    if (!medicine) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: 'Medicine not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Validate pharmacy exists
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
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

    // Validate pharmacy has the medicine in stock
    const inventory = await prisma.inventory.findUnique({
      where: {
        pharmacyId_medicineId: {
          pharmacyId,
          medicineId,
        },
      },
    });

    if (!inventory) {
      return NextResponse.json(
        {
          error: 'CONFLICT',
          message: 'Medicine not available at this pharmacy',
          statusCode: 409,
        },
        { status: 409 }
      );
    }

    // Validate quantity does not exceed available stock
    if (quantity > inventory.quantity) {
      return NextResponse.json(
        {
          error: 'CONFLICT',
          message: `Insufficient stock. Only ${inventory.quantity} unit(s) available`,
          statusCode: 409,
        },
        { status: 409 }
      );
    }

    // Get patient information for notification
    const patient = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { name: true },
    });

    // Create reservation with status PENDING and requestTime set to current timestamp
    const reservation = await prisma.reservation.create({
      data: {
        userId: payload.userId,
        pharmacyId,
        medicineId,
        quantity,
        status: 'PENDING',
        requestTime: new Date(),
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
      },
    });

    // Send notification to pharmacy
    await notifyReservationCreated(
      pharmacy.user.id,
      patient?.name || 'A patient',
      medicine.name,
      quantity
    );

    return NextResponse.json(
      {
        reservation,
        message: 'Reservation created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating reservation:', error);
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

/**
 * GET /api/reservations
 * Get reservations for the authenticated user
 * - Patients see their own reservations
 * - Pharmacies see reservations for their pharmacy
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    };

    let validatedQuery;
    try {
      validatedQuery = reservationQuerySchema.parse(queryParams);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors,
            statusCode: 400,
          },
          { status: 400 }
        );
      }
      throw error;
    }

    const { status, page, limit } = validatedQuery;
    const skip = (page - 1) * limit;

    // Build where clause based on user role
    let whereClause: any = {};

    if (payload.role === 'PATIENT') {
      // Patients see their own reservations
      whereClause.userId = payload.userId;
    } else if (payload.role === 'PHARMACY') {
      // Pharmacies see reservations for their pharmacy
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

      whereClause.pharmacyId = pharmacy.id;
    } else {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Invalid role for this operation',
          statusCode: 403,
        },
        { status: 403 }
      );
    }

    // Add status filter if provided
    if (status) {
      whereClause.status = status;
    }

    // Get total count for pagination
    const total = await prisma.reservation.count({
      where: whereClause,
    });

    // Get reservations with pagination
    const reservations = await prisma.reservation.findMany({
      where: whereClause,
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
      orderBy: {
        requestTime: 'desc',
      },
      skip,
      take: limit,
    });

    return NextResponse.json({
      reservations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching reservations:', error);
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
