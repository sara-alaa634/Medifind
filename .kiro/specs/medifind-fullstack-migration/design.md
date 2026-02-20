# Design Document: MediFind Full-Stack Migration

## Overview

This design document outlines the architecture and implementation approach for migrating the MediFind medicine reservation platform from a React prototype with mock data to a production-ready full-stack application using Next.js 14+ with App Router, PostgreSQL with Prisma ORM, and JWT-based authentication.

### Technology Stack

- **Frontend Framework**: Next.js 14+ with App Router and React Server Components
- **Language**: TypeScript 5.0+
- **Database**: PostgreSQL 15+
- **ORM**: Prisma 5+
- **Authentication**: JWT with httpOnly cookies
- **Validation**: Zod for runtime type validation
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts

### Migration Strategy

The migration follows an incremental approach:
1. Set up Next.js project structure with TypeScript and Prisma
2. Define database schema and run migrations
3. Implement authentication and authorization layer
4. Migrate core features (medicine catalog, pharmacy management, inventory)
5. Implement reservation workflow with timeout logic
6. Add analytics dashboards
7. Implement notification system with polling

### Key Design Decisions

**Next.js App Router**: Leverages React Server Components for improved performance and SEO, with API routes colocated with pages for better organization.

**Route-Based Role Separation**: Unlike the prototype's sidebar role switcher, the production app uses proper routing with separate URL paths for each role (`/patient/*`, `/pharmacy/*`, `/admin/*`). This provides better security (role-based middleware protection), improved UX (bookmarkable URLs, browser history), and follows modern web app patterns.

**Prisma ORM**: Provides type-safe database access with automatic TypeScript types, migration management, and excellent developer experience.

**JWT with httpOnly Cookies**: Balances security (XSS protection via httpOnly) with stateless authentication (no server-side session storage required).

**Polling for Notifications**: Simple implementation without WebSocket complexity, suitable for the expected user load with 30-second polling intervals.

**5-Minute Reservation Timeout**: Ensures timely pharmacy responses while providing fallback mechanism (phone number collection) for delayed responses.

## Architecture

### Routing and Navigation Architecture

**Migration from Sidebar to Route-Based Navigation**:

The prototype uses a single-page application with a sidebar to switch between Patient, Pharmacy, and Admin views. The production app replaces this with proper route-based navigation:

**Prototype Approach** (being replaced):
```
/ (single page)
└── Sidebar with role switcher
    ├── Patient View
    ├── Pharmacy View
    └── Admin View
```

**Production Approach** (new):
```
/                           # Public landing page
├── /login                  # Public login page
├── /register               # Public registration page
├── /patient/*              # Patient-only routes (protected)
│   ├── /patient/search
│   ├── /patient/reservations
│   └── /patient/profile
├── /pharmacy/*             # Pharmacy-only routes (protected)
│   ├── /pharmacy/dashboard
│   ├── /pharmacy/inventory
│   └── /pharmacy/reservations
└── /admin/*                # Admin-only routes (protected)
    ├── /admin/analytics
    ├── /admin/medicines
    └── /admin/pharmacies
```

