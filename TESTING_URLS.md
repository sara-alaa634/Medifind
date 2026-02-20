# MediFind - Testing URLs Guide

## 🌐 Available URLs

### Public Pages (No Login Required)

**Homepage:**
```
http://localhost:3000/
```
- Landing page with Login and Register buttons
- Overview of the platform

**Login Page:**
```
http://localhost:3000/login
```
- Login form for all user types
- Redirects based on role after login

**Registration Page:**
```
http://localhost:3000/register
```
- Register as Patient or Pharmacy
- Admin registration blocked (security)

---

### Patient Portal (Requires Patient Login)

**Patient Search:**
```
http://localhost:3000/patient/search
```
- Medicine search page (placeholder)
- Default redirect after patient login

**Patient Reservations:**
```
http://localhost:3000/patient/reservations
```
- View patient reservations (placeholder)

**Patient Profile:**
```
http://localhost:3000/patient/profile
```
- Patient profile page (placeholder)

---

### Pharmacy Portal (Requires Pharmacy Login + Approval)

**Pharmacy Dashboard:**
```
http://localhost:3000/pharmacy/dashboard
```
- Pharmacy analytics dashboard (placeholder)
- Default redirect after pharmacy login

**Pharmacy Inventory:**
```
http://localhost:3000/pharmacy/inventory
```
- Manage medicine inventory (placeholder)

**Pharmacy Reservations:**
```
http://localhost:3000/pharmacy/reservations
```
- Handle reservation requests (placeholder)

**Pharmacy Profile:**
```
http://localhost:3000/pharmacy/profile
```
- Pharmacy profile page (placeholder)

---

### Admin Portal (Requires Admin Login)

**Admin Analytics:**
```
http://localhost:3000/admin/analytics
```
- Platform-wide analytics (placeholder)
- Default redirect after admin login

**Admin Pharmacies:**
```
http://localhost:3000/admin/pharmacies
```
- Pharmacy management (placeholder)

**Admin Medicines:**
```
http://localhost:3000/admin/medicines
```
- Medicine database management (placeholder)

---

## 🔐 Test Credentials

### Admin Account (Auto-Created)
```
Email: admin@medifind.com
Password: admin123456
```

### Patient Account (You Create)
```
Register at: http://localhost:3000/register
Select: Patient
Fill in your details
```

### Pharmacy Account (You Create)
```
Register at: http://localhost:3000/register
Select: Pharmacy
Fill in pharmacy details
Note: Needs admin approval before access
```

---

## 🧪 Testing Flow

### Test 1: Homepage
1. Go to `http://localhost:3000/`
2. Should see landing page with Login/Register buttons
3. Click "Login" → Goes to `/login`
4. Click "Register" → Goes to `/register`

### Test 2: Patient Registration & Login
1. Go to `http://localhost:3000/register`
2. Select "Patient"
3. Fill in details and register
4. Go to `http://localhost:3000/login`
5. Login with your patient credentials
6. Should redirect to `http://localhost:3000/patient/search`

### Test 3: Admin Login
1. Go to `http://localhost:3000/login`
2. Email: `admin@medifind.com`
3. Password: `admin123456`
4. Should redirect to `http://localhost:3000/admin/analytics`

### Test 4: Navigation
1. After login, use the sidebar to navigate
2. Click different menu items
3. URL should change accordingly

### Test 5: Logout
1. Click "Logout" in sidebar
2. Should redirect to `/login`
3. Try accessing protected routes → Should redirect to login

### Test 6: Security
1. Login as patient
2. Try to access `http://localhost:3000/admin/analytics`
3. Should redirect to `/login` (forbidden)

---

## ⚠️ Common Mistakes

### ❌ Wrong: `/patient`
```
http://localhost:3000/patient
```
This will give an error - no page exists at this route

### ✅ Correct: `/patient/search`
```
http://localhost:3000/patient/search
```
This is the correct patient route

### ❌ Wrong: `/pharmacy`
```
http://localhost:3000/pharmacy
```
This will give an error

### ✅ Correct: `/pharmacy/dashboard`
```
http://localhost:3000/pharmacy/dashboard
```
This is the correct pharmacy route

### ❌ Wrong: `/admin`
```
http://localhost:3000/admin
```
This will give an error

### ✅ Correct: `/admin/analytics`
```
http://localhost:3000/admin/analytics
```
This is the correct admin route

---

## 📋 URL Structure

```
/                           → Landing page (public)
├── /login                  → Login page (public)
├── /register               → Registration page (public)
│
├── /patient/*              → Patient portal (protected)
│   ├── /patient/search
│   ├── /patient/reservations
│   └── /patient/profile
│
├── /pharmacy/*             → Pharmacy portal (protected + approval)
│   ├── /pharmacy/dashboard
│   ├── /pharmacy/inventory
│   ├── /pharmacy/reservations
│   └── /pharmacy/profile
│
└── /admin/*                → Admin portal (protected)
    ├── /admin/analytics
    ├── /admin/pharmacies
    └── /admin/medicines
```

---

## 🐛 Troubleshooting

### Issue: Empty page at `/`
**Solution:** The homepage should now show a landing page with Login/Register buttons

### Issue: Error when accessing `/patient`
**Solution:** Use the full path: `/patient/search` (not just `/patient`)

### Issue: "Module parse failed" error
**Solution:** This is a Next.js/webpack issue. Restart the dev server:
```bash
# Stop with Ctrl+C
npm run dev
```

### Issue: Can't access protected routes
**Solution:** Make sure you're logged in first at `/login`

### Issue: Redirected to login after login
**Solution:** Check browser console for errors. Clear cookies and try again.

---

## ✅ Quick Test Checklist

- [ ] Homepage loads at `http://localhost:3000/`
- [ ] Can click Login button → goes to `/login`
- [ ] Can click Register button → goes to `/register`
- [ ] Can register as patient
- [ ] Can login as patient → redirects to `/patient/search`
- [ ] Can navigate patient pages using sidebar
- [ ] Can login as admin → redirects to `/admin/analytics`
- [ ] Can navigate admin pages using sidebar
- [ ] Can logout successfully
- [ ] Cannot access wrong role routes (gets redirected)

---

## 🎯 Start Testing!

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Open your browser:**
   ```
   http://localhost:3000/
   ```

3. **Follow the testing flow above!**

Happy testing! 🚀
