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

    // Verify user is an admin
    if (payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get total users count
    const totalUsers = await prisma.user.count();

    // Get total patients count
    const totalPatients = await prisma.user.count({
      where: { role: 'PATIENT' },
    });

    // Get total pharmacies count
    const totalPharmacies = await prisma.pharmacy.count();

    // Get pending pharmacy approvals count
    const pendingApprovals = await prisma.pharmacy.count({
      where: { isApproved: false },
    });

    // Get total medicines count
    const totalMedicines = await prisma.medicine.count();

    // Get all reservations
    const allReservations = await prisma.reservation.findMany({
      include: {
        medicine: true,
        pharmacy: true,
      },
    });

    const totalReservations = allReservations.length;

    // Count reservations by status
    const reservationsByStatus = {
      pending: allReservations.filter(r => r.status === 'PENDING').length,
      accepted: allReservations.filter(r => r.status === 'ACCEPTED').length,
      rejected: allReservations.filter(r => r.status === 'REJECTED').length,
      cancelled: allReservations.filter(r => r.status === 'CANCELLED').length,
      noResponse: allReservations.filter(r => r.status === 'NO_RESPONSE').length,
    };

    // Get total direct calls count
    const totalDirectCalls = await prisma.directCall.count();

    // Get NO_RESPONSE count by pharmacy
    const noResponseByPharmacy = await prisma.reservation.groupBy({
      by: ['pharmacyId'],
      where: {
        status: 'NO_RESPONSE',
      },
      _count: {
        id: true,
      },
    });

    // Enrich with pharmacy details
    const noResponseByPharmacyWithDetails = await Promise.all(
      noResponseByPharmacy.map(async (item) => {
        const pharmacy = await prisma.pharmacy.findUnique({
          where: { id: item.pharmacyId },
          select: {
            id: true,
            name: true,
            address: true,
          },
        });
        return {
          pharmacy: pharmacy || { id: item.pharmacyId, name: 'Unknown', address: 'Unknown' },
          count: item._count.id,
        };
      })
    );

    // Get reservations over time (grouped by month for last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const recentReservations = await prisma.reservation.findMany({
      where: {
        createdAt: {
          gte: twelveMonthsAgo,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by month
    const reservationsOverTime = recentReservations.reduce((acc, r) => {
      const monthKey = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, '0')}`;
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Convert to array format for charts
    const reservationsOverTimeArray = Object.entries(reservationsOverTime)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Get top medicines by reservation count
    const medicineReservationCounts = allReservations.reduce((acc, r) => {
      const medicineId = r.medicineId;
      acc[medicineId] = (acc[medicineId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topMedicinesData = await Promise.all(
      Object.entries(medicineReservationCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(async ([medicineId, count]) => {
          const medicine = await prisma.medicine.findUnique({
            where: { id: medicineId },
            select: {
              id: true,
              name: true,
              activeIngredient: true,
              category: true,
            },
          });
          return {
            medicine: medicine || { id: medicineId, name: 'Unknown', activeIngredient: 'Unknown', category: 'Unknown' },
            count,
          };
        })
    );

    return NextResponse.json({
      totalUsers,
      totalPatients,
      totalPharmacies,
      pendingApprovals,
      totalMedicines,
      totalReservations,
      reservationsByStatus,
      directCalls: totalDirectCalls,
      noResponseByPharmacy: noResponseByPharmacyWithDetails,
      reservationsOverTime: reservationsOverTimeArray,
      topMedicines: topMedicinesData,
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
