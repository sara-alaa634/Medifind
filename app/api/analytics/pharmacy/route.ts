import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Extract and verify JWT token
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);

    // Verify user is a pharmacy
    if (payload.role !== 'PHARMACY') {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Pharmacy access required' },
        { status: 403 }
      );
    }

    // Get pharmacy record
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { userId: payload.userId },
    });

    if (!pharmacy) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Pharmacy not found' },
        { status: 404 }
      );
    }

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get reservation metrics for last 30 days
    const reservations = await prisma.reservation.findMany({
      where: {
        pharmacyId: pharmacy.id,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const totalReservations = reservations.length;
    const pending = reservations.filter(r => r.status === 'PENDING').length;
    const accepted = reservations.filter(r => r.status === 'ACCEPTED').length;
    const rejected = reservations.filter(r => r.status === 'REJECTED').length;
    const noResponse = reservations.filter(r => r.status === 'NO_RESPONSE').length;

    // Get direct calls count for last 30 days
    const directCallsCount = await prisma.directCall.count({
      where: {
        pharmacyId: pharmacy.id,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Get inventory stats
    const inventory = await prisma.inventory.findMany({
      where: {
        pharmacyId: pharmacy.id,
      },
      include: {
        medicine: true,
      },
    });

    const totalItems = inventory.length;
    const lowStock = inventory.filter(i => i.status === 'LOW_STOCK').length;
    const outOfStock = inventory.filter(i => i.status === 'OUT_OF_STOCK').length;

    // Get recent reservations (last 10)
    const recentReservations = await prisma.reservation.findMany({
      where: {
        pharmacyId: pharmacy.id,
      },
      include: {
        medicine: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    // Get low stock items
    const lowStockItems = inventory
      .filter(i => i.status === 'LOW_STOCK' || i.status === 'OUT_OF_STOCK')
      .map(i => ({
        id: i.id,
        medicine: {
          id: i.medicine.id,
          name: i.medicine.name,
          activeIngredient: i.medicine.activeIngredient,
        },
        quantity: i.quantity,
        status: i.status,
        lastUpdated: i.lastUpdated,
      }));

    return NextResponse.json({
      totalReservations,
      pending,
      accepted,
      rejected,
      noResponse,
      directCalls: directCallsCount,
      inventoryStats: {
        totalItems,
        lowStock,
        outOfStock,
      },
      recentReservations: recentReservations.map(r => ({
        id: r.id,
        medicine: {
          id: r.medicine.id,
          name: r.medicine.name,
        },
        patient: {
          id: r.user.id,
          name: r.user.name,
        },
        quantity: r.quantity,
        status: r.status,
        requestTime: r.requestTime,
        acceptedTime: r.acceptedTime,
        rejectedTime: r.rejectedTime,
        noResponseTime: r.noResponseTime,
      })),
      lowStockItems,
    });
  } catch (error) {
    console.error('Pharmacy analytics error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
