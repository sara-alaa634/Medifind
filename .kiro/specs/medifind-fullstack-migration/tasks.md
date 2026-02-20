# Implementation Plan: MediFind Full-Stack Migration

## Overview

This implementation plan converts the MediFind React prototype into a production-ready full-stack Next.js application with PostgreSQL, Prisma ORM, and JWT authentication. The migration replaces the sidebar role switcher with proper route-based navigation, adds persistent data storage, implements secure authentication/authorization, and includes the 5-minute reservation timeout mechanism.

## Tasks

- [x] 1. Set up Next.js project infrastructure
  - Initialize Next.js 14+ project with TypeScript and App Router
  - Configure Tailwind CSS, ESLint, and Prettier
  - Set up environment variables (.env.local with DATABASE_URL, JWT_SECRET)
  - Install dependencies (Prisma, Zod, bcrypt, jsonwebtoken, fast-check)
  - Configure path aliases (@/ pointing to project root)
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 1.8, 1.9_

- [x] 2. Define database schema and run migrations
  - [x] 2.1 Create Prisma schema with all models
    - Define User, Medicine, Pharmacy, Reservation, Inventory, DirectCall, Notification models
    - Define enums (UserRole, ReservationStatus, StockStatus)
    - Set up relationships and constraints
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 2.15_
  
  - [x] 2.2 Initialize Prisma and create initial migration
    - Run `npx prisma init`
    - Run `npx prisma migrate dev --name init`
    - Generate Prisma Client
    - _Requirements: 2.16, 2.17_
  
  - [x] 2.3 Create Prisma client singleton
    - Create lib/prisma.ts with singleton pattern
    - Handle connection pooling for serverless environments
    - _Requirements: 1.3_

- [-] 3. Implement authentication utilities and middleware
  - [x] 3.1 Create authentication utility functions
    - Implement password hashing (bcrypt)
    - Implement JWT generation and verification
    - Implement cookie management helpers
    - Create lib/auth.ts
    - _Requirements: 3.4, 4.5, 4.6, 4.7, 4.9_
  
  - [x] 3.2 Write property tests for authentication utilities
    - **Property 4: Password hashing security**
    - **Validates: Requirements 3.4, 16.10**
    - **Property 12: JWT token structure**
    - **Validates: Requirements 4.6, 4.9**
  
  - [x] 3.3 Create Zod validation schemas
    - Define schemas for registration, login, medicine, reservation, inventory
    - Create lib/validation.ts
    - _Requirements: 1.6, 17.7_
  
  - [x] 3.4 Write property tests for validation schemas
    - **Property 1: Email validation consistency**
    - **Validates: Requirements 3.1, 4.1**
    - **Property 2: Password minimum length enforcement**
    - **Validates: Requirements 3.2, 16.9**
  
  - [x] 3.5 Implement Next.js middleware for auth/authz
    - Create middleware.ts with JWT verification
    - Implement role-based route protection
    - Check pharmacy approval status
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_
  
  - [x] 3.6 Write property tests for authorization middleware
    - **Property 17: Role-based access control**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.8**
    - **Property 18: Pharmacy approval enforcement**
    - **Validates: Requirements 6.4**

- [x] 4. Checkpoint - Ensure infrastructure is working
  - Verify database connection
  - Verify Prisma Client generation
  - Verify middleware compiles without errors
  - Ask the user if questions arise

- [x] 5. Implement authentication API routes
  - [x] 5.1 Create registration API endpoint
    - Implement POST /api/auth/register
    - Validate input with Zod
    - Hash password with bcrypt
    - Create User record (and Pharmacy if applicable)
    - Handle duplicate email errors
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_
  
  - [x] 5.2 Write property tests for registration
    - **Property 3: Duplicate email prevention**
    - **Validates: Requirements 3.3**
    - **Property 5: User creation completeness**
    - **Validates: Requirements 3.5**
    - **Property 6: Default role assignment**
    - **Validates: Requirements 3.6**
    - **Property 7: Pharmacy registration atomicity**
    - **Validates: Requirements 3.7**
    - **Property 8: Pharmacy approval default**
    - **Validates: Requirements 3.8**
    - **Property 9: Sensitive data exclusion**
    - **Validates: Requirements 3.9, 4.8**
  
  - [x] 5.3 Create login API endpoint
    - Implement POST /api/auth/login
    - Validate credentials
    - Verify password with bcrypt
    - Generate JWT token
    - Set httpOnly cookie
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_
  
  - [x] 5.4 Write property tests for login
    - **Property 10: Authentication credential validation**
    - **Validates: Requirements 4.3, 4.4**
    - **Property 11: Password verification correctness**
    - **Validates: Requirements 4.5**
    - **Property 13: JWT cookie security**
    - **Validates: Requirements 4.7**
  
  - [x] 5.5 Create logout and session endpoints
    - Implement POST /api/auth/logout
    - Implement GET /api/auth/me
    - Clear cookies on logout
    - _Requirements: 5.6, 5.7_
  
  - [x] 5.6 Write property tests for session management
    - **Property 14: JWT token extraction and verification**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
    - **Property 15: JWT payload extraction**
    - **Validates: Requirements 5.5**
    - **Property 16: Logout session cleanup**
    - **Validates: Requirements 5.6, 5.7**

