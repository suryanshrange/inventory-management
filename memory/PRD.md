# Inventory Ops — Product Requirements Document

## Original Problem Statement
Build a Production-Ready, enterprise-grade Inventory Management System with a professional UI and scalable backend. Spec originally proposed Node + MySQL; adapted to **FastAPI + MongoDB + React** per user confirmation (1a). Resend used for email alerts (key provided). Seeded admin/manager/staff accounts. All v1 scope built end-to-end.

## Tech Stack (delivered)
- **Frontend**: React 19 + React Router 7 + Tailwind + shadcn/ui + Recharts + sonner toasts + lucide icons
- **Backend**: FastAPI (Python) + Motor (async MongoDB) + bcrypt + PyJWT
- **DB**: MongoDB
- **Email**: Resend (`re_5j2SkJe6_...`) → `sri.suryansh016@gmail.com`
- **Exports**: openpyxl (Excel) + reportlab (PDF)

## User Personas
- **Admin** — full access, includes user management & audit visibility
- **Manager** — CRUD on products/categories/suppliers, can trigger low-stock alerts
- **Staff** — read-only on catalog, can record stock-in/out

## Architecture
```
/app/backend/
  server.py          # FastAPI app (all routes)
  auth.py            # JWT + bcrypt + role guards
  models.py          # Pydantic schemas
  database.py        # Motor client + index init
  email_service.py   # Resend wrapper + low-stock template
  audit_helper.py    # Audit log writer
/app/frontend/src/
  context/AuthContext.jsx
  components/{Layout,ProtectedRoute}.jsx
  pages/{Login,Register,Dashboard,Products,Categories,Suppliers,Inventory,Reports,AuditTrail,Profile}.jsx
  lib/api.js         # axios with bearer + refresh interceptor
```

## Implemented (Feb 17, 2026)
- ✅ JWT auth (access+refresh) with RBAC (admin/manager/staff) and seeded test accounts
- ✅ Dashboard: 7 KPI cards, stock-trend area chart, category pie, monthly bar, supplier bar
- ✅ Products: full CRUD, search, category/stock filters, pagination, bulk delete, Excel import, Excel + PDF exports
- ✅ Categories & Suppliers CRUD; supplier detail sheet with products + transactions
- ✅ Inventory Stock-In / Stock-Out with previous→new logs and insufficient-stock guard
- ✅ Low-stock alerts (auto on threshold cross + manual "Send alert" button) via Resend
- ✅ Reports: low-stock, transactions (daily/weekly/monthly), monthly summary; Excel export for products/low-stock/transactions/audit
- ✅ Audit trail (append-only) — login, register, all CRUD, stock movements
- ✅ UI: emerald-green/white theme, dark-mode toggle, collapsible sidebar, responsive, loading skeletons, sonner toasts
- ✅ E2E tested via testing_agent_v3: 100% backend (44/44 pytest), 100% frontend flows

## Backlog / Next Action Items
**P1 — Polish**
- Replace `window.confirm` on Products delete with shadcn `AlertDialog`
- Add `DialogDescription` to dialogs for full a11y
- Throttle/dedupe automatic low-stock emails (per-product cooldown)

**P2 — Hardening**
- Login rate-limit + IP lockout after N failed attempts
- Tighten CORS to specific frontend origin
- Move `stock_status` filter into Mongo query (currently post-paginated)
- Use `relativedelta` for monthly growth to avoid month drift

**P3 — Enhancement**
- Barcode scanner input (HID/USB) for stock-in
- Multi-warehouse / location support
- Purchase orders & supplier invoicing
- User management UI (admin only)
- Real-time updates via WebSocket
- Two-factor authentication

## Test Credentials
See `/app/memory/test_credentials.md`.
