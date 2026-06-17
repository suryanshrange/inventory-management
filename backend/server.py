"""Inventory Management System - FastAPI backend."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import io
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware

import openpyxl
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet

from database import db, init_indexes
from models import (
    UserCreate, UserLogin, User, TokenResponse, RefreshRequest,
    CategoryCreate, Category,
    SupplierCreate, Supplier,
    ProductCreate, ProductUpdate, Product,
    StockIn, StockOut, InventoryLog,
    AuditLog, BulkDelete,
    utc_now_iso, new_id,
)
from auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
    get_current_user, require_roles,
)
from audit_helper import log_audit
from email_service import send_email, low_stock_html

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Inventory Ops API")
api = APIRouter(prefix="/api")


# ============================================================
# STARTUP
# ============================================================
@app.on_event("startup")
async def startup():
    await init_indexes()
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@inventory.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        user = User(name="Administrator", email=admin_email, role="admin")
        doc = user.model_dump()
        doc["password_hash"] = hash_password(admin_password)
        await db.users.insert_one(doc)
        logger.info(f"Seeded admin: {admin_email}")
    # Seed sample manager + staff
    for email, name, role, pwd in [
        ("manager@inventory.com", "Manager User", "manager", "Manager@123"),
        ("staff@inventory.com", "Staff User", "staff", "Staff@123"),
    ]:
        if not await db.users.find_one({"email": email}):
            u = User(name=name, email=email, role=role)
            d = u.model_dump()
            d["password_hash"] = hash_password(pwd)
            await db.users.insert_one(d)


@app.on_event("shutdown")
async def shutdown():
    pass


# ============================================================
# AUTH ROUTES
# ============================================================
@api.post("/auth/register", response_model=TokenResponse)
async def register(payload: UserCreate):
    if await db.users.find_one({"email": payload.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    role = payload.role if payload.role in ("admin", "manager", "staff") else "staff"
    user = User(name=payload.name, email=payload.email, role=role)
    doc = user.model_dump()
    doc["password_hash"] = hash_password(payload.password)
    await db.users.insert_one(doc)
    await log_audit(user, "register", "user", user.id, f"New user: {user.email}")
    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
        user=user,
    )


@api.post("/auth/login", response_model=TokenResponse)
async def login(payload: UserLogin):
    doc = await db.users.find_one({"email": payload.email}, {"_id": 0})
    if not doc or not verify_password(payload.password, doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user = User(**{k: v for k, v in doc.items() if k != "password_hash"})
    await log_audit(user, "login", "user", user.id, "User logged in")
    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
        user=user,
    )


@api.post("/auth/refresh")
async def refresh(payload: RefreshRequest):
    data = decode_token(payload.refresh_token)
    if data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    doc = await db.users.find_one({"id": data["sub"]}, {"_id": 0, "password_hash": 0})
    if not doc:
        raise HTTPException(status_code=401, detail="User not found")
    return {
        "access_token": create_access_token(doc["id"], doc["role"]),
        "refresh_token": create_refresh_token(doc["id"]),
    }


@api.post("/auth/logout")
async def logout(user: User = Depends(get_current_user)):
    await log_audit(user, "logout", "user", user.id, "User logged out")
    return {"message": "Logged out"}


@api.get("/auth/profile", response_model=User)
async def profile(user: User = Depends(get_current_user)):
    return user


# ============================================================
# CATEGORY ROUTES
# ============================================================
@api.get("/categories", response_model=List[Category])
async def list_categories(user: User = Depends(get_current_user)):
    items = await db.categories.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items


@api.post("/categories", response_model=Category)
async def create_category(payload: CategoryCreate, user: User = Depends(require_roles("admin", "manager"))):
    if await db.categories.find_one({"name": payload.name}):
        raise HTTPException(status_code=400, detail="Category name already exists")
    cat = Category(**payload.model_dump())
    await db.categories.insert_one(cat.model_dump())
    await log_audit(user, "create", "category", cat.id, f"Created category: {cat.name}")
    return cat


@api.put("/categories/{cat_id}", response_model=Category)
async def update_category(cat_id: str, payload: CategoryCreate, user: User = Depends(require_roles("admin", "manager"))):
    existing = await db.categories.find_one({"id": cat_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    updated = {**existing, **payload.model_dump(), "updated_at": utc_now_iso()}
    await db.categories.update_one({"id": cat_id}, {"$set": updated})
    await log_audit(user, "update", "category", cat_id, f"Updated category: {updated['name']}")
    return Category(**updated)


@api.delete("/categories/{cat_id}")
async def delete_category(cat_id: str, user: User = Depends(require_roles("admin", "manager"))):
    existing = await db.categories.find_one({"id": cat_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    await db.categories.delete_one({"id": cat_id})
    await log_audit(user, "delete", "category", cat_id, f"Deleted category: {existing.get('name')}")
    return {"message": "Deleted"}


# ============================================================
# SUPPLIER ROUTES
# ============================================================
@api.get("/suppliers", response_model=List[Supplier])
async def list_suppliers(user: User = Depends(get_current_user)):
    items = await db.suppliers.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items


@api.get("/suppliers/{sup_id}")
async def supplier_detail(sup_id: str, user: User = Depends(get_current_user)):
    sup = await db.suppliers.find_one({"id": sup_id}, {"_id": 0})
    if not sup:
        raise HTTPException(status_code=404, detail="Supplier not found")
    products = await db.products.find({"supplier_id": sup_id}, {"_id": 0}).to_list(1000)
    logs = await db.inventory_logs.find({"supplier_id": sup_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"supplier": sup, "products": products, "transactions": logs}


@api.post("/suppliers", response_model=Supplier)
async def create_supplier(payload: SupplierCreate, user: User = Depends(require_roles("admin", "manager"))):
    sup = Supplier(**payload.model_dump())
    await db.suppliers.insert_one(sup.model_dump())
    await log_audit(user, "create", "supplier", sup.id, f"Created supplier: {sup.name}")
    return sup


@api.put("/suppliers/{sup_id}", response_model=Supplier)
async def update_supplier(sup_id: str, payload: SupplierCreate, user: User = Depends(require_roles("admin", "manager"))):
    existing = await db.suppliers.find_one({"id": sup_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Supplier not found")
    updated = {**existing, **payload.model_dump(), "updated_at": utc_now_iso()}
    await db.suppliers.update_one({"id": sup_id}, {"$set": updated})
    await log_audit(user, "update", "supplier", sup_id, f"Updated supplier: {updated['name']}")
    return Supplier(**updated)


@api.delete("/suppliers/{sup_id}")
async def delete_supplier(sup_id: str, user: User = Depends(require_roles("admin", "manager"))):
    existing = await db.suppliers.find_one({"id": sup_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Supplier not found")
    await db.suppliers.delete_one({"id": sup_id})
    await log_audit(user, "delete", "supplier", sup_id, f"Deleted supplier: {existing.get('name')}")
    return {"message": "Deleted"}


# ============================================================
# PRODUCT ROUTES
# ============================================================
@api.get("/products")
async def list_products(
    search: Optional[str] = None,
    category_id: Optional[str] = None,
    supplier_id: Optional[str] = None,
    stock_status: Optional[str] = None,  # "low" | "out" | "in_stock"
    sort: str = "created_at",
    order: str = "desc",
    page: int = 1,
    limit: int = 20,
    user: User = Depends(get_current_user),
):
    query: dict = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}},
            {"barcode": {"$regex": search, "$options": "i"}},
        ]
    if category_id:
        query["category_id"] = category_id
    if supplier_id:
        query["supplier_id"] = supplier_id

    total = await db.products.count_documents(query)
    cursor = db.products.find(query, {"_id": 0}).sort(sort, -1 if order == "desc" else 1)
    cursor = cursor.skip((page - 1) * limit).limit(limit)
    items = await cursor.to_list(limit)

    # Filter for stock_status (post-query, simpler)
    if stock_status == "low":
        items = [p for p in items if 0 < p.get("quantity", 0) <= p.get("reorder_level", 0)]
    elif stock_status == "out":
        items = [p for p in items if p.get("quantity", 0) == 0]
    elif stock_status == "in_stock":
        items = [p for p in items if p.get("quantity", 0) > p.get("reorder_level", 0)]

    return {"items": items, "total": total, "page": page, "limit": limit}


@api.get("/products/{pid}", response_model=Product)
async def get_product(pid: str, user: User = Depends(get_current_user)):
    p = await db.products.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return p


@api.post("/products", response_model=Product)
async def create_product(payload: ProductCreate, user: User = Depends(require_roles("admin", "manager"))):
    if await db.products.find_one({"sku": payload.sku}):
        raise HTTPException(status_code=400, detail="SKU already exists")
    p = Product(**payload.model_dump())
    await db.products.insert_one(p.model_dump())
    await log_audit(user, "create", "product", p.id, f"Created product: {p.name} ({p.sku})")
    return p


@api.put("/products/{pid}", response_model=Product)
async def update_product(pid: str, payload: ProductUpdate, user: User = Depends(require_roles("admin", "manager"))):
    existing = await db.products.find_one({"id": pid}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    changes = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "sku" in changes and changes["sku"] != existing["sku"]:
        if await db.products.find_one({"sku": changes["sku"]}):
            raise HTTPException(status_code=400, detail="SKU already exists")
    changes["updated_at"] = utc_now_iso()
    await db.products.update_one({"id": pid}, {"$set": changes})
    updated = await db.products.find_one({"id": pid}, {"_id": 0})
    await log_audit(user, "update", "product", pid, f"Updated product: {updated['name']}")
    return updated


@api.delete("/products/{pid}")
async def delete_product(pid: str, user: User = Depends(require_roles("admin", "manager"))):
    existing = await db.products.find_one({"id": pid})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.products.delete_one({"id": pid})
    await log_audit(user, "delete", "product", pid, f"Deleted product: {existing.get('name')}")
    return {"message": "Deleted"}


@api.post("/products/bulk-delete")
async def bulk_delete_products(payload: BulkDelete, user: User = Depends(require_roles("admin", "manager"))):
    res = await db.products.delete_many({"id": {"$in": payload.ids}})
    await log_audit(user, "bulk_delete", "product", None, f"Bulk deleted {res.deleted_count} products")
    return {"deleted": res.deleted_count}


# ============================================================
# PRODUCT IMPORT / EXPORT
# ============================================================
@api.post("/products/import")
async def import_products(file: UploadFile = File(...), user: User = Depends(require_roles("admin", "manager"))):
    content = await file.read()
    wb = openpyxl.load_workbook(io.BytesIO(content))
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        raise HTTPException(status_code=400, detail="Empty sheet")
    headers = [str(h).strip().lower() if h else "" for h in rows[0]]
    required = {"sku", "name"}
    if not required.issubset(set(headers)):
        raise HTTPException(status_code=400, detail="Required columns: sku, name")

    created, skipped = 0, 0
    for row in rows[1:]:
        if not any(row):
            continue
        data = dict(zip(headers, row))
        sku = str(data.get("sku") or "").strip()
        name = str(data.get("name") or "").strip()
        if not sku or not name:
            skipped += 1
            continue
        if await db.products.find_one({"sku": sku}):
            skipped += 1
            continue
        p = Product(
            sku=sku,
            name=name,
            description=str(data.get("description") or ""),
            cost_price=float(data.get("cost_price") or 0),
            selling_price=float(data.get("selling_price") or 0),
            quantity=int(data.get("quantity") or 0),
            reorder_level=int(data.get("reorder_level") or 10),
            barcode=str(data.get("barcode") or ""),
        )
        await db.products.insert_one(p.model_dump())
        created += 1
    await log_audit(user, "import", "product", None, f"Imported {created}, skipped {skipped}")
    return {"created": created, "skipped": skipped}


@api.get("/products/export/excel")
async def export_products_excel(user: User = Depends(get_current_user)):
    items = await db.products.find({}, {"_id": 0}).to_list(10000)
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Products"
    headers = ["SKU", "Name", "Description", "Quantity", "Cost Price", "Selling Price", "Reorder Level", "Barcode"]
    ws.append(headers)
    for p in items:
        ws.append([
            p.get("sku"), p.get("name"), p.get("description"), p.get("quantity"),
            p.get("cost_price"), p.get("selling_price"), p.get("reorder_level"), p.get("barcode"),
        ])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=products.xlsx"},
    )


@api.get("/products/export/pdf")
async def export_products_pdf(user: User = Depends(get_current_user)):
    items = await db.products.find({}, {"_id": 0}).to_list(10000)
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4))
    styles = getSampleStyleSheet()
    elements = [Paragraph("Products Report", styles["Title"]), Spacer(1, 12)]
    data = [["SKU", "Name", "Qty", "Cost", "Price", "Reorder"]]
    for p in items:
        data.append([
            p.get("sku"), p.get("name"), str(p.get("quantity")),
            f"{p.get('cost_price'):.2f}", f"{p.get('selling_price'):.2f}",
            str(p.get("reorder_level")),
        ])
    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#10B981")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
    ]))
    elements.append(table)
    doc.build(elements)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=products.pdf"},
    )


# ============================================================
# INVENTORY ROUTES
# ============================================================
async def _check_and_alert_low_stock(product: dict, user: User):
    if product["quantity"] <= product["reorder_level"]:
        recipient = os.environ.get("ALERT_RECIPIENT")
        if recipient:
            await send_email(
                recipient,
                f"Low Stock Alert: {product['name']}",
                low_stock_html([product]),
            )


@api.post("/inventory/stock-in")
async def stock_in(payload: StockIn, user: User = Depends(require_roles("admin", "manager", "staff"))):
    prod = await db.products.find_one({"id": payload.product_id}, {"_id": 0})
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")
    prev_qty = prod["quantity"]
    new_qty = prev_qty + payload.quantity
    await db.products.update_one(
        {"id": payload.product_id},
        {"$set": {"quantity": new_qty, "updated_at": utc_now_iso()}},
    )
    log = InventoryLog(
        product_id=payload.product_id,
        product_name=prod["name"],
        action="stock_in",
        quantity_change=payload.quantity,
        previous_quantity=prev_qty,
        new_quantity=new_qty,
        user_id=user.id,
        user_name=user.name,
        supplier_id=payload.supplier_id,
        purchase_cost=payload.purchase_cost,
        notes=payload.notes,
    )
    await db.inventory_logs.insert_one(log.model_dump())
    await log_audit(user, "stock_in", "inventory", payload.product_id,
                    f"+{payload.quantity} {prod['name']}")
    return log


@api.post("/inventory/stock-out")
async def stock_out(payload: StockOut, user: User = Depends(require_roles("admin", "manager", "staff"))):
    prod = await db.products.find_one({"id": payload.product_id}, {"_id": 0})
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")
    if prod["quantity"] < payload.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    prev_qty = prod["quantity"]
    new_qty = prev_qty - payload.quantity
    await db.products.update_one(
        {"id": payload.product_id},
        {"$set": {"quantity": new_qty, "updated_at": utc_now_iso()}},
    )
    log = InventoryLog(
        product_id=payload.product_id,
        product_name=prod["name"],
        action="stock_out",
        quantity_change=-payload.quantity,
        previous_quantity=prev_qty,
        new_quantity=new_qty,
        user_id=user.id,
        user_name=user.name,
        destination=payload.destination,
        notes=payload.notes,
    )
    await db.inventory_logs.insert_one(log.model_dump())
    await log_audit(user, "stock_out", "inventory", payload.product_id,
                    f"-{payload.quantity} {prod['name']}")
    # async low-stock check (don't block response on email failure)
    updated_prod = {**prod, "quantity": new_qty}
    try:
        await _check_and_alert_low_stock(updated_prod, user)
    except Exception as e:
        logger.error(f"Low stock alert failed: {e}")
    return log


@api.get("/inventory/history")
async def inventory_history(
    product_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 100,
    user: User = Depends(get_current_user),
):
    q: dict = {}
    if product_id:
        q["product_id"] = product_id
    if action:
        q["action"] = action
    items = await db.inventory_logs.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return items


# ============================================================
# REPORTS / DASHBOARD
# ============================================================
@api.get("/reports/dashboard")
async def dashboard(user: User = Depends(get_current_user)):
    products = await db.products.find({}, {"_id": 0}).to_list(10000)
    total_products = len(products)
    total_categories = await db.categories.count_documents({})
    total_suppliers = await db.suppliers.count_documents({})
    low_stock = [p for p in products if 0 < p.get("quantity", 0) <= p.get("reorder_level", 0)]
    out_of_stock = [p for p in products if p.get("quantity", 0) == 0]
    inventory_value = sum(p.get("quantity", 0) * p.get("cost_price", 0) for p in products)

    today = datetime.now(timezone.utc).date().isoformat()
    todays_tx = await db.inventory_logs.count_documents({"created_at": {"$regex": f"^{today}"}})

    # Stock movement trend (last 14 days)
    days = []
    for i in range(13, -1, -1):
        d = (datetime.now(timezone.utc) - timedelta(days=i)).date().isoformat()
        ins = await db.inventory_logs.count_documents({"action": "stock_in", "created_at": {"$regex": f"^{d}"}})
        outs = await db.inventory_logs.count_documents({"action": "stock_out", "created_at": {"$regex": f"^{d}"}})
        days.append({"date": d[5:], "stock_in": ins, "stock_out": outs})

    # Category distribution
    cats = await db.categories.find({}, {"_id": 0}).to_list(1000)
    cat_map = {c["id"]: c["name"] for c in cats}
    cat_dist: dict = {}
    for p in products:
        cid = p.get("category_id") or "uncategorized"
        cname = cat_map.get(cid, "Uncategorized")
        cat_dist[cname] = cat_dist.get(cname, 0) + 1
    category_distribution = [{"name": k, "value": v} for k, v in cat_dist.items()]

    # Monthly growth (last 6 months) - count of products created per month
    months: list = []
    now = datetime.now(timezone.utc)
    for i in range(5, -1, -1):
        m_start = (now.replace(day=1) - timedelta(days=30 * i)).replace(day=1)
        m_label = m_start.strftime("%b %Y")
        m_prefix = m_start.strftime("%Y-%m")
        count = sum(1 for p in products if (p.get("created_at") or "").startswith(m_prefix))
        months.append({"month": m_label, "products": count})

    # Supplier contribution (by product count)
    sups = await db.suppliers.find({}, {"_id": 0}).to_list(1000)
    sup_map = {s["id"]: s["name"] for s in sups}
    sup_dist: dict = {}
    for p in products:
        sid = p.get("supplier_id")
        if sid:
            sname = sup_map.get(sid, "Unknown")
            sup_dist[sname] = sup_dist.get(sname, 0) + 1
    supplier_contribution = [{"name": k, "value": v} for k, v in sup_dist.items()]

    return {
        "kpi": {
            "total_products": total_products,
            "total_categories": total_categories,
            "total_suppliers": total_suppliers,
            "low_stock": len(low_stock),
            "out_of_stock": len(out_of_stock),
            "inventory_value": round(inventory_value, 2),
            "todays_transactions": todays_tx,
        },
        "stock_trend": days,
        "category_distribution": category_distribution,
        "monthly_growth": months,
        "supplier_contribution": supplier_contribution,
    }


@api.get("/reports/low-stock")
async def low_stock_report(user: User = Depends(get_current_user)):
    products = await db.products.find({}, {"_id": 0}).to_list(10000)
    low = [p for p in products if 0 < p.get("quantity", 0) <= p.get("reorder_level", 0)]
    out = [p for p in products if p.get("quantity", 0) == 0]
    return {"low_stock": low, "out_of_stock": out}


@api.post("/reports/low-stock/send-alert")
async def send_low_stock_alert(user: User = Depends(require_roles("admin", "manager"))):
    products = await db.products.find({}, {"_id": 0}).to_list(10000)
    low = [p for p in products if p.get("quantity", 0) <= p.get("reorder_level", 0)]
    if not low:
        return {"sent": False, "message": "No low-stock products"}
    recipient = os.environ.get("ALERT_RECIPIENT")
    if not recipient:
        raise HTTPException(status_code=400, detail="No alert recipient configured")
    ok = await send_email(recipient, "Low Stock Alert - Inventory Ops", low_stock_html(low))
    await log_audit(user, "send_alert", "report", None, f"Low-stock alert sent ({len(low)} items)")
    return {"sent": ok, "count": len(low), "recipient": recipient}


@api.get("/reports/transactions")
async def tx_report(
    range: str = "daily",  # daily | weekly | monthly | custom
    start: Optional[str] = None,
    end: Optional[str] = None,
    user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    if range == "daily":
        start_dt = now - timedelta(days=1)
    elif range == "weekly":
        start_dt = now - timedelta(days=7)
    elif range == "monthly":
        start_dt = now - timedelta(days=30)
    else:
        start_dt = datetime.fromisoformat(start) if start else now - timedelta(days=30)
    end_dt = datetime.fromisoformat(end) if end else now
    items = await db.inventory_logs.find(
        {"created_at": {"$gte": start_dt.isoformat(), "$lte": end_dt.isoformat()}},
        {"_id": 0},
    ).sort("created_at", -1).to_list(5000)
    return {"items": items, "count": len(items)}


@api.get("/reports/monthly")
async def monthly_report(user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    month_prefix = now.strftime("%Y-%m")
    items = await db.inventory_logs.find(
        {"created_at": {"$regex": f"^{month_prefix}"}},
        {"_id": 0},
    ).sort("created_at", -1).to_list(5000)
    stock_in_total = sum(i["quantity_change"] for i in items if i["action"] == "stock_in")
    stock_out_total = sum(-i["quantity_change"] for i in items if i["action"] == "stock_out")
    return {
        "month": now.strftime("%B %Y"),
        "total_transactions": len(items),
        "stock_in_units": stock_in_total,
        "stock_out_units": stock_out_total,
        "items": items,
    }


@api.get("/reports/export/excel")
async def reports_export_excel(
    report: str = "products",  # products | low_stock | transactions | audit
    user: User = Depends(get_current_user),
):
    wb = openpyxl.Workbook()
    ws = wb.active
    if report == "low_stock":
        ws.title = "Low Stock"
        ws.append(["SKU", "Name", "Quantity", "Reorder Level"])
        products = await db.products.find({}, {"_id": 0}).to_list(10000)
        for p in products:
            if p.get("quantity", 0) <= p.get("reorder_level", 0):
                ws.append([p["sku"], p["name"], p["quantity"], p["reorder_level"]])
    elif report == "transactions":
        ws.title = "Transactions"
        ws.append(["Date", "Action", "Product", "Qty Change", "Previous", "New", "User", "Notes"])
        logs = await db.inventory_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
        for l in logs:
            ws.append([l["created_at"], l["action"], l["product_name"], l["quantity_change"],
                       l["previous_quantity"], l["new_quantity"], l["user_name"], l.get("notes", "")])
    elif report == "audit":
        ws.title = "Audit"
        ws.append(["Date", "User", "Action", "Entity", "Details"])
        logs = await db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
        for l in logs:
            ws.append([l["created_at"], l["user_name"], l["action"], l["entity"], l.get("details", "")])
    else:
        ws.title = "Products"
        ws.append(["SKU", "Name", "Quantity", "Cost", "Price", "Reorder"])
        products = await db.products.find({}, {"_id": 0}).to_list(10000)
        for p in products:
            ws.append([p["sku"], p["name"], p["quantity"], p.get("cost_price"),
                       p.get("selling_price"), p.get("reorder_level")])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={report}.xlsx"},
    )


# ============================================================
# AUDIT
# ============================================================
@api.get("/audit-logs")
async def list_audit(
    entity: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 200,
    user: User = Depends(require_roles("admin", "manager")),
):
    q: dict = {}
    if entity:
        q["entity"] = entity
    if action:
        q["action"] = action
    items = await db.audit_logs.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return items


# ============================================================
# MOUNT + CORS
# ============================================================
@api.get("/")
async def root():
    return {"message": "Inventory Ops API", "status": "online"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
