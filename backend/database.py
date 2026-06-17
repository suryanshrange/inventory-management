"""Mongo connection."""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]


async def init_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.products.create_index("sku", unique=True)
    await db.products.create_index("id", unique=True)
    await db.categories.create_index("id", unique=True)
    await db.suppliers.create_index("id", unique=True)
    await db.inventory_logs.create_index([("product_id", 1), ("created_at", -1)])
    await db.audit_logs.create_index([("created_at", -1)])
