# Inator Platform — Docker Containerization Spec

Specification for packaging all Inator Platform services into Docker containers
for consistent, reproducible development and production deployments.

## Decisions & Assumptions

Because several design choices significantly shape this spec, they are listed
up front. Adjust any of these before implementation begins.

| # | Decision | Choice Made | Rationale |
|---|----------|------------|-----------|
| 1 | Scope | Both dev and prod compose files | Developers need hot-reload; production needs hardened images |
| 2 | Database (dev) | SQLite via Docker volume | Minimal change from current dev workflow |
| 3 | Database (prod) | PostgreSQL container | INATOR.md explicitly calls for Postgres in prod |
| 4 | Dockerfile location | One `Dockerfile` per inator repo root | Keeps each repo independently deployable |
| 5 | Frontend (dev) | Vite dev server container (hot reload) | Keeps existing HMR workflow |
| 6 | Frontend (prod) | Static build served directly by Caddy | Eliminates a Node.js runtime dependency in prod |
| 7 | Django server | `runserver` in dev, Gunicorn in prod | Standard Django practice |
| 8 | Caddy | Runs as a container in both modes | Consistent routing layer everywhere |
| 9 | Secrets | `.env` files mounted at runtime (dev), Docker Secrets / env vars (prod) | Consistent with current secrets/ convention |
| 10 | Inter-service networking | Docker Compose internal network; backends reference each other by service name | Replaces hardcoded `localhost` URLs |

---

## Overview

The platform currently runs as native processes orchestrated by `Taskfile.yml`.
This spec adds a Docker Compose layer on top of that, containerizing every
component while keeping the existing per-inator `Taskfile.yml` workflows intact
for developers who prefer the native path.

### Services to Containerize

| Container | Image Base | Internal Port | Notes |
|-----------|-----------|--------------|-------|
| `caddy` | `caddy:2-alpine` | 8080 | Single ingress point |
| `frontend` | `node:22-alpine` (dev) / multi-stage (prod) | 5173 (dev) | Dev: Vite; Prod: static served by Caddy |
| `authinator` | `python:3.11-slim` | 8001 | Django + DRF |
| `rmainator` | `python:3.11-slim` | 8002 | Django + DRF |
| `fulfilinator` | `python:3.11-slim` | 8003 | Django + DRF |
| `db` | `postgres:16-alpine` | 5432 | **Prod only** |

In dev, only port **8080** is published to the host (via Caddy). Backend
containers are on the internal Docker network only — identical to the existing
architecture where backends are not directly browser-accessible.

---

## Architecture

### Dev

```
Host :8080
    │
    ▼
┌─────────────────────────────────────────────┐
│  Docker network: inator-net                  │
│                                              │
│  caddy:8080 ──/api/auth/*──► authinator:8001 │
│              ──/api/rma/*──► rmainator:8002  │
│              ──/api/fulfil/*► fulfilinator:8003│
│              ──/*──────────► frontend:5173   │
│                                              │
│  (Volumes: per-service SQLite files)         │
└─────────────────────────────────────────────┘
```

### Prod

```
Host :443 / :80
    │
    ▼
┌─────────────────────────────────────────────┐
│  Docker network: inator-net                  │
│                                              │
│  caddy:443  ──/api/auth/*──► authinator:8001 │
│             ──/api/rma/*──► rmainator:8002   │
│             ──/api/fulfil/*► fulfilinator:8003│
│             ──/*──────────► static /srv/www  │
│                              (built into     │
│                               caddy image)   │
│                                              │
│  db:5432 ◄──────────────────── all backends │
└─────────────────────────────────────────────┘
```

In prod, the frontend is built into the Caddy image as a multi-stage build.
No separate frontend container is needed at runtime.

---

## Repository Changes

Because each inator lives in its own git repo, the Dockerfiles are added there.
The `inator` platform repo owns the Compose files and a production Caddyfile.

| Repo | File(s) Added |
|------|---------------|
| `inator` | `docker-compose.yml`, `docker-compose.dev.yml`, `Caddyfile.prod`, `Taskfile.yml` (new docker tasks) |
| `Authinator` | `Dockerfile` |
| `RMAinator` | `Dockerfile` |
| `Fulfilinator` | `Dockerfile` |
| `frontend/` (in inator repo) | `Dockerfile` (dev stage only; prod is built into Caddy image) |

---

## File Specifications

### Per-Backend `Dockerfile` (same pattern for all three)

Two stages: `dev` (runserver + volume mounts) and `prod` (Gunicorn + copied code).