**Benefits of Route-Based Approach**:
1. **Security**: Middleware enforces role-based access at the route level (can't access `/pharmacy/*` without PHARMACY role)
2. **UX**: Bookmarkable URLs, browser history, deep linking
3. **SEO**: Each page has its own URL for search engine indexing
4. **Performance**: Code splitting per route (only load pharmacy code for pharmacy users)
5. **Standards**: Follows modern web app patterns (Next.js, React Router, etc.)

**Navigation Implementation**:
- Each role has a dedicated layout component with role-specific navigation
- No role switcher in the UI (users are locked to their assigned role)
- After login, users are redirected to their role's default page:
  - PATIENT → `/patient/search`
  - PHARMACY → `/pharmacy/dashboard`
  - ADMIN → `/admin/analytics`

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Next.js App (React Components + RSC)           │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │ │
│  │  │  Patient │  │ Pharmacy │  │  Admin   │            │ │
│  │  │   Views  │  │  Views   │  │  Views   │            │ │
│  │  └──────────┘  └──────────┘  └──────────┘            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Server (Node.js)                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    API Routes Layer                     │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │ │
│  │  │   Auth   │  │Medicine/ │  │Analytics │            │ │
│  │  │   APIs   │  │Pharmacy/ │  │   APIs   │            │ │
│  │  │          │  │Inventory │  │          │            │ │
│  │  └──────────┘  └──────────┘  └──────────┘            │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Middleware Layer                       │ │
│  │  ┌──────────────┐  ┌──────────────┐                   │ │
│  │  │ Auth Check   │  │ Role-Based   │                   │ │
│  │  │ (JWT Verify) │  │ Authorization│                   │ │
│  │  └──────────────┘  └──────────────┘                   │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   Service Layer                         │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │ │
│  │  │   Auth   │  │Reservation│ │Notification│           │ │
│  │  │ Service  │  │  Service  │ │  Service  │            │ │
│  │  └──────────┘  └──────────┘  └──────────┘            │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Prisma Client (ORM Layer)                  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ TCP
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                       │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │
│  │  User  │ │Medicine│ │Pharmacy│ │Reserv. │ │Inventory│  │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘  │
│  ┌────────┐ ┌────────┐                                     │
│  │DirectC.│ │Notific.│                                     │
│  └────────┘ └────────┘                                     │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
medifind/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group (public)
│   │   ├── login/
│   │   │   └── page.tsx          # /login
│   │   └── register/
│   │       └── page.tsx          # /register
│   ├── (patient)/                # Patient route group (protected)
│   │   ├── layout.tsx            # Patient layout with navigation
│   │   ├── search/
│   │   │   └── page.tsx          # /patient/search
│   │   ├── reservations/
│   │   │   └── page.tsx          # /patient/reservations
│   │   └── profile/
│   │       └── page.tsx          # /patient/profile
│   ├── (pharmacy)/               # Pharmacy route group (protected)
│   │   ├── layout.tsx            # Pharmacy layout with navigation
│   │   ├── dashboard/
│   │   │   └── page.tsx          # /pharmacy/dashboard
│   │   ├── inventory/
│   │   │   └── page.tsx          # /pharmacy/inventory
│   │   └── reservations/
│   │       └── page.tsx          # /pharmacy/reservations
│   ├── (admin)/                  # Admin route group (protected)
│   │   ├── layout.tsx            # Admin layout with navigation
│   │   ├── analytics/
│   │   │   └── page.tsx          # /admin/analytics
│   │   ├── medicines/
│   │   │   └── page.tsx          # /admin/medicines
│   │   └── pharmacies/
│   │       └── page.tsx          # /admin/pharmacies
│   ├── api/                      # API routes
│   │   ├── auth/
│   │   │   ├── register/
│   │   │   │   └── route.ts      # POST /api/auth/register
│   │   │   ├── login/
│   │   │   │   └── route.ts      # POST /api/auth/login
│   │   │   ├── logout/
│   │   │   │   └── route.ts      # POST /api/auth/logout
│   │   │   └── me/
│   │   │       └── route.ts      # GET /api/auth/me
│   │   ├── medicines/
│   │   │   ├── route.ts          # GET /api/medicines, POST /api/medicines
│   │   │   └── [id]/
│   │   │       └── route.ts      # GET/PUT/DELETE /api/medicines/[id]
│   │   ├── pharmacies/
│   │   │   ├── route.ts          # GET /api/pharmacies
│   │   │   └── [id]/
│   │   │       ├── route.ts      # GET/PUT/DELETE /api/pharmacies/[id]
│   │   │       └── approve/
│   │   │           └── route.ts  # POST /api/pharmacies/[id]/approve
│   │   ├── inventory/
│   │   │   ├── route.ts          # GET /api/inventory, POST /api/inventory
│   │   │   └── [id]/
│   │   │       └── route.ts      # PUT/DELETE /api/inventory/[id]
│   │   ├── reservations/
│   │   │   ├── route.ts          # GET /api/reservations, POST /api/reservations
│   │   │   └── [id]/
│   │   │       ├── accept/
│   │   │       │   └── route.ts  # PUT /api/reservations/[id]/accept
│   │   │       ├── reject/
│   │   │       │   └── route.ts  # PUT /api/reservations/[id]/reject
│   │   │       ├── cancel/
│   │   │       │   └── route.ts  # PUT /api/reservations/[id]/cancel
│   │   │       └── provide-phone/
│   │   │           └── route.ts  # PUT /api/reservations/[id]/provide-phone
│   │   ├── notifications/
│   │   │   ├── route.ts          # GET /api/notifications
│   │   │   ├── mark-all-read/
│   │   │   │   └── route.ts      # PUT /api/notifications/mark-all-read
│   │   │   └── [id]/
│   │   │       └── read/
│   │   │           └── route.ts  # PUT /api/notifications/[id]/read
│   │   ├── direct-calls/
│   │   │   └── route.ts          # POST /api/direct-calls
│   │   └── analytics/
│   │       ├── pharmacy/
│   │       │   └── route.ts      # GET /api/analytics/pharmacy
│   │       └── admin/
│   │           └── route.ts      # GET /api/analytics/admin
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page (/)
├── components/                   # Shared React components
│   ├── ui/                       # Base UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── Badge.tsx
│   ├── auth/                     # Auth-related components
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── medicine/                 # Medicine components
│   │   ├── MedicineCard.tsx
│   │   ├── MedicineSearch.tsx
│   │   └── PharmacyAvailability.tsx
│   ├── pharmacy/                 # Pharmacy components
│   │   ├── PharmacyCard.tsx
│   │   └── InventoryTable.tsx
│   ├── reservation/              # Reservation components
│   │   ├── ReservationCard.tsx
│   │   └── ReservationList.tsx
│   └── layout/                   # Layout components
│       ├── Header.tsx
│       ├── Sidebar.tsx           # Role-specific navigation (replaced prototype's role switcher)
│       └── NotificationBell.tsx
├── lib/                          # Utility libraries
│   ├── prisma.ts                 # Prisma client singleton
│   ├── auth.ts                   # JWT utilities
│   ├── validation.ts             # Zod schemas
│   └── utils.ts                  # Helper functions
├── services/                     # Business logic services
│   ├── authService.ts
│   ├── reservationService.ts
│   ├── notificationService.ts
│   └── analyticsService.ts
├── middleware.ts                 # Next.js middleware for auth/authz
├── prisma/
│   ├── schema.prisma             # Database schema
│   ├── migrations/               # Migration files
│   └── seed.ts                   # Seed script
├── types/                        # TypeScript type definitions
│   └── index.ts
└── .env.local                    # Environment variables
```

**Key Architectural Changes from Prototype**:

1. **Route-Based Navigation**: Each role has dedicated routes (`/patient/*`, `/pharmacy/*`, `/admin/*`) instead of a sidebar switcher
2. **Route Groups**: Next.js route groups `(patient)`, `(pharmacy)`, `(admin)` organize pages by role with shared layouts
3. **Middleware Protection**: `middleware.ts` enforces authentication and role-based authorization at the route level
4. **Role-Specific Layouts**: Each route group has its own `layout.tsx` with appropriate navigation for that role
5. **API Routes**: Backend logic moved from mock store to proper API routes under `/api/*`
6. **No Role Switching**: Users are locked to their assigned role; no UI to switch between roles (security improvement)

## Components and Interfaces

### Database Schema (Prisma)

```prisma
// User model - represents all users (patients, pharmacies, admins)
model User {
  id            String         @id @default(cuid())
  email         String         @unique
  password      String         // bcrypt hashed
  name          String
  phone         String?
  role          UserRole       @default(PATIENT)
  avatar        String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  
  // Relations
  pharmacy      Pharmacy?
  reservations  Reservation[]
  directCalls   DirectCall[]
  notifications Notification[]
}

enum UserRole {
  PATIENT
  PHARMACY
  ADMIN
}

// Medicine model - catalog of available medicines
model Medicine {
  id                  String       @id @default(cuid())
  name                String
  activeIngredient    String
  dosage              String
  prescriptionRequired Boolean
  category            String
  priceRange          String
  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt
  
  // Relations
  inventory           Inventory[]
  reservations        Reservation[]
  directCalls         DirectCall[]
}

// Pharmacy model - pharmacy information
model Pharmacy {
  id            String         @id @default(cuid())
  userId        String         @unique
  name          String
  address       String
  phone         String
  latitude      Float
  longitude     Float
  rating        Float          @default(0)
  workingHours  String
  isApproved    Boolean        @default(false)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  
  // Relations
  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  inventory     Inventory[]
  reservations  Reservation[]
  directCalls   DirectCall[]
}

// Reservation model - patient medicine reservations
model Reservation {
  id              String            @id @default(cuid())
  userId          String
  pharmacyId      String
  medicineId      String
  quantity        Int
  status          ReservationStatus @default(PENDING)
  requestTime     DateTime          @default(now())
  acceptedTime    DateTime?
  rejectedTime    DateTime?
  noResponseTime  DateTime?
  patientPhone    String?
  note            String?           // Pharmacy note to patient
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  // Relations
  user            User              @relation(fields: [userId], references: [id])
  pharmacy        Pharmacy          @relation(fields: [pharmacyId], references: [id])
  medicine        Medicine          @relation(fields: [medicineId], references: [id])
}

enum ReservationStatus {
  PENDING
  ACCEPTED
  REJECTED
  CANCELLED
  NO_RESPONSE
}

// Inventory model - pharmacy stock levels
model Inventory {
  id            String       @id @default(cuid())
  pharmacyId    String
  medicineId    String
  quantity      Int
  status        StockStatus
  lastUpdated   DateTime     @default(now())
  
  // Relations
  pharmacy      Pharmacy     @relation(fields: [pharmacyId], references: [id], onDelete: Cascade)
  medicine      Medicine     @relation(fields: [medicineId], references: [id])
  
  @@unique([pharmacyId, medicineId])
}

enum StockStatus {
  IN_STOCK
  LOW_STOCK
  OUT_OF_STOCK
}

// DirectCall model - tracks when patients call pharmacies directly
model DirectCall {
  id            String       @id @default(cuid())
  userId        String
  pharmacyId    String
  medicineId    String
  createdAt     DateTime     @default(now())
  
  // Relations
  user          User         @relation(fields: [userId], references: [id])
  pharmacy      Pharmacy     @relation(fields: [pharmacyId], references: [id])
  medicine      Medicine     @relation(fields: [medicineId], references: [id])
}

// Notification model - user notifications
model Notification {
  id            String       @id @default(cuid())
  userId        String
  type          String       // 'reservation_accepted', 'reservation_rejected', etc.
  title         String
  message       String
  isRead        Boolean      @default(false)
  createdAt     DateTime     @default(now())
  
  // Relations
  user          User         @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### API Endpoints

#### Authentication APIs

**POST /api/auth/register**
- Request: `{ email, password, name, phone?, role?, pharmacyData? }`
- Response: `{ success: boolean, message: string }`
- Creates user account, hashes password, optionally creates pharmacy record

**POST /api/auth/login**
- Request: `{ email, password }`
- Response: `{ user: { id, email, name, role }, token: string }`
- Validates credentials, generates JWT, sets httpOnly cookie

**POST /api/auth/logout**
- Request: None (uses cookie)
- Response: `{ success: boolean }`
- Clears httpOnly cookie

**GET /api/auth/me**
- Request: None (uses cookie)
- Response: `{ user: { id, email, name, role, ... } }`
- Returns current authenticated user

#### Medicine APIs

**GET /api/medicines**
- Query: `{ search?, category?, page?, limit? }`
- Response: `{ medicines: Medicine[], total: number, page: number }`
- Public endpoint, no auth required

**GET /api/medicines/[id]**
- Response: `{ medicine: Medicine, availability: PharmacyAvailability[] }`
- Public endpoint, shows which pharmacies have the medicine

**POST /api/medicines** (Admin only)
- Request: `{ name, activeIngredient, dosage, prescriptionRequired, category, priceRange }`
- Response: `{ medicine: Medicine }`

**PUT /api/medicines/[id]** (Admin only)
- Request: `{ name?, activeIngredient?, ... }`
- Response: `{ medicine: Medicine }`

**DELETE /api/medicines/[id]** (Admin only)
- Response: `{ success: boolean }`
- Checks for active reservations before deletion

#### Pharmacy APIs

**GET /api/pharmacies**
- Query: `{ search?, isApproved?, page?, limit? }`
- Response: `{ pharmacies: Pharmacy[], total: number }`

**GET /api/pharmacies/[id]**
- Response: `{ pharmacy: Pharmacy }`

**PUT /api/pharmacies/[id]** (Pharmacy owner only)
- Request: `{ name?, address?, phone?, workingHours?, ... }`
- Response: `{ pharmacy: Pharmacy }`

**POST /api/pharmacies/[id]/approve** (Admin only)
- Response: `{ pharmacy: Pharmacy }`
- Sets isApproved to true, sends notification

**DELETE /api/pharmacies/[id]** (Admin only)
- Response: `{ success: boolean }`
- Deletes pharmacy and associated user

#### Inventory APIs

**GET /api/inventory** (Pharmacy only)
- Query: `{ status?, search?, page?, limit? }`
- Response: `{ inventory: InventoryItem[], total: number }`

**POST /api/inventory** (Pharmacy only)
- Request: `{ medicineId, quantity }`
- Response: `{ inventory: Inventory }`

**PUT /api/inventory/[id]** (Pharmacy only)
- Request: `{ quantity }`
- Response: `{ inventory: Inventory }`
- Auto-updates status based on quantity

**DELETE /api/inventory/[id]** (Pharmacy only)
- Response: `{ success: boolean }`

#### Reservation APIs

**GET /api/reservations**
- Query: `{ status?, page?, limit? }`
- Response: `{ reservations: Reservation[], total: number }`
- Returns user's reservations (patient) or pharmacy's reservations (pharmacy)

**POST /api/reservations** (Patient only)
- Request: `{ pharmacyId, medicineId, quantity }`
- Response: `{ reservation: Reservation }`
- Validates stock, creates reservation, sends notification

**PUT /api/reservations/[id]/accept** (Pharmacy only)
- Request: `{ note? }`
- Response: `{ reservation: Reservation }`
- Updates status to ACCEPTED, sends notification with 30-min pickup window

**PUT /api/reservations/[id]/reject** (Pharmacy only)
- Request: `{ reason? }`
- Response: `{ reservation: Reservation }`
- Updates status to REJECTED, sends notification

**PUT /api/reservations/[id]/cancel** (Patient only)
- Response: `{ reservation: Reservation }`
- Updates status to CANCELLED

**PUT /api/reservations/[id]/provide-phone** (Patient only)
- Request: `{ phone }`
- Response: `{ reservation: Reservation }`
- Updates patientPhone for NO_RESPONSE reservations

#### Notification APIs

**GET /api/notifications**
- Response: `{ notifications: Notification[], unreadCount: number }`

**PUT /api/notifications/[id]/read**
- Response: `{ notification: Notification }`

**PUT /api/notifications/mark-all-read**
- Response: `{ success: boolean }`

#### Analytics APIs

**GET /api/analytics/pharmacy** (Pharmacy only)
- Response: `{ totalReservations, pending, accepted, rejected, noResponse, directCalls, inventoryStats, recentReservations, lowStockItems }`

**GET /api/analytics/admin** (Admin only)
- Response: `{ totalUsers, totalPatients, totalPharmacies, pendingApprovals, totalMedicines, totalReservations, reservationsByStatus, directCalls, noResponseByPharmacy, reservationsOverTime, topMedicines }`

#### Direct Call APIs

**POST /api/direct-calls** (Patient only)
- Request: `{ pharmacyId, medicineId }`
- Response: `{ success: boolean, phoneNumber: string }`
- Records direct call action, returns pharmacy phone

### Validation Schemas (Zod)

```typescript
// Auth schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(['PATIENT', 'PHARMACY', 'ADMIN']).optional(),
  pharmacyData: z.object({
    name: z.string(),
    address: z.string(),
    phone: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    workingHours: z.string(),
  }).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Medicine schemas
const createMedicineSchema = z.object({
  name: z.string().min(1),
  activeIngredient: z.string().min(1),
  dosage: z.string().min(1),
  prescriptionRequired: z.boolean(),
  category: z.string().min(1),
  priceRange: z.string().min(1),
});

// Reservation schemas
const createReservationSchema = z.object({
  pharmacyId: z.string().cuid(),
  medicineId: z.string().cuid(),
  quantity: z.number().int().positive(),
});

// Inventory schemas
const updateInventorySchema = z.object({
  quantity: z.number().int().min(0),
});
```

### Authentication & Authorization

#### JWT Token Structure

```typescript
interface JWTPayload {
  userId: string;
  role: UserRole;
  iat: number;  // issued at
  exp: number;  // expiration (7 days)
}
```

#### Middleware Implementation

```typescript
// middleware.ts - Next.js middleware for route protection
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  try {
    const payload = await verifyJWT(token);
    
    // Check role-based access
    const path = request.nextUrl.pathname;
    
    if (path.startsWith('/pharmacy') && payload.role !== 'PHARMACY') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    if (path.startsWith('/admin') && payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Check pharmacy approval status
    if (payload.role === 'PHARMACY') {
      const pharmacy = await prisma.pharmacy.findUnique({
        where: { userId: payload.userId }
      });
      
      if (!pharmacy?.isApproved) {
        return NextResponse.json({ error: 'Pharmacy not approved' }, { status: 403 });
      }
    }
    
    return NextResponse.next();
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export const config = {
  matcher: ['/pharmacy/:path*', '/admin/:path*', '/api/reservations/:path*', '/api/inventory/:path*'],
};
```

#### Auth Utility Functions

```typescript
// lib/auth.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET!;
const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateJWT(userId: string, role: UserRole): string {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function verifyJWT(token: string): Promise<JWTPayload> {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.delete('auth-token');
}
```

## Data Models

### Core Domain Models

#### User Model
- Represents all users (patients, pharmacies, admins)
- Role-based access control via `role` enum
- Password stored as bcrypt hash
- One-to-one relationship with Pharmacy for pharmacy users
- One-to-many relationships with Reservations, DirectCalls, Notifications

#### Medicine Model
- Central catalog of available medicines
- Includes prescription requirement flag
- Categorized for filtering
- Referenced by Inventory and Reservation records

#### Pharmacy Model
- Extends User with pharmacy-specific data
- Geographic coordinates for distance calculations
- Approval workflow via `isApproved` flag
- Working hours stored as JSON string
- One-to-many relationships with Inventory and Reservations

#### Reservation Model
- Core business entity for medicine reservations
- Status workflow: PENDING → ACCEPTED/REJECTED/NO_RESPONSE
- Timestamps for each status transition
- Optional note field for pharmacy-to-patient communication
- Optional patientPhone for NO_RESPONSE fallback

#### Inventory Model
- Junction table between Pharmacy and Medicine
- Quantity tracking with automatic status calculation
- Unique constraint on (pharmacyId, medicineId)
- Status auto-updated based on quantity thresholds

#### DirectCall Model
- Analytics tracking for direct pharmacy calls
- Records patient, pharmacy, and medicine context
- Used for pharmacy performance metrics

#### Notification Model
- User notifications for reservation events
- Type field for different notification categories
- Read/unread tracking
- Cascade delete with user

### Business Logic

#### Stock Status Calculation

```typescript
function calculateStockStatus(quantity: number): StockStatus {
  if (quantity === 0) return 'OUT_OF_STOCK';
  if (quantity <= 10) return 'LOW_STOCK';
  return 'IN_STOCK';
}
```

#### Reservation Timeout Logic

```typescript
// Background job or API endpoint to check for timeouts
async function checkReservationTimeouts() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  const timedOutReservations = await prisma.reservation.findMany({
    where: {
      status: 'PENDING',
      requestTime: {
        lte: fiveMinutesAgo,
      },
    },
  });
  
  for (const reservation of timedOutReservations) {
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: 'NO_RESPONSE',
        noResponseTime: new Date(),
      },
    });
    
    // Send notification to patient
    await createNotification({
      userId: reservation.userId,
      type: 'reservation_no_response',
      title: 'Pharmacy Response Needed',
      message: 'The pharmacy hasn\'t responded yet. Please provide your phone number so they can contact you.',
    });
  }
}
```

#### Distance Calculation

```typescript
// Haversine formula for distance between coordinates
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
```

### Data Migration Strategy

#### From React Prototype

```typescript
// Migration script to import existing data
async function migrateFromPrototype() {
  // Import medicines from constants.tsx
  const medicines = MEDICINES.map(m => ({
    name: m.name,
    activeIngredient: m.activeIngredient,
    dosage: m.dosage,
    prescriptionRequired: m.prescriptionRequired,
    category: m.category,
    priceRange: m.priceRange,
  }));
  
  await prisma.medicine.createMany({ data: medicines });
  
  // Import pharmacies from constants.tsx
  for (const p of PHARMACIES) {
    const user = await prisma.user.create({
      data: {
        email: `${p.name.toLowerCase().replace(/\s/g, '')}@pharmacy.com`,
        password: await hashPassword('defaultPassword123'),
        name: p.name,
        phone: p.phone,
        role: 'PHARMACY',
      },
    });
    
    await prisma.pharmacy.create({
      data: {
        userId: user.id,
        name: p.name,
        address: p.address,
        phone: p.phone,
        latitude: p.latitude,
        longitude: p.longitude,
        rating: p.rating,
        workingHours: p.workingHours,
        isApproved: true, // Auto-approve existing pharmacies
      },
    });
  }
  
  // Note: Reservations from mockStore are not migrated as they're test data
}

```

## Error Handling

### Error Response Format

All API errors follow a consistent format:

```typescript
interface ErrorResponse {
  error: string;           // Error type/code
  message: string;         // Human-readable message
  details?: any;           // Additional context (validation errors, etc.)
  statusCode: number;      // HTTP status code
}
```

### Error Categories

#### Validation Errors (400)
- Invalid input format
- Missing required fields
- Type mismatches
- Field-level validation failures

```typescript
// Example: Zod validation error handling
try {
  const data = createReservationSchema.parse(body);
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details: error.errors,
      statusCode: 400,
    }, { status: 400 });
  }
}
```

#### Authentication Errors (401)
- Missing JWT token
- Invalid JWT token
- Expired JWT token
- Invalid credentials

```typescript
// Example: JWT verification error
try {
  const payload = await verifyJWT(token);
} catch (error) {
  return NextResponse.json({
    error: 'UNAUTHORIZED',
    message: 'Invalid or expired token',
    statusCode: 401,
  }, { status: 401 });
}
```

#### Authorization Errors (403)
- Insufficient permissions
- Role mismatch
- Unapproved pharmacy access
- Resource ownership violation

```typescript
// Example: Role-based authorization
if (user.role !== 'ADMIN') {
  return NextResponse.json({
    error: 'FORBIDDEN',
    message: 'Admin access required',
    statusCode: 403,
  }, { status: 403 });
}
```

#### Not Found Errors (404)
- Resource doesn't exist
- Invalid ID

```typescript
// Example: Resource not found
const medicine = await prisma.medicine.findUnique({ where: { id } });
if (!medicine) {
  return NextResponse.json({
    error: 'NOT_FOUND',
    message: 'Medicine not found',
    statusCode: 404,
  }, { status: 404 });
}
```

#### Conflict Errors (409)
- Duplicate email registration
- Medicine with active reservations cannot be deleted
- Insufficient stock for reservation

```typescript
// Example: Duplicate email
const existingUser = await prisma.user.findUnique({ where: { email } });
if (existingUser) {
  return NextResponse.json({
    error: 'CONFLICT',
    message: 'Email already registered',
    statusCode: 409,
  }, { status: 409 });
}
```

#### Server Errors (500)
- Database connection failures
- Unexpected exceptions
- Third-party service failures

```typescript
// Example: Database error handling
try {
  await prisma.user.create({ data });
} catch (error) {
  console.error('Database error:', error);
  return NextResponse.json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    statusCode: 500,
  }, { status: 500 });
}
```

### Input Sanitization

#### SQL Injection Prevention
- Prisma ORM provides parameterized queries by default
- Never use raw SQL with user input
- Use Prisma's type-safe query builder

#### XSS Prevention
- Sanitize all user input before storage
- Use React's built-in XSS protection (automatic escaping)
- Validate and sanitize HTML content if rich text is needed

```typescript
import DOMPurify from 'isomorphic-dompurify';

function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}
```

#### Rate Limiting
- Implement rate limiting on authentication endpoints
- Prevent brute force attacks
- Use middleware or API gateway for rate limiting

```typescript
// Example: Simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimiter.get(ip);
  
  if (!record || now > record.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}
```

### Error Logging

```typescript
// Centralized error logger
function logError(error: Error, context: any) {
  console.error({
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
  });
  
  // In production, send to error tracking service (Sentry, etc.)
  if (process.env.NODE_ENV === 'production') {
    // Sentry.captureException(error, { extra: context });
  }
}
```


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Authentication and Authorization Properties

**Property 1: Email validation consistency**
*For any* user input containing an email field (registration, login, profile update), the system should validate the email format and reject invalid formats with a validation error.
**Validates: Requirements 3.1, 4.1**

**Property 2: Password minimum length enforcement**
*For any* password input (registration, login, password change), the system should enforce a minimum length of 8 characters and reject shorter passwords with a validation error.
**Validates: Requirements 3.2, 16.9**

**Property 3: Duplicate email prevention**
*For any* registration attempt, if the email already exists in the database, the system should return a conflict error without creating a new user.
**Validates: Requirements 3.3**

**Property 4: Password hashing security**
*For any* successful registration or password change, the stored password should be a bcrypt hash and never plaintext.
**Validates: Requirements 3.4, 16.10**

**Property 5: User creation completeness**
*For any* valid registration data, the system should create a User record with all required fields populated.
**Validates: Requirements 3.5**

**Property 6: Default role assignment**
*For any* registration without an explicit role, the system should assign the PATIENT role by default.
**Validates: Requirements 3.6**

**Property 7: Pharmacy registration atomicity**
*For any* pharmacy registration, the system should create both User and Pharmacy records atomically, or neither if validation fails.
**Validates: Requirements 3.7**

**Property 8: Pharmacy approval default**
*For any* pharmacy registration, the created Pharmacy record should have isApproved set to false.
**Validates: Requirements 3.8**

**Property 9: Sensitive data exclusion**
*For any* successful authentication response (registration, login, profile retrieval), the response should not contain the password field.
**Validates: Requirements 3.9, 4.8**

**Property 10: Authentication credential validation**
*For any* login attempt with non-existent email or incorrect password, the system should return an authentication error without revealing which credential was invalid.
**Validates: Requirements 4.3, 4.4**

**Property 11: Password verification correctness**
*For any* login attempt with valid credentials, the system should verify the password against the stored bcrypt hash and succeed only if they match.
**Validates: Requirements 4.5**

**Property 12: JWT token structure**
*For any* successful authentication, the generated JWT token should contain userId and role claims, and have an expiration of 7 days.
**Validates: Requirements 4.6, 4.9**

**Property 13: JWT cookie security**
*For any* successful authentication, the JWT token should be set in an httpOnly cookie to prevent XSS attacks.
**Validates: Requirements 4.7**

**Property 14: JWT token extraction and verification**
*For any* authenticated request, the system should extract the JWT from the httpOnly cookie, verify its signature, and reject expired or invalid tokens with authentication errors.
**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

**Property 15: JWT payload extraction**
*For any* valid JWT token, the system should correctly extract the userId and role from the token payload.
**Validates: Requirements 5.5**

**Property 16: Logout session cleanup**
*For any* logout request, the system should clear the httpOnly cookie and invalidate the session.
**Validates: Requirements 5.6, 5.7**

**Property 17: Role-based access control**
*For any* authenticated request to a protected route, the system should return a 403 Forbidden error if the user's role does not match the required role for that route.
**Validates: Requirements 6.1, 6.2, 6.3, 6.8**

**Property 18: Pharmacy approval enforcement**
*For any* pharmacy user attempting to access pharmacy features, the system should return a 403 Forbidden error if isApproved is false.
**Validates: Requirements 6.4**

**Property 19: Successful authorization**
*For any* authenticated request where the user's role matches the required role, the system should allow the request to proceed.
**Validates: Requirements 6.5**

### Medicine and Pharmacy Management Properties

**Property 20: Medicine CRUD validation**
*For any* medicine create or update operation, the system should validate that all required fields (name, activeIngredient, dosage, prescriptionRequired, category, priceRange) are present and non-empty.
**Validates: Requirements 7.1, 7.3**

**Property 21: Medicine persistence**
*For any* valid medicine create or update operation, the system should persist the changes to the database and return the updated medicine record.
**Validates: Requirements 7.2, 7.4**

**Property 22: Medicine deletion referential integrity**
*For any* medicine deletion attempt, if the medicine has active reservations (status PENDING or ACCEPTED), the system should prevent deletion and return an error; otherwise, it should delete the medicine.
**Validates: Requirements 7.5, 7.6, 7.7**

**Property 23: Medicine pagination and filtering**
*For any* medicine query with pagination parameters, the system should return the correct page of results, and support filtering by category and searching by name or active ingredient.
**Validates: Requirements 7.8, 7.9, 7.10**

**Property 24: Pharmacy approval workflow**
*For any* pharmacy approval by admin, the system should set isApproved to true and send a notification to the pharmacy user.
**Validates: Requirements 8.2, 8.3**

**Property 25: Pharmacy rejection cleanup**
*For any* pharmacy rejection by admin, the system should delete both the Pharmacy and associated User records atomically.
**Validates: Requirements 8.4**

**Property 26: Pharmacy query operations**
*For any* pharmacy query, the system should support pagination, filtering by approval status, and searching by name or address.
**Validates: Requirements 8.1, 8.5, 8.6, 8.7**

**Property 27: Pharmacy profile update validation**
*For any* pharmacy profile update, the system should validate all required fields and persist the changes if valid.
**Validates: Requirements 8.8, 8.9**

### Inventory Management Properties

**Property 28: Inventory creation and deletion**
*For any* pharmacy adding a medicine to inventory, the system should create an Inventory record; for any removal, it should delete the record.
**Validates: Requirements 9.1, 9.7**

**Property 29: Inventory quantity validation**
*For any* inventory quantity update, the system should validate that the quantity is non-negative (>= 0).
**Validates: Requirements 9.2**

**Property 30: Stock status calculation**
*For any* inventory quantity update, the system should automatically set status to OUT_OF_STOCK if quantity is 0, LOW_STOCK if quantity is 1-10, and IN_STOCK if quantity is above 10.
**Validates: Requirements 9.3, 9.4, 9.5**

**Property 31: Inventory timestamp tracking**
*For any* inventory change (create, update, delete), the system should update the lastUpdated timestamp to the current time.
**Validates: Requirements 9.8**

**Property 32: Inventory query operations**
*For any* pharmacy inventory query, the system should return all inventory records for that pharmacy, and support filtering by stock status and searching by medicine name.
**Validates: Requirements 9.6, 9.9, 9.10**

### Medicine Search and Availability Properties

**Property 33: Guest search access**
*For any* guest user (unauthenticated), the system should allow searching medicines by name, active ingredient, or category without requiring authentication.
**Validates: Requirements 10.1, 10.2, 10.3**

**Property 34: Medicine availability display**
*For any* medicine view, the system should display all pharmacies that have it in stock with their current stock status, distance from patient, and prescription requirement indicator.
**Validates: Requirements 10.4, 10.5, 10.6, 10.10**

**Property 35: Pharmacy sorting**
*For any* pharmacy list, the system should support sorting by distance (default) and by rating.
**Validates: Requirements 10.7, 10.8, 10.9**

**Property 36: Guest reservation restriction**
*For any* guest user attempting to create a reservation, the system should return an authentication error prompting login or registration.
**Validates: Requirements 10.11**

### Reservation Management Properties

**Property 37: Reservation creation validation**
*For any* reservation creation attempt, the system should validate that the medicine exists, pharmacy exists, pharmacy has the medicine in stock, quantity is positive, and quantity does not exceed available stock.
**Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**

**Property 38: Reservation creation success**
*For any* valid reservation creation, the system should create a Reservation record with status PENDING, set requestTime to current timestamp, send a notification to the pharmacy, and return the reservation details.
**Validates: Requirements 11.6, 11.7, 11.8, 11.9**

**Property 39: Direct call tracking**
*For any* patient clicking "Call Pharmacy", the system should record a DirectCall entry in the database and return the pharmacy phone number.
**Validates: Requirements 11A.3**

**Property 40: Direct call aggregation**
*For any* pharmacy, the system should correctly count the total number of DirectCall records associated with that pharmacy.
**Validates: Requirements 11A.4**

**Property 41: Reservation timeout mechanism**
*For any* reservation with status PENDING, if 5 minutes have passed since requestTime without a pharmacy response, the system should update status to NO_RESPONSE and set noResponseTime.
**Validates: Requirements 12.2, 12.13**

**Property 42: Reservation acceptance**
*For any* pharmacy accepting a reservation, the system should validate the reservation exists and status is PENDING, then update status to ACCEPTED, set acceptedTime, optionally store a note, and send a notification to the patient.
**Validates: Requirements 12.3, 12.4, 12.5, 12.6, 12.7, 12.8**

**Property 43: Reservation rejection**
*For any* pharmacy rejecting a reservation, the system should update status to REJECTED, set rejectedTime, optionally store a rejection reason, and send a notification to the patient.
**Validates: Requirements 12.9, 12.10, 12.11, 12.12**

**Property 44: NO_RESPONSE phone number handling**
*For any* patient providing a phone number for a NO_RESPONSE reservation, the system should update the patientPhone field and send a notification to the pharmacy with the phone number.
**Validates: Requirements 12.15**

**Property 45: NO_RESPONSE status transitions**
*For any* pharmacy responding to a NO_RESPONSE reservation, the system should allow updating status to either ACCEPTED or REJECTED.
**Validates: Requirements 12.16**

**Property 46: Reservation query operations**
*For any* reservation query (patient or pharmacy), the system should return the appropriate reservations, support filtering by status, and support sorting by request time.
**Validates: Requirements 12.1, 12.17, 13.1, 13.10, 13.11**

**Property 47: Reservation cancellation**
*For any* patient cancelling a reservation, the system should validate the status is PENDING or ACCEPTED, then update status to CANCELLED.
**Validates: Requirements 13.8, 13.9**

**Property 48: NO_RESPONSE analytics tracking**
*For any* pharmacy or admin analytics query, the system should correctly count the number of reservations with status NO_RESPONSE.
**Validates: Requirements 12.18, 12.19**

### Analytics Properties

**Property 49: Pharmacy analytics time window**
*For any* pharmacy analytics query, the system should calculate metrics (total reservations, pending, accepted, rejected, NO_RESPONSE, direct calls) based only on data from the last 30 days.
**Validates: Requirements 14.10**

**Property 50: Admin analytics completeness**
*For any* admin analytics query, the system should calculate metrics (total users, patients, pharmacies, medicines, reservations by status, direct calls, NO_RESPONSE by pharmacy) based on all historical data.
**Validates: Requirements 15.10**

### User Profile Management Properties

**Property 51: Profile field validation**
*For any* profile update, the system should validate that name is not empty, phone matches the expected format, and avatar is a valid image file.
**Validates: Requirements 16.2, 16.3, 16.4**

**Property 52: Avatar upload and storage**
*For any* avatar update, the system should upload the image to storage, store the resulting URL in the database, and update the User record.
**Validates: Requirements 16.5, 16.6, 16.7**

**Property 53: Password change validation**
*For any* password change attempt, the system should validate the current password is correct and the new password meets minimum length requirements before hashing and storing the new password.
**Validates: Requirements 16.8, 16.9, 16.10**

### Error Handling Properties

**Property 54: Consistent error responses**
*For any* API error (validation, authentication, authorization, not found, database), the system should return the appropriate HTTP status code (400, 401, 403, 404, 500) with a consistent error response format containing error type and message.
**Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5**

**Property 55: Error logging**
*For any* unexpected error, the system should log the error details including timestamp, error message, and context.
**Validates: Requirements 17.6**

**Property 56: Field-level validation errors**
*For any* validation failure, the system should return specific field-level error messages indicating which fields failed validation and why.
**Validates: Requirements 17.8**

**Property 57: XSS prevention**
*For any* user input that will be displayed in the UI, the system should sanitize the input to prevent XSS attacks.
**Validates: Requirements 17.10**

### Notification Properties

**Property 58: Notification persistence**
*For any* notification sent (reservation created, accepted, rejected, NO_RESPONSE, pharmacy approved), the system should store a Notification record in the database.
**Validates: Requirements 18.1, 18.2, 18.3, 18.4, 18.5, 18.7**

**Property 59: Notification read status**
*For any* user viewing notifications, the system should mark the viewed notifications as read (isRead = true).
**Validates: Requirements 18.8**

### Data Seeding Properties

**Property 60: Seed script environment check**
*For any* execution of the seed script, if the environment is production, the system should exit with an error message without modifying the database.
**Validates: Requirements 19.2, 19.8**


## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, error conditions, and integration points
- **Property-based tests**: Verify universal properties across all inputs through randomization

Both approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property-based tests verify general correctness across a wide range of inputs.

### Property-Based Testing Configuration

**Library Selection**: Use **fast-check** for TypeScript/JavaScript property-based testing

**Test Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `// Feature: medifind-fullstack-migration, Property {number}: {property_text}`

**Example Property Test Structure**:

```typescript
import fc from 'fast-check';

describe('Authentication Properties', () => {
  test('Property 1: Email validation consistency', () => {
    // Feature: medifind-fullstack-migration, Property 1: Email validation consistency
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.string(),
        async (validEmail, invalidEmail) => {
          // Test that valid emails pass validation
          const validResult = await validateEmail(validEmail);
          expect(validResult.isValid).toBe(true);
          
          // Test that invalid strings fail validation
          const invalidResult = await validateEmail(invalidEmail + '@');
          expect(invalidResult.isValid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  test('Property 4: Password hashing security', () => {
    // Feature: medifind-fullstack-migration, Property 4: Password hashing security
    fc.assert(
      fc.property(
        fc.string({ minLength: 8 }),
        async (password) => {
          // Register user with password
          const user = await registerUser({
            email: `test${Date.now()}@example.com`,
            password,
            name: 'Test User',
          });
          
          // Retrieve user from database
          const storedUser = await prisma.user.findUnique({
            where: { id: user.id },
          });
          
          // Verify password is hashed (not plaintext)
          expect(storedUser.password).not.toBe(password);
          expect(storedUser.password).toMatch(/^\$2[aby]\$\d{2}\$/); // bcrypt format
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing Strategy

**Test Organization**:
- Group tests by feature area (auth, medicines, reservations, etc.)
- Use descriptive test names that explain the scenario
- Follow AAA pattern: Arrange, Act, Assert

**Coverage Focus**:
- API endpoint request/response validation
- Database operations (CRUD)
- Business logic edge cases
- Error handling scenarios
- Integration between components

**Example Unit Test Structure**:

```typescript
describe('POST /api/auth/register', () => {
  it('should create a new patient user with valid data', async () => {
    const userData = {
      email: 'patient@example.com',
      password: 'password123',
      name: 'John Doe',
      phone: '+1234567890',
    };
    
    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    
    const user = await prisma.user.findUnique({
      where: { email: userData.email },
    });
    
    expect(user).toBeDefined();
    expect(user.role).toBe('PATIENT');
  });
  
  it('should return 409 for duplicate email', async () => {
    const userData = {
      email: 'existing@example.com',
      password: 'password123',
      name: 'Jane Doe',
    };
    
    // Create first user
    await request(app).post('/api/auth/register').send(userData);
    
    // Attempt duplicate registration
    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);
    
    expect(response.status).toBe(409);
    expect(response.body.error).toBe('CONFLICT');
  });
  
  it('should reject password shorter than 8 characters', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'short',
      name: 'Test User',
    };
    
    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('VALIDATION_ERROR');
  });
});
```

### Integration Testing

**Scope**:
- End-to-end user workflows (registration → login → reservation → acceptance)
- Multi-step processes (pharmacy approval workflow)
- Cross-component interactions (reservation creation triggers notification)

**Example Integration Test**:

```typescript
describe('Reservation Workflow Integration', () => {
  it('should complete full reservation lifecycle', async () => {
    // Setup: Create patient, pharmacy, medicine, inventory
    const patient = await createTestUser('PATIENT');
    const pharmacy = await createTestPharmacy(true); // approved
    const medicine = await createTestMedicine();
    await createTestInventory(pharmacy.id, medicine.id, 20);
    
    // Patient creates reservation
    const reservation = await createReservation(patient.id, {
      pharmacyId: pharmacy.id,
      medicineId: medicine.id,
      quantity: 2,
    });
    
    expect(reservation.status).toBe('PENDING');
    
    // Verify pharmacy received notification
    const pharmacyNotifications = await getNotifications(pharmacy.userId);
    expect(pharmacyNotifications).toHaveLength(1);
    expect(pharmacyNotifications[0].type).toBe('reservation_created');
    
    // Pharmacy accepts reservation
    const accepted = await acceptReservation(pharmacy.id, reservation.id, {
      note: 'Ready for pickup',
    });
    
    expect(accepted.status).toBe('ACCEPTED');
    expect(accepted.acceptedTime).toBeDefined();
    
    // Verify patient received notification
    const patientNotifications = await getNotifications(patient.id);
    expect(patientNotifications).toHaveLength(1);
    expect(patientNotifications[0].type).toBe('reservation_accepted');
    expect(patientNotifications[0].message).toContain('Ready for pickup');
  });
});
```

### Test Data Management

**Test Database**:
- Use separate test database (configured via TEST_DATABASE_URL)
- Reset database before each test suite
- Use transactions for test isolation when possible

**Test Fixtures**:
- Create reusable factory functions for test data
- Use realistic but anonymized data
- Ensure test data doesn't leak between tests

```typescript
// Test factories
export async function createTestUser(role: UserRole = 'PATIENT') {
  return prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      password: await hashPassword('password123'),
      name: 'Test User',
      role,
    },
  });
}

export async function createTestPharmacy(isApproved: boolean = false) {
  const user = await createTestUser('PHARMACY');
  return prisma.pharmacy.create({
    data: {
      userId: user.id,
      name: 'Test Pharmacy',
      address: '123 Test St',
      phone: '+1234567890',
      latitude: 40.7128,
      longitude: -74.0060,
      workingHours: '9AM-9PM',
      isApproved,
    },
  });
}
```

### Continuous Integration

**CI Pipeline**:
1. Install dependencies
2. Run linter (ESLint)
3. Run type checker (TypeScript)
4. Run unit tests
5. Run property-based tests
6. Run integration tests
7. Generate coverage report (aim for >80% coverage)

**Pre-commit Hooks**:
- Run linter and type checker
- Run fast unit tests
- Prevent commits with failing tests

### Performance Testing

**Load Testing**:
- Test API endpoints under concurrent load
- Verify database query performance
- Monitor response times for critical paths

**Stress Testing**:
- Test reservation timeout mechanism with many concurrent reservations
- Test notification system with high notification volume
- Verify system behavior under database connection limits

### Security Testing

**Authentication Testing**:
- Test JWT token expiration and refresh
- Test password hashing strength
- Test session invalidation on logout

**Authorization Testing**:
- Test role-based access control for all protected routes
- Test pharmacy approval enforcement
- Test resource ownership validation

**Input Validation Testing**:
- Test SQL injection prevention (via Prisma)
- Test XSS prevention
- Test input sanitization for all user inputs

### Monitoring and Observability

**Logging**:
- Log all authentication attempts (success and failure)
- Log all authorization failures
- Log all database errors
- Log all unexpected exceptions

**Metrics**:
- Track API response times
- Track database query performance
- Track error rates by endpoint
- Track reservation timeout rates

**Alerts**:
- Alert on high error rates
- Alert on slow database queries
- Alert on authentication failures spike
- Alert on reservation timeout spike

