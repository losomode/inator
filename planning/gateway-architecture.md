# Gateway Architecture: Before & After

## Current Architecture (Before)

Six ports exposed. Each inator runs its own frontend and backend independently.
The browser talks directly to each service. Cross-origin auth tokens are passed
via URL query parameters.

```mermaid
graph TB
    subgraph "Browser"
        B1[Tab: localhost:3001<br/>Authinator UI]
        B2[Tab: localhost:3002<br/>RMAinator UI]
        B3[Tab: localhost:3003<br/>Fulfilinator UI]
    end

    subgraph "Authinator Repo"
        AF[Vite Dev :3001<br/>React SPA]
        AB[Django :8001<br/>/api/auth/*<br/>/api/services/*]
    end

    subgraph "RMAinator Repo"
        RF[Vite Dev :3002<br/>React SPA]
        RB[Django :8002<br/>/api/rma/*]
    end

    subgraph "Fulfilinator Repo"
        FF[Vite Dev :3003<br/>React SPA]
        FB[Django :8003<br/>/api/fulfil/*]
    end

    B1 -->|"API calls<br/>localhost:8001"| AB
    B2 -->|"API calls<br/>localhost:8002"| RB
    B3 -->|"API calls<br/>localhost:8003"| FB

    B2 -.->|"?token= redirect<br/>cross-origin"| B1
    B3 -.->|"?token= redirect<br/>cross-origin"| B1

    RB -->|"JWT validation<br/>HTTP call"| AB
    FB -->|"JWT validation<br/>HTTP call"| AB

    style AF fill:#4a90d9,color:#fff
    style AB fill:#4a90d9,color:#fff
    style RF fill:#27ae60,color:#fff
    style RB fill:#27ae60,color:#fff
    style FF fill:#e67e22,color:#fff
    style FB fill:#e67e22,color:#fff
    style B1 fill:#f5f5f5,color:#333
    style B2 fill:#f5f5f5,color:#333
    style B3 fill:#f5f5f5,color:#333
```

### Problems

- **6 ports** exposed (8001, 8002, 8003, 3001, 3002, 3003)
- **CORS required** — every backend lists every frontend origin
- **Cross-origin auth** — token passed via `?token=` URL param on redirect
- **Duplicate code** — 3 separate React apps with near-identical Layout, auth utils, API clients
- **Each new inator** adds 2 more ports, CORS entries, and a separate frontend app

---

## Target Architecture (After)

Two internal-only ports per backend (unchanged). One gateway port exposed.
A single frontend SPA handles all UI. Caddy routes API requests by path prefix.

```mermaid
graph TB
    subgraph "Browser"
        B[Single Tab<br/>localhost:8080]
    end

    subgraph "inator Repo — Orchestration Layer"
        subgraph "Caddy Gateway :8080"
            GW[Reverse Proxy<br/>Route by path prefix]
        end
        UF["Unified Frontend :5173<br/>(dev only, internal)<br/>React SPA"]
    end

    subgraph "Authinator Repo"
        AB[Django :8001<br/>/api/auth/*<br/>/api/services/*]
    end

    subgraph "RMAinator Repo"
        RB[Django :8002<br/>/api/rma/*]
    end

    subgraph "Fulfilinator Repo"
        FB[Django :8003<br/>/api/fulfil/*]
    end

    B -->|"All requests<br/>single origin"| GW

    GW -->|"/api/auth/*<br/>/accounts/*"| AB
    GW -->|"/api/rma/*"| RB
    GW -->|"/api/fulfil/*"| FB
    GW -->|"/* (everything else)"| UF

    RB -->|"JWT validation<br/>internal HTTP"| AB
    FB -->|"JWT validation<br/>internal HTTP"| AB

    style GW fill:#9b59b6,color:#fff
    style UF fill:#3498db,color:#fff
    style AB fill:#4a90d9,color:#fff
    style RB fill:#27ae60,color:#fff
    style FB fill:#e67e22,color:#fff
    style B fill:#f5f5f5,color:#333
```

### Benefits

- **1 port exposed** (8080 in dev, 443 in prod)
- **Zero CORS** — everything is same-origin through the gateway
- **In-app auth** — login is a React route, no cross-origin redirects
- **One frontend** — shared Layout, auth context, API client
- **New inator** = 1 Caddy route line + 1 frontend module directory

---

## Detailed Communication Flow

### Auth Flow (Before vs After)