```dockerfile
# syntax=docker/dockerfile:1

# ── Dev stage ───────────────────────────────────
FROM python:3.11-slim AS dev

WORKDIR /app

# System deps (psycopg2, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code is mounted as a volume in dev; COPY is a no-op fallback
COPY backend/ ./backend/

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

EXPOSE 8001   # (or 8002 / 8003 — set per-service in compose)

CMD ["python", "backend/manage.py", "runserver", "0.0.0.0:8001"]

# ── Prod stage ──────────────────────────────────
FROM python:3.11-slim AS prod

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY backend/ ./backend/

RUN python backend/manage.py collectstatic --noinput

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DJANGO_SETTINGS_MODULE=config.settings

EXPOSE 8001

CMD ["gunicorn", "--bind", "0.0.0.0:8001", "--workers", "2", "config.wsgi:application"]
```

> Port numbers differ per service (8001 / 8002 / 8003). The Dockerfile is
> otherwise identical; parameterize via `ARG PORT` if desired.

### `frontend/Dockerfile` (dev only — prod is inlined in `docker-compose.yml`)

```dockerfile
FROM node:22-alpine AS dev

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Source is volume-mounted in dev
EXPOSE 5173

CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]
```

### `docker-compose.dev.yml` (dev — hot reload, SQLite)

```yaml
name: inator-dev

services:
  caddy:
    image: caddy:2-alpine
    ports:
      - "8080:8080"
    volumes:
      - ./Caddyfile.dev:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
    networks: [inator-net]
    depends_on: [authinator, rmainator, fulfilinator, frontend]

  frontend:
    build:
      context: ./frontend
      target: dev
    volumes:
      - ./frontend:/app
      - frontend_node_modules:/app/node_modules
    networks: [inator-net]
    environment:
      - CHOKIDAR_USEPOLLING=true   # needed for some Linux FS setups

  authinator:
    build:
      context: ./Authinator
      target: dev
    volumes:
      - ./Authinator/backend:/app/backend
      - authinator_db:/app/backend   # persists db.sqlite3
    env_file: ./Authinator/backend/.env
    environment:
      - AUTHINATOR_BACKEND_PORT=8001
    networks: [inator-net]

  rmainator:
    build:
      context: ./RMAinator
      target: dev
    volumes:
      - ./RMAinator/backend:/app/backend
      - rmainator_db:/app/backend
    env_file: ./RMAinator/backend/.env
    environment:
      - AUTHINATOR_API_URL=http://authinator:8001
    networks: [inator-net]
    depends_on: [authinator]

  fulfilinator:
    build:
      context: ./Fulfilinator
      target: dev
    volumes:
      - ./Fulfilinator/backend:/app/backend
      - fulfilinator_db:/app/backend
    env_file: ./Fulfilinator/backend/.env
    environment:
      - AUTHINATOR_API_URL=http://authinator:8001
    networks: [inator-net]
    depends_on: [authinator]

volumes:
  caddy_data:
  frontend_node_modules:
  authinator_db:
  rmainator_db:
  fulfilinator_db:

networks:
  inator-net:
    driver: bridge
```

### `docker-compose.yml` (prod — Gunicorn, PostgreSQL, static frontend)

```yaml
name: inator

services:
  caddy:
    build:
      context: .
      dockerfile: Caddyfile.prod.Dockerfile   # multi-stage: builds frontend + caddy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - caddy_data:/data
      - caddy_config:/config
    networks: [inator-net]
    depends_on: [authinator, rmainator, fulfilinator]

  authinator:
    build:
      context: ./Authinator
      target: prod
    env_file: ./Authinator/backend/.env.prod
    environment:
      - DATABASE_URL=postgres://inator:${DB_PASSWORD}@db:5432/authinator
      - AUTHINATOR_BACKEND_PORT=8001
    networks: [inator-net]
    depends_on: [db]

  rmainator:
    build:
      context: ./RMAinator
      target: prod
    env_file: ./RMAinator/backend/.env.prod
    environment:
      - DATABASE_URL=postgres://inator:${DB_PASSWORD}@db:5432/rmainator
      - AUTHINATOR_API_URL=http://authinator:8001
    networks: [inator-net]
    depends_on: [db, authinator]

  fulfilinator:
    build:
      context: ./Fulfilinator
      target: prod
    env_file: ./Fulfilinator/backend/.env.prod
    environment:
      - DATABASE_URL=postgres://inator:${DB_PASSWORD}@db:5432/fulfilinator
      - AUTHINATOR_API_URL=http://authinator:8001
    networks: [inator-net]
    depends_on: [db, authinator]

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql:ro
    environment:
      - POSTGRES_USER=inator
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_MULTIPLE_DATABASES=authinator,rmainator,fulfilinator
    networks: [inator-net]

volumes:
  caddy_data:
  caddy_config:
  postgres_data:

networks:
  inator-net:
    driver: bridge
```

