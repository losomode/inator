# Inator Standards & Conventions

## Overview

Each inator owns its own frontend SPA. All inators share common code from `inator/shared/frontend/` via Vite alias, avoiding duplication.

All traffic is served through a single Caddy gateway on `:8080`. Caddy routes API calls by path prefix to the appropriate backend, and frontend requests by path prefix to the appropriate Vite dev server.

## Port Assignments

| Inator | Backend | Frontend (Vite) | Gateway Path |
|--------|---------|-----------------|----------|
| **Authinator** | :8001 | :3001 | `/` (catch-all) |
| **RMAinator** | :8002 | :3002 | `/rma/` |
| **Fulfilinator** | :8003 | :3003 | `/fulfil/` |
| **USERinator** | :8004 | :3004 | `/users/` |

New inators continue the pattern: backend :800X, frontend :300X.

## Core vs Optional Inators

**Required (always running):**
- **inator** — monorepo, shared code, Caddy gateway
- **Authinator** — auth, service registry, login, service directory
- **USERinator** — user profiles, companies, role management

**Optional (register to appear):**
- **RMAinator**, **Fulfilinator**, and any future inators
- Register via `register_service` management command to appear in Service Directory
- Include `ui_path` (gateway-relative path like `/rma`) for Caddy routing

## Shared Library (`shared/frontend/src/`)

Canonical shared code lives in the monorepo. **Never duplicate these files into individual inators.**

- `auth/AuthProvider.tsx` — Auth context with Authinator + USERinator enrichment, SSO token capture
- `auth/ProtectedRoute.tsx` — Route guard with `adminOnly` support; uses `window.location.href` to redirect to `/login` (cross-inator)
- `layout/Layout.tsx` — App shell (header, sidebar, content). Home button navigates to gateway root via `window.location.href`
- `api/client.ts` — Axios instance with `/api` base URL, Bearer token interceptor, 401→`/login` redirect
- `api/companies.ts` — Companies API endpoints (shared across inators that need company data)
- `types.ts` — `User`, `NavItem`, `LoginResponse`, error helpers

### `shared/frontend/package.json`

React, react-dom, and react-router-dom are declared as **peerDependencies** (each inator provides its own copy) and as **devDependencies** (for running shared tests). This avoids the "two Reacts" problem where hooks fail silently due to duplicate React instances.

## Standard Inator Frontend Structure

```
<Inator>/frontend/
├── src/
│   ├── App.tsx              # BrowserRouter + routes (with basename)
│   ├── main.tsx             # Entry point (StrictMode + createRoot)
│   ├── index.css            # Tailwind v4 import + @source directive
│   ├── pages/               # Page components
│   ├── components/          # Inator-specific components (optional)
│   ├── api.ts               # Inator-specific API calls
│   └── types.ts             # Inator-specific types
├── index.html               # SPA entry (<div id="root">)
├── vite.config.ts           # base, alias, plugins, dedupe
├── tsconfig.json            # paths for @inator/shared
└── package.json
```

## Wiring Shared Code

### Vite Config

Every inator's `vite.config.ts` follows this pattern:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@inator/shared': path.resolve(__dirname, '../../shared/frontend/src'),
    },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  server: {
    port: 300X,        // Unique per inator
    strictPort: true,
    open: false,
  },
  base: '/<prefix>/',   // e.g. '/rma/', '/fulfil/', '/users/' (Authinator omits)
  build: { outDir: 'dist' },
});
```

**Critical settings:**
- `resolve.dedupe` — Prevents multiple React instances when shared code imports React
- `base` — Must match the Caddy route prefix (with trailing slash)
- `strictPort: true` — Fails fast if port is taken (avoids silent port-shifting)

### TypeScript Config

Each inator's `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@inator/shared/*": ["../../shared/frontend/src/*"]
    }
  }
}
```

### CSS — Tailwind v4

Each inator's `src/index.css`:

```css
@import 'tailwindcss';
@source "../../../shared/frontend/src";
```

The `@source` directive tells Tailwind v4 to scan the shared directory for class names. Without this, Tailwind won't generate CSS for classes used only in shared components (like Layout's `w-64` sidebar).

### Import Examples

```ts
import { AuthProvider, useAuth } from '@inator/shared/auth/AuthProvider';
import { ProtectedRoute } from '@inator/shared/auth/ProtectedRoute';
import { Layout } from '@inator/shared/layout/Layout';
import apiClient from '@inator/shared/api/client';
import type { NavItem } from '@inator/shared/types';
```

## Key Conventions

### Routing

1. **Vite `base`**: Set to `'/<prefix>/'` (e.g. `'/rma/'`). Authinator uses `'/'` (default).
2. **BrowserRouter `basename`**: Match the Vite base without trailing slash (e.g. `<BrowserRouter basename="/rma">`).
3. **API calls**: Use relative `/api` paths. Caddy routes to the correct backend.
4. **Cross-inator navigation**: Always use `window.location.href` for full page navigation (not React Router `<Link>` or `navigate()`). React Router only knows about its own inator's routes.
5. **Auth token**: Shared via `localStorage` key `auth_token` — same-origin through Caddy.

### Nav Items & Layout

Each inator defines its own `NAV_ITEMS` array for the sidebar. Items with `adminOnly: true` are hidden from non-admin users. If admin sub-pages exist, use a single sidebar entry (e.g. "Admin Tools") and handle sub-navigation within the admin pages to avoid duplication.

### Non-Admin Root Routes

If the root route (`/`) is admin-only, non-admin users will hit an infinite redirect loop (`ProtectedRoute` redirects `adminOnly` failures to `/`). Fix with a conditional component:

```tsx
function AdminOrDefault(): React.JSX.Element {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/profile" replace />;
  return <Layout ...><AdminPage /></Layout>;
}
```

## Caddy Gateway

### Bare-Path Redirects

Caddy's `handle /rma/*` does **not** match `/rma` (no trailing slash). Without explicit redirects, clicking a service card (which links to `/rma`) falls through to Authinator's catch-all and renders a blank page. Always add named matcher redirects:

```caddy
@rma_bare path /rma
redir @rma_bare /rma/
```

## Adding a New Inator

1. **Name it** — `<Domain>inator`. Acronyms stay caps (`RMAinator`), words get title case (`Fulfilinator`).
2. **Assign ports** — Next available backend (800X) and frontend (300X).
3. **Backend** — Django + DRF with `core/authentication.py` (Authinator JWT validation), `core/permissions.py` (role-based using `role_level`), and `register_service` management command (include `ui_path`).
4. **Frontend** — Vite + React + TypeScript + Tailwind v4. Wire `@inator/shared` in vite.config (alias, dedupe, base, tailwindcss plugin), tsconfig (paths), and index.css (`@import 'tailwindcss'` + `@source`).
5. **Caddy** — Add to `Caddyfile.dev`: API route, bare-path redirect (named matcher), and frontend route.
6. **Taskfile** — Add start/stop/restart/setup tasks to root `Taskfile.yml`.
7. **Parent .gitignore** — Add `<Name>inator/`.
8. **Git** — `git init`, create GitHub repo, add to parent README.
