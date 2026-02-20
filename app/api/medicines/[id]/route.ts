import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateDistance } from '@/lib/utils';

/**
 * GET /api/medicines/[id]
 * Public endpoint - Get medicine details with pharmacy availability
 * Requirements: 10.4, 10.5, 10.6, 10.10
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    
    // Optional patient coordinates for distance calculation
    const patientLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
    const patientLon = searchParams.get('lon') ? parseFloat(searchParams.get('lon')!) : null;
    
    // Get medicine details
    const medicine = await prisma.medicine.findUnique({
      where: { id },
    });
    
    if (!medicine) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: 'Medicine not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }
    
    // Get all pharmacies that have this medicine in stock
    const inventory = await prisma.inventory.findMany({
      where: {
        medicineId: id,
        quantity: {
          gt: 0, // Only show pharmacies with stock
        },
      },
      include: {
        pharmacy: {
          where: {
            isApproved: true, // Only show approved pharmacies
          },
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            latitude: true,
            longitude: true,
            rating: true,
            workingHours: true,
          },
        },
      },
    });
    
    // Build pharmacy availability list with distance calculation
    const availability = inventory
      .filter(item => item.pharmacy) // Filter out null pharmacies (unapproved)
      .map(item => {
        const pharmacy = item.pharmacy!;
        
        // Calculate distance if patient coordinates provided
        let distance = null;
        if (patientLat !== null && patientLon !== null) {
          distance = calculateDistance(
            patientLat,
            patientLon,
            pharmacy.latitude,
            pharmacy.longitude
          );
        }
        
        return {
          pharmacyId: pharmacy.id,
          pharmacyName: pharmacy.name,
          address: pharmacy.address,
          phone: pharmacy.phone,
          latitude: pharmacy.latitude,
          longitude: pharmacy.longitude,
          rating: pharmacy.rating,
          workingHours: pharmacy.workingHours,
          stockStatus: item.status,
          quantity: item.quantity,
          distance,
        };
      });
    
    return NextResponse.json(
      {
        medicine,
        availability,
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Get medicine details error:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching medicine details',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
