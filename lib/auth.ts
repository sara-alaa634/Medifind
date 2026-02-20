import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';
import { generateJWT as generateJWTToken, verifyJWT as verifyJWTToken, JWTPayload } from './jwt';

const SALT_ROUNDS = 10;

export type UserRole = 'PATIENT' | 'PHARMACY' | 'ADMIN';

/**
 * Export JWTPayload type from jwt.ts
 */
export type { JWTPayload };

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a bcrypt hash
 * @param password - Plain text password
 * @param hash - Bcrypt hash to compare against
 * @returns True if password matches hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user
 * Re-exported from jwt.ts (Edge Runtime compatible)
 * @param userId - User ID
 * @param role - User role
 * @returns JWT token string
 */
export function generateJWT(userId: string, role: UserRole): string {
  return generateJWTToken(userId, role);
}

/**
 * Verify and decode a JWT token
 * Re-exported from jwt.ts (Edge Runtime compatible)
 * @param token - JWT token string
 * @returns Decoded JWT payload
 * @throws Error if token is invalid or expired
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  return verifyJWTToken(token);
}

/**
 * Set authentication cookie in response
 * @param response - Next.js response object
 * @param token - JWT token to set
 */
export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

/**
 * Clear authentication cookie from response
 * @param response - Next.js response object
 */
export function clearAuthCookie(response: NextResponse): void {
  response.cookies.delete('auth-token');
}
