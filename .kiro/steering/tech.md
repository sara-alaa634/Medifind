# Technology Stack

## Core Technologies

- **Framework**: React 19.2.4 with TypeScript 5.8.2
- **Build Tool**: Vite 6.2.0
- **UI Library**: Lucide React (icons)
- **Charts**: Recharts 3.7.0
- **Module System**: ES Modules

## Build System

Vite is configured with:
- React plugin for JSX/TSX support
- Path alias `@/` pointing to project root
- Dev server on port 3000
- Environment variables via `.env.local` (GEMINI_API_KEY)

## Common Commands

```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Configuration Notes

- TypeScript uses `bundler` module resolution with path aliases
- JSX transform: `react-jsx` (no React import needed)
- Environment variables are injected at build time via Vite's `define` config
- No testing framework currently configured
