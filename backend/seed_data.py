"""Demo data seeder — runs once if products table is empty (SQL)."""
from datetime import datetime, timezone, timedelta
import random
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from models_sql import Category, Supplier, Product, Customer, Order, OrderItem, InventoryLog, AuditLog


CATEGORIES = [
    ("Electronics", "Computer accessories, peripherals, cables"),
    ("Office Supplies", "Paper, stationery, organizers"),
    ("Apparel", "T-shirts, hoodies, caps, jeans"),
    ("Tools & Hardware", "Power tools, hand tools, safety"),
    ("Beverages", "Coffee, tea, water, energy drinks"),
    ("Furniture", "Chairs, desks, cabinets"),
]

SUPPLIERS = [
    ("Acme Distributors", "Acme Distributors LLC", "sales@acmedist.com", "+1 415-555-0142", "455 Market St, San Francisco, CA", "22ABCDE1234F1Z5"),
    ("TechSource Inc", "TechSource Incorporated", "info@techsource.com", "+1 408-555-0188", "2100 Bryant St, San Jose, CA", "29FGHIJ5678K2L4"),
    ("Global Imports Co", "Global Imports Co.", "contact@globalimports.com", "+1 713-555-0177", "880 Commerce Dr, Houston, TX", "07MNOPQ9012R3S6"),
    ("North Star Trading", "North Star Trading Group", "hello@northstar.co", "+1 212-555-0156", "300 Park Ave, New York, NY", "11TUVWX3456Y7Z8"),
    ("Urban Outfit", "Urban Outfit Apparel", "support@urbanoutfit.com", "+1 310-555-0119", "1820 Sunset Blvd, Los Angeles, CA", "33ABCDE7890F1G2"),
    ("Hardware Plus", "Hardware Plus Supply", "sales@hardwareplus.com", "+1 214-555-0133", "5500 Industrial Way, Dallas, TX", "06HIJKL1234M5N6"),
    ("BeanWorks Coffee", "BeanWorks Coffee Roasters", "hi@beanworks.com", "+1 206-555-0188", "1200 Pike Pl, Seattle, WA", "53OPQRS5678T9U0"),
    ("Pacific Suppliers", "Pacific Suppliers LLC", "info@pacific.co", "+1 503-555-0177", "850 Burnside St, Portland, OR", "41VWXYZ9012A3B4"),
]

PRODUCTS_BLUEPRINT = [
    (0, 1, "ELC-001", "Wireless Mouse Pro", "Ergonomic 2.4GHz wireless mouse, 6 buttons", 19.99, 39.99, 145, 30),
    (0, 1, "ELC-002", "USB-C Hub 7-port", "Multi-port hub with HDMI, USB 3.0, SD card reader", 24.50, 49.99, 67, 20),
    (0, 1, "ELC-003", "Mechanical Keyboard", "RGB backlit, cherry MX blue switches", 58.00, 119.99, 23, 25),
    (0, 1, "ELC-004", "27\" 4K Monitor", "IPS panel, HDR, USB-C input", 245.00, 449.00, 8, 5),
    (0, 0, "ELC-005", "HDMI Cable 6ft", "High-speed HDMI 2.1, gold-plated", 3.50, 9.99, 0, 25),
    (0, 1, "ELC-006", "Webcam 1080p", "Full HD webcam with stereo mics", 32.00, 64.99, 89, 20),
    (0, 0, "ELC-007", "Laptop Stand Aluminum", "Adjustable, foldable, fits 13-17\"", 28.50, 54.99, 41, 15),
    (0, 1, "ELC-008", "Bluetooth Headphones", "Active noise cancelling, 30hr battery", 84.00, 169.00, 52, 20),
    (1, 3, "OFF-001", "A4 Paper Ream (500 sheets)", "Premium white 80gsm paper", 4.20, 8.99, 240, 50),
    (1, 3, "OFF-002", "Stapler Heavy Duty", "Up to 100 sheets, metal body", 12.30, 27.50, 56, 15),
    (1, 3, "OFF-003", "Sticky Notes Pack (12pcs)", "Assorted neon colors, 3x3 inch", 5.50, 13.99, 12, 30),
    (1, 7, "OFF-004", "Whiteboard 4x3 ft", "Magnetic, aluminum frame", 48.00, 89.99, 18, 10),
    (1, 7, "OFF-005", "Desk Organizer Mesh", "5-compartment, black wire mesh", 11.20, 28.99, 95, 25),
    (1, 3, "OFF-006", "Ballpoint Pens (50pk)", "Blue ink, smooth-flow", 6.80, 16.99, 178, 40),
    (2, 4, "APP-001", "Polo Shirt - Black", "100% cotton, classic fit, M-XL", 14.00, 34.99, 132, 40),
    (2, 4, "APP-002", "Hoodie - Navy", "Heavyweight fleece, kangaroo pocket", 22.00, 59.99, 47, 30),
    (2, 4, "APP-003", "Cap - Embroidered", "Adjustable, 6-panel structured", 6.80, 22.99, 178, 50),
    (2, 4, "APP-004", "Denim Jeans - Slim", "Stretch denim, dark wash", 28.00, 69.99, 0, 25),
    (2, 4, "APP-005", "Running Shoes Mesh", "Lightweight, breathable mesh upper", 42.00, 99.00, 22, 25),
    (3, 5, "TLS-001", "Cordless Drill 18V", "2-speed, includes battery + charger", 68.00, 149.00, 34, 12),
    (3, 5, "TLS-002", "Tape Measure 25ft", "Heavy duty, magnetic hook", 5.40, 14.99, 156, 40),
    (3, 5, "TLS-003", "Toolbox Steel 22\"", "Tri-fold compartments, locking lid", 32.50, 69.99, 19, 10),
    (3, 5, "TLS-004", "Safety Glasses (12pk)", "ANSI Z87.1 certified, anti-fog", 3.20, 10.99, 287, 60),
    (3, 5, "TLS-005", "Wrench Set 14-pc", "Combination metric, 8-22mm", 24.00, 54.99, 38, 15),
    (4, 6, "BEV-001", "Coffee Beans Arabica 1kg", "Medium roast, single origin", 11.50, 28.99, 89, 30),
    (4, 7, "BEV-002", "Sparkling Water 24pk", "Naturally flavored, no sugar", 8.40, 19.99, 67, 25),
    (4, 7, "BEV-003", "Energy Drink Pack 12", "Original flavor, 250ml cans", 14.00, 34.99, 8, 30),
    (4, 6, "BEV-004", "Tea Variety Box (40 bags)", "Green, black, herbal selection", 6.80, 17.99, 124, 30),
    (5, 2, "FRN-001", "Office Chair Ergo Mesh", "Lumbar support, adjustable arms", 128.00, 279.00, 16, 8),
    (5, 2, "FRN-002", "Standing Desk Adjustable", "Electric, 28\"-48\" height range", 245.00, 499.00, 7, 6),
    (5, 2, "FRN-003", "Bookshelf 5-tier Oak", "Solid oak, 72\" tall", 58.00, 129.00, 29, 10),
    (5, 2, "FRN-004", "Filing Cabinet 3-drawer", "Lockable, anti-tip mechanism", 89.00, 189.00, 0, 5),
]

