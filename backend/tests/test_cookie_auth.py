"""Cookie-based auth tests for migration from Bearer to httpOnly cookies."""
import os
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://stock-sync-152.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN = {"email": "admin@inventory.com", "password": "Admin@123"}
STAFF = {"email": "staff@inventory.com", "password": "Staff@123"}


# Cookie-based login should set access_token and refresh_token cookies
class TestCookieAuth:
    def test_login_sets_httponly_cookies(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json=ADMIN, timeout=30)
        assert r.status_code == 200
        # check Set-Cookie headers
        set_cookies = r.headers.get("set-cookie", "")
        # Multiple cookies may be in raw header; use cookies jar instead
        names = [c.name for c in s.cookies]
        assert "access_token" in names, f"access_token cookie missing. got: {names}"
        assert "refresh_token" in names, f"refresh_token cookie missing. got: {names}"
        # ensure HttpOnly + Secure attributes present in raw Set-Cookie
        assert "httponly" in set_cookies.lower(), f"HttpOnly missing in: {set_cookies}"
        assert "secure" in set_cookies.lower(), f"Secure missing in: {set_cookies}"
        # Response body still returns tokens (back-compat)
        body = r.json()
        assert body.get("access_token")
        assert body.get("refresh_token")
        assert body["user"]["email"] == ADMIN["email"]

    def test_profile_via_cookie_only(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json=ADMIN, timeout=30)
        r = s.get(f"{API}/auth/profile", timeout=30)  # NO Authorization header
        assert r.status_code == 200, r.text
        assert r.json()["email"] == ADMIN["email"]

    def test_profile_via_bearer_only(self):
        # New session (no cookies)
        login = requests.post(f"{API}/auth/login", json=ADMIN, timeout=30)
        access = login.json()["access_token"]
        # Fresh session WITHOUT cookies
        r = requests.get(
            f"{API}/auth/profile",
            headers={"Authorization": f"Bearer {access}"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        assert r.json()["email"] == ADMIN["email"]

    def test_refresh_via_cookie_empty_body(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json=ADMIN, timeout=30)
        # Send empty body; refresh should pick up cookie
        r = s.post(f"{API}/auth/refresh", json={}, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "access_token" in body and "refresh_token" in body
        # New cookies should be set
        names = [c.name for c in s.cookies]
        assert "access_token" in names

    def test_refresh_via_body_token(self):
        login = requests.post(f"{API}/auth/login", json=ADMIN, timeout=30)
        refresh = login.json()["refresh_token"]
        # Brand-new session without cookies
        r = requests.post(f"{API}/auth/refresh",
                          json={"refresh_token": refresh}, timeout=30)
        assert r.status_code == 200, r.text
        assert "access_token" in r.json()

    def test_refresh_no_token_returns_401(self):
        r = requests.post(f"{API}/auth/refresh", json={}, timeout=30)
        assert r.status_code == 401

    def test_logout_clears_cookies(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json=ADMIN, timeout=30)
        assert "access_token" in [c.name for c in s.cookies]
        r = s.post(f"{API}/auth/logout", timeout=30)
        assert r.status_code == 200, r.text
        # Raw Set-Cookie should mark the cookies as expired (Max-Age=0 or expired date)
        raw = r.headers.get("set-cookie", "")
        assert "access_token" in raw and "refresh_token" in raw
        # After logout, cookie jar should not retain working tokens; subsequent profile should fail
        r2 = s.get(f"{API}/auth/profile", timeout=30)
        assert r2.status_code == 401, f"expected 401 after logout, got {r2.status_code}"

    def test_protected_route_via_cookie(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json=ADMIN, timeout=30)
        # Categories list - cookie only
        r = s.get(f"{API}/categories", timeout=30)
        assert r.status_code == 200
        # Dashboard - cookie only
        r2 = s.get(f"{API}/reports/dashboard", timeout=30)
        assert r2.status_code == 200

    def test_rbac_staff_via_cookie_blocked(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json=STAFF, timeout=30)
        r = s.post(f"{API}/categories",
                   json={"name": "TEST_StaffBlocked", "description": ""},
                   timeout=30)
        assert r.status_code == 403
        r2 = s.get(f"{API}/audit-logs", timeout=30)
        assert r2.status_code == 403


# Dashboard refactor shape validation
class TestDashboardShape:
    def test_dashboard_has_expected_shape(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json=ADMIN, timeout=30)
        r = s.get(f"{API}/reports/dashboard", timeout=30)
        assert r.status_code == 200
        body = r.json()
        # top-level keys
        for k in ["kpi", "stock_trend", "category_distribution",
                  "monthly_growth", "supplier_contribution"]:
            assert k in body, f"missing {k}"
        # KPI keys
        kpi = body["kpi"]
        for k in ["total_products", "total_categories", "total_suppliers",
                  "low_stock", "out_of_stock", "inventory_value",
                  "todays_transactions"]:
            assert k in kpi, f"kpi missing {k}"
        assert len(body["stock_trend"]) == 14
        assert len(body["monthly_growth"]) == 6


# Seed data verification
class TestSeedData:
    def test_seed_counts(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json=ADMIN, timeout=30)
        # Categories should be at least 6
        cats = s.get(f"{API}/categories", timeout=30).json()
        assert len(cats) >= 6, f"expected >=6 categories, got {len(cats)}"
        # Suppliers >= 8
        sups = s.get(f"{API}/suppliers", timeout=30).json()
        assert len(sups) >= 8, f"expected >=8 suppliers, got {len(sups)}"
        # Products: query all
        prods = s.get(f"{API}/products?limit=200", timeout=30).json()
        assert prods["total"] >= 32, f"expected >=32 products, got {prods['total']}"
        # inventory history
        logs = s.get(f"{API}/inventory/history?limit=500", timeout=30).json()
        assert len(logs) >= 60, f"expected >=60 inventory logs, got {len(logs)}"
        # low/out
        low = s.get(f"{API}/reports/low-stock", timeout=30).json()
        assert len(low["low_stock"]) >= 1
        assert len(low["out_of_stock"]) >= 1
