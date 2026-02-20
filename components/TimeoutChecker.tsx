'use client';

import { useTimeoutChecker } from '@/lib/useTimeoutChecker';

/**
 * Client component that runs the timeout checker hook
 * 
 * This component should be included in the root layout to ensure
 * reservation timeouts are checked periodically while users are
 * browsing the application.
 */
export function TimeoutChecker() {
  useTimeoutChecker();
  return null; // This component doesn't render anything
}
