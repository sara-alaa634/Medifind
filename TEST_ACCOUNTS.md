# Test Accounts

## 🔐 Login Credentials

All test accounts use the same password: **`password123`**

---

## Admin Account

- **Email**: `admin@medifind.com`
- **Password**: `password123`
- **Role**: ADMIN
- **Access**: Full system access, manage medicines, approve pharmacies, view analytics

---

## Patient Account

- **Email**: `patient@example.com`
- **Password**: `password123`
- **Role**: PATIENT
- **Access**: Search medicines, make reservations, view reservation history

---

## Pharmacy Accounts

### HealthFirst Pharmacy
- **Email**: `pharmacy1@example.com`
- **Password**: `password123`
- **Role**: PHARMACY
- **Access**: Manage inventory, handle reservations, view analytics

### CureAll Drugs
- **Email**: `pharmacy2@example.com`
- **Password**: `password123`
- **Role**: PHARMACY

### Wellness Point
- **Email**: `pharmacy3@example.com`
- **Password**: `password123`
- **Role**: PHARMACY

### QuickMeds Express
- **Email**: `pharmacy4@example.com`
- **Password**: `password123`
- **Role**: PHARMACY

---

## 🚀 Quick Login

1. Go to http://localhost:3000/login
2. Enter one of the emails above
3. Enter password: `password123`
4. Click "Login"

---

## 🔄 Reset Database

If you need to reset the database and recreate all test accounts:

```bash
npx prisma migrate reset
npm run seed
```

This will:
1. Drop all tables
2. Run migrations
3. Seed with test data
4. Create all test accounts with `password123`

---

## ✅ Verify Users

To check what users exist in your database:

```bash
npx tsx scripts/check-users.ts
```

---

**Note**: These are test accounts for development only. Never use these credentials in production!
