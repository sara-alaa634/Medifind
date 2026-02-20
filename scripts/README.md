# Database Scripts

This directory contains scripts for database management and data migration.

## Available Scripts

### 1. Seed Script (`prisma/seed.ts`)

Seeds the database with sample data for development and testing.

**Usage:**
```bash
npm run seed
```

**What it does:**
- ✅ Checks environment (refuses to run in production)
- 🧹 Clears existing data
- 💊 Seeds 6 medicines from prototype constants
- 👥 Creates sample users (admin, patient, pharmacy users)
- 🏥 Creates 4 pharmacies with auto-approval
- 📦 Seeds random inventory items
- 📋 Creates 5 sample reservations

**Sample Credentials:**
- Admin: `admin@medifind.com` / `password123`
- Patient: `patient@example.com` / `password123`
- Pharmacy: `pharmacy1@example.com` / `password123`

**Environment Check:**
The script will exit with an error if `NODE_ENV=production` to prevent accidental data loss.

---

### 2. Migration Script (`scripts/migrate-from-prototype.ts`)

One-time migration script to import data from the React prototype constants.

**Usage:**
```bash
npm run migrate-prototype
```

**What it does:**
- 📖 Reads `constants.tsx` to extract medicines and pharmacies
- 💊 Imports all medicines preserving all information
- 🏥 Imports all pharmacies preserving all information
- 👤 Creates user accounts for each pharmacy
- 🗺️ Generates approximate coordinates based on distance
- ⚠️ Checks for existing data and prompts before proceeding

**Notes:**
- Designed to run once on an empty database
- All pharmacy accounts use password: `pharmacy123`
- Email format: `[pharmacyname]@migrated.com`
- Coordinates are approximated based on distance values
- Will prompt for confirmation if data already exists

---

### 3. Admin Initialization Script (`scripts/init-admin.ts`)

Creates an admin user if one doesn't exist.

**Usage:**
```bash
npm run init-admin
```

**What it does:**
- Checks if an admin user already exists
- Creates admin user with credentials from environment variables
- Uses `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`

---

## Workflow Recommendations

### For Development

1. **Fresh Start:**
   ```bash
   npx prisma migrate reset  # Resets database and runs migrations
   npm run seed              # Seeds with sample data
   ```

2. **Just Seed Data:**
   ```bash
   npm run seed
   ```

### For Initial Deployment

1. **Run Migrations:**
   ```bash
   npx prisma migrate deploy
   ```

2. **Import Prototype Data (one-time):**
   ```bash
   npm run migrate-prototype
   ```

3. **Create Admin User:**
   ```bash
   npm run init-admin
   ```

### For Production

- ⚠️ **Never run `npm run seed` in production** - it will clear all data!
- ✅ Use `npm run migrate-prototype` only once during initial deployment
- ✅ Use `npm run init-admin` to create the first admin user

---

## Environment Variables

Required for scripts:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/medifind"

# Admin initialization
ADMIN_EMAIL="admin@medifind.com"
ADMIN_PASSWORD="secure_password_here"

# JWT
JWT_SECRET="your-secret-key"
```

---

## Safety Features

### Seed Script
- ✅ Environment check (refuses to run in production)
- ✅ Clears data before seeding (development only)

### Migration Script
- ✅ Checks for existing data
- ✅ Prompts for confirmation if data exists
- ✅ Designed for one-time use

### Admin Init Script
- ✅ Checks if admin already exists
- ✅ Won't create duplicates

---

## Troubleshooting

### "Cannot find module 'constants.tsx'"
Make sure you're running the migration script from the project root directory.

### "Database already contains data"
The migration script detected existing data. You can:
- Type "yes" to continue anyway (will create duplicates)
- Type "no" to abort (recommended)
- Clear the database first: `npx prisma migrate reset`

### "Seed script cannot run in production"
This is intentional. The seed script is for development only. Use the migration script for production deployment.

### Connection errors
Verify your `DATABASE_URL` in `.env` is correct and the database is running.

---

## File Locations

```
/
├── prisma/
│   └── seed.ts                    # Development seed script
├── scripts/
│   ├── migrate-from-prototype.ts  # One-time migration script
│   ├── init-admin.ts              # Admin user creation
│   └── README.md                  # This file
└── constants.tsx                  # Prototype data source
```
