import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from './lib/jwt';
import { prisma } from './lib/prisma';

/**
 * Next.js middleware for authentication and authorization
 * COMPLETELY DISABLED FOR DEBUGGING
 */
export async function middleware(request: NextRequest) {
  // Middleware is disabled - just pass through
  return NextResponse.next();
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
 * COMPLETELY DISABLED
 */
export const config = {
  matcher: [],
};
