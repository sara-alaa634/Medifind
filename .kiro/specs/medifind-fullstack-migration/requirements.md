# Requirements Document: MediFind Full-Stack Migration

## Introduction

This document specifies the requirements for migrating the MediFind medicine reservation platform from a React prototype with mock data to a production-ready full-stack application. The system will use Next.js 14+ with App Router for the frontend, Node.js API routes for the backend, PostgreSQL with Prisma ORM for data persistence, and JWT-based authentication with role-based access control.

The migration maintains all existing functionality while adding production features including persistent data storage, secure authentication, real-time updates, and comprehensive error handling.

## Glossary

- **System**: The MediFind full-stack application
- **Patient**: A user with the PATIENT role who searches for and reserves medicines
- **Pharmacy**: A user with the PHARMACY role who manages inventory and handles reservations
- **Admin**: A user with the ADMIN role who oversees the platform
- **Reservation**: A request from a Patient to reserve a specific medicine at a specific Pharmacy
- **Inventory**: The collection of medicines and their quantities available at a Pharmacy
- **JWT**: JSON Web Token used for authentication
- **Prisma**: The ORM (Object-Relational Mapping) tool for database access
- **API_Route**: A Next.js API endpoint that handles backend logic
- **Session**: An authenticated user's active connection to the System
- **Stock_Status**: The availability state of a medicine (IN_STOCK, LOW_STOCK, OUT_OF_STOCK)

## Requirements

### Requirement 1: Project Infrastructure Setup

**User Story:** As a developer, I want a properly configured Next.js project with TypeScript and Prisma, so that I can build a production-ready full-stack application.

#### Acceptance Criteria

1. THE System SHALL use Next.js version 14 or higher with App Router
2. THE System SHALL use TypeScript version 5.0 or higher for type safety
3. THE System SHALL use Prisma ORM for database access
4. THE System SHALL use PostgreSQL as the database engine
5. THE System SHALL use Tailwind CSS for styling
6. THE System SHALL use Zod for runtime validation
7. THE System SHALL store environment variables in .env.local file
8. THE System SHALL include a database connection string in environment variables
9. THE System SHALL include a JWT secret key in environment variables

### Requirement 2: Database Schema and Migrations

**User Story:** As a developer, I want a well-defined database schema with proper relationships, so that data is stored consistently and efficiently.

#### Acceptance Criteria

1. THE System SHALL define a User table with id, email, password, name, phone, role, avatar, createdAt, and updatedAt fields
2. THE System SHALL define a Medicine table with id, name, activeIngredient, dosage, prescriptionRequired, category, priceRange, createdAt, and updatedAt fields
3. THE System SHALL define a Pharmacy table with id, userId, name, address, phone, latitude, longitude, rating, workingHours, isApproved, createdAt, and updatedAt fields
4. THE System SHALL define a Reservation table with id, userId, pharmacyId, medicineId, quantity, status, requestTime, acceptedTime, rejectedTime, noResponseTime, patientPhone, note, createdAt, and updatedAt fields
5. THE System SHALL define an Inventory table with id, pharmacyId, medicineId, quantity, status, lastUpdated fields
6. THE System SHALL define a DirectCall table with id, userId, pharmacyId, medicineId, createdAt fields
7. THE System SHALL define a Notification table with id, userId, type, title, message, isRead, createdAt fields
8. THE System SHALL establish a one-to-one relationship between User and Pharmacy tables
9. THE System SHALL establish a one-to-many relationship between User and Reservation tables
10. THE System SHALL establish a one-to-many relationship between Pharmacy and Reservation tables
11. THE System SHALL establish a one-to-many relationship between Pharmacy and Inventory tables
12. THE System SHALL establish a many-to-one relationship between Inventory and Medicine tables
13. THE System SHALL establish a one-to-many relationship between User and DirectCall tables
14. THE System SHALL establish a one-to-many relationship between Pharmacy and DirectCall tables
15. THE System SHALL establish a one-to-many relationship between User and Notification tables
16. WHEN a Prisma migration is created, THE System SHALL generate SQL migration files
17. WHEN a Prisma migration is applied, THE System SHALL update the database schema

