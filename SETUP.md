# MediFind Full-Stack Migration - Setup Guide

## Project Infrastructure

This document describes the Next.js project infrastructure setup for the MediFind full-stack migration.

## Technology Stack

- **Framework**: Next.js 14.2.35 with App Router
- **Language**: TypeScript 5.8.2
- **Database**: PostgreSQL with Prisma ORM 5.22.0
- **Authentication**: JWT with bcrypt
- **Validation**: Zod 3.25.76
- **Styling**: Tailwind CSS 3.4.0
- **Testing**: fast-check 3.23.2 (Property-Based Testing)
- **Icons**: Lucide React
- **Charts**: Recharts

## Configuration Files

### Next.js Configuration
- `next.config.js` - Next.js configuration with React strict mode and SWC minification
- `tsconfig.json` - TypeScript configuration for Next.js with path aliases (@/*)
- `tailwind.config.ts` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration with Tailwind and Autoprefixer

### Code Quality
- `.eslintrc.json` - ESLint configuration extending next/core-web-vitals
- `.prettierrc` - Prettier configuration for consistent code formatting

### Environment Variables
- `.env.local` - Environment variables (DATABASE_URL, JWT_SECRET)

## Directory Structure

```
/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   └── globals.css        # Global styles with Tailwind directives
├── lib/                   # Utility libraries
│   └── prisma.ts          # Prisma client singleton
├── components/            # React components (existing prototype)
├── views/                 # Role-specific views (existing prototype)
├── services/              # Business logic (existing prototype)
└── [config files]         # Configuration files
```

## Environment Variables

The following environment variables are configured in `.env.local`:

```env
# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/medifind?schema=public"

# JWT Configuration
JWT_SECRET="your-secret-key-change-this-in-production"

# Existing
GEMINI_API_KEY=PLACEHOLDER_API_KEY
```

**Important**: Update these values for your environment before running the application.

## Available Scripts

### Next.js (Production)
```bash
npm run dev          # Start Next.js development server
npm run build        # Build Next.js production bundle
npm run start        # Start Next.js production server
npm run lint         # Run ESLint
```

### Vite (Prototype - Legacy)
```bash
npm run dev:vite     # Start Vite development server (prototype)
npm run build:vite   # Build Vite production bundle (prototype)
npm run preview      # Preview Vite production build
```

## Path Aliases

The project uses `@/*` path alias pointing to the project root:

```typescript
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/Button';
```

## Next Steps

1. **Database Setup**: Initialize Prisma and create database schema (Task 2)
2. **Authentication**: Implement JWT authentication utilities (Task 3)
3. **API Routes**: Create Next.js API routes for backend logic (Tasks 5-13)
4. **UI Migration**: Migrate React components to Next.js App Router (Tasks 6, 21)

## Verification

To verify the setup is working:

```bash
# Check TypeScript compilation
npx tsc --noEmit

# Check Next.js version
npx next --version

# Check installed dependencies
npm list --depth=0
```

## Notes

- The existing Vite-based prototype remains intact in the root directory
- Next.js App Router uses React Server Components by default
- Path aliases work in both Next.js and the existing Vite setup
- React version downgraded from 19.2.4 to 18.3.1 for Next.js 14 compatibility
