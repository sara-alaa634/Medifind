import { NextRequest, NextResponse } from 'next/server';
import { checkReservationTimeouts } from '@/services/reservationService';

/**
 * API endpoint for checking reservation timeouts
 * 
 * This endpoint should be called periodically by a cron job service
 * (e.g., Vercel Cron, GitHub Actions, external cron service)
 * 
 * For security, you can add authorization via:
 * - API key in Authorization header
 * - Vercel Cron Secret header
 * - IP whitelist
 * 
 * Example cron schedule: Every 1 minute
 * Vercel cron: "* * * * *"
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authorization check
    // const authHeader = request.headers.get('authorization');
    // const cronSecret = process.env.CRON_SECRET;
    // if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Check for timed-out reservations
    const updatedReservationIds = await checkReservationTimeouts();

    return NextResponse.json({
      success: true,
      message: `Processed ${updatedReservationIds.length} timed-out reservations`,
      updatedReservationIds,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking reservation timeouts:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check reservation timeouts',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility with different cron services
export async function POST(request: NextRequest) {
  return GET(request);
}
