import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateJWT, setAuthCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import { sanitizeEmail } from '@/lib/utils';
import { handleError, handleAuthenticationError } from '@/lib/errorHandler';

/**
 * POST /api/auth/login
 * Authenticate user and create session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return handleError(validationResult.error);
    }
    
    const { email, password } = validationResult.data;
    
    // Sanitize email input (Requirement: 17.9)
    const sanitizedEmail = sanitizeEmail(email);
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
      include: {
        pharmacy: true,
      },
    });
    
    // Check if user exists
    if (!user) {
      return handleAuthenticationError('Invalid email or password');
    }
    
    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return handleAuthenticationError('Invalid email or password');
    }
    
    // Generate JWT token
    const token = generateJWT(user.id, user.role);
    
    // Create response with user data (excluding password)
    const response = NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          createdAt: user.createdAt,
          pharmacy: user.pharmacy ? {
            id: user.pharmacy.id,
            name: user.pharmacy.name,
            isApproved: user.pharmacy.isApproved,
          } : null,
        },
        token,
      },
      { status: 200 }
    );
    
    // Set httpOnly cookie
    setAuthCookie(response, token);
    
    return response;
    
  } catch (error) {
    return handleError(error);
  }
}
