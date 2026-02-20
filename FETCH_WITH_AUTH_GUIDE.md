# Fetch with Auth - Automatic 401 Redirect Guide

## Overview
The `fetchWithAuth` utility automatically handles authentication errors (401) by redirecting users to the appropriate login page. This provides a modern, seamless user experience.

## Usage

### Import the utility
```typescript
import { fetchPharmacy, fetchAdmin, fetchPatient } from '@/lib/fetchWithAuth';
```

### For Pharmacy Pages
Use `fetchPharmacy()` - redirects to `/pharmacy` on 401:

```typescript
const response = await fetchPharmacy('/api/inventory');
const response = await fetchPharmacy('/api/reservations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
```

### For Admin Pages
Use `fetchAdmin()` - redirects to `/admin` on 401:

```typescript
const response = await fetchAdmin('/api/medicines');
const response = await fetchAdmin('/api/pharmacies/[id]/approve', {
  method: 'POST',
});
```

### For Patient Pages
Use `fetchPatient()` - redirects to `/login` on 401:

```typescript
const response = await fetchPatient('/api/reservations');
```

## Benefits

1. **Automatic 401 handling** - No need to check `response.status === 401` everywhere
2. **Automatic credentials** - Always includes `credentials: 'include'` to send cookies
3. **Consistent behavior** - All pages handle auth errors the same way
4. **Better UX** - Users are redirected to login instead of seeing errors
5. **Less code** - No repetitive 401 checks in every fetch call

## Migration Guide

### Before (manual handling):
```typescript
const response = await fetch('/api/inventory', {
  credentials: 'include',
});

if (response.status === 401) {
  window.location.href = '/pharmacy';
  return;
}

if (response.ok) {
  const data = await response.json();
  // ...
}
```

### After (automatic handling):
```typescript
const response = await fetchPharmacy('/api/inventory');

if (response.ok) {
  const data = await response.json();
  // ...
}
```

## Pages to Update

### Pharmacy Pages (use `fetchPharmacy`)
- ✅ `app/(pharmacy)/inventory/page.tsx` - DONE
- ✅ `app/(pharmacy)/dashboard/page.tsx` - DONE
- ✅ `app/(pharmacy)/reservations/page.tsx` - DONE
- ✅ `app/(pharmacy)/profile/page.tsx` - Uses ProfileForm component (DONE)

### Admin Pages (use `fetchAdmin`)
- ✅ `app/(admin)/analytics/page.tsx` - DONE
- ✅ `app/(admin)/medicines/page.tsx` - DONE
- ✅ `app/(admin)/pharmacies/page.tsx` - DONE

### Patient Pages (use `fetchPatient`)
- ✅ `app/(patient)/reservations/page.tsx` - DONE
- ✅ `app/(patient)/profile/page.tsx` - Uses ProfileForm component (DONE)

### Shared Components
- ✅ `components/NotificationBell.tsx` - DONE
- ✅ `components/ProfileForm.tsx` - DONE

## Token Expiration
- JWT tokens expire after **7 days**
- When expired, users are automatically redirected to login
- No error messages shown - seamless redirect experience
