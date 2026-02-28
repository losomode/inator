# Phase 5: Production Deployment

**Status:** Not started
**Created:** 2026-02-28

## Overview

The unified gateway architecture is complete for local development. This phase covers everything needed to deploy the platform to a production environment.

## Tasks

### 1. Production Caddyfile
- Create `Caddyfile` (or `Caddyfile.prod`) with:
  - Real domain name (e.g. `inator.example.com`)
  - Automatic HTTPS via Caddy's built-in ACME
  - Static file serving from `frontend/dist/` (built SPA)
  - `try_files {path} /index.html` for SPA client-side routing
  - Backend reverse proxies using internal hostnames (Docker service names or IPs)
  - Security headers, rate limiting

### 2. Docker Compose
- `docker-compose.yml` at repo root with services:
  - `caddy` — gateway, exposes 80/443
  - `authinator` — Django backend on 8001 (internal only)
  - `rmainator` — Django backend on 8002 (internal only)
  - `fulfilinator` — Django backend on 8003 (internal only)
  - `postgres` — shared or per-service database
- Dockerfiles for each backend (Python + gunicorn/uvicorn)
- Frontend built at image build time (`npm run build`), served by Caddy as static files
- Volumes for persistent data (DB, media uploads)

### 3. Environment & Secrets
- Production `.env` template with:
  - Real SECRET_KEY per service
  - DATABASE_URL (Postgres)
  - CORS/CSRF set to production domain
  - Email backend (SMTP)
  - SSO provider credentials
- Secret management strategy (e.g. Docker secrets, vault, or `.env` on host)

### 4. Database Migration
- Switch from SQLite to Postgres
- Shared Postgres instance or per-service databases
- Migration scripts / data export-import tooling

### 5. CI/CD
- GitHub Actions or similar for:
  - Run tests on PR
  - Build Docker images on merge to main
  - Deploy to staging/production

### 6. Monitoring & Logging
- Centralized logging (all backends + Caddy)
- Health check endpoints per backend
- Uptime monitoring

## Dependencies
- Domain name + DNS configuration
- Hosting environment (VPS, cloud, etc.)
- SSL certificates (handled automatically by Caddy if using a public domain)
