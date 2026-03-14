# Inator Frontend Architecture

## Overview

Each inator owns its own frontend SPA. All inators share common code from `inator/shared/frontend/` via Vite alias, avoiding duplication.

All traffic is served through a single Caddy gateway on `:8080`. Caddy routes API calls by path prefix to the appropriate backend, and frontend requests by path prefix to the appropriate Vite dev server.

## Shared Library (`shared/frontend/src/`)

Canonical shared code lives in the monorepo. **Never duplicate these files into individual inators.**

- `auth/AuthProvider.tsx` — Auth context with Authinator + Userinator enrichment, SSO token capture
- `auth/ProtectedRoute.tsx` — Route guard with `adminOnly` support
- `layout/Layout.tsx` — App shell (header, sidebar, content). Home button uses full page navigation to gateway root.
- `api/client.ts` — Axios instance with `/api` base URL, Bearer token interceptor, 401→`/login` redirect
- `api/companies.ts` — Companies API endpoints
- `types.ts` — `User`, `NavItem`, `LoginResponse`, error helpers

### Wiring Shared Code

Each inator's `vite.config.ts`:

```ts
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@inator/shared': path.resolve(__dirname, '../../shared/frontend/src'),
    },
  },
  // ...
});
```

Each inator's `tsconfig.json` (or `tsconfig.app.json`):

```json
{
  "compilerOptions": {
    "paths": {
      "@inator/shared/*": ["../../shared/frontend/src/*"]
    }
  }
}
```

Import example:

```ts
import { useAuth } from '@inator/shared/auth/AuthProvider';
import { ProtectedRoute } from '@inator/shared/auth/ProtectedRoute';
import { Layout } from '@inator/shared/layout/Layout';
import type { NavItem } from '@inator/shared/types';
```

## Standard Inator Frontend Structure

```
<Inator>/frontend/
├── src/
│   ├── App.tsx              # BrowserRouter + routes
│   ├── main.tsx             # Entry point
│   ├── pages/               # Page components (or modules/<name>/pages/)
│   ├── components/          # Inator-specific components
│   ├── api.ts               # Inator-specific API calls
│   └── types.ts             # Inator-specific types
├── vite.config.ts           # base: '/<prefix>/', @inator/shared alias
├── tsconfig.json            # paths for @inator/shared
└── package.json
```

### Key Conventions

1. **Vite `base`**: Set to `'/<prefix>/'` (e.g., `'/rma/'`, `'/fulfil/'`, `'/users/'`). Authinator uses `'/'`.
2. **BrowserRouter `basename`**: Match the Vite base (e.g., `<BrowserRouter basename="/rma">`).
3. **API calls**: Use relative `/api` paths. Caddy routes to the correct backend.
4. **Cross-inator navigation**: Use `window.location.href` for full page navigation (not React Router `<Link>`).
5. **Auth token**: Shared via `localStorage` key `auth_token` — same-origin through Caddy.

## Core vs Optional Inators

**Required (always running):**
- **inator** — monorepo, shared code, Caddy gateway
- **Authinator** — auth, service registry, core frontend
- **Userinator** — user/company/role management

**Optional (register to appear):**
- **RMAinator**, **Fulfilinator**, and any future inators
- Register via `register_service` management command to appear in Service Directory
- Include `ui_path` (gateway-relative path) for Caddy routing

## Adding a New Inator

1. Create the backend with a `register_service` management command including `ui_path`
2. Create the frontend following the standard structure above
3. Wire `@inator/shared` in vite.config and tsconfig
4. Add a Caddy route in `Caddyfile.dev` for the new path prefix
5. Add backend + frontend start/stop tasks to `Taskfile.yml`
