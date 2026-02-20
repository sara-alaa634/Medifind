# Project Structure

## Directory Organization

```
/
├── components/          # Shared UI components (Layout, StatusBadge)
├── views/              # Role-specific view components
│   ├── User/           # Patient-facing views (search, reservation, history)
│   ├── Pharmacy/       # Pharmacy portal views (dashboard, inventory)
│   └── Admin/          # Admin portal views (analytics, management)
├── services/           # Business logic and data management
├── .kiro/              # Kiro configuration and steering rules
└── [root files]        # App entry, types, constants, config
```

## Key Files

- `App.tsx` - Main application component with role-based routing and state management
- `types.ts` - TypeScript interfaces and enums (UserRole, ReservationStatus, etc.)
- `constants.tsx` - Mock data and static configuration (medicines, pharmacies, categories)
- `services/mockStore.ts` - In-memory data store for reservations and inventory

## Architecture Patterns

### Component Organization
- Views are organized by user role (User/Pharmacy/Admin)
- Each role has dedicated views for their workflows
- Shared components live in `/components`

### State Management
- App-level state in `App.tsx` using React hooks
- Mock data store (`mockStore.ts`) simulates backend persistence
- No external state management library (Redux, Zustand, etc.)

### Styling
- Inline Tailwind CSS classes for all styling
- No separate CSS/SCSS files
- Responsive design with mobile-first approach (md: breakpoints)

### Data Flow
- Props drilling from App.tsx to child views
- Callback functions for navigation and state updates
- Mock store provides CRUD operations for reservations and inventory

## Naming Conventions

- Components: PascalCase with `.tsx` extension
- Services: camelCase with `.ts` extension
- Enums: SCREAMING_SNAKE_CASE values
- Interfaces: PascalCase
