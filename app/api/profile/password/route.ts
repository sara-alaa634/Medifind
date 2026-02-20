import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/jwt';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { passwordChangeSchema } from '@/lib/validation';
import { z } from 'zod';

/**
 * PUT /api/profile/password
 * Change current user's password
 * Requires authentication
 */
export async function PUT(request: NextRequest) {
  try {
    // Extract and verify JWT token
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

    const payload = await verifyJWT(token);

    // Parse and validate request body
    const body = await request.json();
    const { currentPassword, newPassword } = passwordChangeSchema.parse(body);

    // Fetch user with password
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        password: true,
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

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password);
    
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Current password is incorrect',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: payload.userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Password change error:', error);
    
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
    
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
          statusCode: 401,
        },
        { status: 401 }
      );
    }

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
