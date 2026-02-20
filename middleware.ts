import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from './lib/jwt';
import { prisma } from './lib/prisma';

/**
 * Next.js middleware for authentication and authorization
 * Protects routes based on user role and pharmacy approval status
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const path = request.nextUrl.pathname;

  // Allow public routes
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/pharmacy', // Pharmacy login page
    '/admin', // Admin login page
  ];

  // Check if current path is a public route
  if (publicRoutes.includes(path)) {
    return NextResponse.next();
  }

  // Check if route requires authentication
  const isProtectedRoute = 
    path.startsWith('/patient') ||
    path.startsWith('/pharmacy/') || // Pharmacy dashboard and sub-routes
    path.startsWith('/admin/') || // Admin panel and sub-routes
    path.startsWith('/api/reservations') ||
    path.startsWith('/api/inventory') ||
    path.startsWith('/api/profile') ||
    path.startsWith('/api/notifications') ||
    path.startsWith('/api/direct-calls') ||
    path.startsWith('/api/analytics') ||
    (path.startsWith('/api/medicines') && request.method !== 'GET'); // POST/PUT/DELETE require auth

  // Allow public routes
  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Require authentication for protected routes
  if (!token) {
    // For API routes, return 401
    if (path.startsWith('/api/')) {
      return NextResponse.json(
        { 
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          statusCode: 401 
        },
        { status: 401 }
      );
    }
    
    // For page routes, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify JWT token
  try {
    const payload = await verifyJWT(token);
    
    // Role-based route protection
    if (path.startsWith('/pharmacy/') || path.startsWith('/api/inventory')) {
      if (payload.role !== 'PHARMACY') {
        return createForbiddenResponse(path, 'Pharmacy access required');
      }
      
      // Check pharmacy approval status
      const pharmacy = await prisma.pharmacy.findUnique({
        where: { userId: payload.userId }
      });
      
      if (!pharmacy?.isApproved) {
        return createForbiddenResponse(path, 'Pharmacy not approved');
      }
    }
    
    if (path.startsWith('/admin/')) {
      if (payload.role !== 'ADMIN') {
        return createForbiddenResponse(path, 'Admin access required');
      }
    }
    
    if (path.startsWith('/patient')) {
      if (payload.role !== 'PATIENT') {
        return createForbiddenResponse(path, 'Patient access required');
      }
    }
    
    // API route authorization
    if (path.startsWith('/api/analytics/pharmacy')) {
      if (payload.role !== 'PHARMACY') {
        return createForbiddenResponse(path, 'Pharmacy access required');
      }
      
      // Check pharmacy approval status
      const pharmacy = await prisma.pharmacy.findUnique({
        where: { userId: payload.userId }
      });
      
      if (!pharmacy?.isApproved) {
        return createForbiddenResponse(path, 'Pharmacy not approved');
      }
    }
    
    if (path.startsWith('/api/analytics/admin')) {
      if (payload.role !== 'ADMIN') {
        return createForbiddenResponse(path, 'Admin access required');
      }
    }
    
    // Medicine API routes (POST/PUT/DELETE require admin)
    if (path.startsWith('/api/medicines') && request.method !== 'GET') {
      if (payload.role !== 'ADMIN') {
        return createForbiddenResponse(path, 'Admin access required');
      }
    }
    
    // Allow authenticated request to proceed
    const response = NextResponse.next();
    
    // Add user info to request headers for API routes
    response.headers.set('x-user-id', payload.userId);
    response.headers.set('x-user-role', payload.role);
    
    return response;
    
  } catch (error) {
    // Invalid or expired token
    if (path.startsWith('/api/')) {
      return NextResponse.json(
        { 
          error: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
          statusCode: 401 
        },
        { status: 401 }
      );
    }
    
    // For page routes, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

/**
 * Helper function to create forbidden response
 */
function createForbiddenResponse(path: string, message: string): NextResponse {
  if (path.startsWith('/api/')) {
    return NextResponse.json(
      { 
        error: 'FORBIDDEN',
        message,
        statusCode: 403 
      },
      { status: 403 }
    );
  }
  
  // For page routes, redirect to login with error
  const url = new URL('/login', 'http://localhost:3000');
  url.searchParams.set('error', 'forbidden');
  return NextResponse.redirect(url);
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    // Page routes (excluding login pages /admin and /pharmacy)
    '/patient/:path*',
    '/pharmacy/dashboard/:path*',
    '/pharmacy/inventory/:path*',
    '/pharmacy/profile/:path*',
    '/pharmacy/reservations/:path*',
    '/admin/analytics/:path*',
    '/admin/medicines/:path*',
    '/admin/pharmacies/:path*',
    // API routes
    '/api/reservations/:path*',
    '/api/inventory/:path*',
    '/api/profile/:path*',
    '/api/notifications/:path*',
    '/api/direct-calls/:path*',
    '/api/analytics/:path*',
  ],
};