### Requirement 3: User Authentication - Registration

**User Story:** As a new user, I want to create an account with my email and password, so that I can access the platform.

#### Acceptance Criteria

1. WHEN a user submits registration data, THE System SHALL validate the email format
2. WHEN a user submits registration data, THE System SHALL validate the password has minimum 8 characters
3. WHEN a user submits registration data with an existing email, THE System SHALL return an error indicating email already exists
4. WHEN a user submits valid registration data, THE System SHALL hash the password using bcrypt
5. WHEN a user submits valid registration data, THE System SHALL create a new User record in the database
6. WHEN a user submits valid registration data, THE System SHALL assign the PATIENT role by default
7. WHEN a user registers as a pharmacy, THE System SHALL create both User and Pharmacy records
8. WHEN a pharmacy user is created, THE System SHALL set isApproved to false by default
9. WHEN registration succeeds, THE System SHALL return a success message without exposing sensitive data

### Requirement 4: User Authentication - Login

**User Story:** As a registered user, I want to log in with my email and password, so that I can access my account.

#### Acceptance Criteria

1. WHEN a user submits login credentials, THE System SHALL validate the email format
2. WHEN a user submits login credentials, THE System SHALL validate the password is not empty
3. WHEN a user submits credentials with a non-existent email, THE System SHALL return an authentication error
4. WHEN a user submits credentials with an incorrect password, THE System SHALL return an authentication error
5. WHEN a user submits valid credentials, THE System SHALL verify the password against the stored hash
6. WHEN authentication succeeds, THE System SHALL generate a JWT token containing user id and role
7. WHEN authentication succeeds, THE System SHALL set the JWT token in an httpOnly cookie
8. WHEN authentication succeeds, THE System SHALL return user data excluding the password
9. THE JWT token SHALL expire after 7 days

### Requirement 5: User Authentication - Session Management

**User Story:** As an authenticated user, I want my session to persist across page refreshes, so that I don't have to log in repeatedly.

#### Acceptance Criteria

1. WHEN a user makes an authenticated request, THE System SHALL extract the JWT token from the httpOnly cookie
2. WHEN a JWT token is present, THE System SHALL verify the token signature
3. WHEN a JWT token is expired, THE System SHALL return an authentication error
4. WHEN a JWT token is invalid, THE System SHALL return an authentication error
5. WHEN a JWT token is valid, THE System SHALL extract the user id and role from the token
6. WHEN a user logs out, THE System SHALL clear the httpOnly cookie
7. WHEN a user logs out, THE System SHALL invalidate the current session

### Requirement 6: Authorization and Access Control

**User Story:** As a system administrator, I want role-based access control, so that users can only access features appropriate to their role.

#### Acceptance Criteria

1. WHEN a Patient attempts to access Pharmacy routes, THE System SHALL return an authorization error
2. WHEN a Patient attempts to access Admin routes, THE System SHALL return an authorization error
3. WHEN a Pharmacy attempts to access Admin routes, THE System SHALL return an authorization error
4. WHEN an unapproved Pharmacy attempts to access Pharmacy features, THE System SHALL return an authorization error
5. WHEN an authenticated user accesses a route matching their role, THE System SHALL allow the request
6. THE System SHALL implement middleware to check authentication before processing protected routes
7. THE System SHALL implement middleware to check authorization based on user role
8. WHEN authorization fails, THE System SHALL return HTTP status 403

### Requirement 7: Medicine Catalog Management

**User Story:** As an Admin, I want to manage the medicine database, so that the platform has accurate and up-to-date medicine information.

#### Acceptance Criteria

