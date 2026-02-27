# Inator Family Rules

Standards and conventions for all inator microservices.

## Naming

- Service names MUST follow the pattern `<Domain>inator`:
  - Acronyms: `FOOinator` (e.g. `RMAinator`)
  - Words: `FooBarinator` (e.g. `Fulfilinator`, `Authinator`)
- The leading component is always capitalized — never all-lowercase (e.g. ~~authinator~~ → `Authinator`).
- Directory names match the service name exactly.
- Filenames within services use hyphens, not underscores (except where Django requires underscores).

## Architecture

Each inator is a self-contained microservice with:
- `backend/` — Django + Django REST Framework (settings in `config/`)
- `frontend/` — Vite + Tailwind CSS (npm)
- `deft/` — Shared AI agent framework (Deft)
- `Taskfile.yml` — Task runner (replaces Makefile)
- `docs/` — External-facing documentation (screenshots, guides); committed to git
- `Reference/` — Internal dev materials (spreadsheets, specs, mockups); gitignored, never committed

### Port Assignments

Each inator MUST have a unique port to allow parallel local development:

| Service       | Backend Port | Frontend Port |
|---------------|-------------|---------------|
| Authinator    | 8001        | 3001          |
| RMAinator     | 8002        | 3002          |
| Fulfilinator  | 8003        | 3003          |

New inators increment from the highest assigned port.

### Inter-Service Communication

- Services communicate via REST APIs over HTTP.
- Use environment variables for service URLs (e.g. `AUTHINATOR_API_URL`).
- Never hardcode service hostnames or ports.

## Tech Stack

### Backend
- **Framework**: Django 6.x + djangorestframework
- **Auth**: djangorestframework-simplejwt, django-allauth (via Authinator)
- **Python**: 3.11+
- **Deps**: `requirements.txt` (pip) — one per service
- **DB**: SQLite for dev, plan for Postgres in prod
- **Lint**: `ruff check .`
- **Format**: `black .`
- **Test**: `pytest` with `pytest-django`, `coverage` (≥75% threshold)

### Frontend
- **Language**: TypeScript (strict mode) — no `.js`/`.jsx` source files
- **Build**: Vite
- **Styling**: Tailwind CSS
- **Package manager**: npm
- **Lint**: `npm run lint` (ESLint with `typescript-eslint` parser)
- **Typecheck**: `npm run typecheck` (`tsc --noEmit`)
- **Test**: `npm test` (when configured)

#### TypeScript Requirements
- `tsconfig.json` MUST set `"strict": true`
- `any` types are FORBIDDEN — use `unknown` for type-safe unknowns
- All component props, state, and API responses MUST be explicitly typed
- A `typecheck` script MUST exist in `package.json`
- ESLint MUST be configured with `typescript-eslint` for `.ts`/`.tsx` files

## Taskfile

Every inator MUST have a `Taskfile.yml` with at minimum these tasks:
- `backend:install`, `backend:dev`, `backend:test`, `backend:lint`, `backend:fmt`
- `frontend:install`, `frontend:dev`, `frontend:build`, `frontend:lint`, `frontend:typecheck`
- `install`, `dev`, `test`, `lint`, `fmt` (combined)
- `test:coverage` (with threshold enforcement)

The `PROJECT_NAME` var in Taskfile.yml MUST match the service directory name.

## Secrets

- All secrets in `secrets/` dir as `.env` files, never in code.
- `.env` at service root for local dev (gitignored).
- `.env.example` checked in with placeholder values.
- Use `python-decouple` for env var loading in Django.

## SCM

- Each inator maintains its own git repository.
- This root `inator/` directory is NOT itself a git repo — it's a workspace.
- Conventional Commits: `type(scope): description`
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`

## Creating a New Inator

1. Create directory `<name>inator/` under this root.
2. Scaffold `backend/` with Django + DRF, `frontend/` with Vite + Tailwind.
3. Copy and adapt `Taskfile.yml` from an existing inator.
4. Copy `deft/` framework from an existing inator.
5. Assign the next available port pair.
6. Create `.env.example`, `.gitignore`, `README.md`.
7. Initialize git repo.
8. Update the port table in this file.

## Quality Gates

Before any commit:
- `task lint` passes
- `task test` passes
- `task test:coverage` meets threshold (≥75%)
- No secrets in tracked files
- Files SHOULD be < 500 lines, MUST be < 1000 lines
