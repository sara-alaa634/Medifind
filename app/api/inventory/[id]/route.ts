import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/jwt';
import { 
  updateInventorySchema,
  type UpdateInventoryInput 
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
 * PUT /api/inventory/[id]
 * Update inventory quantity and auto-update status
 * Requirements: 9.2, 9.3, 9.4, 9.5, 9.8
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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

    // Check if inventory item exists and belongs to this pharmacy
    const existingInventory = await prisma.inventory.findUnique({
      where: { id }
    });

    if (!existingInventory) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Inventory item not found', statusCode: 404 },
        { status: 404 }
      );
    }

    if (existingInventory.pharmacyId !== pharmacy.id) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Cannot update inventory for another pharmacy', statusCode: 403 },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateInventorySchema.parse(body) as UpdateInventoryInput;
    const { quantity } = validatedData;

    // Calculate new stock status based on quantity
    const status = calculateStockStatus(quantity);

    // Update inventory record
    const inventory = await prisma.inventory.update({
      where: { id },
      data: {
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

    return NextResponse.json({ inventory });

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

    console.error('Error updating inventory:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to update inventory', statusCode: 500 },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory/[id]
 * Remove a medicine from pharmacy inventory
 * Requirements: 9.7
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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

    // Check if inventory item exists and belongs to this pharmacy
    const existingInventory = await prisma.inventory.findUnique({
      where: { id }
    });

    if (!existingInventory) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Inventory item not found', statusCode: 404 },
        { status: 404 }
      );
    }

    if (existingInventory.pharmacyId !== pharmacy.id) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Cannot delete inventory for another pharmacy', statusCode: 403 },
        { status: 403 }
      );
    }

    // Delete inventory record
    await prisma.inventory.delete({
      where: { id }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Inventory item deleted successfully' 
    });

  } catch (error: any) {
    // Handle JWT errors
    if (error.message?.includes('jwt') || error.message?.includes('token')) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Invalid or expired token', statusCode: 401 },
        { status: 401 }
      );
    }

    console.error('Error deleting inventory:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to delete inventory', statusCode: 500 },
      { status: 500 }
    );
  }
}
