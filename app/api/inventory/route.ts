import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/jwt';
import { 
  createInventorySchema, 
  inventoryQuerySchema,
  type CreateInventoryInput,
  type InventoryQueryInput 
} from '@/lib/validation';
import { StockStatus } from '@prisma/client';

/**
 * Calculate stock status based on quantity
 * Requirements: 9.3, 9.4, 9.5
 */
function calculateStockStatus(quantity: number): StockStatus {
  if (quantity === 0) return 'OUT_OF_STOCK';
  if (quantity <= 10) return 'LOW_STOCK';
  return 'IN_STOCK';
}

/**
 * GET /api/inventory
 * Get inventory for authenticated pharmacy with filtering and search
 * Requirements: 9.6, 9.9, 9.10
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookie
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 },
        { status: 401 }
      );
    }

    // Verify JWT and get user info
    const payload = await verifyJWT(token);
    
    // Ensure user is a pharmacy
    if (payload.role !== 'PHARMACY') {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Pharmacy access required', statusCode: 403 },
        { status: 403 }
      );
    }

    // Get pharmacy record
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { userId: payload.userId }
    });

    if (!pharmacy) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Pharmacy not found', statusCode: 404 },
        { status: 404 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, string> = {};
    
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const validatedQuery = inventoryQuerySchema.parse(queryParams) as InventoryQueryInput;
    const { status, search, page, limit } = validatedQuery;

    // Build where clause
    const where: any = {
      pharmacyId: pharmacy.id,
    };

    // Filter by stock status if provided
    if (status) {
      where.status = status;
    }

    // Search by medicine name if provided
    if (search) {
      where.medicine = {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      };
    }

    // Get total count for pagination
    const total = await prisma.inventory.count({ where });

    // Get inventory items with pagination
    const inventory = await prisma.inventory.findMany({
      where,
      include: {
        medicine: {
          select: {
            id: true,
            name: true,
            activeIngredient: true,
            dosage: true,
            category: true,
            priceRange: true,
            prescriptionRequired: true,
          },
        },
      },
      orderBy: {
        lastUpdated: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      inventory,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error: any) {
    // Handle validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { 
          error: 'VALIDATION_ERROR', 
          message: 'Invalid query parameters',
          details: error.errors,
          statusCode: 400 
        },
        { status: 400 }
      );
    }

    // Handle JWT errors
    if (error.message?.includes('jwt') || error.message?.includes('token')) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Invalid or expired token', statusCode: 401 },
        { status: 401 }
      );
    }

    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch inventory', statusCode: 500 },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory
 * Add a medicine to pharmacy inventory
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.8
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth token from cookie
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 },
        { status: 401 }
      );
    }

    // Verify JWT and get user info
    const payload = await verifyJWT(token);
    
    // Ensure user is a pharmacy
    if (payload.role !== 'PHARMACY') {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Pharmacy access required', statusCode: 403 },
        { status: 403 }
      );
    }

    // Get pharmacy record
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { userId: payload.userId }
    });

    if (!pharmacy) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Pharmacy not found', statusCode: 404 },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createInventorySchema.parse(body) as CreateInventoryInput;
    const { medicineId, quantity } = validatedData;

    // Verify medicine exists
    const medicine = await prisma.medicine.findUnique({
      where: { id: medicineId }
    });

    if (!medicine) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Medicine not found', statusCode: 404 },
        { status: 404 }
      );
    }

    // Check if inventory item already exists
    const existingInventory = await prisma.inventory.findUnique({
      where: {
        pharmacyId_medicineId: {
          pharmacyId: pharmacy.id,
          medicineId,
        },
      },
    });

    if (existingInventory) {
      return NextResponse.json(
        { 
          error: 'CONFLICT', 
          message: 'Medicine already exists in inventory. Use PUT to update quantity.',
          statusCode: 409 
        },
        { status: 409 }
      );
    }

    // Calculate stock status based on quantity
    const status = calculateStockStatus(quantity);

    // Create inventory record
    const inventory = await prisma.inventory.create({
      data: {
        pharmacyId: pharmacy.id,
        medicineId,
        quantity,
        status,
        lastUpdated: new Date(),
      },
      include: {
        medicine: {
          select: {
            id: true,
            name: true,
            activeIngredient: true,
            dosage: true,
            category: true,
            priceRange: true,
            prescriptionRequired: true,
          },
        },
      },
    });

    return NextResponse.json(
      { inventory },
      { status: 201 }
    );

  } catch (error: any) {
    // Handle validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { 
          error: 'VALIDATION_ERROR', 
          message: 'Invalid request data',
          details: error.errors,
          statusCode: 400 
        },
        { status: 400 }
      );
    }

    // Handle JWT errors
    if (error.message?.includes('jwt') || error.message?.includes('token')) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Invalid or expired token', statusCode: 401 },
        { status: 401 }
      );
    }

    console.error('Error creating inventory:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to create inventory', statusCode: 500 },
      { status: 500 }
    );
  }
}