1. WHEN an Admin creates a medicine, THE System SHALL validate all required fields are present
2. WHEN an Admin creates a medicine, THE System SHALL store the medicine in the database
3. WHEN an Admin updates a medicine, THE System SHALL validate the medicine exists
4. WHEN an Admin updates a medicine, THE System SHALL update the medicine record
5. WHEN an Admin deletes a medicine, THE System SHALL check if the medicine is referenced in active reservations
6. WHEN a medicine has active reservations, THE System SHALL prevent deletion and return an error
7. WHEN a medicine has no active reservations, THE System SHALL delete the medicine record
8. WHEN an Admin retrieves medicines, THE System SHALL return all medicines with pagination support
9. THE System SHALL support filtering medicines by category
10. THE System SHALL support searching medicines by name or active ingredient

### Requirement 8: Pharmacy Management and Approval

**User Story:** As an Admin, I want to approve or reject pharmacy registrations, so that only legitimate pharmacies can operate on the platform.

#### Acceptance Criteria

1. WHEN an Admin retrieves pending pharmacies, THE System SHALL return all pharmacies where isApproved is false
2. WHEN an Admin approves a pharmacy, THE System SHALL set isApproved to true
3. WHEN an Admin approves a pharmacy, THE System SHALL send a notification to the pharmacy user
4. WHEN an Admin rejects a pharmacy, THE System SHALL delete the Pharmacy and User records
5. WHEN an Admin retrieves all pharmacies, THE System SHALL return pharmacies with pagination support
6. THE System SHALL support filtering pharmacies by approval status
7. THE System SHALL support searching pharmacies by name or address
8. WHEN a Pharmacy updates their profile, THE System SHALL validate all required fields
9. WHEN a Pharmacy updates their profile, THE System SHALL update the Pharmacy record

### Requirement 9: Inventory Management

**User Story:** As a Pharmacy, I want to manage my medicine inventory, so that patients can see accurate availability information.

#### Acceptance Criteria

1. WHEN a Pharmacy adds a medicine to inventory, THE System SHALL create an Inventory record
2. WHEN a Pharmacy updates inventory quantity, THE System SHALL validate the quantity is non-negative
3. WHEN a Pharmacy updates inventory quantity to 0, THE System SHALL set status to OUT_OF_STOCK
4. WHEN a Pharmacy updates inventory quantity between 1 and 10, THE System SHALL set status to LOW_STOCK
5. WHEN a Pharmacy updates inventory quantity above 10, THE System SHALL set status to IN_STOCK
6. WHEN a Pharmacy retrieves their inventory, THE System SHALL return all Inventory records for that Pharmacy
7. WHEN a Pharmacy removes a medicine from inventory, THE System SHALL delete the Inventory record
8. THE System SHALL update lastUpdated timestamp whenever inventory changes
9. THE System SHALL support filtering inventory by stock status
10. THE System SHALL support searching inventory by medicine name

### Requirement 10: Medicine Search and Availability

**User Story:** As a Patient, I want to search for medicines and see their availability across pharmacies, so that I can find where to get my medication.

#### Acceptance Criteria

1. WHEN a guest user searches by medicine name, THE System SHALL return medicines matching the search term without requiring authentication
2. WHEN a guest user searches by active ingredient, THE System SHALL return medicines containing that ingredient without requiring authentication
3. WHEN a guest user filters by category, THE System SHALL return medicines in that category without requiring authentication
4. WHEN a guest user views a medicine, THE System SHALL display all pharmacies that have it in stock without requiring authentication
5. WHEN displaying pharmacy availability, THE System SHALL show the current stock status
6. WHEN displaying pharmacy availability, THE System SHALL show the pharmacy distance from the patient
7. WHEN displaying pharmacy availability, THE System SHALL sort pharmacies by distance by default
8. THE System SHALL support sorting pharmacies by rating
9. THE System SHALL support sorting pharmacies by distance
10. WHEN a medicine requires a prescription, THE System SHALL display a prescription required indicator
11. WHEN a guest user attempts to create a reservation, THE System SHALL prompt them to login or register

### Requirement 11: Reservation Creation

**User Story:** As a Patient, I want to reserve a medicine at a specific pharmacy, so that I can ensure it's available when I arrive.

