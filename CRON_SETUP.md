# Reservation Timeout Cron Job Setup

This document explains how to set up the reservation timeout checking mechanism for the MediFind application.

## Overview

The system needs to periodically check for reservations that have been in PENDING status for more than 5 minutes and update them to NO_RESPONSE status. This is handled by the `/api/cron/check-timeouts` endpoint.

## Endpoint Details

- **URL**: `GET /api/cron/check-timeouts` or `POST /api/cron/check-timeouts`
- **Authentication**: Optional (can be secured with API key or cron secret)
- **Response**: JSON with count of updated reservations

## Setup Options

### Option 1: Vercel Cron (Recommended for Vercel Deployments)

1. Create a `vercel.json` file in the project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-timeouts",
      "schedule": "* * * * *"
    }
  ]
}
```

2. The cron job will run every minute automatically on Vercel.

3. (Optional) Add security with Vercel Cron Secret:
   - Vercel automatically adds `x-vercel-cron-secret` header
   - Update the route to verify this header

### Option 2: External Cron Service (cron-job.org, EasyCron, etc.)

1. Sign up for a cron service
2. Create a new cron job with:
   - URL: `https://your-domain.com/api/cron/check-timeouts`
   - Method: GET or POST
   - Schedule: Every 1 minute (`* * * * *`)
   - (Optional) Add Authorization header with API key

3. Add environment variable for security:
```env
CRON_SECRET=your-secret-key-here
```

4. Uncomment the authorization check in the route handler

### Option 3: GitHub Actions (For Testing/Development)

1. Create `.github/workflows/check-timeouts.yml`:

```yaml
name: Check Reservation Timeouts

on:
  schedule:
    - cron: '* * * * *'  # Every minute
  workflow_dispatch:  # Allow manual trigger

jobs:
  check-timeouts:
    runs-on: ubuntu-latest
    steps:
      - name: Call timeout check endpoint
        run: |
          curl -X GET https://your-domain.com/api/cron/check-timeouts \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

2. Add `CRON_SECRET` to GitHub repository secrets

### Option 4: Client-Side Polling (Development/Testing Only)

For development or testing, you can implement client-side polling:

```typescript
// In a React component or service
useEffect(() => {
  const interval = setInterval(async () => {
    try {
      await fetch('/api/cron/check-timeouts');
    } catch (error) {
      console.error('Failed to check timeouts:', error);
    }
  }, 60000); // Every 60 seconds

  return () => clearInterval(interval);
}, []);
```

**Note**: This is NOT recommended for production as it requires an active user session.

## Security Recommendations

### Add API Key Authentication

Uncomment and configure the authorization check in `app/api/cron/check-timeouts/route.ts`:

```typescript
const authHeader = request.headers.get('authorization');
const cronSecret = process.env.CRON_SECRET;

if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

Then add to `.env.local`:
```env
CRON_SECRET=your-secure-random-string-here
```

### Vercel Cron Secret Verification

For Vercel deployments, verify the Vercel-provided secret:

```typescript
const cronSecret = request.headers.get('x-vercel-cron-secret');
if (cronSecret !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## Testing

### Manual Testing

Call the endpoint manually to test:

```bash
# Without authentication
curl http://localhost:3000/api/cron/check-timeouts

# With authentication
curl http://localhost:3000/api/cron/check-timeouts \
  -H "Authorization: Bearer your-secret-key"
```

### Automated Testing

Create a test reservation and wait 5 minutes to verify the timeout mechanism:

```typescript
// Create a test reservation
const reservation = await prisma.reservation.create({
  data: {
    userId: 'test-user-id',
    pharmacyId: 'test-pharmacy-id',
    medicineId: 'test-medicine-id',
    quantity: 1,
    status: 'PENDING',
    requestTime: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes ago
  },
});

// Call the endpoint
const response = await fetch('/api/cron/check-timeouts');
const result = await response.json();

// Verify the reservation was updated
const updated = await prisma.reservation.findUnique({
  where: { id: reservation.id },
});
expect(updated.status).toBe('NO_RESPONSE');
```

## Monitoring

Monitor the cron job execution:

1. Check application logs for timeout processing
2. Monitor the response from the endpoint
3. Set up alerts for failures (e.g., via Sentry, LogRocket)
4. Track NO_RESPONSE count in analytics dashboard

## Troubleshooting

### Cron job not running
- Verify the cron schedule syntax
- Check service logs for errors
- Ensure the endpoint is accessible (not behind auth middleware)

### Reservations not updating
- Check database connection
- Verify Prisma schema is up to date
- Check for errors in application logs
- Ensure notification service is working

### Performance issues
- Consider batching updates if processing many reservations
- Add database indexes on `status` and `requestTime` columns
- Monitor endpoint response time
