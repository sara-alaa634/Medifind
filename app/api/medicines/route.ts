import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createMedicineSchema, medicineQuerySchema } from '@/lib/validation';
import { verifyJWT } from '@/lib/jwt';
import { sanitizeSearchQuery, sanitizeString } from '@/lib/utils';
import { handleError, handleAuthenticationError, handleAuthorizationError } from '@/lib/errorHandler';

/**
 * GET /api/medicines
 * Public endpoint - Get all medicines with pagination, filtering, and search
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const queryResult = medicineQuerySchema.safeParse({
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });
    
    if (!queryResult.success) {
      return handleError(queryResult.error);
    }
    
    const { search, category, page, limit } = queryResult.data;
    const skip = (page - 1) * limit;
    
    // Sanitize search input (Requirement: 17.9)
    const sanitizedSearch = search ? sanitizeSearchQuery(search) : undefined;
    const sanitizedCategory = category ? sanitizeString(category) : undefined;
    
    // Build where clause for filtering and search
    const where: any = {};
    
    if (sanitizedCategory) {
      where.category = sanitizedCategory;
    }
    
    if (sanitizedSearch) {
      where.OR = [
        { name: { contains: sanitizedSearch, mode: 'insensitive' } },
        { activeIngredient: { contains: sanitizedSearch, mode: 'insensitive' } },
      ];
    }
    
    // Get total count for pagination
    const total = await prisma.medicine.count({ where });
    
    // Get medicines with pagination
    const medicines = await prisma.medicine.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    });
    
    return NextResponse.json(
      {
        medicines,
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
    return handleError(error);
  }
}

/**
 * POST /api/medicines
 * Admin only - Create a new medicine
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return handleAuthenticationError('Authentication required');
    }
    
    // Verify JWT and check role
    let payload;
    try {
      payload = await verifyJWT(token);
    } catch (error) {
      return handleAuthenticationError('Invalid or expired token');
    }
    
    // Check admin role
    if (payload.role !== 'ADMIN') {
      return handleAuthorizationError('Admin access required');
    }
    
    const body = await request.json();
    
    // Validate input
    const validationResult = createMedicineSchema.safeParse(body);
    if (!validationResult.success) {
      return handleError(validationResult.error);
    }
    
    const data = validationResult.data;
    
    // Sanitize medicine data (Requirement: 17.9, 17.10)
    const sanitizedData = {
      name: sanitizeString(data.name),
      activeIngredient: sanitizeString(data.activeIngredient),
      dosage: sanitizeString(data.dosage),
      prescriptionRequired: data.prescriptionRequired,
      category: sanitizeString(data.category),
      priceRange: sanitizeString(data.priceRange),
    };
    
    // Create medicine
    const medicine = await prisma.medicine.create({
      data: sanitizedData,
    });
    
    return NextResponse.json(
      {
        success: true,
        message: 'Medicine created successfully',
        medicine,
      },
      { status: 201 }
    );
    
  } catch (error) {
    return handleError(error);
  }
}
