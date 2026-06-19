# Inventory & Order Management System

Production-ready full-stack containerized **Inventory & Order Management System** built per the Software Engineer technical assessment specification.

A complete platform for managing products, customers, orders, and inventory tracking — with a 3D digital-twin warehouse map, role-based access control, and email alerts.

---

## Tech Stack

| Layer | Tech |
|---|---|
| **Backend** | Python 3.11 · FastAPI · SQLAlchemy 2 (async) · asyncpg |
| **Database** | PostgreSQL 16 |
| **Frontend** | React 19 · React Router 7 · Tailwind · shadcn/ui · Recharts · framer-motion · react-three-fiber |
| **Auth** | bcrypt + JWT in httpOnly cookies (Bearer fallback) |
| **Email** | Resend (low-stock alerts) |
| **Container** | Docker · Docker Compose |
| **Frontend serving** | nginx (multi-stage build) |

---

## Features

### Core (per assessment spec)
- **Products** — full CRUD with SKU uniqueness, non-negative quantity, search/filter/pagination, bulk delete, Excel import + Excel/PDF export
- **Customers** — Add / list / view / delete with **email uniqueness**
- **Orders** — Create / list / view / cancel
  - Multi-line items with **auto-calculated total**
  - **Inventory auto-deducts** on order creation
  - **Rejects insufficient inventory** with a clear error
  - Cancellation **restocks** items + logs the inventory movement
  - Auto-generated `ORD-#####` order numbers
- **Dashboard** — KPIs: total products / customers / orders / low-stock / out-of-stock / inventory value / today's transactions + charts (stock trend, category mix, monthly growth, supplier contribution)
- **Validation + HTTP codes** — 201 on create, 400 on bad input, 401/403/404/422 properly emitted

### Bonus enhancements (beyond spec)
- Categories & Suppliers CRUD with supplier detail sheet
- Stock-In/Stock-Out transactions with append-only inventory logs
- **Audit Trail** — every login/create/update/delete/stock movement
- **Low-stock email alerts** (Resend) — auto-fires when threshold crossed
- **3D Warehouse Digital Twin** — interactive react-three-fiber scene with stock-flow particles
- **JWT + httpOnly cookies** with refresh token rotation
- **RBAC** — Admin / Manager / Staff roles
- Dark mode, motion animations, glass UI, responsive design
- Excel/PDF reports + bulk Excel import

---

## API (selected endpoints — full list via `/docs`)

### Products
- `POST /api/products` · `GET /api/products` · `GET /api/products/{id}` · `PUT /api/products/{id}` · `DELETE /api/products/{id}`

### Customers
- `POST /api/customers` · `GET /api/customers` · `GET /api/customers/{id}` · `DELETE /api/customers/{id}`

### Orders
- `POST /api/orders` · `GET /api/orders` · `GET /api/orders/{id}` · `DELETE /api/orders/{id}`

### Auth
- `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/refresh` · `POST /api/auth/logout` · `GET /api/auth/profile`

### Order body (POST `/api/orders`)
```json
{
  "customer_id": "...",
  "items": [{ "product_id": "...", "quantity": 2 }],
  "notes": "optional"
}
```
Returns 201 with `order_number`, `total_amount` (server-computed), `status`, nested `items[]` + `customer`.

Interactive docs: `http://localhost:8001/docs`

---

## Local Development (Docker Compose)

```bash
# 1. Copy env template
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET to a long random string

# 2. Build + start everything
docker compose up --build

# 3. Visit
#   Frontend: http://localhost:3000
#   Backend:  http://localhost:8001
#   Postgres: localhost:5432 (invuser / invpass)
```

Default seeded users (created automatically):

| Role | Email | Password |
|---|---|---|
| Admin | admin@inventory.com | Admin@123 |
| Manager | manager@inventory.com | Manager@123 |
| Staff | staff@inventory.com | Staff@123 |

Demo data: 32 products · 6 categories · 8 suppliers · 6 customers · 4 sample orders · 68 inventory transactions across 14 days.

---

## Container Architecture

```
┌────────────────────────────────┐
│       inventory_frontend       │  nginx :80 → :3000 (host)
│  React build served as static  │
└──────────────┬─────────────────┘
               │ /api/*
┌──────────────▼─────────────────┐
│       inventory_backend        │  FastAPI uvicorn :8001
│   SQLAlchemy async + asyncpg   │
└──────────────┬─────────────────┘
               │
┌──────────────▼─────────────────┐
│      inventory_postgres        │  PostgreSQL 16 :5432
│  named volume: postgres_data   │
└────────────────────────────────┘
```

- All credentials via environment variables (no hardcoding)
- Slim base images (`python:3.11-slim`, `node:20-alpine`, `nginx:1.27-alpine`, `postgres:16-alpine`)
- Named volume `inventory_postgres_data` for DB persistence
- Health checks on every service
- Non-root user in backend container
- Multi-stage builds for both backend (slim runtime, no build deps) and frontend (static nginx)

---

## Deployment

### Backend → Render / Railway / Fly.io
1. Push to GitHub
2. Create new web service from the repo, root = `backend/`
3. Set environment variables (see `.env.example`)
4. Connect a managed PostgreSQL (Render/Railway provide free tier)
5. Set `DATABASE_URL` to the managed Postgres URL (using `+asyncpg` driver)

### Frontend → Vercel / Netlify
1. Connect the repo, root = `frontend/`
2. Build command: `yarn build`
3. Output dir: `build/`
4. Env var: `REACT_APP_BACKEND_URL=https://your-backend.onrender.com`

### Docker Hub
```bash
docker build -t <your-user>/inventory-backend:latest ./backend
docker push <your-user>/inventory-backend:latest
```

---

## Business Logic (enforced server-side)

| Rule | Implementation |
|---|---|
| Unique SKU | `UNIQUE` constraint on `products.sku` + pre-check |
| Unique customer email | `UNIQUE` constraint on `customers.email` + pre-check |
| Non-negative quantity | `CHECK (quantity >= 0)` + Pydantic validator |
| Insufficient inventory blocks orders | Pre-validate every order line; 400 with details |
| Auto stock deduction on order | Atomic decrement within same DB transaction |
| Auto total calculation | `unit_price * qty` per line; sum on backend (frontend just previews) |
| Restock on cancellation | Items added back + inventory log written |

---

## Project Structure

```
/
├── backend/
│   ├── server.py           # FastAPI app (all routes)
│   ├── auth.py             # JWT + bcrypt + role guards
│   ├── models_sql.py       # SQLAlchemy ORM
│   ├── schemas.py          # Pydantic v2 schemas
│   ├── database.py         # async engine + session
│   ├── seed_data.py        # demo data seeder
│   ├── audit_helper.py
│   ├── email_service.py    # Resend wrapper
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .dockerignore
├── frontend/
│   ├── src/
│   │   ├── pages/          # Dashboard, Products, Customers, Orders, ...
│   │   ├── components/     # Layout, WarehouseMap3D, RecentActivity, ...
│   │   ├── context/        # AuthContext
│   │   ├── hooks/          # useCountUp, useTransactionFeed
│   │   └── lib/api.js
│   ├── Dockerfile
│   └── .dockerignore
├── docker-compose.yml
├── .env.example
└── README.md
```
