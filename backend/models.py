"""Pydantic models for the Inventory Management System."""
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr, ConfigDict
import uuid


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# ============ AUTH ============
class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    email: EmailStr
    role: str = "staff"


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class User(UserBase):
    id: str = Field(default_factory=new_id)
    avatar: Optional[str] = None
    created_at: str = Field(default_factory=utc_now_iso)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: User


class RefreshRequest(BaseModel):
    refresh_token: str


# ============ CATEGORY ============
class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    status: str = "active"


class Category(CategoryCreate):
    id: str = Field(default_factory=new_id)
    created_at: str = Field(default_factory=utc_now_iso)
    updated_at: str = Field(default_factory=utc_now_iso)


# ============ SUPPLIER ============
class SupplierCreate(BaseModel):
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    address: Optional[str] = ""
    gst_number: Optional[str] = ""
    company_name: Optional[str] = ""
    status: str = "active"


class Supplier(SupplierCreate):
    id: str = Field(default_factory=new_id)
    created_at: str = Field(default_factory=utc_now_iso)
    updated_at: str = Field(default_factory=utc_now_iso)


# ============ PRODUCT ============
class ProductCreate(BaseModel):
    sku: str
    name: str
    description: Optional[str] = ""
    category_id: Optional[str] = None
    supplier_id: Optional[str] = None
    cost_price: float = 0.0
    selling_price: float = 0.0
    quantity: int = 0
    reorder_level: int = 10
    image: Optional[str] = None
    barcode: Optional[str] = ""


class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    supplier_id: Optional[str] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    quantity: Optional[int] = None
    reorder_level: Optional[int] = None
    image: Optional[str] = None
    barcode: Optional[str] = None


class Product(ProductCreate):
    id: str = Field(default_factory=new_id)
    created_at: str = Field(default_factory=utc_now_iso)
    updated_at: str = Field(default_factory=utc_now_iso)


# ============ INVENTORY TRANSACTIONS ============
class StockIn(BaseModel):
    product_id: str
    quantity: int
    supplier_id: Optional[str] = None
    purchase_cost: float = 0.0
    notes: Optional[str] = ""


class StockOut(BaseModel):
    product_id: str
    quantity: int
    destination: Optional[str] = ""
    notes: Optional[str] = ""


class InventoryLog(BaseModel):
    id: str = Field(default_factory=new_id)
    product_id: str
    product_name: str = ""
    action: str  # "stock_in" | "stock_out"
    quantity_change: int
    previous_quantity: int
    new_quantity: int
    user_id: str
    user_name: str = ""
    supplier_id: Optional[str] = None
    purchase_cost: Optional[float] = 0.0
    destination: Optional[str] = ""
    notes: Optional[str] = ""
    created_at: str = Field(default_factory=utc_now_iso)


# ============ AUDIT ============
class AuditLog(BaseModel):
    id: str = Field(default_factory=new_id)
    user_id: str
    user_name: str
    action: str
    entity: str
    entity_id: Optional[str] = None
    details: Optional[str] = ""
    created_at: str = Field(default_factory=utc_now_iso)


class BulkDelete(BaseModel):
    ids: List[str]