### `Caddyfile.prod.Dockerfile` (builds frontend static files into Caddy)

```dockerfile
# Stage 1: Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Caddy with static files
FROM caddy:2-alpine
COPY Caddyfile.prod /etc/caddy/Caddyfile
COPY --from=frontend-build /app/dist /srv/www
```

### `Caddyfile.prod` (new file — differs from `Caddyfile.dev`)

```caddy
{
    email {$CADDY_ACME_EMAIL}
}

{$DEPLOY_DOMAIN} {
    handle /api/auth/*   { reverse_proxy authinator:8001 }
    handle /api/users/*  { reverse_proxy authinator:8001 }
    handle /api/services/* { reverse_proxy authinator:8001 }
    handle /accounts/*   { reverse_proxy authinator:8001 }
    handle /admin/*      { reverse_proxy authinator:8001 }
    handle /api/rma/*    { reverse_proxy rmainator:8002 }
    handle /api/fulfil/* { reverse_proxy fulfilinator:8003 }
    handle {
        root * /srv/www
        try_files {path} /index.html
        file_server
    }
}
```

> Note: backend hostnames in this file are Docker service names (`authinator`,
> `rmainator`, `fulfilinator`), not `localhost`. This is the key difference from
> `Caddyfile.dev`.

---

## Django Configuration Changes Required

Each backend needs to support `DATABASE_URL` (for PostgreSQL in prod) and
Docker-aware `ALLOWED_HOSTS`. These are env-var-driven and require no code
changes beyond settings — consistent with the existing `python-decouple` pattern.

### `settings.py` additions (all three backends)

```python
import dj_database_url  # add to requirements.txt

# Replace hardcoded DATABASES block with:
DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
    )
}

# ALLOWED_HOSTS: add Docker service name
DOCKER_SERVICE_NAME = config("DOCKER_SERVICE_NAME", default="")
if DOCKER_SERVICE_NAME:
    ALLOWED_HOSTS.append(DOCKER_SERVICE_NAME)
```

Add `dj-database-url` and `psycopg2-binary` to each `requirements.txt`.

---

## New Taskfile Tasks (platform `Taskfile.yml`)

```yaml
# ─── Docker ──────────────────────────────────────

docker:build:
  desc: Build all Docker images (dev targets)
  cmds:
    - docker compose -f docker-compose.dev.yml build

docker:up:
  desc: Start all services in Docker (dev mode)
  cmds:
    - docker compose -f docker-compose.dev.yml up

docker:down:
  desc: Stop and remove Docker containers (dev)
  cmds:
    - docker compose -f docker-compose.dev.yml down

docker:logs:
  desc: Tail logs from all Docker containers
  cmds:
    - docker compose -f docker-compose.dev.yml logs -f

docker:migrate:
  desc: Run migrations in all backend containers
  cmds:
    - docker compose -f docker-compose.dev.yml exec authinator python backend/manage.py migrate
    - docker compose -f docker-compose.dev.yml exec rmainator python backend/manage.py migrate
    - docker compose -f docker-compose.dev.yml exec fulfilinator python backend/manage.py migrate

docker:prod:build:
  desc: Build production images
  cmds:
    - docker compose build

docker:prod:up:
  desc: Start production stack
  cmds:
    - docker compose up -d

docker:prod:down:
  desc: Stop production stack
  cmds:
    - docker compose down
```

---

## Implementation Plan

### Phase 1: Per-Backend Dockerfiles

**Goal**: Each inator repo has a working `Dockerfile` with `dev` and `prod` stages.

Tasks:
- Add `Dockerfile` to Authinator repo (dev + prod stages)
- Add `Dockerfile` to RMAinator repo (dev + prod stages)
- Add `Dockerfile` to Fulfilinator repo (dev + prod stages)
- Add `dj-database-url` and `psycopg2-binary` to each `requirements.txt`
- Update `settings.py` in each backend to use `dj_database_url`

Acceptance criteria:
- `docker build --target dev .` succeeds in each inator directory
- `docker build --target prod .` succeeds in each inator directory

