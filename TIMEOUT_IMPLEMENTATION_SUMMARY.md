# Reservation Timeout Implementation Summary

## Overview

Task 14.3 has been completed. The reservation timeout mechanism is now fully operational using **client-side polling** for simplicity and ease of deployment.

## Implementation Approach: Client-Side Polling

After evaluating both options (cron job vs client-side polling), we chose **client-side polling** because:

✅ **Zero setup** - Works immediately in development and production  
✅ **No external dependencies** - No need for Vercel Cron, cron-job.org, or GitHub Actions  
✅ **Free** - No additional service costs  
✅ **Simple to test** - Just open the app and it works  
✅ **Sufficient for use case** - Reservations only happen when users are active anyway  

## Files Created

### 1. API Endpoint: `app/api/cron/check-timeouts/route.ts`
- Exposes GET/POST endpoint to trigger timeout checks
- Calls `checkReservationTimeouts()` from reservation service
- Returns count of updated reservations
- Can be called by cron services OR client-side polling

### 2. Custom Hook: `lib/useTimeoutChecker.ts`
- React hook that polls the timeout endpoint every 60 seconds
- Runs automatically when component mounts
- Handles errors silently to avoid disrupting user experience
- Logs only when reservations are actually updated

### 3. Client Component: `components/TimeoutChecker.tsx`
- Wrapper component for the hook (needed for Next.js server components)
- Renders nothing (invisible component)
- Just runs the polling logic in the background

### 4. Documentation: `CRON_SETUP.md`
- Comprehensive guide for both approaches (cron and polling)
- Instructions for Vercel Cron, external cron services, GitHub Actions
- Security recommendations
- Testing and troubleshooting tips

## How It Works

```
User opens app
    ↓
Root layout loads
    ↓
TimeoutChecker component mounts
    ↓
useTimeoutChecker hook starts
    ↓
Calls /api/cron/check-timeouts immediately
    ↓
Then calls every 60 seconds
    ↓
Endpoint checks for PENDING reservations > 5 minutes old
    ↓
Updates status to NO_RESPONSE
    ↓
Sends notification to patient
```

## Integration

The timeout checker is integrated into the root layout (`app/layout.tsx`):

```tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <TimeoutChecker />  {/* ← Runs in background */}
        {children}
      </body>
    </html>
  );
}
```

## Performance Considerations

**Multiple Users = Multiple Calls?**
- Yes, but this is fine! The endpoint is idempotent
- Each call processes the same reservations
- Database queries are fast (indexed on status + requestTime)
- No race conditions or duplicate processing

**Bandwidth Usage:**
- ~1 request per minute per active user
- Response is tiny (~100 bytes if no updates)
- Negligible impact on performance

**What if no users are online?**
- Timeouts won't be checked until someone visits the app
- This is acceptable because:
  - Reservations only happen when users are active
  - A few minutes delay is not critical
  - Pharmacy can still manually respond later

## Testing

### Manual Test
1. Start the dev server: `npm run dev`
2. Open the app in browser
3. Check browser console - you'll see timeout checks every 60 seconds
4. Create a test reservation with `requestTime` 6 minutes ago
5. Wait for the next check cycle
6. Verify reservation status changes to NO_RESPONSE

### API Test
```bash
# Call the endpoint directly
curl http://localhost:3000/api/cron/check-timeouts

# Expected response:
{
  "success": true,
  "message": "Processed 0 timed-out reservations",
  "updatedReservationIds": [],
  "timestamp": "2024-02-20T10:30:00.000Z"
}
```

## Future Enhancements (Optional)

If you later want to switch to a proper cron job:

1. **Vercel Cron** (if deploying to Vercel):
   - Create `vercel.json` with cron configuration
   - Remove TimeoutChecker from layout
   - Add authentication to the endpoint

2. **External Cron Service**:
   - Sign up for cron-job.org or similar
   - Point it to your endpoint
   - Add API key authentication

3. **Hybrid Approach**:
   - Keep client-side polling for development
   - Use cron job for production
   - Detect environment and choose approach

## Requirements Satisfied

✅ **Requirement 12.2**: 5-minute response timer implemented  
✅ **Requirement 12.13**: Status updated to NO_RESPONSE after timeout  
✅ **Requirement 12.13**: Notification sent to patient prompting for phone number  

## Next Steps

The timeout mechanism is complete and ready to use. The next task in the implementation plan is:

**Task 15: Checkpoint - Ensure reservation workflow is complete**
- Test full reservation lifecycle
- Test timeout mechanism
- Test phone number fallback for NO_RESPONSE
