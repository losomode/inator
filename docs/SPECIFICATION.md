# Unified Gateway Architecture

Specification for migrating the Inator Platform from multi-port microservice frontends
to a single-URL architecture with Caddy reverse proxy and unified React SPA.

## Overview

The Inator Platform currently exposes 6 ports (3 backends + 3 frontends) for 3 services.
This specification defines the migration to a single exposed port (8080 in dev, 443 in prod)
using Caddy as a reverse proxy and a unified React frontend.

**See also**: `planning/gateway-architecture.md` for visual diagrams.

## Requirements

### Functional

- MUST route all API traffic through a single gateway port (8080 in dev)
- MUST serve a single React SPA that handles all inator UI
- MUST preserve all existing backend API functionality without modification
- MUST support in-app authentication (no cross-origin redirects)
- MUST support lazy-loaded route groups per inator module
- MUST maintain independent backend repositories (AUTHinator, RMAinator, FULFILinator)
- MUST support adding new inators with minimal configuration (one Caddy route + one frontend module)
- MUST support dark and light modes via system preference

### Non-Functional

- MUST achieve ≥85% test coverage on all new frontend code
- MUST use TypeScript strict mode (no `any`)
- MUST use ESLint + Prettier
- MUST use Vitest with coverage thresholds (85% lines/functions/branches/statements)
- MUST follow Conventional Commits for all commits
- MUST run `task check` before every commit
- SHOULD maintain existing backend test coverage

### Out of Scope

- Database changes
- Backend API changes (beyond CORS simplification)
- Production deployment (Docker/Compose) — Phase 4 only plans it
- New inator features

## Architecture

### Components

1. **Caddy Gateway** — reverse proxy at :8080, routes by URL path prefix
2. **Unified Frontend** — single Vite + React 19 + Tailwind SPA at `inator/frontend/`
3. **Backend Services** — unchanged Django apps at internal ports :8001/:8002/:8003

### Routing

```
Browser → :8080 (Caddy)
  /api/auth/*     → :8001 (Authinator backend)
  /api/users/*    → :8001 (Authinator backend)
  /api/services/* → :8001 (Authinator backend)
  /accounts/*     → :8001 (Authinator SSO callbacks)
  /api/rma/*      → :8002 (RMAinator backend)
  /api/fulfil/*   → :8003 (Fulfilinator backend)
  /*              → :5173 (Vite dev server) or static files (prod)
```

### Frontend Module Structure

```
frontend/
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Router with lazy-loaded route groups
│   ├── shared/
│   │   ├── api/
│   │   │   └── client.ts           # Single axios instance, base URL = /api
│   │   ├── auth/
│   │   │   ├── AuthProvider.tsx     # Auth context + token management
│   │   │   ├── useAuth.ts          # Auth hook
│   │   │   └── ProtectedRoute.tsx  # Route guard
│   │   ├── components/
│   │   │   └── Layout.tsx          # Shared sidebar + header shell
│   │   └── types.ts                # Shared types (User, Service, etc.)
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── pages/              # Login, Profile, Home (ServiceDirectory)
│   │   │   ├── api.ts              # Auth-specific API calls
│   │   │   └── types.ts
│   │   ├── rma/
│   │   │   ├── pages/              # Dashboard, RMADetail, Admin*, CreateRMA
│   │   │   ├── components/         # RMA-specific components
│   │   │   ├── api.ts              # RMA API calls (/api/rma/*)
│   │   │   └── types.ts
│   │   └── fulfil/
│   │       ├── pages/              # Items, POs, Orders, Deliveries
│   │       │   ├── items/
│   │       │   ├── pos/
│   │       │   ├── orders/
│   │       │   └── deliveries/
│   │       ├── api.ts              # Fulfil API calls (/api/fulfil/*)
│   │       └── types.ts
│   └── test/
│       └── setup.ts                # Vitest setup (jsdom, RTL matchers)
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
├── .prettierrc
└── Taskfile.yml                    # Frontend-specific tasks
```