### Phase 2: Frontend Dockerfile

**Goal**: Unified frontend runs in a container with hot reload.

Tasks:
- Add `Dockerfile` to `frontend/` (dev stage)
- Verify Vite binds to `0.0.0.0` (not just localhost) — required for Docker networking

Acceptance criteria:
- `docker build --target dev frontend/` succeeds

### Phase 3: Dev Compose

**Goal**: `docker compose -f docker-compose.dev.yml up` starts the full platform.

Tasks:
- Create `docker-compose.dev.yml` at platform root
- Update `Caddyfile.dev` to use Docker service names instead of `localhost` for
  backends (Caddy itself is in the same Docker network)
- Add docker tasks to platform `Taskfile.yml`
- Test full flow: browser → Caddy → backend → auth

Acceptance criteria:
- `task docker:up` starts all services
- `http://localhost:8080` serves the frontend
- Login, RMA, and Fulfilinator flows work end-to-end
- Source code changes in any service trigger hot reload without rebuilding

> **Important**: `Caddyfile.dev` currently proxies to `localhost:8001` etc. When
> Caddy runs in a container on the Docker network, these must become
> `authinator:8001`, `rmainator:8002`, `fulfilinator:8003`. This is the only
> required change to the Caddyfile.

### Phase 4: Prod Compose + PostgreSQL

**Goal**: Production-ready stack with PostgreSQL, Gunicorn, and static frontend.

Tasks:
- Create `scripts/init-db.sql` to provision PostgreSQL databases for all three inators
- Create `Caddyfile.prod` (uses service names, auto-TLS via ACME)
- Create `Caddyfile.prod.Dockerfile` (multi-stage: frontend build + Caddy)
- Create `docker-compose.yml` (prod)
- Create `.env.prod.example` files for each backend (documenting all required vars)
- Test prod stack locally with a test domain or `localhost` override
- Update `docs/DEPLOYMENT.md` to document the Docker-based prod path alongside
  the existing Cloudflare Tunnel / native process path

Acceptance criteria:
- `task docker:prod:up` starts the stack
- All backends use PostgreSQL (verify with `SHOW server_version;` query)
- Frontend is served as static files (no Node.js process in prod)

### Phase 5: Documentation & Taskfile Cleanup

Tasks:
- Add Docker tasks to platform `Taskfile.yml`
- Update `README.md`: add Docker Quick Start section alongside existing native setup
- Update `INATOR.md`: document Docker as an alternative deployment path
- Add `.dockerignore` to each inator repo (exclude `.venv`, `__pycache__`, `node_modules`, `*.sqlite3`, `.env`)

---

## Migration Notes

### `ALLOWED_HOSTS` / CORS in Docker

When running in Docker, each backend's `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`
must include the Caddy container's address. Since all traffic flows through Caddy
on the Docker network and each backend only receives requests forwarded from Caddy,
this is already handled by the existing `DEPLOY_DOMAIN` mechanism (see
`DEPLOYMENT.md`). For dev containers, set `ALLOWED_HOSTS=*` or add the service
name explicitly.

### SQLite and Docker Volumes

SQLite files must be in named Docker volumes (not the container filesystem) or
they will be lost on container recreation. The dev compose maps a named volume to
each backend's working directory, which preserves the database across restarts.

### Existing Native Workflow Preserved

The native Taskfile (`task start:all`, `task setup`, etc.) continues to work
unchanged. Docker is an additive deployment path, not a replacement for the
existing developer workflow.

---

## Out of Scope

- CI/CD pipeline (GitHub Actions / etc.)
- Container registry publishing
- Kubernetes / Helm charts
- Production secrets management (Vault, AWS Secrets Manager, etc.) — use env vars for now
- Changing any backend API behavior

---

## Open Questions

If any of the assumptions at the top of this document need to change, these are
the areas most likely to be affected:

1. **SQLite in dev containers** — If you want full dev/prod parity, use PostgreSQL
   in dev too. Add a `db` service to `docker-compose.dev.yml` and point all dev
   backends at it.
2. **Database migrations on startup** — Currently migrations must be run manually
   (`task docker:migrate`). An entrypoint script could automate this but adds
   startup complexity.
3. **Per-inator Dockerfiles vs platform-owned Dockerfiles** — If you prefer to
   keep all Docker config in the `inator` platform repo (centralized), Dockerfiles
   can live in `inator/docker/<ServiceName>/Dockerfile` instead, using build
   context paths. This trades per-repo independence for centralized control.
