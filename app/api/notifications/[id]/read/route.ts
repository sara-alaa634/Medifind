import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

/**
 * PUT /api/notifications/[id]/read
 * Mark a specific notification as read
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Extract and verify JWT token
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);
    const notificationId = params.id;

    // Check if notification exists and belongs to the user
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Notification not found', statusCode: 404 },
        { status: 404 }
      );
    }

    if (notification.userId !== payload.userId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Access denied', statusCode: 403 },
        { status: 403 }
      );
    }

    // Mark notification as read
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return NextResponse.json({ notification: updatedNotification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    
    if (error instanceof Error && error.message.includes('jwt')) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Invalid or expired token', statusCode: 401 },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred', statusCode: 500 },
      { status: 500 }
    );
  }
}
