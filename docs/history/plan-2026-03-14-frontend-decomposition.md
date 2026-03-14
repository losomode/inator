# Frontend Decomposition: Unified → Per-Inator Microservice Frontends

## Problem
The unified frontend (`inator/frontend/`) violates microservice boundaries by bundling all inator UIs into a single SPA. Each inator should own its own frontend while preserving all current functionality and single-port deployment via Caddy.

## Current State
- **Unified frontend** at `inator/frontend/` on `:5173` — all modules (auth, rma, fulfil, users) in one React app
- **Individual inator frontends** exist but are stale/outdated (different auth patterns, hardcoded URLs, missing features)
- **Caddy** routes API by path prefix, sends all other traffic to the single frontend
- **Service registry** on Authinator stores `ui_url` per service; unified frontend uses a hardcoded `SERVICE_ROUTE_MAP` for in-app links
- **Shared code** in unified frontend: `AuthProvider` (with USERinator enrichment, SSO capture), `ProtectedRoute` (with adminOnly), `Layout`, `api/client`, `types`

## Core vs Optional Inators
**Required (always present):**
- **inator** (monorepo) — orchestration, shared code, Caddy gateway
- **Authinator** — authentication, service registry, core frontend (login, service directory, security)
- **Userinator** — user/company/role management (AuthProvider depends on `/api/users/me/` for role enrichment)

**Optional (register to appear):**
- **RMAinator**, **Fulfilinator**, and any future inators
- Register via service registry to appear in Service Directory and get Caddy routes
- Platform functions without them; missing optional inators return 502 from Caddy (acceptable)

**Design implications:**
- Caddy always includes routes for Authinator + Userinator frontends/APIs
- Optional inator Caddy routes are present but harmless if the service isn't running
- Service Directory shows all registered services as a single flat list (no required/optional distinction in UI)
- AuthProvider treats Userinator as required (fail loudly, not `console.warn`)
- `start:all` starts everything; a future `start:core` could start just required services

## Architecture After Decomposition
**Routing (all through Caddy on `:8080`):**
- `/api/auth/*`, `/api/services/*`, `/accounts/*`, `/admin/*` → Authinator backend (always)
- `/api/users/*`, `/api/companies/*`, `/api/roles/*`, `/api/invitations/*` → Userinator backend (always)
- `/api/rma/*` → RMAinator backend (optional)
- `/api/fulfil/*` → Fulfilinator backend (optional)
- `/users/*` → Userinator frontend (`:3004`, always)
- `/rma/*` → RMAinator frontend (`:3002`, optional)
- `/fulfil/*` → Fulfilinator frontend (`:3003`, optional)
- `/*` (everything else) → Authinator core frontend (`:3001`, always)

**Each inator frontend:**
- Runs its own Vite dev server on its assigned port
- Has `base: '/<prefix>/'` in vite.config and `<BrowserRouter basename="/<prefix>">`
- Imports shared code from `inator/shared/frontend/` via `@inator/shared` alias (no duplication)
- Uses relative `/api` paths — Caddy handles routing to correct backend
- All share `localStorage` auth token since they're same-origin through Caddy

**Cross-inator navigation:**
- Layout "Home" button → `window.location.href = '/'` (full navigation to Authinator core)
- Service Directory cards → `window.location.href = service.ui_path` (full navigation, not React Router)
- Logout → clears token, `window.location.href = '/login'`

## Phase 1–8
See Warp plan for detailed implementation phases.
