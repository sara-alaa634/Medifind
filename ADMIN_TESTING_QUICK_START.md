# Admin Account - Quick Start Guide

## 🎯 Automatic Admin Initialization

**Good news!** The admin account is created automatically when you start the application.

### How It Works:

1. When you run `npm run dev`, the app automatically:
   - ✅ Checks if any admin account exists
   - ✅ If none exists, creates a default admin
   - ✅ Logs the credentials to the console
   - ✅ Safe to restart - won't create duplicates

2. **No manual commands needed!** Just start the app and the admin is ready.

---

## 🚀 Quick Start (3 Steps)

**Login with admin credentials:**
- Email: `admin@medifind.com`
- Password: `admin123456`
- Click "Log In"
- You'll be redirected to `/admin/analytics`

---

## 🔧 Customize Admin Credentials (Optional)

Want to use custom credentials? Set environment variables in your `.env` file:

```bash
ADMIN_EMAIL=your-admin@company.com
ADMIN_PASSWORD=your-secure-password
ADMIN_NAME=Your Name
```

Then restart the server. The app will use your custom credentials.

---

## 🔒 Security Features

**Admin accounts can ONLY be created automatically by the system:**
- ✅ No registration endpoint for admin role
- ✅ API blocks any attempt to register as admin
- ✅ Validation layer rejects admin role
- ✅ UI doesn't show admin option

**This ensures:**
- No unauthorized admin account creation
- Controlled admin access
- Secure initialization

---

## 🚀 Login and Test

## 🔐 Admin Portal Features

After logging in as admin, you have access to:

- **Analytics Dashboard** (`/admin/analytics`)
  - Platform-wide statistics
  - User metrics
  - Reservation analytics
  
- **Pharmacy Management** (`/admin/pharmacies`)
  - Approve/reject pharmacy registrations
  - View all pharmacies
  - Manage pharmacy accounts

- **Medicine Database** (`/admin/medicines`)
  - Add new medicines
  - Edit medicine information
  - Delete medicines (with safety checks)

**Note:** The actual functionality for these pages will be implemented in later tasks. Right now they're placeholder pages.

---

## 🧪 Test All Three Roles

### 1. Admin Account (Created via Script)
```bash
# Initialize admin
npm run init-admin

# Login credentials
Email: admin@medifind.com
Password: admin123456
```
**Access:** `/admin/analytics`, `/admin/pharmacies`, `/admin/medicines`
**Note:** Admin accounts CANNOT be created via registration endpoint (blocked for security)

### 2. Patient Account (Register via UI)
```bash
# Register at /register
Email: patient@test.com
Password: password123
Role: Patient
```
**Access:** `/patient/search`, `/patient/reservations`, `/patient/profile`

### 3. Pharmacy Account (Register via UI)
```bash
# Register at /register
Email: pharmacy@test.com
Password: password123
Role: Pharmacy
# Fill in pharmacy details
```
**Access:** `/pharmacy/dashboard`, `/pharmacy/inventory`, `/pharmacy/reservations`
**Note:** Needs admin approval before accessing features

---

## ✅ Quick Verification Checklist

- [ ] Admin account created successfully
- [ ] Can login as admin
- [ ] Redirected to `/admin/analytics` after login
- [ ] Can navigate to `/admin/pharmacies`
- [ ] Can navigate to `/admin/medicines`
- [ ] Can logout successfully
- [ ] Cannot access `/patient/*` routes (403 Forbidden)
- [ ] Cannot access `/pharmacy/*` routes (403 Forbidden)

---

## 🔧 Troubleshooting

### "Admin already exists" error
The script checks for existing admins. If you see this message, you can:
1. Use the existing admin credentials
2. Delete the existing admin from database and run script again
3. Edit the script to use a different email

### Can't access admin routes after login
1. Check the JWT token is set (check browser cookies for `auth-token`)
2. Verify the user role in database: `SELECT role FROM "User" WHERE email = 'admin@medifind.com'`
3. Clear cookies and login again

### Script fails with "Cannot find module"
Make sure you have `tsx` installed:
```bash
npm install -D tsx
```

---

## 📝 Next Steps

After verifying admin authentication works:

1. **Approve a pharmacy** (when pharmacy approval endpoint is implemented)
2. **Add medicines** (when medicine CRUD endpoints are implemented)
3. **View analytics** (when analytics endpoints are implemented)

For now, you can test the authentication and navigation flow!