- [x] 6. Create authentication UI components and pages
  - [x] 6.1 Create login and registration pages
    - Create app/(auth)/login/page.tsx
    - Create app/(auth)/register/page.tsx
    - Create components/auth/LoginForm.tsx
    - Create components/auth/RegisterForm.tsx
    - Handle form submission and error display
    - Redirect to role-specific routes after login
    - _Requirements: 3.1-3.9, 4.1-4.9_
  
  - [x] 6.2 Create role-specific layouts
    - Create app/(patient)/layout.tsx with patient navigation
    - Create app/(pharmacy)/layout.tsx with pharmacy navigation
    - Create app/(admin)/layout.tsx with admin navigation
    - Remove prototype's sidebar role switcher
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 7. Implement medicine catalog API routes
  - [x] 7.1 Create medicine CRUD endpoints
    - Implement GET /api/medicines (public, with pagination/filtering/search)
    - Implement GET /api/medicines/[id] (public, with pharmacy availability)
    - Implement POST /api/medicines (admin only)
    - Implement PUT /api/medicines/[id] (admin only)
    - Implement DELETE /api/medicines/[id] (admin only, check active reservations)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_
  
  - [ ]* 7.2 Write property tests for medicine management
    - **Property 20: Medicine CRUD validation**
    - **Validates: Requirements 7.1, 7.3**
    - **Property 21: Medicine persistence**
    - **Validates: Requirements 7.2, 7.4**
    - **Property 22: Medicine deletion referential integrity**
    - **Validates: Requirements 7.5, 7.6, 7.7**
    - **Property 23: Medicine pagination and filtering**
    - **Validates: Requirements 7.8, 7.9, 7.10**

- [-] 8. Implement pharmacy management API routes
  - [x] 8.1 Create pharmacy CRUD and approval endpoints
    - Implement GET /api/pharmacies (with pagination/filtering/search)
    - Implement GET /api/pharmacies/[id]
    - Implement PUT /api/pharmacies/[id] (pharmacy owner only)
    - Implement POST /api/pharmacies/[id]/approve (admin only)
    - Implement DELETE /api/pharmacies/[id] (admin only)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_
  
  - [x] 8.2 Write property tests for pharmacy management
    - **Property 24: Pharmacy approval workflow**
    - **Validates: Requirements 8.2, 8.3**
    - **Property 25: Pharmacy rejection cleanup**
    - **Validates: Requirements 8.4**
    - **Property 26: Pharmacy query operations**
    - **Validates: Requirements 8.1, 8.5, 8.6, 8.7**
    - **Property 27: Pharmacy profile update validation**
    - **Validates: Requirements 8.8, 8.9**

- [x] 9. Checkpoint - Ensure core entities are working
  - Test medicine CRUD operations
  - Test pharmacy approval workflow
  - Verify role-based access control
  - Ask the user if questions arise

- [-] 10. Implement inventory management API routes
  - [x] 10.1 Create inventory CRUD endpoints
    - Implement GET /api/inventory (pharmacy only, with filtering/search)
    - Implement POST /api/inventory (pharmacy only)
    - Implement PUT /api/inventory/[id] (pharmacy only, auto-update status)
    - Implement DELETE /api/inventory/[id] (pharmacy only)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10_
  
  - [x] 10.2 Write property tests for inventory management
    - **Property 28: Inventory creation and deletion**
    - **Validates: Requirements 9.1, 9.7**
    - **Property 29: Inventory quantity validation**
    - **Validates: Requirements 9.2**
    - **Property 30: Stock status calculation**
    - **Validates: Requirements 9.3, 9.4, 9.5**
    - **Property 31: Inventory timestamp tracking**
    - **Validates: Requirements 9.8**
    - **Property 32: Inventory query operations**
    - **Validates: Requirements 9.6, 9.9, 9.10**

