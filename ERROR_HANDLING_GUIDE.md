# Error Handling and Input Sanitization Guide

This guide explains how to apply centralized error handling and input sanitization across all API routes in the MediFind application.

## Requirements Addressed

- **17.1**: Validation errors (400)
- **17.2**: Authentication errors (401)
- **17.3**: Authorization errors (403)
- **17.4**: Not found errors (404)
- **17.5**: Database errors (500)
- **17.6**: Error logging with context
- **17.9**: SQL injection prevention
- **17.10**: XSS attack prevention

## Error Handler Usage

### Import Error Handlers

```typescript
import { 
  handleError, 
  handleAuthenticationError, 
  handleAuthorizationError,
  handleNotFoundError,
  withErrorHandler 
} from '@/lib/errorHandler';
```

### Basic Pattern

Replace manual error responses with centralized handlers:

**Before:**
```typescript
try {
  // ... code
} catch (error) {
  console.error('Error:', error);
  return NextResponse.json(
    { error: 'INTERNAL_ERROR', message: 'Something went wrong' },
    { status: 500 }
  );
}
```

**After:**
```typescript
try {
  // ... code
} catch (error) {
  return handleError(error);
}
```

### Validation Errors

**Before:**
```typescript
const validationResult = schema.safeParse(body);
if (!validationResult.success) {
  return NextResponse.json(
    { error: 'VALIDATION_ERROR', details: validationResult.error.errors },
    { status: 400 }
  );
}
```

**After:**
```typescript
const validationResult = schema.safeParse(body);
if (!validationResult.success) {
  return handleError(validationResult.error);
}
```

### Authentication Errors

**Before:**
```typescript
if (!token) {
  return NextResponse.json(
    { error: 'UNAUTHORIZED', message: 'Authentication required' },
    { status: 401 }
  );
}
```

**After:**
```typescript
if (!token) {
  return handleAuthenticationError('Authentication required');
}
```

### Authorization Errors

**Before:**
```typescript
if (payload.role !== 'ADMIN') {
  return NextResponse.json(
    { error: 'FORBIDDEN', message: 'Admin access required' },
    { status: 403 }
  );
}
```

**After:**
```typescript
if (payload.role !== 'ADMIN') {
  return handleAuthorizationError('Admin access required');
}
```

### Not Found Errors

**Before:**
```typescript
if (!resource) {
  return NextResponse.json(
    { error: 'NOT_FOUND', message: 'Resource not found' },
    { status: 404 }
  );
}
```

**After:**
```typescript
if (!resource) {
  return handleNotFoundError('Resource');
}
```

## Input Sanitization Usage

### Import Sanitization Functions

```typescript
import { 
  sanitizeString,
  sanitizeEmail,
  sanitizePhoneNumber,
  sanitizeSearchQuery,
  sanitizeObject,
  stripHtmlTags,
  sanitizeUrl,
  sanitizeFilename
} from '@/lib/utils';
```

### String Sanitization

Use `sanitizeString()` for all user-provided text fields:

```typescript
const sanitizedName = sanitizeString(data.name);
const sanitizedAddress = sanitizeString(data.address);
```

### Email Sanitization

```typescript
const sanitizedEmail = sanitizeEmail(email);
```

### Phone Number Sanitization

```typescript
const sanitizedPhone = sanitizePhoneNumber(phone);
```

### Search Query Sanitization

```typescript
const sanitizedSearch = sanitizeSearchQuery(searchQuery);
```

### Object Sanitization

For complex objects with multiple string fields:

```typescript
const sanitizedData = sanitizeObject(requestBody);
```

### URL Sanitization

```typescript
const sanitizedUrl = sanitizeUrl(userProvidedUrl);
```

### Filename Sanitization

```typescript
const sanitizedFilename = sanitizeFilename(uploadedFile.name);
```

## Complete Example

