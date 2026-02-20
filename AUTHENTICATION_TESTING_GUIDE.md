# Authentication & Authorization Testing Guide

## ✅ What's Already Implemented

All authentication and authorization components are fully implemented and ready to test:

### API Endpoints
- ✅ `POST /api/auth/register` - User registration (Patient/Pharmacy)
- ✅ `POST /api/auth/login` - User login with JWT
- ✅ `POST /api/auth/logout` - Session logout
- ✅ `GET /api/auth/me` - Get current user info

### UI Components
- ✅ Login page at `/login`
- ✅ Registration page at `/register`
- ✅ Patient portal at `/patient/*`
- ✅ Pharmacy portal at `/pharmacy/*`
- ✅ Admin portal at `/admin/*`

### Security Features
- ✅ JWT authentication with httpOnly cookies
- ✅ Password hashing with bcrypt
- ✅ Role-based access control (RBAC)
- ✅ Pharmacy approval enforcement
- ✅ Route protection middleware

---

## 🚀 Testing via Browser (Recommended)

## 🚀 Quick Start (3 Steps)

### Step 1: Start the Development Server

```bash
npm run dev
```

**Watch the console output!** You'll see:
```
⚠️  No admin account found. Creating default admin...
✅ Default admin account created successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email: admin@medifind.com
🔑 Password: admin123456
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  SECURITY: Change the default password after first login!
```

### Step 2: Navigate to Login

Open your browser:
```
http://localhost:3000/login
```

### Step 3: Login with Admin Credentials

1. Navigate to `http://localhost:3000/register`
2. **Register as Patient:**
   - Select "Patient" from dropdown
   - Fill in: Name, Email, Password (min 8 chars), Phone (optional)
   - Click "Create Account"
   - You should be redirected to `/login`

3. **Register as Pharmacy:**
   - Select "Pharmacy" from dropdown
   - Fill in personal info + pharmacy details
   - Note: You'll see a message about admin approval
   - Click "Create Account"

4. **Register as Admin (Testing Only):**
   - Select "Admin (Testing Only)" from dropdown
   - Fill in: Name, Email, Password (min 8 chars)
   - Click "Create Account"
   - **Note:** In production, admins should only be created via script

### Step 4: Test Login Flow

1. Navigate to `http://localhost:3000/login`
2. **Login with Admin Account:**
   - Email: `admin@medifind.com`
   - Password: `admin123456`
   - Click "Log In"
   - You'll be redirected to `/admin/analytics`

3. **Login with Patient Account:**
   - Enter your registered email and password
   - Click "Log In"
   - You'll be redirected to `/patient/search`

4. **Login with Pharmacy Account:**
   - Enter your registered email and password
   - Click "Log In"
   - **If approved:** Redirected to `/pharmacy/dashboard`
   - **If not approved:** You'll get a 403 Forbidden error

### Step 5: Test Protected Routes

Try accessing these URLs directly:
- `/patient/search` - Should work if logged in as PATIENT
- `/pharmacy/dashboard` - Should work if logged in as PHARMACY (and approved)
- `/admin/analytics` - Should work if logged in as ADMIN

**Without login:** You'll be redirected to `/login`
**Wrong role:** You'll be redirected to `/login` with forbidden error

### Step 6: Test Logout

Click the "Logout" button in the sidebar → Should redirect to `/login`

---

## 🔧 Quick Admin Setup Script

If you need to create an admin account quickly, I've provided a script:

**Run this command:**
```bash
npx tsx scripts/create-admin.ts
```

**What it does:**
- Creates an admin user with email: `admin@medifind.com`
- Sets password to: `admin123456`
- Checks if admin already exists (won't create duplicates)
- Hashes the password securely with bcrypt

**To customize:**
Edit `scripts/create-admin.ts` and change the email/password before running.

---

## 🧪 Testing via API (cURL/Postman)

### 1. Register a Patient

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@test.com",
    "password": "password123",
    "name": "John Doe",
    "phone": "+1234567890",
    "role": "PATIENT"
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "id": "...",
    "email": "patient@test.com",
    "name": "John Doe",
    "role": "PATIENT"
  }
}
```

### 2. Register a Pharmacy

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pharmacy@test.com",
    "password": "password123",
    "name": "Pharmacy Owner",
    "phone": "+1234567890",
    "role": "PHARMACY",
    "pharmacyData": {
      "name": "Test Pharmacy",
      "address": "123 Main St",
      "phone": "+1234567890",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "workingHours": "9AM-9PM"
    }
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Pharmacy registration successful. Awaiting admin approval.",
  "user": {
    "id": "...",
    "email": "pharmacy@test.com",
    "role": "PHARMACY"
  }
}
```

