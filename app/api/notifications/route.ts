import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

/**
 * GET /api/notifications
 * Get all notifications for the authenticated user
 * Returns notifications sorted by creation date (newest first)
 */
export async function GET(request: NextRequest) {
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

    // Get all notifications for the user
    const notifications = await prisma.notification.findMany({
      where: {
        userId: payload.userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Count unread notifications
    const unreadCount = notifications.filter(n => !n.isRead).length;

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    
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