Here's a complete example of an API route with error handling and sanitization:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/jwt';
import { mySchema } from '@/lib/validation';
import { sanitizeString, sanitizeEmail } from '@/lib/utils';
import { 
  handleError, 
  handleAuthenticationError, 
  handleAuthorizationError 
} from '@/lib/errorHandler';

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return handleAuthenticationError('Authentication required');
    }
    
    // 2. Verify JWT
    let payload;
    try {
      payload = await verifyJWT(token);
    } catch (error) {
      return handleAuthenticationError('Invalid or expired token');
    }
    
    // 3. Authorization
    if (payload.role !== 'REQUIRED_ROLE') {
      return handleAuthorizationError('Insufficient permissions');
    }
    
    // 4. Parse and validate input
    const body = await request.json();
    const validationResult = mySchema.safeParse(body);
    if (!validationResult.success) {
      return handleError(validationResult.error);
    }
    
    const data = validationResult.data;
    
    // 5. Sanitize input
    const sanitizedData = {
      name: sanitizeString(data.name),
      email: sanitizeEmail(data.email),
      // ... other fields
    };
    
    // 6. Database operation
    const result = await prisma.myModel.create({
      data: sanitizedData,
    });
    
    // 7. Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Operation successful',
        data: result,
      },
      { status: 201 }
    );
    
  } catch (error) {
    // 8. Centralized error handling
    return handleError(error);
  }
}
```

## Migration Checklist

When updating existing API routes:

- [ ] Import error handlers from `@/lib/errorHandler`
- [ ] Import sanitization functions from `@/lib/utils`
- [ ] Replace validation error responses with `handleError(validationResult.error)`
- [ ] Replace authentication error responses with `handleAuthenticationError()`
- [ ] Replace authorization error responses with `handleAuthorizationError()`
- [ ] Replace not found error responses with `handleNotFoundError()`
- [ ] Replace catch block with `return handleError(error)`
- [ ] Sanitize all user input before database operations
- [ ] Sanitize search queries before database queries
- [ ] Test error responses to ensure proper format

## Error Response Format

All errors now return a consistent format:

```json
{
  "error": "ERROR_TYPE",
  "message": "Human-readable error message",
  "details": { /* Optional, only in development */ },
  "timestamp": "2024-02-20T10:30:00.000Z"
}
```

## Logging

All errors are automatically logged with context. In production, these logs should be sent to a logging service (e.g., Sentry, CloudWatch).

## Security Notes

1. **Never expose sensitive data** in error messages (e.g., database structure, internal paths)
2. **Always sanitize user input** before database operations
3. **Use parameterized queries** (Prisma handles this automatically)
4. **Validate file uploads** before processing
5. **Limit input length** to prevent DoS attacks (sanitization functions handle this)

## Testing Error Handling

Test that your API routes return proper error responses:

```typescript
// Test validation error
const response = await fetch('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify({ invalid: 'data' }),
});
expect(response.status).toBe(400);
expect(await response.json()).toMatchObject({
  error: 'VALIDATION_ERROR',
  message: expect.any(String),
});

// Test authentication error
const response = await fetch('/api/endpoint', {
  method: 'POST',
  // No auth token
});
expect(response.status).toBe(401);

// Test authorization error
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { Cookie: 'auth-token=patient-token' },
});
expect(response.status).toBe(403);
```

## Routes Updated

The following routes have been updated with error handling and sanitization:

- ✅ `/api/auth/register`
- ✅ `/api/auth/login`
- ✅ `/api/medicines` (GET and POST)

## Routes To Update

Apply the same pattern to these remaining routes:

- `/api/auth/logout`
- `/api/auth/me`
- `/api/medicines/[id]`
- `/api/pharmacies/*`
- `/api/inventory/*`
- `/api/reservations/*`
- `/api/notifications/*`
- `/api/direct-calls/*`
- `/api/analytics/*`
- `/api/profile/*`

Follow the pattern shown in the updated routes and this guide.
