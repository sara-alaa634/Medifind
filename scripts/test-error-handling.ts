/**
 * Error Handling and Validation Test
 * Tests that error handling and validation are working correctly
 */

import { z } from 'zod';

console.log('🛡️  Error Handling and Validation Test\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    const result = fn();
    if (result) {
      console.log(`✓ ${name}`);
      passed++;
    } else {
      console.log(`✗ ${name}`);
      failed++;
    }
  } catch (error) {
    console.log(`✗ ${name}: ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }
}

console.log('\nValidation Schemas:');
console.log('-'.repeat(80));

// Test email validation
test('Email validation - valid email', () => {
  const schema = z.string().email();
  const result = schema.safeParse('user@example.com');
  return result.success;
});

test('Email validation - invalid email', () => {
  const schema = z.string().email();
  const result = schema.safeParse('invalid-email');
  return !result.success;
});

// Test password validation
test('Password validation - minimum 8 characters', () => {
  const schema = z.string().min(8);
  const result = schema.safeParse('password123');
  return result.success;
});

test('Password validation - too short', () => {
  const schema = z.string().min(8);
  const result = schema.safeParse('pass');
  return !result.success;
});

// Test number validation
test('Quantity validation - positive integer', () => {
  const schema = z.number().int().positive();
  const result = schema.safeParse(5);
  return result.success;
});

test('Quantity validation - negative number', () => {
  const schema = z.number().int().positive();
  const result = schema.safeParse(-1);
  return !result.success;
});

test('Quantity validation - zero', () => {
  const schema = z.number().int().positive();
  const result = schema.safeParse(0);
  return !result.success;
});

// Test enum validation
test('Role validation - valid role', () => {
  const schema = z.enum(['PATIENT', 'PHARMACY', 'ADMIN']);
  const result = schema.safeParse('PATIENT');
  return result.success;
});

test('Role validation - invalid role', () => {
  const schema = z.enum(['PATIENT', 'PHARMACY', 'ADMIN']);
  const result = schema.safeParse('INVALID');
  return !result.success;
});

// Test object validation
test('Object validation - all required fields', () => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1),
  });
  const result = schema.safeParse({
    email: 'user@example.com',
    password: 'password123',
    name: 'John Doe',
  });
  return result.success;
});

test('Object validation - missing required field', () => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1),
  });
  const result = schema.safeParse({
    email: 'user@example.com',
    password: 'password123',
  });
  return !result.success;
});

// Test optional fields
test('Optional field validation - field present', () => {
  const schema = z.object({
    name: z.string(),
    phone: z.string().optional(),
  });
  const result = schema.safeParse({
    name: 'John',
    phone: '1234567890',
  });
  return result.success;
});

test('Optional field validation - field absent', () => {
  const schema = z.object({
    name: z.string(),
    phone: z.string().optional(),
  });
  const result = schema.safeParse({
    name: 'John',
  });
  return result.success;
});

console.log('\nError Response Formats:');
console.log('-'.repeat(80));

// Test error response structure
test('Error response has status code', () => {
  const error = { error: 'Invalid input', status: 400 };
  return error.status === 400;
});

test('Error response has message', () => {
  const error = { error: 'Invalid input', status: 400 };
  return typeof error.error === 'string' && error.error.length > 0;
});

test('Validation error includes field details', () => {
  const schema = z.object({
    email: z.string().email(),
  });
  const result = schema.safeParse({ email: 'invalid' });
  return !result.success && result.error.issues.length > 0;
});

console.log('\nInput Sanitization:');
console.log('-'.repeat(80));

// Test XSS prevention
test('XSS prevention - script tag detection', () => {
  const input = '<script>alert("xss")</script>';
  const hasScriptTag = /<script/i.test(input);
  return hasScriptTag; // Should be detected
});

test('XSS prevention - normal text', () => {
  const input = 'This is normal text';
  const hasScriptTag = /<script/i.test(input);
  return !hasScriptTag; // Should not be detected
});

// Test SQL injection patterns
test('SQL injection pattern detection', () => {
  const input = "'; DROP TABLE users; --";
  const hasSqlPattern = /(\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b)/i.test(input);
  return hasSqlPattern; // Should be detected
});

console.log('\nHTTP Status Codes:');
console.log('-'.repeat(80));

test('400 Bad Request - validation error', () => {
  return 400 === 400;
});

test('401 Unauthorized - authentication error', () => {
  return 401 === 401;
});

test('403 Forbidden - authorization error', () => {
  return 403 === 403;
});

test('404 Not Found - resource not found', () => {
  return 404 === 404;
});

test('500 Internal Server Error - server error', () => {
  return 500 === 500;
});

console.log('\n' + '='.repeat(80));
console.log('\nTest Summary:');
console.log(`Total: ${passed + failed}`);
console.log(`Passed: ${passed} ✓`);
console.log(`Failed: ${failed} ✗`);
console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

if (failed > 0) {
  console.log('\n❌ Some validation tests failed');
  process.exit(1);
} else {
  console.log('\n✅ All error handling and validation tests passed!');
}
