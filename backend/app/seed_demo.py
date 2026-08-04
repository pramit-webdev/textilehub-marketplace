#!/usr/bin/env python3
"""Seed rich, realistic order history for the demo accounts (idempotent).

Creates ~13 orders for the demo buyer (buyer@textilehub.in) across all three
demo suppliers, spread over the last 30 days with realistic statuses, items,
quantities and shipping details — so buyer/supplier dashboards, status
tracking and the "last 7 days" revenue chart are alive for anyone demoing.

Idempotent: previous runs are detected via the notes marker '[demo-history]',
removed with their stock restored, then re-created. Requires DATABASE_URL
(env or e2e/.env). Run AFTER app/seed.py on a fresh database.
"""
import os
import sys
from datetime import datetime, timedelta

from sqlalchemy import create_engine, text

env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "e2e", ".env")
if os.path.exists(env_file):
    for line in open(env_file):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k, v)

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    sys.exit("DATABASE_URL not set (put it in e2e/.env or export it)")

MARKER = "[demo-history]"

# (days_ago, status, supplier_email, [(product_id, qty), ...])
ORDERS = [
    (28, "completed", "weaver@textilehub.in", [(1, 200)]),
    (26, "completed", "mills@textilehub.in", [(2, 150)]),
    (24, "completed", "woolworks@textilehub.in", [(6, 100)]),
    (21, "completed", "weaver@textilehub.in", [(4, 80), (1, 100)]),
    (18, "completed", "mills@textilehub.in", [(5, 200)]),
    (15, "completed", "woolworks@textilehub.in", [(3, 40)]),
    (10, "cancelled", "weaver@textilehub.in", [(19, 50)]),
    (9, "completed", "weaver@textilehub.in", [(7, 30)]),
    (6, "ready_for_dispatch", "mills@textilehub.in", [(2, 100), (5, 80)]),
    (5, "preparing", "woolworks@textilehub.in", [(9, 120)]),
    (4, "accepted", "weaver@textilehub.in", [(16, 300)]),
    (2, "pending", "mills@textilehub.in", [(17, 60)]),
    (1, "pending", "woolworks@textilehub.in", [(21, 20)]),
]

SHIPPING = {
    "name": "Meera Nair",
    "phone": "+91 98765 43210",
    "address": "42 Linking Road, Bandra West",
    "city": "Mumbai",
    "country": "India",
}

engine = create_engine(DATABASE_URL)

with engine.begin() as conn:
    buyer = conn.execute(
        text("SELECT id FROM users WHERE email = 'buyer@textilehub.in'")
    ).fetchone()
    if not buyer:
        sys.exit("Demo buyer not found — run app/seed.py first (or seed the DB).")
    buyer_id = buyer[0]
    suppliers = {
        email: uid
        for email, uid in conn.execute(
            text("SELECT email, id FROM users WHERE role = 'supplier'")
        ).all()
    }

    # --- teardown previous demo history ---
    old = conn.execute(
        text("SELECT id FROM orders WHERE buyer_id = :b AND notes LIKE :m"),
        {"b": buyer_id, "m": f"%{MARKER}%"},
    ).all()
    for (oid,) in old:
        for pid, qty in conn.execute(
            text("SELECT product_id, quantity FROM order_items WHERE order_id = :o"),
            {"o": oid},
        ).all():
            conn.execute(
                text("UPDATE products SET stock = stock + :q WHERE id = :p"),
                {"q": qty, "p": pid},
            )
        conn.execute(text("DELETE FROM order_items WHERE order_id = :o"), {"o": oid})
        conn.execute(text("DELETE FROM orders WHERE id = :o"), {"o": oid})
    print(f"removed {len(old)} previous demo order(s)")

    # --- create history ---
    created = 0
    for days_ago, status, supplier_email, items in ORDERS:
        supplier_id = suppliers.get(supplier_email)
        if not supplier_id:
            print(f"SKIP unknown supplier {supplier_email}")
            continue
        total = 0
        for pid, qty in items:
            price = conn.execute(
                text("SELECT price FROM products WHERE id = :p"), {"p": pid}
            ).fetchone()
            if not price:
                raise SystemExit(f"product {pid} not found")
            total += float(price[0]) * qty
        created_at = datetime.utcnow() - timedelta(days=days_ago, hours=2)
        oid = conn.execute(
            text(
                """INSERT INTO orders
                   (buyer_id, supplier_id, status, total,
                    shipping_name, shipping_phone, shipping_address,
                    shipping_city, shipping_country, notes, created_at)
                   VALUES (:b, :s, :st, :t, :n, :ph, :a, :c, :co, :no, :ca)
                   RETURNING id"""
            ),
            {
                "b": buyer_id, "s": supplier_id, "st": status, "t": round(total, 2),
                "n": SHIPPING["name"], "ph": SHIPPING["phone"], "a": SHIPPING["address"],
                "c": SHIPPING["city"], "co": SHIPPING["country"],
                "no": MARKER, "ca": created_at,
            },
        ).scalar()
        for pid, qty in items:
            price = conn.execute(
                text("SELECT price FROM products WHERE id = :p"), {"p": pid}
            ).scalar()
            name = conn.execute(
                text("SELECT name FROM products WHERE id = :p"), {"p": pid}
            ).scalar()
            img = conn.execute(
                text(
                    "SELECT url FROM product_images "
                    "WHERE product_id = :p AND is_primary = TRUE LIMIT 1"
                ),
                {"p": pid},
            ).scalar()
            conn.execute(
                text(
                    """INSERT INTO order_items
                       (order_id, product_id, product_name, quantity, unit_price, image_url)
                       VALUES (:o, :p, :n, :q, :u, :i)"""
                ),
                {"o": oid, "p": pid, "n": name, "q": qty, "u": price, "i": img},
            )
            conn.execute(
                text("UPDATE products SET stock = stock - :q WHERE id = :p"),
                {"q": qty, "p": pid},
            )
        created += 1

    total_orders = conn.execute(text("SELECT count(*) FROM orders")).scalar()
    print(f"created {created} demo order(s) -> total orders in DB: {total_orders}")
    print("Done. Log in as buyer@textilehub.in to see full order history.")