**Before** — Multi-hop cross-origin redirect:
```mermaid
sequenceDiagram
    participant User
    participant RMA_UI as RMAinator UI<br/>:3002
    participant Auth_UI as Authinator UI<br/>:3001
    participant Auth_API as Authinator API<br/>:8001
    participant RMA_API as RMAinator API<br/>:8002

    User->>RMA_UI: Visit localhost:3002
    RMA_UI->>RMA_UI: No token found
    RMA_UI->>Auth_UI: Redirect to localhost:3001/login?redirect=localhost:3002
    User->>Auth_UI: Enter credentials
    Auth_UI->>Auth_API: POST /api/auth/login/
    Auth_API-->>Auth_UI: JWT tokens
    Auth_UI->>RMA_UI: Redirect to localhost:3002?token=eyJ...
    RMA_UI->>RMA_UI: Extract token from URL, store in localStorage
    RMA_UI->>RMA_API: GET /api/rma/ (Bearer token)
    RMA_API->>Auth_API: Validate JWT (HTTP call)
    Auth_API-->>RMA_API: User data
    RMA_API-->>RMA_UI: RMA data
```

**After** — Single-origin, no redirects:
```mermaid
sequenceDiagram
    participant User
    participant SPA as Unified SPA<br/>(via Caddy :8080)
    participant Auth_API as Authinator API<br/>:8001 (internal)
    participant RMA_API as RMAinator API<br/>:8002 (internal)

    User->>SPA: Visit localhost:8080/rma
    SPA->>SPA: No token → navigate to /login (React route)
    User->>SPA: Enter credentials
    SPA->>Auth_API: POST /api/auth/login/ (via Caddy)
    Auth_API-->>SPA: JWT tokens
    SPA->>SPA: Store token, navigate to /rma
    SPA->>RMA_API: GET /api/rma/ (via Caddy, Bearer token)
    RMA_API->>Auth_API: Validate JWT (internal HTTP)
    Auth_API-->>RMA_API: User data
    RMA_API-->>SPA: RMA data
```

---

## Repository & Deployment Boundaries

Each repo remains fully independent. The inator repo orchestrates, but never
contains backend application code.

```mermaid
graph LR
    subgraph "inator repo<br/>(orchestration)"
        T[Taskfile.yml<br/>start/stop/setup]
        C[Caddyfile.dev<br/>gateway routing]
        F[frontend/<br/>unified React SPA]
        P[planning/<br/>docs & diagrams]
    end

    subgraph "AUTHinator repo<br/>(independent)"
        AB2[backend/<br/>Django + DRF]
        AB2_DB[(SQLite/Postgres)]
        AB2_ENV[.env + .venv]
    end

    subgraph "RMAinator repo<br/>(independent)"
        RB2[backend/<br/>Django + DRF]
        RB2_DB[(SQLite/Postgres)]
        RB2_ENV[.env + .venv]
    end

    subgraph "FULFILinator repo<br/>(independent)"
        FB2[backend/<br/>Django + DRF]
        FB2_DB[(SQLite/Postgres)]
        FB2_ENV[.env + .venv]
    end

    T -.->|orchestrates| AB2
    T -.->|orchestrates| RB2
    T -.->|orchestrates| FB2
    C -.->|routes to| AB2
    C -.->|routes to| RB2
    C -.->|routes to| FB2
    F -.->|calls via gateway| AB2
    F -.->|calls via gateway| RB2
    F -.->|calls via gateway| FB2

    style T fill:#9b59b6,color:#fff
    style C fill:#9b59b6,color:#fff
    style F fill:#3498db,color:#fff
    style P fill:#95a5a6,color:#fff
    style AB2 fill:#4a90d9,color:#fff
    style RB2 fill:#27ae60,color:#fff
    style FB2 fill:#e67e22,color:#fff
```

### What Changes Per Repo

| Repo | Gains | Loses | Unchanged |
|------|-------|-------|-----------|
| **inator** | `frontend/`, `Caddyfile.dev`, gateway tasks | — | Taskfile orchestration, README, planning docs |
| **AUTHinator** | Simplified CORS config | Frontend traffic (UI moves to unified SPA) | Backend API, DB, auth logic, SSO, MFA |
| **RMAinator** | Simplified CORS config | Frontend traffic | Backend API, DB, RMA state machine, JWT validation |
| **FULFILinator** | Simplified CORS config | Frontend traffic | Backend API, DB, PO/Order/Delivery logic, JWT validation |

Each inator's `frontend/` directory can be kept for reference or archived.
Backend `Taskfile.yml` tasks (`backend:dev`, `backend:test`, etc.) remain unchanged.
