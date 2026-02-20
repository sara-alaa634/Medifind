import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/jwt';
import { z } from 'zod';

// Avatar upload schema
const avatarUploadSchema = z.object({
  avatar: z.string().url('Invalid avatar URL'),
});

/**
 * POST /api/profile/avatar
 * Upload/update user avatar
 * Requires authentication
 * 
 * Note: This is a simplified implementation that accepts a URL.
 * In production, you would typically:
 * 1. Accept multipart/form-data with file upload
 * 2. Validate file type (image/jpeg, image/png, etc.)
 * 3. Validate file size (e.g., max 5MB)
 * 4. Upload to cloud storage (S3, Cloudinary, etc.)
 * 5. Store the resulting URL in the database
 */
export async function POST(request: NextRequest) {
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
    const { avatar } = avatarUploadSchema.parse(body);

    // Validate image URL format (basic check)
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const hasValidExtension = imageExtensions.some(ext => 
      avatar.toLowerCase().includes(ext)
    );

    if (!hasValidExtension) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Avatar must be a valid image URL (jpg, jpeg, png, gif, webp)',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Update user avatar
    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: { avatar },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Avatar updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    
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