## Implementation Plan

### Phase 1: Caddy Gateway (COMPLETE)

Status: Done. Caddy installed, `Caddyfile.dev` created, gateway tasks added to parent Taskfile.

**Acceptance Criteria:**
- [x] Caddy installed via Homebrew
- [x] `Caddyfile.dev` routes API paths to correct backends
- [x] `task gateway:start` / `task gateway:stop` work
- [x] `task start:all` includes gateway
- [x] `task status` checks port 8080

### Phase 2: Unified Frontend (depends on: Phase 1)

#### Subphase 2.1: Project Scaffold

- Task 2.1.1: Initialize Vite + React + TypeScript project at `inator/frontend/`
  - Dependencies: React 19, react-router-dom 7, axios, Tailwind 3, @simplewebauthn/browser
  - Dev deps: Vitest 4+, @vitest/coverage-v8, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, ESLint, Prettier, typescript-eslint
  - Acceptance: `npm run dev` starts on :5173, `npm run build` succeeds, `npm run lint` passes
- Task 2.1.2: Configure Vitest with 85% coverage thresholds
  - Acceptance: `task test:coverage` enforces ≥85% lines/functions/branches/statements
- Task 2.1.3: Configure ESLint strict + Prettier
  - TypeScript strict mode, no `any`, explicit return types on exported functions
  - Acceptance: `task lint` and `task fmt` run without error on empty project
- Task 2.1.4: Create `Taskfile.yml` for frontend with standard tasks
  - Tasks: `dev`, `build`, `test`, `test:coverage`, `lint`, `fmt`, `typecheck`, `check`
  - Acceptance: `task check` runs fmt + lint + typecheck + test:coverage
- Task 2.1.5: Add frontend tasks to parent `Taskfile.yml`
  - Add `frontend:dev`, `frontend:build`, `frontend:check` delegating to frontend Taskfile
  - Update `task start:all` to start unified frontend (alongside backends + gateway)
  - Acceptance: `task start:all` starts backends + gateway + unified frontend

#### Subphase 2.2: Shared Infrastructure (depends on: 2.1)

- Task 2.2.1: Create shared API client (`src/shared/api/client.ts`)
  - Single axios instance with relative base URL (`/api`)
  - Request interceptor: attach Bearer token from localStorage
  - Response interceptor: redirect to /login on 401
  - Tests: interceptor behavior, token attachment, 401 handling
  - Acceptance: ≥85% coverage on client.ts
- Task 2.2.2: Create AuthProvider + useAuth hook (`src/shared/auth/`)
  - Merge RMAinator `AuthContext` + Fulfilinator `useUser` into single provider
  - State: user, loading, isAdmin, isAuthenticated
  - Actions: login (calls /api/auth/login/), logout, fetchUser (calls /api/auth/me/)
  - MFA support: mfaStep, mfaToken, mfaMethods, totpVerify, webauthnVerify
  - Tests: provider renders, login flow, logout clears state, 401 redirects, MFA flow
  - Acceptance: ≥85% coverage on AuthProvider.tsx and useAuth.ts
- Task 2.2.3: Create ProtectedRoute component (`src/shared/auth/ProtectedRoute.tsx`)
  - Redirects to /login if not authenticated
  - Optional `adminOnly` prop for admin-gated routes
  - Tests: redirects unauthenticated, renders children when authenticated, blocks non-admin
  - Acceptance: ≥85% coverage
- Task 2.2.4: Create shared Layout component (`src/shared/components/Layout.tsx`)
  - Header with app name, user info, logout button
  - Sidebar with dynamic nav items (configured per-module)
  - Active route highlighting
  - Module config: each module exports its nav items + base path
  - Tests: renders nav items, active state, logout calls handler, responsive
  - Acceptance: ≥85% coverage

#### Subphase 2.3: Auth Module (depends on: 2.2)

