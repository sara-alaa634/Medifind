/**
 * JWT utilities for middleware (Edge Runtime compatible)
 * 
 * This file contains only JWT functions without bcrypt dependency
 * so it can be used in Next.js middleware (Edge Runtime)
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export interface JWTPayload {
  userId: string;
  role: 'PATIENT' | 'PHARMACY' | 'ADMIN';
  iat: number;
  exp: number;
}

/**
 * Verify JWT token
 * Edge Runtime compatible (no bcrypt dependency)
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return payload;
  } catch (error) {
    throw error;
  }
}

/**
 * Generate JWT token
 * Edge Runtime compatible (no bcrypt dependency)
 */
export function generateJWT(userId: string, role: 'PATIENT' | 'PHARMACY' | 'ADMIN'): string {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}
