# Database Setup Guide

## Prerequisites

Before running migrations, you need to have PostgreSQL installed and running.

## Step 1: Install PostgreSQL

### Windows
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. Remember the password you set for the `postgres` user
4. Default port is 5432

### macOS
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

## Step 2: Create Database

### Option A: Using psql command line
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE medifind;

# Exit psql
\q
```

### Option B: Using pgAdmin
1. Open pgAdmin (installed with PostgreSQL)
2. Connect to your PostgreSQL server
3. Right-click "Databases" → "Create" → "Database"
4. Name: `medifind`
5. Click "Save"

## Step 3: Update DATABASE_URL

Update the `.env.local` file with your actual database credentials:

```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/medifind?schema=public"
```

Replace:
- `USERNAME` - Your PostgreSQL username (default: `postgres`)
- `PASSWORD` - Your PostgreSQL password
- `localhost` - Your database host (use `localhost` for local development)
- `5432` - PostgreSQL port (default: 5432)
- `medifind` - Database name

### Example:
```env
DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/medifind?schema=public"
```

## Step 4: Run Prisma Migrations

Once your database is set up and DATABASE_URL is configured:

```bash
# Create and apply the initial migration
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate
```

## Step 5: Verify Setup

```bash
# Open Prisma Studio to view your database
npx prisma studio
```

This will open a browser window at http://localhost:5555 where you can view and manage your database.

## Troubleshooting

### Connection Refused
- Ensure PostgreSQL is running: `pg_isready` (Linux/Mac) or check Services (Windows)
- Check if port 5432 is available

### Authentication Failed
- Verify username and password in DATABASE_URL
- Check PostgreSQL authentication settings in `pg_hba.conf`

### Database Does Not Exist
- Create the database first using psql or pgAdmin
- Ensure the database name in DATABASE_URL matches the created database

## Alternative: Using Docker

If you prefer using Docker:

```bash
# Run PostgreSQL in Docker
docker run --name medifind-postgres \
  -e POSTGRES_PASSWORD=mypassword \
  -e POSTGRES_DB=medifind \
  -p 5432:5432 \
  -d postgres:15

# Update .env.local
DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/medifind?schema=public"
```

## Next Steps

After completing the database setup:
1. Run migrations: `npx prisma migrate dev --name init`
2. Generate Prisma Client: `npx prisma generate`
3. Continue with Task 2.3 (Prisma client singleton is already created in `lib/prisma.ts`)
