import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { createDirectCallSchema } from '@/lib/validation';
import { z } from 'zod';

/**
 * POST /api/direct-calls
 * Record a direct call from patient to pharmacy (Patient only)
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
          message: 'Only patients can record direct calls',
          statusCode: 403,
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    let validatedData;
    try {
      validatedData = createDirectCallSchema.parse(body);
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

    const { pharmacyId, medicineId } = validatedData;

    // Validate pharmacy exists
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: {
        id: true,
        phone: true,
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

    // Validate medicine exists
    const medicine = await prisma.medicine.findUnique({
      where: { id: medicineId },
      select: {
        id: true,
      },
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

    // Record the direct call
    await prisma.directCall.create({
      data: {
        userId: payload.userId,
        pharmacyId,
        medicineId,
      },
    });

    // Return pharmacy phone number
    return NextResponse.json(
      {
        success: true,
        phoneNumber: pharmacy.phone,
        message: 'Direct call recorded successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error recording direct call:', error);
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
