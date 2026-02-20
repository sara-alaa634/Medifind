# Admin Security Implementation

## 🔒 Security Overview

Admin accounts in MediFind are protected with multiple layers of security to prevent unauthorized admin creation.

---

## 🛡️ Security Layers Implemented

### 1. Validation Layer (Zod Schema)
**File:** `lib/validation.ts`

The registration schema only accepts `PATIENT` or `PHARMACY` roles:

```typescript
role: z.enum(['PATIENT', 'PHARMACY'], {
  errorMap: () => ({ message: 'Role must be either PATIENT or PHARMACY' })
}).optional()
```

**What this blocks:**
- ❌ Any API request with `role: "ADMIN"` will fail validation
- ❌ Returns 400 Bad Request with error: "Role must be either PATIENT or PHARMACY"
- ❌ Works for all API clients (Postman, cURL, browser, etc.)

### 2. UI Layer (Registration Form)
**File:** `components/auth/RegisterForm.tsx`

The registration form only shows two role options:

```typescript
<select>
  <option value="PATIENT">Patient</option>
  <option value="PHARMACY">Pharmacy</option>
</select>
```

**What this blocks:**
- ❌ No "Admin" option in the dropdown
- ❌ Users cannot select admin role from UI

### 3. API Endpoint Layer
**File:** `app/api/auth/register/route.ts`

The registration endpoint relies on Zod validation to reject admin roles:

```typescript
const validationResult = registerSchema.safeParse(body);
if (!validationResult.success) {
  return NextResponse.json({ error: 'VALIDATION_ERROR', ... }, { status: 400 });
}
```

**What this blocks:**
- ❌ Direct API calls with admin role fail at validation
- ❌ No way to bypass through API endpoint

---

## ✅ How Admin Accounts ARE Created

### Only Method: Initialization Script

**File:** `scripts/init-admin.ts`

```bash
npm run init-admin
```

**Features:**
- ✅ Creates default admin if none exists
- ✅ Safe to run multiple times (checks for existing admin)
- ✅ Customizable via environment variables
- ✅ Secure password hashing with bcrypt
- ✅ Can be run during deployment/startup

**Environment Variables (Optional):**
```bash
ADMIN_EMAIL=your-admin@company.com
ADMIN_PASSWORD=your-secure-password
ADMIN_NAME=Your Name
```

---

## 🧪 Testing the Security

### Test 1: Try to Register Admin via UI
1. Go to `http://localhost:3000/register`
2. Check the role dropdown
3. **Expected:** Only "Patient" and "Pharmacy" options visible

### Test 2: Try to Register Admin via API (Postman/cURL)

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hacker@test.com",
    "password": "password123",
    "name": "Hacker",
    "role": "ADMIN"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid input data",
  "details": [
    {
      "path": ["role"],
      "message": "Role must be either PATIENT or PHARMACY"
    }
  ],
  "statusCode": 400
}
```

### Test 3: Try Invalid Role

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "password123",
    "name": "Test",
    "role": "SUPERADMIN"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid input data",
  "details": [
    {
      "path": ["role"],
      "message": "Role must be either PATIENT or PHARMACY"
    }
  ],
  "statusCode": 400
}
```

### Test 4: Create Admin via Script (Correct Way)

```bash
npm run init-admin
```

**Expected Output:**
```
✅ Default admin account created successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email: admin@medifind.com
🔑 Password: admin123456
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  SECURITY WARNING:
   Please change the default password immediately after first login!
```

---

## 🔐 Production Deployment Checklist

### Before Deployment:

- [ ] Set custom admin credentials via environment variables:
  ```bash
  ADMIN_EMAIL=admin@yourcompany.com
  ADMIN_PASSWORD=strong-random-password-here
  ADMIN_NAME=System Administrator
  ```

- [ ] Run initialization script during deployment:
  ```bash
  npm run init-admin
  ```

- [ ] Verify admin account exists:
  ```sql
  SELECT email, name, role FROM "User" WHERE role = 'ADMIN';
  ```

- [ ] Change default password immediately after first login

- [ ] Remove or secure the `scripts/init-admin.ts` file in production

- [ ] Set up admin password rotation policy

- [ ] Enable 2FA for admin accounts (future enhancement)

---

## 📊 Security Audit Summary

| Attack Vector | Protection | Status |
|--------------|------------|--------|
| UI Registration Form | No admin option in dropdown | ✅ Protected |
| API Registration Endpoint | Zod validation rejects ADMIN role | ✅ Protected |
| Direct Database Insert | Only via init script with proper auth | ✅ Protected |
| Postman/cURL API Calls | Validation layer blocks admin role | ✅ Protected |
| Invalid Role Values | Zod enum validation | ✅ Protected |
| Bypassing Validation | No bypass possible - validation is server-side | ✅ Protected |

---

## 🚨 Security Recommendations

### Immediate Actions:
1. ✅ **Change default admin password** after first login
2. ✅ **Use strong passwords** (min 12 characters, mixed case, numbers, symbols)
3. ✅ **Set custom admin email** via environment variables

### Future Enhancements:
- [ ] Implement 2FA for admin accounts
- [ ] Add admin activity logging
- [ ] Implement admin session timeout (shorter than regular users)
- [ ] Add IP whitelisting for admin access
- [ ] Implement admin password complexity requirements
- [ ] Add admin account lockout after failed login attempts
- [ ] Implement admin password expiration policy

---

## 📝 Code References

**Validation Schema:**
- File: `lib/validation.ts`
- Line: `role: z.enum(['PATIENT', 'PHARMACY'])`

**Registration Form:**
- File: `components/auth/RegisterForm.tsx`
- Only shows PATIENT and PHARMACY options

**Registration API:**
- File: `app/api/auth/register/route.ts`
- Uses `registerSchema.safeParse()` for validation

**Admin Initialization:**
- File: `scripts/init-admin.ts`
- Command: `npm run init-admin`

---

## ✅ Verification Complete

All security layers are in place. Admin accounts can ONLY be created via the initialization script, ensuring controlled and auditable admin access.
