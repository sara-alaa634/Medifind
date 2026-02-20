/**
 * Utility functions for the MediFind application
 */

/**
 * Convert degrees to radians
 */
function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two geographic coordinates using Haversine formula
 * Returns distance in kilometers
 * 
 * Requirements: 10.6
 * 
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Input sanitization utilities to prevent XSS attacks
 * Requirements: 17.9, 17.10
 */

/**
 * Sanitize string input to prevent XSS attacks
 * Escapes HTML special characters
 * Requirement: 17.10
 * 
 * @param input - Raw string input from user
 * @returns Sanitized string safe for display
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize object with string values
 * Recursively sanitizes all string properties
 * Requirement: 17.10
 * 
 * @param obj - Object with potentially unsafe string values
 * @returns Object with sanitized string values
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = {} as T;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeString(value) as T[keyof T];
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key as keyof T] = sanitizeObject(value as Record<string, unknown>) as T[keyof T];
    } else if (Array.isArray(value)) {
      sanitized[key as keyof T] = value.map((item) =>
        typeof item === 'string'
          ? sanitizeString(item)
          : item && typeof item === 'object'
          ? sanitizeObject(item as Record<string, unknown>)
          : item
      ) as T[keyof T];
    } else {
      sanitized[key as keyof T] = value as T[keyof T];
    }
  }

  return sanitized;
}

/**
 * Strip HTML tags from string
 * Removes all HTML/XML tags from input
 * Requirement: 17.10
 * 
 * @param input - String potentially containing HTML tags
 * @returns String with all HTML tags removed
 */
export function stripHtmlTags(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize search query
 * Removes special characters that could be used for injection
 * Requirement: 17.9
 * 
 * @param query - Search query string
 * @returns Sanitized search query
 */
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') {
    return '';
  }

  // Remove SQL injection attempts and special characters
  // Keep alphanumeric, spaces, hyphens, and basic punctuation
  return query
    .replace(/[^\w\s\-.,()]/g, '')
    .trim()
    .slice(0, 200); // Limit length to prevent DoS
}

/**
 * Validate and sanitize email
 * Basic email format validation and sanitization
 * Requirement: 17.9
 * 
 * @param email - Email address to sanitize
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }

  const sanitized = email.toLowerCase().trim();
  
  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return emailRegex.test(sanitized) ? sanitized : '';
}

/**
 * Sanitize phone number
 * Removes non-numeric characters except + and spaces
 * Requirement: 17.9
 * 
 * @param phone - Phone number to sanitize
 * @returns Sanitized phone number
 */
export function sanitizePhoneNumber(phone: string): string {
  if (typeof phone !== 'string') {
    return '';
  }

  // Keep only digits, +, spaces, hyphens, and parentheses
  return phone.replace(/[^\d+\s\-()]/g, '').trim();
}

/**
 * Sanitize URL
 * Validates and sanitizes URL input
 * Requirement: 17.9, 17.10
 * 
 * @param url - URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') {
    return '';
  }

  try {
    const parsed = new URL(url);
    
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Sanitize filename
 * Removes path traversal attempts and dangerous characters
 * Requirement: 17.9
 * 
 * @param filename - Filename to sanitize
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') {
    return '';
  }

  // Remove path traversal attempts and dangerous characters
  return filename
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    .replace(/[<>:"|?*]/g, '')
    .trim()
    .slice(0, 255); // Limit filename length
}