### 3. Register an Admin (Testing Only)

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123",
    "name": "Admin User",
    "role": "ADMIN"
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "id": "...",
    "email": "admin@test.com",
    "name": "Admin User",
    "role": "ADMIN"
  }
}
```

### 4. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "patient@test.com",
    "password": "password123"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "...",
    "email": "patient@test.com",
    "name": "John Doe",
    "role": "PATIENT"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note:** The JWT token is also set in an httpOnly cookie named `auth-token`

### 5. Get Current User (Authenticated)

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -b cookies.txt
```

**Expected Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "patient@test.com",
    "name": "John Doe",
    "role": "PATIENT",
    "pharmacy": null
  }
}
```

### 6. Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## 🔒 Testing Authorization

### Test Role-Based Access Control

1. **Login as Patient**
2. **Try to access pharmacy route:**
   ```bash
   curl -X GET http://localhost:3000/pharmacy/dashboard \
     -b cookies.txt
   ```
   **Expected:** Redirect to `/login` with forbidden error

3. **Try to access admin route:**
   ```bash
   curl -X GET http://localhost:3000/admin/analytics \
     -b cookies.txt
   ```
   **Expected:** Redirect to `/login` with forbidden error

### Test Pharmacy Approval Enforcement

1. **Register as Pharmacy** (isApproved = false by default)
2. **Login as Pharmacy**
3. **Try to access pharmacy dashboard:**
   ```bash
   curl -X GET http://localhost:3000/pharmacy/dashboard \
     -b cookies.txt
   ```
   **Expected:** 403 Forbidden - "Pharmacy not approved"

4. **To test approved pharmacy:**
   - Manually update database: `UPDATE "Pharmacy" SET "isApproved" = true WHERE id = '...'`
   - Or create an admin user and implement pharmacy approval endpoint

---

## 🐛 Common Issues & Solutions

### Issue: "Database connection error"
**Solution:** 
- Ensure PostgreSQL is running
- Check `.env` file has correct `DATABASE_URL`
- Run `npx prisma migrate dev` to apply migrations

### Issue: "JWT_SECRET not found"
**Solution:** 
- Add `JWT_SECRET=your-secret-key-here` to `.env` file
- Restart the dev server

### Issue: "Cannot find module '@/lib/prisma'"
**Solution:**
- Ensure `tsconfig.json` has path alias configured
- Restart TypeScript server in your IDE

### Issue: Pharmacy can't access dashboard after login
**Solution:**
- Check if pharmacy is approved in database
- Run: `SELECT * FROM "Pharmacy" WHERE "userId" = '...'`
- Update: `UPDATE "Pharmacy" SET "isApproved" = true WHERE "userId" = '...'`

---

## 📊 Database Verification

### Check Registered Users
```sql
SELECT id, email, name, role, "createdAt" FROM "User";
```

### Check Pharmacies
```sql
SELECT p.id, p.name, p."isApproved", u.email 
FROM "Pharmacy" p 
JOIN "User" u ON p."userId" = u.id;
```

### Manually Approve a Pharmacy
```sql
UPDATE "Pharmacy" 
SET "isApproved" = true 
WHERE "userId" = 'user-id-here';
```

### Create an Admin User (for testing)

**Option 1: Use the provided script (Recommended)**
```bash
npx tsx scripts/create-admin.ts
```

**Option 2: Manual SQL insert**
First, generate a bcrypt hash for your password:
```bash
npx tsx -e "import bcrypt from 'bcrypt'; bcrypt.hash('password123', 10).then(console.log)"
```

Then insert into database:
```sql
INSERT INTO "User" (id, email, password, name, role, "createdAt", "updatedAt")
VALUES (
  'admin-test-id',
  'admin@test.com',
  '$2b$10$...',  -- Use bcrypt hash of 'password123'
  'Admin User',
  'ADMIN',
  NOW(),
  NOW()
);
```

---

## ✅ Test Checklist

- [ ] Register as Patient → Success
- [ ] Register as Pharmacy → Success (with approval notice)
- [ ] Login as Patient → Redirect to `/patient/search`
- [ ] Login as Pharmacy (unapproved) → 403 Forbidden
- [ ] Login as Pharmacy (approved) → Redirect to `/pharmacy/dashboard`
- [ ] Access protected route without login → Redirect to `/login`
- [ ] Access wrong role route → Redirect to `/login` with error
- [ ] Logout → Clear session and redirect to `/login`
- [ ] GET `/api/auth/me` with valid token → Return user data
- [ ] GET `/api/auth/me` without token → 401 Unauthorized

---

## 🎯 Next Steps

After verifying authentication works:
1. Implement medicine catalog API (Task 7)
2. Implement pharmacy management API (Task 8)
3. Implement inventory management API (Task 10)
4. Implement reservation workflow (Tasks 12-14)

**Note:** The UI pages are placeholders. They'll be implemented in later tasks (Tasks 11, 17, 18, 21).
