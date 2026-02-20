import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updatePharmacySchema } from '@/lib/validation';
import { verifyJWT } from '@/lib/jwt';

/**
 * GET /api/pharmacies/[id]
 * Get a specific pharmacy by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Get pharmacy with user data
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            avatar: true,
            createdAt: true,
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
    
    return NextResponse.json(
      {
        pharmacy,
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Get pharmacy error:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching pharmacy',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/pharmacies/[id]
 * Update pharmacy profile (pharmacy owner only)
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
    
    // Verify JWT
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
    
    const { id } = params;
    
    // Get pharmacy to verify ownership
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id },
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
    
    // Check if user is the pharmacy owner
    if (pharmacy.userId !== payload.userId) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'You can only update your own pharmacy profile',
          statusCode: 403,
        },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    // Validate input
    const validationResult = updatePharmacySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: validationResult.error.errors,
          statusCode: 400,
        },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // Update pharmacy
    const updatedPharmacy = await prisma.pharmacy.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            avatar: true,
            createdAt: true,
          },
        },
      },
    });
    
    return NextResponse.json(
      {
        success: true,
        message: 'Pharmacy updated successfully',
        pharmacy: updatedPharmacy,
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Update pharmacy error:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'An error occurred while updating pharmacy',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pharmacies/[id]
 * Delete pharmacy (admin only)
 */
export async function DELETE(
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
    
    // Verify JWT and check role
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
    
    // Check admin role
    if (payload.role !== 'ADMIN') {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Admin access required',
          statusCode: 403,
        },
        { status: 403 }
      );
    }
    
    const { id } = params;
    
    // Get pharmacy to verify it exists
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id },
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
    
    // Delete pharmacy (cascade will delete user due to onDelete: Cascade in schema)
    await prisma.user.delete({
      where: { id: pharmacy.userId },
    });
    
    return NextResponse.json(
      {
        success: true,
        message: 'Pharmacy deleted successfully',
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Delete pharmacy error:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'An error occurred while deleting pharmacy',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