CUSTOMERS = [
    ("Alice Johnson", "alice.johnson@example.com", "+1 415-555-1011", "120 Pine St, San Francisco, CA"),
    ("Bob Martinez", "bob.martinez@example.com", "+1 408-555-1042", "55 Tasman Dr, San Jose, CA"),
    ("Catherine Lee", "catherine.lee@example.com", "+1 212-555-1078", "401 Broadway, New York, NY"),
    ("David Kim", "david.kim@example.com", "+1 213-555-1090", "1620 Sunset Blvd, Los Angeles, CA"),
    ("Emily Patel", "emily.patel@example.com", "+1 312-555-1133", "200 Lake Shore Dr, Chicago, IL"),
    ("Frank O'Brien", "frank.obrien@example.com", "+1 617-555-1155", "85 Beacon St, Boston, MA"),
]


async def seed_demo_data(db: AsyncSession) -> bool:
    existing = (await db.execute(select(func.count()).select_from(Product))).scalar() or 0
    if existing > 0:
        return False

    cats = [Category(name=n, description=d, status="active") for n, d in CATEGORIES]
    db.add_all(cats)
    await db.flush()

    sups = [Supplier(name=n, company_name=c, email=e, phone=p, address=a, gst_number=g, status="active")
            for (n, c, e, p, a, g) in SUPPLIERS]
    db.add_all(sups)
    await db.flush()

    products = []
    for (ci, si, sku, name, desc, cost, price, qty, reorder) in PRODUCTS_BLUEPRINT:
        p = Product(
            sku=sku, name=name, description=desc,
            category_id=cats[ci].id, supplier_id=sups[si].id,
            cost_price=cost, selling_price=price,
            quantity=qty, reorder_level=reorder,
            barcode=f"7{random.randint(10**11, 10**12 - 1)}",
        )
        products.append(p)
    db.add_all(products)
    await db.flush()

    customers = [Customer(full_name=n, email=e, phone=p, address=a) for (n, e, p, a) in CUSTOMERS]
    db.add_all(customers)
    await db.flush()

    # Generate inventory transactions over 14 days
    now = datetime.now(timezone.utc)
    sample = random.sample(products, min(20, len(products)))
    for day_offset in range(14, -1, -1):
        ts = now - timedelta(days=day_offset, hours=random.randint(0, 23), minutes=random.randint(0, 59))
        for _ in range(random.randint(2, 6)):
            prod = random.choice(sample)
            action = random.choice(["stock_in", "stock_in", "stock_out", "stock_out", "stock_out"])
            change = random.randint(3, 25) * (1 if action == "stock_in" else -1)
            db.add(InventoryLog(
                product_id=prod.id, product_name=prod.name,
                action=action, quantity_change=change,
                previous_quantity=random.randint(20, 200),
                new_quantity=random.randint(20, 200),
                user_id="seed", user_name="System Seed",
                supplier_id=prod.supplier_id if action == "stock_in" else None,
                purchase_cost=round(random.uniform(5, 50), 2) if action == "stock_in" else 0,
                destination=random.choice(["Branch A", "Customer Order", "Warehouse 2", ""]) if action == "stock_out" else "",
                notes="", created_at=ts,
            ))

    # Sample orders
    for i, cust in enumerate(customers[:4]):
        chosen = random.sample(products, k=random.randint(1, 3))
        items = []
        total = 0.0
        for prod in chosen:
            q = random.randint(1, 3)
            line = round(prod.selling_price * q, 2)
            total += line
            items.append(OrderItem(
                product_id=prod.id, product_name=prod.name, product_sku=prod.sku,
                unit_price=prod.selling_price, quantity=q, line_total=line,
            ))
        order = Order(
            order_number=f"ORD-{1000 + i:05d}",
            customer_id=cust.id, total_amount=round(total, 2),
            status=random.choice(["pending", "fulfilled"]),
            notes="", items=items,
            created_at=now - timedelta(days=random.randint(0, 10), hours=random.randint(0, 23)),
        )
        db.add(order)

    db.add(AuditLog(user_id="seed", user_name="System Seed", action="seed", entity="system", details="Demo data seeded"))
    await db.flush()
    return True
