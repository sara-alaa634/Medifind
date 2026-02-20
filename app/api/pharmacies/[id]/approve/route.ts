import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/jwt';

/**
 * POST /api/pharmacies/[id]/approve
 * Approve a pharmacy (admin only)
 */
export async function POST(
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
      include: {
        user: true,
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
    
    // Check if already approved
    if (pharmacy.isApproved) {
      return NextResponse.json(
        {
          error: 'CONFLICT',
          message: 'Pharmacy is already approved',
          statusCode: 409,
        },
        { status: 409 }
      );
    }
    
    // Update pharmacy approval status
    const updatedPharmacy = await prisma.pharmacy.update({
      where: { id },
      data: { isApproved: true },
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
    
    // Create notification for pharmacy user
    await prisma.notification.create({
      data: {
        userId: pharmacy.userId,
        type: 'pharmacy_approved',
        title: 'Pharmacy Approved',
        message: `Your pharmacy "${pharmacy.name}" has been approved and is now active on the platform.`,
        isRead: false,
      },
    });
    
    return NextResponse.json(
      {
        success: true,
        message: 'Pharmacy approved successfully',
        pharmacy: updatedPharmacy,
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Approve pharmacy error:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'An error occurred while approving pharmacy',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