- Task 2.3.1: Migrate Login page (`src/modules/auth/pages/Login.tsx`)
  - Port from Authinator Login.tsx
  - Replace hardcoded `localhost:8001` with relative `/api/auth/` via shared client
  - SSO provider links use relative `/accounts/` paths (Caddy routes to Authinator)
  - MFA flow (TOTP + WebAuthn) integrated with AuthProvider
  - After login: navigate to `redirect` param or `/` (React Router, no window.location)
  - Tests: renders form, submits credentials, handles MFA step, handles SSO links, error states
  - Acceptance: ≥85% coverage
- Task 2.3.2: Migrate Profile page (`src/modules/auth/pages/Profile.tsx`)
  - Port from Authinator Profile.tsx
  - Uses shared AuthProvider for user data
  - TOTP setup/disable, WebAuthn credential management via relative API calls
  - Tests: renders user info, TOTP setup flow, WebAuthn registration
  - Acceptance: ≥85% coverage
- Task 2.3.3: Create Home page (`src/modules/auth/pages/Home.tsx`)
  - Replaces ServiceDirectory — shows available service modules as cards
  - Clicking a card navigates to that module's route (e.g., /rma, /fulfil)
  - Cards driven by module config (static, not API-driven)
  - Tests: renders service cards, navigation works
  - Acceptance: ≥85% coverage
- Task 2.3.4: Create auth module API functions (`src/modules/auth/api.ts`)
  - login, logout, me, TOTP endpoints, WebAuthn endpoints, SSO providers
  - All use shared API client
  - Tests: each function calls correct endpoint with correct params
  - Acceptance: ≥85% coverage

#### Subphase 2.4: RMA Module (depends on: 2.2)

- Task 2.4.1: Create RMA API functions (`src/modules/rma/api.ts`)
  - Port from RMAinator `services/api.ts`
  - All calls relative: `/api/rma/*`
  - Remove direct Authinator API calls (user info comes from shared AuthProvider)
  - Tests: each function calls correct endpoint
  - Acceptance: ≥85% coverage
- Task 2.4.2: Migrate RMA types (`src/modules/rma/types.ts`)
  - Port from RMAinator `types.ts`
- Task 2.4.3: Migrate RMA pages
  - Dashboard, RMADetail, CreateRMA, AdminDashboard, AdminRMAManagement, AdminStaleConfig
  - Routes: `/rma/dashboard`, `/rma/new`, `/rma/:id`, `/rma/admin`, `/rma/admin/rmas`, `/rma/admin/config`
  - Replace `useAuth()` from RMAinator context with shared `useAuth()` hook
  - Tests: each page renders, data loading, user interactions
  - Acceptance: ≥85% coverage per page component

#### Subphase 2.5: Fulfil Module (depends on: 2.2)

- Task 2.5.1: Create Fulfil API functions (`src/modules/fulfil/api.ts`)
  - Port from Fulfilinator `api/` directory
  - All calls relative: `/api/fulfil/*`
  - Tests: each function calls correct endpoint
  - Acceptance: ≥85% coverage
- Task 2.5.2: Migrate Fulfil types (`src/modules/fulfil/types.ts`)
- Task 2.5.3: Migrate Fulfil pages
  - Items (ItemList, ItemForm), POs (POList, POForm, PODetail), Orders (OrderList, OrderForm, OrderDetail), Deliveries (DeliveryList, DeliveryForm, DeliveryDetail, SerialSearch)
  - Routes: `/fulfil/items`, `/fulfil/pos`, `/fulfil/orders`, `/fulfil/deliveries`, etc.
  - Tests: each page renders, data loading, form submissions
  - Acceptance: ≥85% coverage per page component

#### Subphase 2.6: App Shell & Routing (depends on: 2.3, 2.4, 2.5)