#### Acceptance Criteria

1. WHEN a Patient creates a reservation, THE System SHALL validate the medicine exists
2. WHEN a Patient creates a reservation, THE System SHALL validate the pharmacy exists
3. WHEN a Patient creates a reservation, THE System SHALL validate the pharmacy has the medicine in stock
4. WHEN a Patient creates a reservation, THE System SHALL validate the quantity is positive
5. WHEN a Patient creates a reservation, THE System SHALL validate the quantity does not exceed available stock
6. WHEN a Patient creates a valid reservation, THE System SHALL create a Reservation record with status PENDING
7. WHEN a reservation is created, THE System SHALL set requestTime to the current timestamp
8. WHEN a reservation is created, THE System SHALL send a notification to the pharmacy
9. WHEN a reservation is created, THE System SHALL return the reservation details to the patient

### Requirement 11A: Direct Pharmacy Contact

**User Story:** As a Patient, I want to call a pharmacy directly instead of making a reservation, so that I can speak with them immediately about my medicine needs.

#### Acceptance Criteria

1. WHEN a Patient views pharmacy availability for a medicine, THE System SHALL display a "Call Pharmacy" button for each pharmacy
2. WHEN a Patient clicks "Call Pharmacy", THE System SHALL display the pharmacy phone number
3. WHEN a Patient clicks "Call Pharmacy", THE System SHALL record this action in the database
4. THE System SHALL track direct call count per pharmacy
5. THE System SHALL display direct call count in pharmacy analytics dashboard
6. THE System SHALL display direct call count in admin analytics dashboard

### Requirement 12: Reservation Management - Pharmacy Actions

**User Story:** As a Pharmacy, I want to accept or reject reservation requests within a time window, so that I can manage customer demand efficiently and patients get timely responses.

#### Acceptance Criteria

1. WHEN a Pharmacy retrieves reservations, THE System SHALL return all reservations for that Pharmacy
2. WHEN a reservation is created, THE System SHALL start a 5-minute response timer
3. WHEN a Pharmacy accepts a reservation within 5 minutes, THE System SHALL validate the reservation exists
4. WHEN a Pharmacy accepts a reservation within 5 minutes, THE System SHALL validate the reservation status is PENDING
5. WHEN a Pharmacy accepts a reservation within 5 minutes, THE System SHALL update status to ACCEPTED
6. WHEN a Pharmacy accepts a reservation, THE System SHALL set acceptedTime to the current timestamp
7. WHEN a Pharmacy accepts a reservation, THE Pharmacy SHALL optionally store a note to send to patient
8. WHEN a Pharmacy accepts a reservation, THE System SHALL send a notification to the patient with 30-minute pickup window and note if provided
9. WHEN a Pharmacy rejects a reservation, THE System SHALL update status to REJECTED
10. WHEN a Pharmacy rejects a reservation, THE System SHALL set rejectedTime to the current timestamp
11. WHEN a Pharmacy rejects a reservation, THE Pharmacy SHALL optionally store a rejection reason
12. WHEN a Pharmacy rejects a reservation, THE System SHALL send a notification to the patient with rejection reason if provided
13. WHEN 5 minutes pass without pharmacy response, THE System SHALL update status to NO_RESPONSE
14. WHEN status changes to NO_RESPONSE, THE System SHALL prompt the patient to provide their phone number
15. WHEN a patient provides phone number for NO_RESPONSE reservation, THE System SHALL send notification to pharmacy with patient phone number
16. WHEN a Pharmacy responds to NO_RESPONSE reservation, THE Pharmacy SHALL update status to ACCEPTED or REJECTED
17. THE System SHALL support filtering reservations by status
18. THE System SHALL track NO_RESPONSE count in pharmacy analytics
19. THE System SHALL track NO_RESPONSE count in Admin Dashboard analytics
### Requirement 13: Reservation Management - Patient Actions

**User Story:** As a Patient, I want to view and manage my reservations, so that I can track the status of my medicine requests.

#### Acceptance Criteria