- [x] 11. Implement medicine search and availability features
  - [x] 11.1 Create medicine search UI (patient view)
    - Create app/(patient)/search/page.tsx
    - Implement search by name, active ingredient, category
    - Display pharmacy availability with distance and stock status
    - Support sorting by distance and rating
    - Show prescription requirement indicator
    - Allow guest access (no auth required)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10_
  
  - [x] 11.2 Write property tests for search functionality
    - **Property 33: Guest search access**
    - **Validates: Requirements 10.1, 10.2, 10.3**
    - **Property 34: Medicine availability display**
    - **Validates: Requirements 10.4, 10.5, 10.6, 10.10**
    - **Property 35: Pharmacy sorting**
    - **Validates: Requirements 10.7, 10.8, 10.9**
  
  - [x] 11.3 Implement distance calculation utility
    - Create Haversine formula function in lib/utils.ts
    - Calculate distance between patient and pharmacy coordinates
    - _Requirements: 10.6_

- [x] 12. Implement reservation creation and direct call features
  - [x] 12.1 Create reservation creation endpoint
    - Implement POST /api/reservations (patient only)
    - Validate medicine, pharmacy, stock availability, quantity
    - Create Reservation with status PENDING
    - Set requestTime to current timestamp
    - Send notification to pharmacy
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9_
  
  - [x] 12.2 Write property tests for reservation creation
    - **Property 37: Reservation creation validation**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**
    - **Property 38: Reservation creation success**
    - **Validates: Requirements 11.6, 11.7, 11.8, 11.9**
    - **Property 36: Guest reservation restriction**
    - **Validates: Requirements 10.11**
  
  - [x] 12.3 Create direct call tracking endpoint
    - Implement POST /api/direct-calls (patient only)
    - Record DirectCall entry
    - Return pharmacy phone number
    - _Requirements: 11A.3, 11A.4_
  
  - [ ] 12.4 Write property tests for direct call tracking
    - **Property 39: Direct call tracking**
    - **Validates: Requirements 11A.3**
    - **Property 40: Direct call aggregation**
    - **Validates: Requirements 11A.4**

- [-] 13. Implement reservation management endpoints (pharmacy actions)
  - [x] 13.1 Create reservation action endpoints
    - Implement GET /api/reservations (role-based: patient or pharmacy)
    - Implement PUT /api/reservations/[id]/accept (pharmacy only)
    - Implement PUT /api/reservations/[id]/reject (pharmacy only)
    - Implement PUT /api/reservations/[id]/cancel (patient only)
    - Implement PUT /api/reservations/[id]/provide-phone (patient only)
    - Support filtering by status and sorting by request time
    - _Requirements: 12.1, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11, 12.12, 12.15, 12.16, 12.17, 13.1, 13.8, 13.9, 13.10, 13.11_
  
  - [ ] 13.2 Write property tests for reservation management
    - **Property 42: Reservation acceptance**
    - **Validates: Requirements 12.3, 12.4, 12.5, 12.6, 12.7, 12.8**
    - **Property 43: Reservation rejection**
    - **Validates: Requirements 12.9, 12.10, 12.11, 12.12**
    - **Property 44: NO_RESPONSE phone number handling**
    - **Validates: Requirements 12.15**
    - **Property 45: NO_RESPONSE status transitions**
    - **Validates: Requirements 12.16**
    - **Property 46: Reservation query operations**
    - **Validates: Requirements 12.1, 12.17, 13.1, 13.10, 13.11**
    - **Property 47: Reservation cancellation**
    - **Validates: Requirements 13.8, 13.9**

- [x] 14. Implement reservation timeout mechanism
  - [x] 14.1 Create background job for timeout checking
    - Create services/reservationService.ts with checkReservationTimeouts()
    - Query reservations with status PENDING and requestTime > 5 minutes ago
    - Update status to NO_RESPONSE and set noResponseTime
    - Send notification to patient prompting for phone number
    - _Requirements: 12.2, 12.13_
  
  - [ ]* 14.2 Write property tests for timeout mechanism
    - **Property 41: Reservation timeout mechanism**
    - **Validates: Requirements 12.2, 12.13**
  
  - [x] 14.3 Set up timeout job execution
    - Create API route /api/cron/check-timeouts (for cron job)
    - Or implement client-side polling to trigger timeout checks
    - _Requirements: 12.2, 12.13_

