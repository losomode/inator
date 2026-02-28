# The Inator Platform

> *"If I had a nickel for every microservice I built with an -inator suffix, I'd have… well, several nickels. Which isn't a lot, but it's weird that it keeps happening."*

The Inator Platform is a family of purpose-built microservices for **business-to-customer information sharing**. Each inator gives **admins** the tools to manage operations and **customers** clear visibility into what matters to them — returns, orders, deliveries, and more.

Every inator is self-contained, independently deployable, and follows the same conventions. Add a new one when you need a new capability. It's microservices, but fun.

## Architecture

```mermaid
graph TB
    subgraph "The Inator Platform"
        AUTH[🔐 Authinator<br/><i>Authentication & Users</i>]

        subgraph "Business Services"
            RMA[📦 RMAinator<br/><i>Return Merchandise</i>]
            FULFIL[🚚 Fulfilinator<br/><i>Order Fulfillment</i>]
            INV[📋 Inventoryinator<br/><i>Coming Soon</i>]
            NOTIF[🔔 Notificationinator<br/><i>Coming Soon</i>]
            USAGE[📊 Usageinator<br/><i>Coming Soon</i>]
            LIC[📄 Licenseinator<br/><i>Coming Soon</i>]
        end
    end

    AUTH -- JWT tokens --> RMA
    AUTH -- JWT tokens --> FULFIL
    AUTH -- JWT tokens --> INV
    AUTH -- JWT tokens --> NOTIF
    AUTH -- JWT tokens --> USAGE
    AUTH -- JWT tokens --> LIC

    style AUTH fill:#4a90d9,color:#fff
    style RMA fill:#27ae60,color:#fff
    style FULFIL fill:#e67e22,color:#fff
    style INV fill:#95a5a6,color:#fff,stroke-dasharray: 5 5
    style NOTIF fill:#95a5a6,color:#fff,stroke-dasharray: 5 5
    style USAGE fill:#95a5a6,color:#fff,stroke-dasharray: 5 5
    style LIC fill:#95a5a6,color:#fff,stroke-dasharray: 5 5
```

**Authinator** is the foundation — every other inator delegates authentication and user management to it via JWT. Services never store credentials; they validate tokens against Authinator's API.

## Anatomy of an Inator

Every inator follows the same internal structure. If you've worked in one, you can work in any of them.

```mermaid
graph LR
    subgraph "Any Inator"
        direction TB
        FE[🖥 Frontend<br/>Vite + React + Tailwind]
        BE[⚙️ Backend<br/>Django + DRF]
        DB[(SQLite / Postgres)]

        FE <-->|REST API| BE
        BE <--> DB
    end

    AUTH[🔐 Authinator]
    FE -->|JWT| AUTH
    BE -->|Token validation| AUTH

    style FE fill:#3498db,color:#fff
    style BE fill:#2ecc71,color:#fff
    style DB fill:#9b59b6,color:#fff
    style AUTH fill:#4a90d9,color:#fff
```

```
<Name>inator/
├── backend/          # Django + Django REST Framework
│   ├── config/       # Settings, URLs, WSGI
│   ├── core/         # Auth integration, permissions, shared models
│   └── <app>/        # Domain-specific apps
├── frontend/         # Vite + React + TypeScript + Tailwind
│   └── src/
├── docs/             # External-facing documentation
├── Reference/        # Internal dev materials (gitignored)
├── deft/             # AI agent framework (gitignored)
├── Taskfile.yml      # Task runner
├── .env.example      # Environment template
└── README.md
```

## Current Inators

