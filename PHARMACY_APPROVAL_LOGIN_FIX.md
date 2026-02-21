# Pharmacy Approval Login Fix

## Issues Fixed

### Issue 1: Unapproved Pharmacy Can Login
**Problem**: Pharmacy accounts could login even before admin approval, which violates security requirements.

**Solution**: Added approval check in login API that returns a clear message:
- Status: 403 Forbidden
- Error code: `ACCOUNT_PENDING`
- Message: "Your pharmacy account is pending approval. You will be notified once an administrator reviews your application."

### Issue 2: Rejected Pharmacy Shows Generic Error
**Problem**: When admin rejects a pharmacy (deletes the account), the user sees "Invalid email or password" which is confusing.

**Solution**: Added rejection detection in login API:
- Checks if user exists but has no pharmacy record (was rejected)
- Status: 403 Forbidden
- Error code: `ACCOUNT_REJECTED`
- Message: "Your pharmacy account has been rejected by the administrator. Please contact support for more information."

## Implementation Details

### Login Flow for Pharmacy Users

```
1. User submits email/password
2. System validates credentials
3. If user.role === 'PHARMACY':
   a. Check if pharmacy record exists
      - If NO → Account was rejected (show rejection message)
   b. Check if pharmacy.isApproved === true
      - If NO → Account pending approval (show pending message)
   c. If approved → Allow login
4. Generate JWT and set cookie
```

### Error Responses

**Pending Approval (403)**:
```json
{
  "success": false,
  "error": "ACCOUNT_PENDING",
  "message": "Your pharmacy account is pending approval. You will be notified once an administrator reviews your application."
}
```

**Account Rejected (403)**:
```json
{
  "success": false,
  "error": "ACCOUNT_REJECTED",
  "message": "Your pharmacy account has been rejected by the administrator. Please contact support for more information."
}
```

## Requirements Validated

- **Requirement 6.4**: "WHEN an unapproved Pharmacy attempts to access Pharmacy features, THE System SHALL return an authorization error"
- **Requirement 8.4**: "WHEN an Admin rejects a pharmacy, THE System SHALL delete the Pharmacy and User records"

## User Experience

### Before Fix
- ❌ Unapproved pharmacy: Could login and access dashboard
- ❌ Rejected pharmacy: "Invalid email or password" (confusing)

### After Fix
- ✅ Unapproved pharmacy: Clear message about pending approval
- ✅ Rejected pharmacy: Clear message about rejection with support contact suggestion

## Testing

### Test Case 1: Unapproved Pharmacy Login
1. Register a new pharmacy account
2. Try to login before admin approval
3. Expected: See "pending approval" message

### Test Case 2: Rejected Pharmacy Login
1. Admin rejects a pharmacy (deletes it)
2. Try to login with that pharmacy's credentials
3. Expected: See "account rejected" message

### Test Case 3: Approved Pharmacy Login
1. Admin approves a pharmacy
2. Login with pharmacy credentials
3. Expected: Successfully login and access dashboard

## Files Modified

- `app/api/auth/login/route.ts` - Added pharmacy approval checks

## Notes

- The login form already displays error messages properly, no changes needed there
- The middleware also checks approval status for route protection (defense in depth)
- Error messages are user-friendly and actionable