1. WHEN a Patient retrieves their reservations, THE System SHALL return all reservations for that Patient
2. WHEN a Patient views a reservation, THE System SHALL display the medicine name and details
3. WHEN a Patient views a reservation, THE System SHALL display the pharmacy name and address
4. WHEN a Patient views a reservation, THE System SHALL display the current status
5. WHEN a Patient views a reservation, THE System SHALL display the request time
6. WHEN a reservation is accepted, THE System SHALL display the acceptance time and any notes
7. WHEN a reservation is rejected, THE System SHALL display the rejection time and reason
8. WHEN a Patient cancels a reservation, THE System SHALL validate the reservation status is PENDING or ACCEPTED
9. WHEN a Patient cancels a reservation, THE System SHALL update status to CANCELLED
10. THE System SHALL support filtering reservations by status
11. THE System SHALL support sorting reservations by request time

### Requirement 14: Dashboard and Analytics - Pharmacy

**User Story:** As a Pharmacy, I want to view business metrics and reports, so that I can understand my performance and make informed decisions.

#### Acceptance Criteria

1. WHEN a Pharmacy views their dashboard, THE System SHALL display total reservations count
2. WHEN a Pharmacy views their dashboard, THE System SHALL display pending reservations count
3. WHEN a Pharmacy views their dashboard, THE System SHALL display accepted reservations count
4. WHEN a Pharmacy views their dashboard, THE System SHALL display rejected reservations count
5. WHEN a Pharmacy views their dashboard, THE System SHALL display NO_RESPONSE reservations count
6. WHEN a Pharmacy views their dashboard, THE System SHALL display direct call count
7. WHEN a Pharmacy views their dashboard, THE System SHALL display total inventory items count
8. WHEN a Pharmacy views their dashboard, THE System SHALL display low stock items count
9. WHEN a Pharmacy views their dashboard, THE System SHALL display out of stock items count
10. THE System SHALL calculate metrics based on data from the last 30 days
11. THE System SHALL display a list of recent reservations on the dashboard
12. THE System SHALL display a list of low stock items on the dashboard
13. THE System SHALL highlight NO_RESPONSE count as a performance indicator

### Requirement 15: Dashboard and Analytics - Admin

**User Story:** As an Admin, I want to view platform-wide analytics, so that I can monitor system health and usage.

#### Acceptance Criteria

1. WHEN an Admin views the analytics dashboard, THE System SHALL display total users count
2. WHEN an Admin views the analytics dashboard, THE System SHALL display total patients count
3. WHEN an Admin views the analytics dashboard, THE System SHALL display total pharmacies count
4. WHEN an Admin views the analytics dashboard, THE System SHALL display pending pharmacy approvals count
5. WHEN an Admin views the analytics dashboard, THE System SHALL display total medicines count
6. WHEN an Admin views the analytics dashboard, THE System SHALL display total reservations count
7. WHEN an Admin views the analytics dashboard, THE System SHALL display reservations by status breakdown including NO_RESPONSE
8. WHEN an Admin views the analytics dashboard, THE System SHALL display total direct calls count
9. WHEN an Admin views the analytics dashboard, THE System SHALL display NO_RESPONSE count per pharmacy
10. THE System SHALL calculate metrics based on all historical data
11. THE System SHALL display a chart of reservations over time
12. THE System SHALL display a list of most reserved medicines
13. THE System SHALL display pharmacies ranked by NO_RESPONSE rate to identify performance issues

### Requirement 16: User Profile Management

**User Story:** As a user, I want to view and update my profile information, so that my account details are accurate.

#### Acceptance Criteria

1. WHEN a user views their profile, THE System SHALL display their name, email, phone, and avatar
2. WHEN a user updates their name, THE System SHALL validate the name is not empty
3. WHEN a user updates their phone, THE System SHALL validate the phone format
4. WHEN a user updates their avatar, THE System SHALL validate the file is an image
5. WHEN a user updates their avatar, THE System SHALL upload the image to storage
6. WHEN a user updates their avatar, THE System SHALL store the image URL in the database
7. WHEN a user updates valid profile data, THE System SHALL update the User record
8. WHEN a user changes their password, THE System SHALL validate the current password
9. WHEN a user changes their password, THE System SHALL validate the new password has minimum 8 characters
10. WHEN a user changes their password, THE System SHALL hash the new password and update the User record 

