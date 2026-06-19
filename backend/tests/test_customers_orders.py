"""Tests for Customers + Orders endpoints (new in PDF spec, PostgreSQL backend)."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://stock-sync-152.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@inventory.com", "password": "Admin@123"}
MANAGER = {"email": "manager@inventory.com", "password": "Manager@123"}
STAFF = {"email": "staff@inventory.com", "password": "Staff@123"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"login failed: {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_token():
    return _login(ADMIN)


@pytest.fixture(scope="session")
def manager_token():
    return _login(MANAGER)


@pytest.fixture(scope="session")
def staff_token():
    return _login(STAFF)


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------------- HEALTH + SEED ----------------
class TestHealthAndSeed:
    def test_healthz(self):
        r = requests.get(f"{API}/healthz", timeout=15)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_seed_products_count(self, admin_token):
        r = requests.get(f"{API}/products?page=1&limit=1", headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        assert r.json()["total"] >= 32

    def test_seed_customers_count(self, admin_token):
        r = requests.get(f"{API}/customers", headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body, list)
        assert len(body) >= 6

    def test_seed_orders_with_ord01005(self, admin_token):
        r = requests.get(f"{API}/orders", headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        orders = r.json()
        assert isinstance(orders, list)
        assert len(orders) >= 5
        nums = {o["order_number"] for o in orders}
        assert "ORD-01005" in nums


# ---------------- CUSTOMERS ----------------
class TestCustomers:
    customer_id = None
    customer_email = None

    def test_list_customers(self, admin_token):
        r = requests.get(f"{API}/customers", headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        if items:
            c = items[0]
            for k in ("id", "full_name", "email", "phone", "address", "created_at"):
                assert k in c, f"missing {k} in customer response"

    def test_create_customer(self, admin_token):
        email = f"TEST_cust_{uuid.uuid4().hex[:8]}@test.com"
        TestCustomers.customer_email = email
        payload = {
            "full_name": "TEST Customer One",
            "email": email,
            "phone": "+1 555 010-1234",
            "address": "1 Test St",
        }
        r = requests.post(f"{API}/customers", json=payload, headers=H(admin_token), timeout=30)
        assert r.status_code in (200, 201), r.text
        body = r.json()
        TestCustomers.customer_id = body["id"]
        assert body["full_name"] == payload["full_name"]
        assert body["email"] == email

    def test_get_by_id(self, admin_token):
        assert TestCustomers.customer_id
        r = requests.get(f"{API}/customers/{TestCustomers.customer_id}",
                         headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == TestCustomers.customer_email

    def test_duplicate_email_rejected(self, admin_token):
        r = requests.post(f"{API}/customers",
                          json={"full_name": "Dup", "email": TestCustomers.customer_email},
                          headers=H(admin_token), timeout=30)
        assert r.status_code == 400, r.text

    def test_invalid_email_422(self, admin_token):
        r = requests.post(f"{API}/customers",
                          json={"full_name": "Bad", "email": "not-an-email"},
                          headers=H(admin_token), timeout=30)
        assert r.status_code == 422, r.text

    def test_staff_cannot_delete_customer(self, staff_token):
        # Need a real customer id to attempt delete on
        assert TestCustomers.customer_id
        r = requests.delete(f"{API}/customers/{TestCustomers.customer_id}",
                            headers=H(staff_token), timeout=30)
        assert r.status_code == 403


# ---------------- ORDERS ----------------
class TestOrders:
    customer_id = None
    product_id = None
    initial_qty = None
    initial_price = None
    order_id = None
    order_total = None

    @classmethod
    def _setup_prereq(cls, admin_token):
        if cls.customer_id and cls.product_id:
            return
        # create a customer
        email = f"TEST_ord_{uuid.uuid4().hex[:8]}@test.com"
        r = requests.post(f"{API}/customers",
                          json={"full_name": "TEST Order Customer", "email": email,
                                "phone": "1", "address": "x"},
                          headers=H(admin_token), timeout=30)
        assert r.status_code in (200, 201), r.text
        cls.customer_id = r.json()["id"]
        # find a product with > 5 quantity
        r2 = requests.get(f"{API}/products?page=1&limit=50",
                          headers=H(admin_token), timeout=30)
        assert r2.status_code == 200
        for p in r2.json()["items"]:
            if p["quantity"] >= 5:
                cls.product_id = p["id"]
                cls.initial_qty = p["quantity"]
                cls.initial_price = p["selling_price"]
                return
        pytest.skip("No product with sufficient stock available")

    def test_setup(self, admin_token):
        TestOrders._setup_prereq(admin_token)
        assert TestOrders.customer_id
        assert TestOrders.product_id

    def test_create_order_success(self, admin_token):
        payload = {
            "customer_id": TestOrders.customer_id,
            "items": [{"product_id": TestOrders.product_id, "quantity": 2}],
            "notes": "TEST_order",
        }
        r = requests.post(f"{API}/orders", json=payload, headers=H(admin_token), timeout=30)
        assert r.status_code in (200, 201), r.text
        body = r.json()
        TestOrders.order_id = body["id"]
        # order_number ORD-#####
        assert body["order_number"].startswith("ORD-"), body["order_number"]
        assert len(body["order_number"]) == len("ORD-") + 5
        # total_amount = unit_price * qty
        expected_total = TestOrders.initial_price * 2
        TestOrders.order_total = body["total_amount"]
        assert abs(body["total_amount"] - expected_total) < 0.01, \
            f"expected {expected_total}, got {body['total_amount']}"
        # nested items + customer
        assert len(body["items"]) == 1
        item = body["items"][0]
        assert item["product_id"] == TestOrders.product_id
        assert item["quantity"] == 2
        assert "product_name" in item and "product_sku" in item
        assert item["line_total"] == item["unit_price"] * 2
        assert body["customer"]["id"] == TestOrders.customer_id
        assert body["status"] == "pending"

    def test_product_quantity_decremented(self, admin_token):
        r = requests.get(f"{API}/products/{TestOrders.product_id}",
                         headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        assert r.json()["quantity"] == TestOrders.initial_qty - 2

    def test_inventory_log_stock_out_written(self, admin_token):
        r = requests.get(f"{API}/inventory/history?limit=100",
                         headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        logs = r.json()
        # find a stock_out for our product that matches order creation
        matched = [l for l in logs
                   if l.get("product_id") == TestOrders.product_id
                   and l.get("action") == "stock_out"
                   and l.get("quantity_change") in (-2, 2)]
        assert matched, "expected stock_out inventory log for order"

    def test_get_order_by_id(self, admin_token):
        r = requests.get(f"{API}/orders/{TestOrders.order_id}",
                         headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == TestOrders.order_id
        assert "items" in body and len(body["items"]) == 1
        assert "customer" in body

    def test_list_orders_includes_new(self, admin_token):
        r = requests.get(f"{API}/orders", headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        ids = {o["id"] for o in r.json()}
        assert TestOrders.order_id in ids

    # ---- validation cases ----
    def test_empty_items_422(self, admin_token):
        r = requests.post(f"{API}/orders",
                          json={"customer_id": TestOrders.customer_id, "items": []},
                          headers=H(admin_token), timeout=30)
        assert r.status_code == 422, r.text

    def test_nonexistent_customer_404(self, admin_token):
        r = requests.post(f"{API}/orders",
                          json={"customer_id": str(uuid.uuid4()),
                                "items": [{"product_id": TestOrders.product_id, "quantity": 1}]},
                          headers=H(admin_token), timeout=30)
        assert r.status_code == 404, r.text

    def test_nonexistent_product_404(self, admin_token):
        r = requests.post(f"{API}/orders",
                          json={"customer_id": TestOrders.customer_id,
                                "items": [{"product_id": str(uuid.uuid4()), "quantity": 1}]},
                          headers=H(admin_token), timeout=30)
        assert r.status_code == 404, r.text

    def test_insufficient_stock_400_and_no_qty_change(self, admin_token):
        # snapshot current product qty
        r0 = requests.get(f"{API}/products/{TestOrders.product_id}",
                          headers=H(admin_token), timeout=30)
        qty_before = r0.json()["quantity"]
        r = requests.post(f"{API}/orders",
                          json={"customer_id": TestOrders.customer_id,
                                "items": [{"product_id": TestOrders.product_id,
                                           "quantity": qty_before + 9999}]},
                          headers=H(admin_token), timeout=30)
        assert r.status_code == 400, r.text
        detail = r.json().get("detail", "")
        assert "insufficient stock" in detail.lower(), detail
        # ensure quantity not changed
        r2 = requests.get(f"{API}/products/{TestOrders.product_id}",
                          headers=H(admin_token), timeout=30)
        assert r2.json()["quantity"] == qty_before

    # ---- staff RBAC ----
    def test_staff_can_create_order(self, staff_token, admin_token):
        # ensure a product with stock
        r0 = requests.get(f"{API}/products/{TestOrders.product_id}",
                          headers=H(admin_token), timeout=30)
        if r0.json()["quantity"] < 1:
            pytest.skip("no stock left for staff order test")
        r = requests.post(f"{API}/orders",
                          json={"customer_id": TestOrders.customer_id,
                                "items": [{"product_id": TestOrders.product_id, "quantity": 1}],
                                "notes": "TEST_staff_order"},
                          headers=H(staff_token), timeout=30)
        assert r.status_code in (200, 201), r.text

    # ---- cancellation ----
    def test_cancel_order_restocks(self, admin_token):
        # get current product qty before cancel
        r0 = requests.get(f"{API}/products/{TestOrders.product_id}",
                          headers=H(admin_token), timeout=30)
        qty_before = r0.json()["quantity"]

        r = requests.delete(f"{API}/orders/{TestOrders.order_id}",
                            headers=H(admin_token), timeout=30)
        assert r.status_code == 200, r.text

        # order should now be cancelled
        r2 = requests.get(f"{API}/orders/{TestOrders.order_id}",
                         headers=H(admin_token), timeout=30)
        assert r2.status_code == 200
        assert r2.json()["status"] == "cancelled"

        # product restocked by 2 (original order qty)
        r3 = requests.get(f"{API}/products/{TestOrders.product_id}",
                          headers=H(admin_token), timeout=30)
        assert r3.json()["quantity"] == qty_before + 2

        # inventory log with stock_in written
        r4 = requests.get(f"{API}/inventory/history?limit=200",
                          headers=H(admin_token), timeout=30)
        logs = r4.json()
        matched = [l for l in logs
                   if l.get("product_id") == TestOrders.product_id
                   and l.get("action") == "stock_in"]
        assert matched, "expected stock_in inventory log after cancel"

    def test_double_cancel_400(self, admin_token):
        r = requests.delete(f"{API}/orders/{TestOrders.order_id}",
                            headers=H(admin_token), timeout=30)
        assert r.status_code == 400, r.text


# ---------------- DASHBOARD KPI new fields ----------------
class TestDashboardNewFields:
    def test_kpi_has_customer_and_order_counts(self, admin_token):
        r = requests.get(f"{API}/reports/dashboard", headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        kpi = r.json()["kpi"]
        assert "total_customers" in kpi
        assert "total_orders" in kpi
        assert isinstance(kpi["total_customers"], int)
        assert isinstance(kpi["total_orders"], int)
        assert kpi["total_customers"] >= 6
        # existing fields still present
        for k in ("total_products", "low_stock", "out_of_stock", "inventory_value"):
            assert k in kpi


# ---------------- RBAC: staff denial on admin/manager-only endpoints ----------------
class TestRBACStaff:
    def test_staff_403_categories_post(self, staff_token):
        r = requests.post(f"{API}/categories", json={"name": "TEST", "description": ""},
                          headers=H(staff_token), timeout=30)
        assert r.status_code == 403

    def test_staff_403_suppliers_post(self, staff_token):
        r = requests.post(f"{API}/suppliers", json={"name": "TEST"},
                          headers=H(staff_token), timeout=30)
        assert r.status_code == 403

    def test_staff_403_delete_product(self, staff_token, admin_token):
        # pick any existing product
        r0 = requests.get(f"{API}/products?page=1&limit=1",
                          headers=H(admin_token), timeout=30)
        pid = r0.json()["items"][0]["id"]
        r = requests.delete(f"{API}/products/{pid}", headers=H(staff_token), timeout=30)
        assert r.status_code == 403

    def test_staff_403_delete_customer(self, staff_token, admin_token):
        r0 = requests.get(f"{API}/customers", headers=H(admin_token), timeout=30)
        cid = r0.json()[0]["id"]
        r = requests.delete(f"{API}/customers/{cid}", headers=H(staff_token), timeout=30)
        assert r.status_code == 403

    def test_staff_403_audit_logs(self, staff_token):
        r = requests.get(f"{API}/audit-logs", headers=H(staff_token), timeout=30)
        assert r.status_code == 403

    def test_staff_can_stock_in(self, staff_token, admin_token):
        r0 = requests.get(f"{API}/products?page=1&limit=1",
                          headers=H(admin_token), timeout=30)
        pid = r0.json()["items"][0]["id"]
        r = requests.post(f"{API}/inventory/stock-in",
                          json={"product_id": pid, "quantity": 1, "notes": "TEST_stk"},
                          headers=H(staff_token), timeout=30)
        assert r.status_code == 200


# ---------------- PRODUCTS: SKU uniqueness + negative qty ----------------
class TestProductsConstraints:
    def test_negative_quantity_rejected(self, admin_token):
        sku = f"TEST-NEG-{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/products",
                          json={"sku": sku, "name": "neg", "cost_price": 1,
                                "selling_price": 2, "quantity": -5},
                          headers=H(admin_token), timeout=30)
        assert r.status_code == 422, r.text


# ---------------- Cleanup of created customer (manager can delete) ----------------
class TestCleanup:
    def test_delete_customer_admin(self, admin_token):
        if TestCustomers.customer_id:
            r = requests.delete(f"{API}/customers/{TestCustomers.customer_id}",
                                headers=H(admin_token), timeout=30)
            # admin should be allowed
            assert r.status_code in (200, 204, 400, 409), r.text
            # 400/409 acceptable if customer still has orders
