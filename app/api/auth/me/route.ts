import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/jwt';

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Not authenticated',
          statusCode: 401,
        },
        { status: 401 }
      );
    }

    // Verify JWT token
    const payload = await verifyJWT(token);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        pharmacy: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: 'User not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Return user data (excluding password)
    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          createdAt: user.createdAt,
          pharmacy: user.pharmacy ? {
            id: user.pharmacy.id,
            name: user.pharmacy.name,
            isApproved: user.pharmacy.isApproved,
          } : null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      {
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
        statusCode: 401,
      },
      { status: 401 }
    );
  }
}
