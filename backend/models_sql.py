"""SQLAlchemy 2.0 ORM models — Inventory & Order Management System."""
from datetime import datetime, timezone
from typing import Optional, List
import uuid

from sqlalchemy import (
    String, Integer, Float, ForeignKey, Text, DateTime,
    UniqueConstraint, CheckConstraint, Index,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def new_id() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(160), unique=True, nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="staff")
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar: Mapped[Optional[str]] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Category(Base):
    __tablename__ = "categories"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    products: Mapped[List["Product"]] = relationship(back_populates="category")


class Supplier(Base):
    __tablename__ = "suppliers"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    company_name: Mapped[Optional[str]] = mapped_column(String(160), default="")
    email: Mapped[Optional[str]] = mapped_column(String(160), default="")
    phone: Mapped[Optional[str]] = mapped_column(String(40), default="")
    address: Mapped[Optional[str]] = mapped_column(Text, default="")
    gst_number: Mapped[Optional[str]] = mapped_column(String(40), default="")
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    products: Mapped[List["Product"]] = relationship(back_populates="supplier")


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("sku", name="uq_product_sku"),
        CheckConstraint("quantity >= 0", name="chk_quantity_nonneg"),
        Index("ix_product_name", "name"),
    )
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    sku: Mapped[str] = mapped_column(String(60), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, default="")
    category_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("categories.id", ondelete="SET NULL"))
    supplier_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("suppliers.id", ondelete="SET NULL"))
    cost_price: Mapped[float] = mapped_column(Float, default=0.0)
    selling_price: Mapped[float] = mapped_column(Float, default=0.0)
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    reorder_level: Mapped[int] = mapped_column(Integer, default=10)
    image: Mapped[Optional[str]] = mapped_column(String(500))
    barcode: Mapped[Optional[str]] = mapped_column(String(60), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    category: Mapped[Optional["Category"]] = relationship(back_populates="products")
    supplier: Mapped[Optional["Supplier"]] = relationship(back_populates="products")


class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = (UniqueConstraint("email", name="uq_customer_email"),)
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(40), default="")
    address: Mapped[Optional[str]] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    orders: Mapped[List["Order"]] = relationship(back_populates="customer", cascade="all, delete-orphan")


class Order(Base):
    __tablename__ = "orders"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    order_number: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    customer_id: Mapped[str] = mapped_column(String(64), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|fulfilled|cancelled
    notes: Mapped[Optional[str]] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)

    customer: Mapped["Customer"] = relationship(back_populates="orders")
    items: Mapped[List["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    order_id: Mapped[str] = mapped_column(String(64), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[str] = mapped_column(String(64), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    product_name: Mapped[str] = mapped_column(String(200), nullable=False)
    product_sku: Mapped[str] = mapped_column(String(60), nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    line_total: Mapped[float] = mapped_column(Float, nullable=False)

    order: Mapped["Order"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()


class InventoryLog(Base):
    __tablename__ = "inventory_logs"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    product_id: Mapped[str] = mapped_column(String(64), ForeignKey("products.id", ondelete="CASCADE"), index=True, nullable=False)
    product_name: Mapped[str] = mapped_column(String(200), default="")
    action: Mapped[str] = mapped_column(String(30), nullable=False)
    quantity_change: Mapped[int] = mapped_column(Integer, nullable=False)
    previous_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    new_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    user_id: Mapped[str] = mapped_column(String(64), default="")
    user_name: Mapped[str] = mapped_column(String(120), default="")
    supplier_id: Mapped[Optional[str]] = mapped_column(String(64))
    purchase_cost: Mapped[float] = mapped_column(Float, default=0.0)
    destination: Mapped[Optional[str]] = mapped_column(String(160), default="")
    notes: Mapped[Optional[str]] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(64), default="")
    user_name: Mapped[str] = mapped_column(String(120), default="")
    action: Mapped[str] = mapped_column(String(40), nullable=False)
    entity: Mapped[str] = mapped_column(String(40), nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(String(64))
    details: Mapped[Optional[str]] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)
