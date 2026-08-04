#!/usr/bin/env python3
"""TextileHub API E2E suite — covers every hackathon-PDF feature against the live API.

Stdlib only. Run:  python3 e2e/api_tests.py   (set E2E_API_URL to override base)
Creates throwaway accounts/orders; run e2e/cleanup_db.py afterwards to restore prod data.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request

BASE = os.environ.get("E2E_API_URL", "https://textilehub-api.vercel.app")
TS = int(time.time())
BUYER_EMAIL = f"e2e-buyer-{TS}@gmail.com"
SUPPLIER_EMAIL = f"e2e-supplier-{TS}@gmail.com"
PASSWORD = "E2Epass123!"
SHIP = {
    "shipping_name": "E2E Buyer",
    "shipping_phone": "+910000000000",
    "shipping_address": "14 Test Road",
    "shipping_city": "Mumbai",
    "shipping_country": "India",
    "notes": "automated e2e",
}

results = []  # (name, ok, detail)


def req(method, path, token=None, body=None, raw=False, timeout=150):
    url = f"{BASE}{path}"
    headers = {}
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            payload = resp.read()
            return resp.status, (payload.decode() if raw else json.loads(payload or "null"))
    except urllib.error.HTTPError as exc:
        payload = exc.read().decode()
        try:
            return exc.code, json.loads(payload or "null")
        except json.JSONDecodeError:
            return exc.code, payload
    except Exception as exc:  # network flake -> fail loudly
        return -1, f"{type(exc).__name__}: {exc}"


def multipart_req(path, token, filename="pixel.png", content=b"\x89PNG\r\n\x1a\n"):
    boundary = "----e2e" + str(TS)
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        "Content-Type: image/png\r\n\r\n"
    ).encode() + content + f"\r\n--{boundary}--\r\n".encode()
    r = urllib.request.Request(
        f"{BASE}{path}",
        data=body,
        headers={"Authorization": f"Bearer {token}", "Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(r, timeout=150) as resp:
            return resp.status, json.loads(resp.read().decode() or "null")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode()[:200]
    except Exception as exc:
        return -1, f"{type(exc).__name__}: {exc}"


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"  | {detail}" if detail else ""))


def test(name):
    def deco(fn):
        try:
            fn()
        except Exception as exc:
            check(name, False, f"exception: {type(exc).__name__}: {exc}")
    return deco


def login(email, password=PASSWORD):
    code, data = req("POST", "/api/auth/login", body={"email": email, "password": password})
    if code != 200:
        raise RuntimeError(f"login {email} -> {code} {data}")
    return data["access_token"]


def main():
    print(f"=== TextileHub API E2E — {BASE} (ts={TS}) ===")

    # ---------- A. Buyer auth + onboarding ----------
    print("\n[A] Auth & onboarding")
    code, d = req("POST", "/api/auth/register",
                  body={"email": BUYER_EMAIL, "password": PASSWORD, "full_name": "E2E Buyer Tester", "role": "buyer"})
    check("register buyer -> 201", code == 201, f"{code}")
    bt = d["access_token"]
    code, _ = req("POST", "/api/auth/register",
                  body={"email": BUYER_EMAIL, "password": PASSWORD, "full_name": "Dup", "role": "buyer"})
    check("duplicate email -> 409", code == 409, f"{code}")
    code, _ = req("POST", "/api/auth/login", body={"email": BUYER_EMAIL, "password": "wrongpass1"})
    check("wrong password -> 401", code == 401, f"{code}")
    code, d = req("GET", "/api/auth/me", token=bt)
    check("me -> 200, not onboarded", code == 200 and d["is_onboarded"] is False, f"{code} onboarded={d.get('is_onboarded')}")
    code, d = req("GET", "/api/auth/me")
    check("me without token -> 401", code == 401, f"{code}")
    code, d = req("POST", "/api/ai/onboarding",
                  body={"role": "buyer", "messages": [{"role": "user", "content": "I am a garment manufacturer in fashion, interested in cotton and silk, orders 500-1000 meters, budget under 800"}]},
                  token=bt)
    check("AI onboarding -> 200 structured", code == 200 and isinstance(d.get("structured"), dict), f"{code}")
    code, _ = req("POST", "/api/buyer/me/profile", token=bt, body={
        "business_type": "garment manufacturer", "industry": "fashion",
        "interested_categories": ["Cotton", "Silk"], "preferred_fabrics": ["cotton", "silk"],
        "typical_order_qty": "500-1000 meters", "budget_range": "under 800"})
    check("buyer profile save -> 200", code == 200, f"{code}")
    code, d = req("GET", "/api/auth/me", token=bt)
    check("is_onboarded flips true", code == 200 and d["is_onboarded"] is True, f"{code} onboarded={d.get('is_onboarded')}")
    code, _ = req("POST", "/api/buyer/me/profile", token=bt, body={"evil_key": "x"})
    check("profile unknown key -> 422", code == 422, f"{code}")

    # ---------- B. Discovery ----------
    print("\n[B] Catalog discovery")
    code, d = req("GET", "/api/categories")
    check("categories -> 200 (8)", code == 200 and len(d) == 8, f"{code} n={len(d) if isinstance(d, list) else '?'}")
    code, d = req("GET", "/api/products?page=1&page_size=24")
    check("products -> 200 total 25", code == 200 and d["total"] >= 25, f"{code} total={d.get('total')}")
    code, d = req("GET", "/api/products?featured=true&page_size=8")
    check("featured filter", code == 200 and all(p["is_featured"] for p in d["items"]), f"{code} n={len(d['items'])}")
    code, d = req("GET", "/api/products?search=silk")
    check("search=silk", code == 200 and len(d["items"]) > 0, f"{code} n={len(d['items'])}")
    code, d = req("GET", "/api/products?category=1")
    check("category filter", code == 200 and all(p["category"]["id"] == 1 for p in d["items"]), f"{code}")
    code, d = req("GET", "/api/products?min_price=200&max_price=300")
    check("price range", code == 200 and all(200 <= float(p["price"]) <= 300 for p in d["items"]), f"{code}")
    code, _ = req("GET", "/api/products?min_price=500&max_price=100")
    check("min>max -> 422", code == 422, f"{code}")
    code, d = req("GET", "/api/products/1")
    check("product detail", code == 200 and all(k in d for k in ("images", "colors", "stock", "moq", "specifications")), f"{code}")
    code, _ = req("GET", "/api/products/999999")
    check("missing product -> 404", code == 404, f"{code}")
    code, _ = req("GET", "/api/products/fabric-types")
    check("fabric-types -> 200", code == 200, f"{code}")

    # ---------- C. Cart ----------
    print("\n[C] Cart")
    code, d = req("GET", "/api/products/1")
    stock_before = d["stock"]
    code, _ = req("POST", "/api/cart/items", token=bt, body={"product_id": 1, "quantity": 2})
    code2, _ = req("POST", "/api/cart/items", token=bt, body={"product_id": 2, "quantity": 2})
    check("add 2 items", code == 201 and code2 == 201, f"{code}/{code2}")
    code, d = req("GET", "/api/cart", token=bt)
    check("subtotal 2x245+2x320=1130", code == 200 and float(d["subtotal"]) == 1130.0, f"{code} subtotal={d.get('subtotal')}")
    code, _ = req("PATCH", "/api/cart/items/1", token=bt, body={"product_id": 1, "quantity": 4})
    code, d = req("GET", "/api/cart", token=bt)
    check("PATCH qty -> subtotal 1620", code == 200 and float(d["subtotal"]) == 1620.0, f"{code} subtotal={d.get('subtotal')}")
    code, d = req("GET", "/api/products/3")
    stock3 = d["stock"]
    code, _ = req("POST", "/api/cart/items", token=bt, body={"product_id": 3, "quantity": stock3 + 1})
    check("over-stock add -> 400", code == 400, f"{code} stock={stock3}")
    code, _ = req("POST", "/api/cart/items", token=bt, body={"product_id": 1, "quantity": 1, "hacker": True})
    check("extra field -> 422", code == 422, f"{code}")

    # ---------- D. Checkout + orders ----------
    print("\n[D] Checkout & orders")
    code, orders = req("POST", "/api/checkout", token=bt, body=SHIP)
    ok = code == 201 and len(orders) == 2 and sum(float(o["total"]) for o in orders) == 1620.0
    check("checkout -> 2 orders, total 1620", ok, f"{code} orders={[(o['id'], str(o['total'])) for o in orders] if isinstance(orders, list) else orders}")
    order_ids = [o["id"] for o in orders] if isinstance(orders, list) else []
    code, d = req("GET", "/api/products/1")
    check("stock decremented p1 by 4", code == 200 and d["stock"] == stock_before - 4, f"{code} {stock_before}->{d.get('stock')}")
    code, _ = req("POST", "/api/checkout", token=bt, body=SHIP)
    check("empty-cart checkout -> 400", code == 400, f"{code}")
    code, d = req("GET", "/api/buyer/orders", token=bt)
    check("buyer orders contain ids", code == 200 and all(o in [x["id"] for x in d] for o in order_ids), f"{code}")
    for oid in order_ids:
        code, _ = req("GET", f"/api/orders/{oid}", token=bt)
        check(f"order {oid} detail -> 200", code == 200, f"{code}")

    # ---------- E. AI ----------
    print("\n[E] AI assistant")
    code, d = req("POST", "/api/ai/chat", token=bt,
                  body={"messages": [{"role": "user", "content": "find lightweight summer cotton under 300"}]})
    check("chat -> source ai", code == 200 and d.get("source") == "ai" and d.get("reply"), f"{code} source={d.get('source')}")
    code, d = req("POST", "/api/ai/nl-search", token=bt,
                  body={"messages": [{"role": "user", "content": "silk sarees"}]})
    check("nl-search -> ids", code == 200 and isinstance(d, list) and len(d) > 0, f"{code}")
    code, _ = req("POST", "/api/ai/similar/1", token=bt)
    check("similar -> 200", code == 200, f"{code}")
    code, _ = req("POST", "/api/ai/product-qa", token=bt, body={"product_id": 1, "question": "What is the MOQ?"})
    check("product-qa -> 200", code == 200, f"{code}")
    code, _ = req("POST", "/api/ai/compare", token=bt, body={"product_ids": [1, 2, 3]})
    check("compare -> 200", code == 200, f"{code}")
    code, d = req("POST", "/api/ai/recommendations", token=bt, body={"limit": 6})
    check("recommendations -> ids", code == 200 and len(d) == 6, f"{code}")
    code, _ = req("POST", "/api/ai/chat", body={"messages": [{"role": "user", "content": "hi"}]})
    check("chat without token -> 401", code == 401, f"{code}")

    # ---------- F. Supplier journey ----------
    print("\n[F] Supplier journey")
    code, d = req("POST", "/api/auth/register",
                  body={"email": SUPPLIER_EMAIL, "password": PASSWORD, "full_name": "E2E Supplier", "role": "supplier"})
    check("register supplier -> 201", code == 201, f"{code}")
    st = d["access_token"]
    code, _ = req("POST", "/api/supplier/me/profile", token=st, body={
        "business_name": "E2E Fulfilment Mills", "business_type": "weaver",
        "contact_phone": "+910000000001", "business_address": "14 Mill Road, Mumbai",
        "operating_hours": "Mon-Sat 9-6", "product_categories": ["Cotton"],
        "fabric_types": ["cotton"], "min_order_qty": "100"})
    check("supplier onboarding -> 200", code == 200, f"{code}")
    code, d = req("POST", "/api/supplier/products", token=st, body={
        "name": f"E2E-API-{TS}-A", "description": "automated test", "category_id": 1,
        "fabric_type": "Cotton", "price": 100, "moq": 10, "stock": 50})
    check("create product -> 201", code == 201, f"{code}")
    pid_a = d["id"]
    code, d = req("POST", "/api/supplier/products", token=st, body={
        "name": f"E2E-API-{TS}-B", "description": "inactive test", "category_id": 1,
        "fabric_type": "Cotton", "price": 50, "moq": 5, "stock": 20, "is_active": False})
    check("create inactive product -> 201", code == 201, f"{code}")
    pid_b = d["id"]
    code, _ = req("GET", f"/api/products/{pid_b}")
    check("inactive product hidden -> 404", code == 404, f"{code}")
    code, _ = req("PATCH", f"/api/supplier/products/{pid_a}", token=st, body={"price": 120})
    check("PATCH price -> 200", code == 200, f"{code}")
    code, _ = req("PATCH", f"/api/supplier/products/{pid_a}", token=st, body={"name": ""})
    check("empty name -> 422", code == 422, f"{code}")
    code, d = req("GET", "/api/supplier/dashboard", token=st)
    check("dashboard totals", code == 200 and d["total_products"] == 2 and d["active_products"] == 1, f"{code} {d.get('total_products')}/{d.get('active_products')}")
    code, _ = req("GET", "/api/supplier/orders/stats/last7days", token=st)
    check("stats last7days -> 200", code == 200, f"{code}")
    code, _ = multipart_req(f"/api/supplier/products/{pid_a}/images", st)
    check("upload unavailable -> 503", code == 503, f"{code}")
    code, _ = req("POST", "/api/cart/items", token=bt, body={"product_id": pid_a, "quantity": 2})
    code, orders = req("POST", "/api/checkout", token=bt, body=SHIP)
    cross_oid = orders[0]["id"] if isinstance(orders, list) and orders else None
    check("cross-role order created", code == 201 and cross_oid, f"{code}")
    code, d = req("GET", "/api/supplier/orders", token=st)
    check("supplier sees order", code == 200 and any(o["id"] == cross_oid for o in d), f"{code}")
    for status in ("accepted", "preparing", "ready_for_dispatch", "completed"):
        code, _ = req("PATCH", f"/api/supplier/orders/{cross_oid}/status", token=st, body={"status": status})
        check(f"status -> {status}", code == 200, f"{code}")
    code, _ = req("PATCH", f"/api/supplier/orders/{cross_oid}/status", token=st, body={"status": "accepted"})
    check("completed -> accepted rejected", code == 400, f"{code}")
    code, _ = req("PATCH", f"/api/supplier/orders/{cross_oid}/status", token=bt, body={"status": "completed"})
    check("buyer on status PATCH -> 403", code == 403, f"{code}")
    code, d = req("DELETE", f"/api/supplier/products/{pid_a}", token=st)
    check("delete ordered product -> archived", code == 200 and d.get("is_active") is False, f"{code}")
    code, _ = req("DELETE", f"/api/supplier/products/{pid_b}", token=st)
    check("delete unordered product -> 204", code == 204, f"{code}")
    code, _ = req("DELETE", f"/api/supplier/products/{pid_b}", token=st)
    check("re-delete -> 404", code == 404, f"{code}")

    # ---------- G. RBAC + misc ----------
    print("\n[G] RBAC & misc")
    code, _ = req("GET", "/api/supplier/dashboard", token=bt)
    check("buyer on supplier route -> 403", code == 403, f"{code}")
    code, _ = req("GET", "/api/cart", token=st)
    check("supplier on buyer route -> 403", code == 403, f"{code}")
    code, _ = req("POST", "/api/auth/register",
                  body={"email": f"hacker-{TS}@gmail.com", "password": PASSWORD, "full_name": "H", "role": "admin"})
    check("register role admin -> 422", code == 422, f"{code}")
    code, _ = req("POST", "/api/auth/login", body={"email": "buyer@textilehub.in", "password": "demo1234", "x": 1})
    check("login extra field -> 422", code == 422, f"{code}")
    code, _ = req("GET", "/api/debug/hf")
    check("debug routes removed -> 404", code == 404, f"{code}")
    code, _ = req("GET", "/api/health")
    check("health -> 200", code == 200, f"{code}")

    # ---------- Report ----------
    failed = [r for r in results if not r[1]]
    print(f"\n=== {len(results) - len(failed)}/{len(results)} PASS ===")
    if failed:
        print("FAILED:")
        for name, _, detail in failed:
            print(f"  - {name} | {detail}")
        return 1
    print("All checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
