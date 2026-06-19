"""Pydantic v2 schemas for request/response bodies."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator


# ============ AUTH ============
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "staff"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    email: EmailStr
    role: str
    avatar: Optional[str] = None
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshRequest(BaseModel):
    refresh_token: Optional[str] = None


# ============ CATEGORY ============
class CategoryIn(BaseModel):
    name: str
    description: Optional[str] = ""
    status: str = "active"


class CategoryOut(CategoryIn):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime
    updated_at: datetime


# ============ SUPPLIER ============
class SupplierIn(BaseModel):
    name: str
    company_name: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    address: Optional[str] = ""
    gst_number: Optional[str] = ""
    status: str = "active"


class SupplierOut(SupplierIn):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime
    updated_at: datetime


# ============ PRODUCT ============
class ProductIn(BaseModel):
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

    @field_validator("quantity")
    @classmethod
    def quantity_nonneg(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Product quantity cannot be negative")
        return v


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


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    sku: str
    name: str
    description: Optional[str]
    category_id: Optional[str]
    supplier_id: Optional[str]
    cost_price: float
    selling_price: float
    quantity: int
    reorder_level: int
    image: Optional[str]
    barcode: Optional[str]
    created_at: datetime
    updated_at: datetime


# ============ CUSTOMER ============
class CustomerIn(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = ""
    address: Optional[str] = ""


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    full_name: str
    email: EmailStr
    phone: Optional[str]
    address: Optional[str]
    created_at: datetime


# ============ ORDER ============
class OrderItemIn(BaseModel):
    product_id: str
    quantity: int = Field(gt=0)


class OrderIn(BaseModel):
    customer_id: str
    items: List[OrderItemIn]
    notes: Optional[str] = ""

    @field_validator("items")
    @classmethod
    def at_least_one(cls, v):
        if not v:
            raise ValueError("At least one order item is required")
        return v


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    product_id: str
    product_name: str
    product_sku: str
    unit_price: float
    quantity: int
    line_total: float


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    order_number: str
    customer_id: str
    total_amount: float
    status: str
    notes: Optional[str]
    created_at: datetime
    items: List[OrderItemOut] = []
    customer: Optional[CustomerOut] = None


# ============ INVENTORY ============
class StockIn(BaseModel):
    product_id: str
    quantity: int = Field(gt=0)
    supplier_id: Optional[str] = None
    purchase_cost: float = 0.0
    notes: Optional[str] = ""


class StockOut(BaseModel):
    product_id: str
    quantity: int = Field(gt=0)
    destination: Optional[str] = ""
    notes: Optional[str] = ""


class InventoryLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    product_id: str
    product_name: str
    action: str
    quantity_change: int
    previous_quantity: int
    new_quantity: int
    user_id: str
    user_name: str
    supplier_id: Optional[str]
    purchase_cost: float
    destination: Optional[str]
    notes: Optional[str]
    created_at: datetime


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    user_name: str
    action: str
    entity: str
    entity_id: Optional[str]
    details: Optional[str]
    created_at: datetime


class BulkDelete(BaseModel):
    ids: List[str]
