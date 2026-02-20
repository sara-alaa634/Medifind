/**
 * Centralized error handling utilities for the MediFind application
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
  timestamp: string;
}

/**
 * Error types for classification
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  DATABASE = 'DATABASE_ERROR',
  INTERNAL = 'INTERNAL_SERVER_ERROR',
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Log error with context
 * Requirement: 17.6
 */
function logError(error: Error | AppError, context?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...(error instanceof AppError && {
      type: error.type,
      statusCode: error.statusCode,
      details: error.details,
    }),
    ...context,
  };

  // In production, this would send to a logging service (e.g., Sentry, CloudWatch)
  console.error('[ERROR]', JSON.stringify(errorInfo, null, 2));
}

/**
 * Create standardized error response
 */
function createErrorResponse(
  type: ErrorType,
  statusCode: number,
  message: string,
  details?: unknown
): NextResponse<ErrorResponse> {
  const response: ErrorResponse = {
    error: type,
    message,
    timestamp: new Date().toISOString(),
  };

  if (details && process.env.NODE_ENV !== 'production') {
    response.details = details;
  }

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Handle validation errors (400)
 * Requirement: 17.1
 */
export function handleValidationError(error: ZodError): NextResponse<ErrorResponse> {
  logError(error, { type: ErrorType.VALIDATION });

  const fieldErrors = error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  return createErrorResponse(
    ErrorType.VALIDATION,
    400,
    'Validation failed',
    fieldErrors
  );
}

/**
 * Handle authentication errors (401)
 * Requirement: 17.2
 */
export function handleAuthenticationError(
  message: string = 'Authentication required'
): NextResponse<ErrorResponse> {
  const error = new AppError(ErrorType.AUTHENTICATION, 401, message);
  logError(error);

  return createErrorResponse(
    ErrorType.AUTHENTICATION,
    401,
    message
  );
}

/**
 * Handle authorization errors (403)
 * Requirement: 17.3
 */
export function handleAuthorizationError(
  message: string = 'Access forbidden'
): NextResponse<ErrorResponse> {
  const error = new AppError(ErrorType.AUTHORIZATION, 403, message);
  logError(error);

  return createErrorResponse(
    ErrorType.AUTHORIZATION,
    403,
    message
  );
}

/**
 * Handle not found errors (404)
 * Requirement: 17.4
 */
export function handleNotFoundError(
  resource: string = 'Resource'
): NextResponse<ErrorResponse> {
  const message = `${resource} not found`;
  const error = new AppError(ErrorType.NOT_FOUND, 404, message);
  logError(error);

  return createErrorResponse(
    ErrorType.NOT_FOUND,
    404,
    message
  );
}

/**
 * Handle database errors (500)
 * Requirement: 17.5
 */
export function handleDatabaseError(error: unknown): NextResponse<ErrorResponse> {
  let message = 'Database operation failed';
  let details: unknown;

  // Handle Prisma-specific errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        message = 'A record with this value already exists';
        details = { field: error.meta?.target };
        break;
      case 'P2025':
        message = 'Record not found';
        break;
      case 'P2003':
        message = 'Foreign key constraint failed';
        break;
      default:
        message = 'Database constraint violation';
    }
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    message = 'Invalid database query';
  }

  const appError = new AppError(ErrorType.DATABASE, 500, message, details);
  logError(appError, { originalError: error });

  // Don't expose internal database details in production
  return createErrorResponse(
    ErrorType.DATABASE,
    500,
    message,
    process.env.NODE_ENV !== 'production' ? details : undefined
  );
}

/**
 * Handle unexpected errors (500)
 * Requirement: 17.6
 */
export function handleInternalError(error: unknown): NextResponse<ErrorResponse> {
  const message = 'An unexpected error occurred';
  
  if (error instanceof Error) {
    logError(error, { type: ErrorType.INTERNAL });
  } else {
    console.error('[ERROR] Unknown error type:', error);
  }

  return createErrorResponse(
    ErrorType.INTERNAL,
    500,
    message
  );
}

/**
 * Main error handler - routes errors to appropriate handlers
 * Requirement: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6
 */
export function handleError(error: unknown): NextResponse<ErrorResponse> {
  // Zod validation errors
  if (error instanceof ZodError) {
    return handleValidationError(error);
  }

  // Custom application errors
  if (error instanceof AppError) {
    logError(error);
    return createErrorResponse(
      error.type,
      error.statusCode,
      error.message,
      error.details
    );
  }

  // Prisma database errors
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientInitializationError
  ) {
    return handleDatabaseError(error);
  }

  // Generic errors
  if (error instanceof Error) {
    // Check for specific error messages to classify
    if (error.message.includes('authentication') || error.message.includes('token')) {
      return handleAuthenticationError(error.message);
    }
    if (error.message.includes('authorization') || error.message.includes('forbidden')) {
      return handleAuthorizationError(error.message);
    }
    if (error.message.includes('not found')) {
      return handleNotFoundError();
    }
  }

  // Fallback to internal server error
  return handleInternalError(error);
}

/**
 * Async error wrapper for API routes
 * Wraps async route handlers to catch and handle errors automatically
 */
export function withErrorHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error);
    }
  };
}
