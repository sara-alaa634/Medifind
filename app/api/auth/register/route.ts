import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { registerSchema } from '@/lib/validation';
import { sanitizeString, sanitizeEmail, sanitizePhoneNumber } from '@/lib/utils';
import { handleError } from '@/lib/errorHandler';

/**
 * POST /api/auth/register
 * Register a new user account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return handleError(validationResult.error);
    }
    
    const { email, password, name, phone, role, pharmacyData } = validationResult.data;
    
    // Sanitize user input to prevent XSS (Requirement: 17.9, 17.10)
    const sanitizedEmail = sanitizeEmail(email);
    const sanitizedName = sanitizeString(name);
    const sanitizedPhone = phone ? sanitizePhoneNumber(phone) : undefined;
    
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });
    
    if (existingUser) {
      return NextResponse.json(
        {
          error: 'EMAIL_EXISTS',
          message: 'Email already exists',
          statusCode: 400,
        },
        { status: 400 }
      );
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Determine user role (default to PATIENT)
    const userRole = role || 'PATIENT';
    
    // Create user and pharmacy (if applicable) in a transaction
    if (userRole === 'PHARMACY' && pharmacyData) {
      // Sanitize pharmacy data
      const sanitizedPharmacyData = {
        name: sanitizeString(pharmacyData.name),
        address: sanitizeString(pharmacyData.address),
        phone: sanitizePhoneNumber(pharmacyData.phone),
        latitude: pharmacyData.latitude,
        longitude: pharmacyData.longitude,
        workingHours: sanitizeString(pharmacyData.workingHours),
      };
      
      // Create user and pharmacy together
      const user = await prisma.user.create({
        data: {
          email: sanitizedEmail,
          password: hashedPassword,
          name: sanitizedName,
          phone: sanitizedPhone,
          role: userRole,
          pharmacy: {
            create: {
              name: sanitizedPharmacyData.name,
              address: sanitizedPharmacyData.address,
              phone: sanitizedPharmacyData.phone,
              latitude: sanitizedPharmacyData.latitude,
              longitude: sanitizedPharmacyData.longitude,
              workingHours: sanitizedPharmacyData.workingHours,
              isApproved: false, // Default to not approved
            },
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          avatar: true,
          createdAt: true,
        },
      });
      
      return NextResponse.json(
        {
          success: true,
          message: 'Pharmacy registration successful. Awaiting admin approval.',
          user,
        },
        { status: 201 }
      );
    } else {
      // Create regular user (patient or admin)
      const user = await prisma.user.create({
        data: {
          email: sanitizedEmail,
          password: hashedPassword,
          name: sanitizedName,
          phone: sanitizedPhone,
          role: userRole,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          avatar: true,
          createdAt: true,
        },
      });
      
      return NextResponse.json(
        {
          success: true,
          message: 'Registration successful',
          user,
        },
        { status: 201 }
      );
    }
    
  } catch (error) {
    return handleError(error);
  }
}
