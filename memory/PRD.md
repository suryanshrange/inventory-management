# Inventory & Order Management System — PRD

## Original Problem Statement
Build a production-ready inventory management system. Migrated per the **Software Engineer Technical Assessment** PDF to the mandatory stack: **Python + FastAPI + PostgreSQL + React + Docker**. Adds **Customers** and **Orders** entities with business-rule enforcement.

## Tech Stack (per assessment)
- **Backend**: Python 3.11 · FastAPI · SQLAlchemy 2 async · asyncpg
- **Database**: PostgreSQL 16
- **Frontend**: React 19 · Tailwind · shadcn/ui · Recharts · framer-motion · react-three-fiber
- **Container**: Docker + Docker Compose (multi-stage; nginx serves frontend)
- **Auth**: bcrypt + JWT in httpOnly cookies (Bearer fallback)
- **Email**: Resend

## Architecture
```
/app/
├── backend/
│   ├── server.py          # all routes (auth, products, customers, orders, inventory, reports, audit)
│   ├── models_sql.py      # SQLAlchemy ORM (User, Category, Supplier, Product, Customer, Order, OrderItem, InventoryLog, AuditLog)
│   ├── schemas.py         # Pydantic v2 schemas
│   ├── auth.py            # JWT + bcrypt + cookies + RBAC
│   ├── database.py        # async engine + session
│   ├── seed_data.py       # demo data
│   ├── audit_helper.py
│   ├── email_service.py
│   ├── Dockerfile         # multi-stage slim runtime, non-root user, healthcheck
│   └── .dockerignore
├── frontend/
│   ├── src/
│   │   ├── pages/         # Dashboard, Products, Customers, Orders, Categories, Suppliers, Inventory, Reports, AuditTrail, Profile, Login, Register
│   │   ├── components/    # Layout, WarehouseMap3D, RecentActivity, Tilt3D, HeroScene3D, ProtectedRoute, ui/
│   │   ├── context/AuthContext.jsx
│   │   ├── hooks/         # useCountUp, useTransactionFeed
│   │   └── lib/api.js     # axios withCredentials
│   ├── Dockerfile         # node build → nginx serve
│   └── .dockerignore
├── docker-compose.yml     # frontend + backend + postgres with named volume
├── .env.example
└── README.md
```

## Implemented (Feb 19, 2026)

### Core entities (PDF spec)
- **Products** — POST/GET/GET-by-id/PUT/DELETE with unique SKU + non-negative quantity (DB CHECK + Pydantic)
- **Customers** — POST/GET/GET-by-id/PUT/DELETE with unique email
- **Orders** — POST/GET/GET-by-id/DELETE
  - Multi-line items, auto-generated `ORD-#####` numbers, server-computed `total_amount`
  - **Auto-deducts product stock** on creation
  - **Rejects insufficient stock** with detailed 400
  - **DELETE cancels** (soft) + **restocks** items with `stock_in` log

### Inventory & ops
- Stock-in / Stock-out with append-only `inventory_logs`
- Low-stock alerts via Resend (auto + manual)
- Categories, Suppliers (bonus, beyond spec)
- Audit Trail (every login/create/update/delete/stock-movement)

### Auth
- JWT in httpOnly cookies (Secure + SameSite=None)
- Bearer header fallback
- RBAC: Admin / Manager / Staff
- Refresh token rotation, cookie-based bootstrap

### Frontend
- 3D Warehouse Digital Twin with stock-flow particles (react-three-fiber)
- KPI dashboard (7 cards including total_customers & total_orders)
- Recent Activity widget with live polling
- Full Customers + Orders pages with multi-line order builder, detail sheets
- Dark mode, framer-motion animations, glass UI, responsive

### Docker
- Multi-stage backend (`python:3.11-slim`) — non-root user, healthcheck
- Multi-stage frontend (build with node-alpine → serve with nginx-alpine + SPA fallback)
- `docker-compose.yml`: frontend / backend / postgres services + named volume + healthchecks + env-driven config
- `.env.example` for all secrets
- `.dockerignore` for both services

### Testing
- 87/87 backend pytest pass (covers all CRUD, business rules, RBAC, cookie auth, validation)
- 100% frontend flows verified (login → dashboard, customers create/search, orders create/cancel/detail)

## Test Credentials
See `/app/memory/test_credentials.md`

## Backlog
- **P1**: pin CORS to explicit origins for production; brute-force login lockout
- **P2**: extract Products.jsx into smaller sub-components (currently 314 lines)
- **P2**: replace `window.confirm` with shadcn `AlertDialog` 
- **P3**: cmdk global search palette; WebSocket live updates; per-bin "aisle view" in 3D map

## Deliverables for Assessment
- GitHub repo (this codebase)
- Docker Hub images (build via `./backend/Dockerfile` and `./frontend/Dockerfile`)
- Live URLs (deployable to Render/Railway + Vercel)
- README.md with full setup + endpoint docs at `/docs`