### Requirement 17: Error Handling and Validation

**User Story:** As a developer, I want comprehensive error handling and validation, so that the application is robust and provides clear feedback.

#### Acceptance Criteria

1. WHEN an API_Route receives invalid input, THE System SHALL return HTTP status 400 with error details
2. WHEN an API_Route encounters an authentication error, THE System SHALL return HTTP status 401
3. WHEN an API_Route encounters an authorization error, THE System SHALL return HTTP status 403
4. WHEN an API_Route encounters a resource not found error, THE System SHALL return HTTP status 404
5. WHEN an API_Route encounters a database error, THE System SHALL return HTTP status 500 with a generic error message
6. WHEN an API_Route encounters an unexpected error, THE System SHALL log the error details
7. THE System SHALL validate all request bodies using Zod schemas
8. WHEN validation fails, THE System SHALL return specific field-level error messages
9. THE System SHALL sanitize user input to prevent SQL injection
10. THE System SHALL sanitize user input to prevent XSS attacks

### Requirement 18: Real-Time Updates and Notifications

**User Story:** As a user, I want to receive timely notifications about important events, so that I stay informed without constantly refreshing the page.

#### Acceptance Criteria

1. WHEN a Patient creates a reservation, THE System SHALL send a notification to the Pharmacy
2. WHEN a Pharmacy accepts a reservation, THE System SHALL send a notification to the Patient
3. WHEN a Pharmacy rejects a reservation, THE System SHALL send a notification to the Patient
4. WHEN an Admin approves a pharmacy, THE System SHALL send a notification to the Pharmacy user
5. WHEN a reservation status changes to NO_RESPONSE, THE System SHALL send a notification to the Pharmacy
6. THE System SHALL use polling every 30 seconds to check for new notifications
7. WHEN a notification is sent, THE System SHALL store it in the database
8. WHEN a user views notifications, THE System SHALL mark them as read
9. THE System SHALL display unread notification count in the UI
10. THE System SHALL display notifications in a dropdown or notification panel

### Requirement 19: Data Seeding and Migration

**User Story:** As a developer, I want to seed the database with initial data for development and testing, so that I can test the application with realistic data.

#### Acceptance Criteria

1. THE System SHALL provide a seed script to populate initial data
2. THE seed script SHALL check the environment and refuse to run in production
3. WHEN the seed script runs in development, THE System SHALL create sample medicines
4. WHEN the seed script runs in development, THE System SHALL create sample pharmacies
5. WHEN the seed script runs in development, THE System SHALL create sample users for each role
6. WHEN the seed script runs in development, THE System SHALL create sample inventory records
7. WHEN the seed script runs in development, THE System SHALL create sample reservations
8. WHEN the seed script is executed in production environment, THE System SHALL exit with an error message
9. THE System SHALL provide a one-time migration script to import data from the React prototype
10. WHEN migrating data, THE System SHALL preserve all medicine information
11. WHEN migrating data, THE System SHALL preserve all pharmacy information
12. THE migration script SHALL be designed to run once during initial deployment

### Requirement 20: API Documentation and Testing

**User Story:** As a developer, I want well-documented API endpoints, so that I can understand and test the backend functionality.

#### Acceptance Criteria

1. THE System SHALL document all API_Route endpoints with request and response schemas
2. THE System SHALL document authentication requirements for each endpoint
3. THE System SHALL document authorization requirements for each endpoint
4. THE System SHALL provide example requests and responses for each endpoint
5. THE System SHALL include error response examples for each endpoint
6. THE System SHALL organize API documentation by feature area
7. THE System SHALL keep API documentation in sync with implementation
