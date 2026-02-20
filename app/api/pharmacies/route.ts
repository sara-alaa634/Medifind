import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pharmacyQuerySchema } from '@/lib/validation';

/**
 * GET /api/pharmacies
 * Get all pharmacies with pagination, filtering, and search
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const queryResult = pharmacyQuerySchema.safeParse({
      search: searchParams.get('search') || undefined,
      isApproved: searchParams.get('isApproved') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });
    
    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: queryResult.error.errors,
          statusCode: 400,
        },
        { status: 400 }
      );
    }
    
    const { search, isApproved, page, limit } = queryResult.data;
    const skip = (page - 1) * limit;
    
    // Build where clause for filtering and search
    const where: any = {};
    
    if (isApproved !== undefined) {
      where.isApproved = isApproved;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    // Get total count for pagination
    const total = await prisma.pharmacy.count({ where });
    
    // Get pharmacies with pagination, including user data
    const pharmacies = await prisma.pharmacy.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
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
        pharmacies,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Get pharmacies error:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching pharmacies',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