- [x] 15. Checkpoint - Ensure reservation workflow is complete
  - Test full reservation lifecycle (create → accept → notification)
  - Test timeout mechanism (create → wait 5 min → NO_RESPONSE)
  - Test phone number fallback for NO_RESPONSE
  - Ask the user if questions arise

- [x] 16. Implement notification system
  - [x] 16.1 Create notification service and endpoints
    - Create services/notificationService.ts with createNotification()
    - Implement GET /api/notifications (authenticated)
    - Implement PUT /api/notifications/[id]/read
    - Implement PUT /api/notifications/mark-all-read
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.7, 18.8_
  
  - [ ]* 16.2 Write property tests for notifications
    - **Property 58: Notification persistence**
    - **Validates: Requirements 18.1, 18.2, 18.3, 18.4, 18.5, 18.7**
    - **Property 59: Notification read status**
    - **Validates: Requirements 18.8**
  
  - [x] 16.3 Create notification UI component
    - Create components/layout/NotificationBell.tsx
    - Implement polling every 30 seconds
    - Display unread count badge
    - Show notification dropdown
    - _Requirements: 18.6, 18.9, 18.10_

- [x] 17. Implement analytics dashboards
  - [x] 17.1 Create pharmacy analytics endpoint
    - Implement GET /api/analytics/pharmacy (pharmacy only)
    - Calculate metrics for last 30 days
    - Return total reservations, pending, accepted, rejected, NO_RESPONSE, direct calls
    - Return inventory stats (total items, low stock, out of stock)
    - Return recent reservations and low stock items
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 14.10, 14.11, 14.12, 14.13_
  
  - [ ]* 17.2 Write property tests for pharmacy analytics
    - **Property 48: NO_RESPONSE analytics tracking**
    - **Validates: Requirements 12.18, 12.19**
    - **Property 49: Pharmacy analytics time window**
    - **Validates: Requirements 14.10**
  
  - [x] 17.3 Create admin analytics endpoint
    - Implement GET /api/analytics/admin (admin only)
    - Calculate metrics for all historical data
    - Return total users, patients, pharmacies, pending approvals, medicines
    - Return total reservations, reservations by status (including NO_RESPONSE)
    - Return direct calls count, NO_RESPONSE by pharmacy
    - Return reservations over time chart data, top medicines
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9, 15.10, 15.11, 15.12, 15.13_
  
  - [ ]* 17.4 Write property tests for admin analytics
    - **Property 50: Admin analytics completeness**
    - **Validates: Requirements 15.10**
  
  - [x] 17.5 Create analytics dashboard pages
    - Create app/(pharmacy)/dashboard/page.tsx
    - Create app/(admin)/analytics/page.tsx
    - Display metrics with charts (using Recharts)
    - Highlight NO_RESPONSE count as performance indicator
    - _Requirements: 14.1-14.13, 15.1-15.13_

- [x] 18. Implement user profile management
  - [x] 18.1 Create profile management endpoints
    - Implement GET /api/profile (authenticated)
    - Implement PUT /api/profile (authenticated)
    - Implement PUT /api/profile/password (authenticated)
    - Implement POST /api/profile/avatar (authenticated)
    - Validate name, phone, avatar file type
    - Hash new password with bcrypt
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10_
  
  - [ ]* 18.2 Write property tests for profile management
    - **Property 51: Profile field validation**
    - **Validates: Requirements 16.2, 16.3, 16.4**
    - **Property 52: Avatar upload and storage**
    - **Validates: Requirements 16.5, 16.6, 16.7**
    - **Property 53: Password change validation**
    - **Validates: Requirements 16.8, 16.9, 16.10**
  
  - [x] 18.3 Create profile page UI
    - Create app/(patient)/profile/page.tsx (shared across roles)
    - Display user information
    - Allow editing name, phone, avatar
    - Allow password change
    - _Requirements: 16.1-16.10_

- [x] 19. Implement error handling and validation
  - [x] 19.1 Create centralized error handler
    - Create lib/errorHandler.ts with consistent error response format
    - Handle validation errors (400)
    - Handle authentication errors (401)
    - Handle authorization errors (403)
    - Handle not found errors (404)
    - Handle database errors (500)
    - Log all errors with context
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_
  
  - [ ]* 19.2 Write property tests for error handling
    - **Property 54: Consistent error responses**
    - **Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5**
    - **Property 55: Error logging**
    - **Validates: Requirements 17.6**
    - **Property 56: Field-level validation errors**
    - **Validates: Requirements 17.8**
  
  - [x] 19.3 Implement input sanitization
    - Create sanitization utilities in lib/utils.ts
    - Sanitize all user input to prevent XSS
    - Apply sanitization in API routes
    - _Requirements: 17.9, 17.10_
  
  - [ ]* 19.4 Write property tests for input sanitization
    - **Property 57: XSS prevention**
    - **Validates: Requirements 17.10**

