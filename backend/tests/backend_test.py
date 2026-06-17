"""Inventory Management System - backend regression tests."""
import os
import io
import pytest
import requests
import openpyxl

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://stock-sync-152.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@inventory.com", "password": "Admin@123"}
MANAGER = {"email": "manager@inventory.com", "password": "Manager@123"}
STAFF = {"email": "staff@inventory.com", "password": "Staff@123"}


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=30)
    assert r.status_code == 200, f"admin login failed: {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def manager_token():
    r = requests.post(f"{API}/auth/login", json=MANAGER, timeout=30)
    assert r.status_code == 200, f"manager login failed: {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def staff_token():
    r = requests.post(f"{API}/auth/login", json=STAFF, timeout=30)
    assert r.status_code == 200, f"staff login failed: {r.text}"
    return r.json()["access_token"]


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------------- AUTH ----------------
class TestAuth:
    def test_login_admin(self):
        r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=30)
        assert r.status_code == 200
        body = r.json()
        assert "access_token" in body and "refresh_token" in body
        assert body["user"]["email"] == ADMIN["email"]
        assert body["user"]["role"] == "admin"

    def test_login_manager(self):
        r = requests.post(f"{API}/auth/login", json=MANAGER, timeout=30)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "manager"

    def test_login_staff(self):
        r = requests.post(f"{API}/auth/login", json=STAFF, timeout=30)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "staff"

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": "x@x.com", "password": "bad"}, timeout=30)
        assert r.status_code == 401

    def test_profile(self, admin_token):
        r = requests.get(f"{API}/auth/profile", headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN["email"]

    def test_profile_no_token(self):
        r = requests.get(f"{API}/auth/profile", timeout=30)
        assert r.status_code in (401, 403)

    def test_register_and_duplicate(self):
        import uuid
        email = f"TEST_{uuid.uuid4().hex[:8]}@test.com"
        r = requests.post(f"{API}/auth/register",
                          json={"name": "Test", "email": email, "password": "Test@123", "role": "staff"},
                          timeout=30)
        assert r.status_code == 200
        assert "access_token" in r.json()
        # duplicate
        r2 = requests.post(f"{API}/auth/register",
                           json={"name": "Test", "email": email, "password": "Test@123", "role": "staff"},
                           timeout=30)
        assert r2.status_code == 400


# ---------------- CATEGORIES ----------------
class TestCategories:
    cat_id = None

    def test_create_category_admin(self, admin_token):
        import uuid
        name = f"TEST_Cat_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/categories", json={"name": name, "description": "t"},
                          headers=H(admin_token), timeout=30)
        assert r.status_code == 200, r.text
        TestCategories.cat_id = r.json()["id"]
        assert r.json()["name"] == name

    def test_staff_cannot_create(self, staff_token):
        r = requests.post(f"{API}/categories", json={"name": "TEST_NoPerm", "description": ""},
                          headers=H(staff_token), timeout=30)
        assert r.status_code == 403

    def test_list_categories(self, admin_token):
        r = requests.get(f"{API}/categories", headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_update_category(self, admin_token):
        assert TestCategories.cat_id
        r = requests.put(f"{API}/categories/{TestCategories.cat_id}",
                         json={"name": "TEST_Updated", "description": "u"},
                         headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Updated"

    def test_delete_category(self, admin_token):
        assert TestCategories.cat_id
        r = requests.delete(f"{API}/categories/{TestCategories.cat_id}",
                            headers=H(admin_token), timeout=30)
        assert r.status_code == 200


# ---------------- SUPPLIERS ----------------
class TestSuppliers:
    sup_id = None

    def test_create_supplier(self, admin_token):
        import uuid
        r = requests.post(f"{API}/suppliers",
                          json={"name": f"TEST_Sup_{uuid.uuid4().hex[:6]}", "contact_person": "x",
                                "email": "s@t.com", "phone": "1", "address": "a"},
                          headers=H(admin_token), timeout=30)
        assert r.status_code == 200, r.text
        TestSuppliers.sup_id = r.json()["id"]

    def test_staff_cannot_create_supplier(self, staff_token):
        r = requests.post(f"{API}/suppliers", json={"name": "TEST_NS"},
                          headers=H(staff_token), timeout=30)
        assert r.status_code == 403

    def test_list_suppliers(self, admin_token):
        r = requests.get(f"{API}/suppliers", headers=H(admin_token), timeout=30)
        assert r.status_code == 200

    def test_supplier_detail(self, admin_token):
        assert TestSuppliers.sup_id
        r = requests.get(f"{API}/suppliers/{TestSuppliers.sup_id}",
                         headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        body = r.json()
        assert "supplier" in body and "products" in body and "transactions" in body

    def test_update_supplier(self, admin_token):
        r = requests.put(f"{API}/suppliers/{TestSuppliers.sup_id}",
                         json={"name": "TEST_SupUpd", "contact_person": "y"},
                         headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_SupUpd"


# ---------------- PRODUCTS ----------------
class TestProducts:
    prod_id = None
    sku = None
    cat_id = None

    def test_setup_category(self, admin_token):
        import uuid
        r = requests.post(f"{API}/categories",
                          json={"name": f"TEST_PCat_{uuid.uuid4().hex[:6]}", "description": ""},
                          headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        TestProducts.cat_id = r.json()["id"]

    def test_create_product(self, admin_token):
        import uuid
        TestProducts.sku = f"TEST-SKU-{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "sku": TestProducts.sku, "name": "TEST_Prod", "description": "d",
            "cost_price": 10.0, "selling_price": 15.0, "quantity": 50,
            "reorder_level": 10, "category_id": TestProducts.cat_id,
            "supplier_id": TestSuppliers.sup_id, "barcode": "B1",
        }
        r = requests.post(f"{API}/products", json=payload, headers=H(admin_token), timeout=30)
        assert r.status_code == 200, r.text
        TestProducts.prod_id = r.json()["id"]
        assert r.json()["sku"] == TestProducts.sku

    def test_duplicate_sku(self, admin_token):
        r = requests.post(f"{API}/products",
                          json={"sku": TestProducts.sku, "name": "x",
                                "cost_price": 1, "selling_price": 2, "quantity": 1},
                          headers=H(admin_token), timeout=30)
        assert r.status_code == 400

    def test_staff_denied(self, staff_token):
        r = requests.post(f"{API}/products",
                          json={"sku": "NOSKU", "name": "x",
                                "cost_price": 1, "selling_price": 2, "quantity": 1},
                          headers=H(staff_token), timeout=30)
        assert r.status_code == 403

    def test_list_with_search_and_filter(self, admin_token):
        r = requests.get(f"{API}/products?search=TEST_Prod&page=1&limit=10",
                         headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        body = r.json()
        assert "items" in body and "total" in body
        # filter by category
        r2 = requests.get(f"{API}/products?category_id={TestProducts.cat_id}",
                          headers=H(admin_token), timeout=30)
        assert r2.status_code == 200
        # stock_status filter
        r3 = requests.get(f"{API}/products?stock_status=in_stock",
                          headers=H(admin_token), timeout=30)
        assert r3.status_code == 200

    def test_update_product(self, admin_token):
        r = requests.put(f"{API}/products/{TestProducts.prod_id}",
                         json={"name": "TEST_Prod_Updated"},
                         headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Prod_Updated"

    def test_export_excel(self, admin_token):
        r = requests.get(f"{API}/products/export/excel", headers=H(admin_token), timeout=60)
        assert r.status_code == 200
        assert len(r.content) > 100

    def test_export_pdf(self, admin_token):
        r = requests.get(f"{API}/products/export/pdf", headers=H(admin_token), timeout=60)
        assert r.status_code == 200
        assert r.content.startswith(b"%PDF")

    def test_import_xlsx(self, admin_token):
        import uuid
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["sku", "name", "description", "cost_price", "selling_price",
                   "quantity", "reorder_level", "barcode"])
        sku1 = f"TEST-IMP-{uuid.uuid4().hex[:6].upper()}"
        ws.append([sku1, "TEST_Imp1", "d", 5, 10, 100, 5, "bc1"])
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        files = {"file": ("imp.xlsx", buf,
                          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        r = requests.post(f"{API}/products/import", files=files,
                          headers=H(admin_token), timeout=60)
        assert r.status_code == 200, r.text
        assert r.json().get("created", 0) >= 1


# ---------------- INVENTORY ----------------
class TestInventory:
    def test_stock_in_staff_allowed(self, staff_token):
        r = requests.post(f"{API}/inventory/stock-in",
                          json={"product_id": TestProducts.prod_id, "quantity": 10,
                                "notes": "TEST_in"},
                          headers=H(staff_token), timeout=30)
        assert r.status_code == 200, r.text
        log = r.json()
        assert log["action"] == "stock_in"
        assert log["quantity_change"] == 10

    def test_stock_out(self, staff_token):
        r = requests.post(f"{API}/inventory/stock-out",
                          json={"product_id": TestProducts.prod_id, "quantity": 5,
                                "notes": "TEST_out"},
                          headers=H(staff_token), timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["action"] == "stock_out"

    def test_stock_out_insufficient(self, staff_token):
        r = requests.post(f"{API}/inventory/stock-out",
                          json={"product_id": TestProducts.prod_id, "quantity": 99999},
                          headers=H(staff_token), timeout=30)
        assert r.status_code == 400

    def test_inventory_history(self, admin_token):
        r = requests.get(f"{API}/inventory/history?limit=50",
                         headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 2


# ---------------- REPORTS ----------------
class TestReports:
    def test_dashboard(self, admin_token):
        r = requests.get(f"{API}/reports/dashboard", headers=H(admin_token), timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        for k in ["kpi", "stock_trend", "category_distribution",
                  "monthly_growth", "supplier_contribution"]:
            assert k in body
        kpi = body["kpi"]
        for k in ["total_products", "total_categories", "total_suppliers",
                  "low_stock", "out_of_stock", "inventory_value", "todays_transactions"]:
            assert k in kpi
        assert len(body["stock_trend"]) == 14

    def test_low_stock(self, admin_token):
        r = requests.get(f"{API}/reports/low-stock", headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        body = r.json()
        assert "low_stock" in body and "out_of_stock" in body

    def test_send_low_stock_alert(self, admin_token):
        r = requests.post(f"{API}/reports/low-stock/send-alert",
                          headers=H(admin_token), timeout=60)
        assert r.status_code == 200, r.text
        assert "sent" in r.json()

    def test_send_alert_staff_denied(self, staff_token):
        r = requests.post(f"{API}/reports/low-stock/send-alert",
                          headers=H(staff_token), timeout=30)
        assert r.status_code == 403

    def test_monthly(self, admin_token):
        r = requests.get(f"{API}/reports/monthly", headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        for k in ["month", "total_transactions", "stock_in_units",
                  "stock_out_units", "items"]:
            assert k in r.json()

    def test_transactions(self, admin_token):
        r = requests.get(f"{API}/reports/transactions?range=weekly",
                         headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        assert "items" in r.json() and "count" in r.json()

    @pytest.mark.parametrize("report", ["low_stock", "transactions", "audit", "products"])
    def test_export_excel(self, admin_token, report):
        r = requests.get(f"{API}/reports/export/excel?report={report}",
                         headers=H(admin_token), timeout=60)
        assert r.status_code == 200, f"{report}: {r.text[:200]}"
        assert len(r.content) > 100


# ---------------- AUDIT + RBAC ----------------
class TestAudit:
    def test_audit_admin(self, admin_token):
        r = requests.get(f"{API}/audit-logs", headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        # should contain login, create, etc.
        actions = {i.get("action") for i in items}
        assert "login" in actions or len(items) > 0

    def test_audit_staff_denied(self, staff_token):
        r = requests.get(f"{API}/audit-logs", headers=H(staff_token), timeout=30)
        assert r.status_code == 403


# ---------------- BULK + Cleanup ----------------
class TestCleanup:
    def test_bulk_delete_and_supplier_delete(self, admin_token):
        # bulk delete the test product
        r = requests.post(f"{API}/products/bulk-delete",
                          json={"ids": [TestProducts.prod_id]},
                          headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        assert r.json()["deleted"] >= 1
        # delete supplier
        if TestSuppliers.sup_id:
            r2 = requests.delete(f"{API}/suppliers/{TestSuppliers.sup_id}",
                                 headers=H(admin_token), timeout=30)
            assert r2.status_code == 200
        # delete category
        if TestProducts.cat_id:
            requests.delete(f"{API}/categories/{TestProducts.cat_id}",
                            headers=H(admin_token), timeout=30)

    def test_staff_bulk_delete_denied(self, staff_token):
        r = requests.post(f"{API}/products/bulk-delete", json={"ids": ["x"]},
                          headers=H(staff_token), timeout=30)
        assert r.status_code == 403