| Service | Purpose | Ports | Repo |
|---------|---------|-------|------|
| **Authinator** | Authentication, users, SSO, MFA | 8001 / 3001 | [losomode/AUTHinator](https://github.com/losomode/AUTHinator) |
| **RMAinator** | Return merchandise authorization tracking | 8002 / 3002 | [losomode/RMAinator](https://github.com/losomode/RMAinator) |
| **Fulfilinator** | Purchase orders, orders, deliveries | 8003 / 3003 | [losomode/FULFILinator](https://github.com/losomode/FULFILinator) |

## Roles

The platform uses two roles across all services:

- **ADMIN** — Full access. Manage data, users, and workflows across all customers.
- **USER** — Customer-scoped. View and interact with their own customer's data.

Authinator owns the role definitions. Every other inator reads the role from the JWT and enforces it locally.

## Quick Start

### Prerequisites
- [Task](https://taskfile.dev/) — `brew install go-task`
- Python 3.11+
- Node.js 18+
- Git (configured for SSH)

### Installation

```bash
# 1. Clone the platform and all inators
git clone git@github.com:losomode/inator.git
cd inator
git clone git@github.com:losomode/AUTHinator.git Authinator
git clone git@github.com:losomode/RMAinator.git RMAinator
git clone git@github.com:losomode/FULFILinator.git Fulfilinator

# 2. Run first-time setup (installs deps, creates .env files, runs migrations)
task setup

# 3. Configure each inator's backend/.env
# Edit Authinator/backend/.env (set SECRET_KEY, configure SSO if needed)
# Edit RMAinator/backend/.env (set AUTHINATOR_API_URL to http://localhost:8001/api/auth/)
# Edit Fulfilinator/backend/.env (set AUTHINATOR_API_URL to http://localhost:8001/api/auth/)

# 4. Start everything
task start:all
```

**Access your inators:**
- **Authinator**: http://localhost:3001 (Auth, Users, SSO)
- **RMAinator**: http://localhost:3002 (RMA Tracking)
- **Fulfilinator**: http://localhost:3003 (Order Fulfillment)

### Troubleshooting

If services fail to start:

```bash
# Check status
task status

# View logs
tail -50 logs/Authinator-backend.log
tail -50 logs/RMAinator-backend.log
tail -50 logs/Fulfilinator-backend.log

# Common fixes
task stop:all           # Stop everything
task setup              # Re-run setup
task start:all          # Start again
```

### Platform-Level Tasks

```bash
# Setup (first-time only)
task setup                # Install all inators, create .env files, run migrations
task setup:authinator     # Setup just Authinator
task setup:rmainator      # Setup just RMAinator

# Start/Stop/Restart
task start:all            # Start all services
task stop:all             # Stop all services
task restart:all          # Restart all services
task status               # Check which ports are listening
task logs                 # Tail all logs

# Individual inator control
task start:rmainator      # Start just RMAinator
task stop:fulfilinator    # Stop just Fulfilinator
task restart:authinator   # Restart just Authinator
```

### Per-Inator Tasks

Each inator also has its own `Taskfile.yml` for dev workflows:

```bash
cd RMAinator
task install      # Set up backend + frontend
task dev          # Run backend + frontend
task test         # Run all tests
task lint         # Lint everything
```

## Creating a New Inator

So you need a new -inator? Here's the recipe:

1. **Name it** — `<Domain>inator`. Acronyms stay caps (`RMAinator`), words get title case (`Fulfilinator`).
2. **Create the directory** under this root.
3. **Scaffold** — `backend/` with Django + DRF, `frontend/` with Vite + React + Tailwind.
4. **Assign ports** — next available pair (backend: 800X, frontend: 300X).
5. **Integrate auth** — point at Authinator for JWT validation. Copy `core/authentication.py` from an existing inator.
6. **Add a `Taskfile.yml`** — copy from an existing inator, update the project name.
7. **Init git**, create the GitHub repo, add to this README and `.gitignore`.

See [INATOR.md](./INATOR.md) for the full standards and conventions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+, Django 6.x, Django REST Framework |
| Frontend | TypeScript (strict), React, Vite, Tailwind CSS |
| Auth | JWT (simplejwt), Google SSO, WebAuthn/passkeys |
| Testing | pytest + coverage (backend), Vitest (frontend) |
| Task Runner | [Task](https://taskfile.dev/) |
| AI Tooling | [Deft](https://github.com/losomode/deft) (optional) |

## Project Layout

This repo (`inator`) is the **informational hub** — it doesn't contain application code. Each inator lives in its own repository and is cloned into this workspace as a sibling directory.

```
inator/                  ← You are here (informational repo)
├── Authinator/          ← git@github.com:losomode/AUTHinator.git
├── RMAinator/           ← git@github.com:losomode/RMAinator.git
├── Fulfilinator/        ← git@github.com:losomode/FULFILinator.git
├── Taskfile.yml         ← Platform-level task runner
├── INATOR.md            ← Standards & conventions
└── README.md            ← This file
```

## License

MIT — See individual inator repos for their specific licenses.