- [x] 20. Create data seeding and migration scripts
  - [x] 20.1 Create seed script
    - Create prisma/seed.ts
    - Check environment (refuse to run in production)
    - Seed medicines from prototype constants
    - Seed pharmacies with auto-approval
    - Seed sample users for each role
    - Seed sample inventory and reservations
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8_
  
  - [ ]* 20.2 Write property tests for seed script
    - **Property 60: Seed script environment check**
    - **Validates: Requirements 19.2, 19.8**
  
  - [x] 20.3 Create one-time migration script
    - Create scripts/migrate-from-prototype.ts
    - Import medicines from constants.tsx
    - Import pharmacies from constants.tsx
    - Preserve all medicine and pharmacy information
    - _Requirements: 19.9, 19.10, 19.11, 19.12_

- [x] 21. Create remaining UI pages and components
  - [x] 21.1 Create patient pages
    - Create app/(patient)/reservations/page.tsx
    - Display reservation list with filtering and sorting
    - Show reservation status, medicine, pharmacy details
    - Allow cancellation of PENDING/ACCEPTED reservations
    - _Requirements: 13.1-13.11_
  
  - [x] 21.2 Create pharmacy pages
    - Create app/(pharmacy)/inventory/page.tsx
    - Create app/(pharmacy)/reservations/page.tsx
    - Display inventory table with filtering and search
    - Display reservation list with accept/reject actions
    - _Requirements: 9.1-9.10, 12.1-12.19_
  
  - [x] 21.3 Create admin pages
    - Create app/(admin)/medicines/page.tsx
    - Create app/(admin)/pharmacies/page.tsx
    - Display medicine CRUD interface
    - Display pharmacy approval interface
    - _Requirements: 7.1-7.10, 8.1-8.9_

- [x] 22. Checkpoint - Ensure all features are integrated
  - Test complete user workflows for each role
  - Verify all API endpoints are working
  - Verify all UI pages are accessible
  - Test error handling and validation
  - Ask the user if questions arise

- [ ] 23. Set up testing infrastructure
  - [ ] 23.1 Configure testing framework
    - Install Jest and React Testing Library
    - Install fast-check for property-based testing
    - Configure test database (TEST_DATABASE_URL)
    - Create test utilities and factories
    - _Requirements: 20.1-20.7_
  
  - [ ] 23.2 Create test factories
    - Create test/factories.ts with createTestUser, createTestPharmacy, etc.
    - Ensure test data isolation
    - _Requirements: Testing Strategy_

- [ ] 24. Write integration tests
  - [ ]* 24.1 Write reservation workflow integration tests
    - Test full lifecycle: create → accept → notification
    - Test timeout workflow: create → wait → NO_RESPONSE → phone → accept
    - Test cancellation workflow
    - _Requirements: 11.1-11.9, 12.1-12.19, 13.1-13.11_
  
  - [ ]* 24.2 Write authentication workflow integration tests
    - Test registration → login → access protected route
    - Test role-based access control
    - Test pharmacy approval workflow
    - _Requirements: 3.1-3.9, 4.1-4.9, 6.1-6.8, 8.1-8.9_

- [ ] 25. Final testing and polish
  - [ ] 25.1 Run all tests and fix failures
    - Run unit tests
    - Run property-based tests (100 iterations each)
    - Run integration tests
    - Verify test coverage >80%
    - _Requirements: All_
  
  - [ ] 25.2 Perform manual testing
    - Test all user workflows manually
    - Test on different browsers
    - Test responsive design on mobile
    - Verify error messages are user-friendly
    - _Requirements: All_
  
  - [ ] 25.3 Performance optimization
    - Add database indexes for common queries
    - Optimize API response times
    - Implement pagination for large lists
    - _Requirements: All_

- [ ] 26. Final checkpoint - Production readiness
  - All tests passing
  - All features implemented
  - Error handling comprehensive
  - Security measures in place
  - Ask the user if ready for deployment

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with 100 iterations each
- Unit tests validate specific examples and edge cases
- The migration replaces the prototype's sidebar role switcher with proper route-based navigation
- Each role has dedicated routes protected by middleware (`/patient/*`, `/pharmacy/*`, `/admin/*`)
