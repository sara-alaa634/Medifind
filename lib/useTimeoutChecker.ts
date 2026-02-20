import { useEffect } from 'react';

/**
 * Custom hook to periodically check for reservation timeouts
 * 
 * This hook calls the timeout check endpoint every 60 seconds
 * when the component is mounted. It's designed to be used in
 * the main layout or app component.
 * 
 * The endpoint is idempotent, so multiple instances calling it
 * simultaneously is safe and won't cause issues.
 */
export function useTimeoutChecker() {
  useEffect(() => {
    // Check immediately on mount
    checkTimeouts();

    // Then check every 60 seconds
    const interval = setInterval(() => {
      checkTimeouts();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []);
}

async function checkTimeouts() {
  try {
    const response = await fetch('/api/cron/check-timeouts');
    
    if (!response.ok) {
      console.error('Failed to check timeouts:', response.statusText);
      return;
    }

    const result = await response.json();
    
    // Log only if reservations were updated (to avoid noise)
    if (result.updatedReservationIds?.length > 0) {
      console.log(
        `Updated ${result.updatedReservationIds.length} timed-out reservations`
      );
    }
  } catch (error) {
    // Silently fail - don't disrupt user experience
    console.error('Error checking timeouts:', error);
  }
}