- Task 2.6.1: Wire up App.tsx with lazy-loaded route groups
  - Auth routes (login, profile) — not lazy (needed immediately)
  - RMA routes — `React.lazy(() => import('./modules/rma/...'))`
  - Fulfil routes — `React.lazy(() => import('./modules/fulfil/...'))`
  - Home route at `/` shows service directory
  - All service routes wrapped in `ProtectedRoute`
  - Admin routes wrapped in `ProtectedRoute adminOnly`
  - Tests: routes render correct components, lazy loading works, auth guards work
  - Acceptance: ≥85% coverage
- Task 2.6.2: Integration test — full navigation flow
  - Login → Home → navigate to RMA → navigate to Fulfil → back to Home → logout
  - Tests: mocked API responses, verify route transitions and auth state
  - Acceptance: test passes

### Phase 3: Backend CORS Simplification (depends on: Phase 2)

- Task 3.1: Update Authinator CORS/CSRF settings
  - CORS_ALLOWED_ORIGINS: add `http://localhost:8080`
  - CSRF_TRUSTED_ORIGINS: add `http://localhost:8080`
  - Keep existing origins for backwards compatibility during transition
  - Acceptance: API requests from :8080 succeed without CORS errors
- Task 3.2: Update RMAinator CORS/CSRF settings
  - Same pattern as Task 3.1
  - Acceptance: API requests from :8080 succeed
- Task 3.3: Update Fulfilinator CORS/CSRF settings
  - Same pattern as Task 3.1
  - Acceptance: API requests from :8080 succeed
- Task 3.4: Run existing backend tests
  - `task test` in each inator to verify no regressions
  - Acceptance: all existing tests pass

### Phase 4: Cleanup & Documentation (depends on: Phase 3)

- Task 4.1: Update parent Taskfile
  - Remove per-inator frontend start/stop from `task start:all`
  - Keep per-inator `backend:dev` tasks for standalone backend development
  - Acceptance: `task start:all` starts backends + gateway + unified frontend only
- Task 4.2: Update README.md
  - New architecture diagram
  - Updated Quick Start (single URL: localhost:8080)
  - Updated task list
  - Acceptance: README reflects current state
- Task 4.3: Update INATOR.md
  - New "Adding an Inator" process (no frontend port, just Caddy route + module dir)
  - Acceptance: instructions are accurate and complete
- Task 4.4: Archive old per-inator frontends
  - Mark each inator's `frontend/` as deprecated in their READMEs
  - MAY remove later once unified frontend is proven stable

## Testing Strategy

### Frontend Testing

- **Framework**: Vitest + @testing-library/react + jsdom
- **Coverage**: ≥85% lines, functions, branches, statements (enforced in vitest.config.ts)
- **Unit tests**: Every component, hook, API function, utility
- **Integration tests**: Full navigation flow with mocked API
- **Test organization**: Co-located `*.test.ts(x)` files next to source

### What to Test Per Component

- Renders without crashing
- Displays correct content based on props/state
- User interactions trigger correct behavior
- Loading states shown during async operations
- Error states displayed when API calls fail
- Auth guards redirect when unauthenticated

### Backend Testing

- No new backend tests needed (backends unchanged)
- MUST run existing tests after CORS changes to verify no regressions

### Coverage Exclusions

- `main.tsx` (entry point)
- `vite-env.d.ts` (type declarations)
- Generated/config files

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Frontend merge introduces regressions | High | ≥85% test coverage on all new code, integration tests |
| Caddy adds dev dependency | Low | Simple `brew install caddy`, documented in README |
| Dependency version skew (Vite 5 vs 7) | Medium | Unified frontend uses latest versions, fresh install |
| Auth flow changes break login | High | Thorough testing of login + MFA + SSO flows |
| Performance regression from monolithic SPA | Low | Lazy-loaded route groups, code splitting per module |

## Dependencies

- Caddy 2.x (`brew install caddy`) — ALREADY INSTALLED
- Node.js 18+ — already present
- npm — already present
- All existing backend dependencies — unchanged
