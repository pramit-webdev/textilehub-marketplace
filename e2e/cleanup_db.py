#!/usr/bin/env python3
"""Restore the prod DB to its seeded baseline after E2E runs.

Pattern-based: removes every user whose email starts with e2e-buyer- / e2e-supplier-,
their orders (restoring product stock additively), carts, products and profiles.
Safe to re-run. Requires DATABASE_URL (sqlalchemy URL) in env or e2e/.env.
"""
import os
import sys

from sqlalchemy import create_engine, text

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

# load e2e/.env if present
env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(env_file):
    for line in open(env_file):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k, v)

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    sys.exit("DATABASE_URL not set (put it in e2e/.env or export it)")

engine = create_engine(DATABASE_URL)

with engine.begin() as conn:
    buyers = [r[0] for r in conn.execute(text(
        "SELECT id FROM users WHERE email LIKE 'e2e-buyer-%'"))]
    suppliers = [r[0] for r in conn.execute(text(
        "SELECT id FROM users WHERE email LIKE 'e2e-supplier-%'"))]
    all_users = buyers + suppliers

    if not all_users:
        print("No E2E test users found — nothing to clean.")
        sys.exit(0)

    # restore stock from order_items of test orders (additive)
    rows = conn.execute(text(
        "SELECT oi.product_id, SUM(oi.quantity) FROM order_items oi "
        "JOIN orders o ON o.id = oi.order_id WHERE o.buyer_id IN :bids GROUP BY oi.product_id"),
        {"bids": tuple(buyers) if buyers else (-1,)}).fetchall()
    for pid, qty in rows:
        conn.execute(text("UPDATE products SET stock = stock + :qty WHERE id = :pid"),
                     {"qty": qty, "pid": pid})
        print(f"restored stock: product {pid} +{qty}")

    n_oi = conn.execute(text(
        "DELETE FROM order_items WHERE order_id IN "
        "(SELECT id FROM orders WHERE buyer_id IN :bids)"),
        {"bids": tuple(buyers) if buyers else (-1,)}).rowcount
    n_o = conn.execute(text("DELETE FROM orders WHERE buyer_id IN :bids"),
                       {"bids": tuple(buyers) if buyers else (-1,)}).rowcount
    n_c = conn.execute(text("DELETE FROM cart_items WHERE buyer_id IN :bids"),
                       {"bids": tuple(buyers) if buyers else (-1,)}).rowcount

    # products owned by e2e suppliers (and any stray E2E-named products)
    pids = [r[0] for r in conn.execute(text(
        "SELECT id FROM products WHERE supplier_id IN :sids OR name LIKE 'E2E-%'"),
        {"sids": tuple(suppliers) if suppliers else (-1,)})]
    if pids:
        conn.execute(text("DELETE FROM product_images WHERE product_id IN :pids"),
                     {"pids": tuple(pids)})
        n_p = conn.execute(text("DELETE FROM products WHERE id IN :pids"),
                           {"pids": tuple(pids)}).rowcount
    else:
        n_p = 0

    n_bp = conn.execute(text("DELETE FROM buyer_profiles WHERE user_id IN :uids"),
                        {"uids": tuple(all_users)}).rowcount
    n_sp = conn.execute(text("DELETE FROM supplier_profiles WHERE user_id IN :uids"),
                        {"uids": tuple(all_users)}).rowcount
    n_u = conn.execute(text("DELETE FROM users WHERE id IN :uids"),
                       {"uids": tuple(all_users)}).rowcount

    # reset any seeded orders that tests may have advanced
    conn.execute(text("UPDATE orders SET status = 'accepted' WHERE id = 1"))
    conn.execute(text("UPDATE orders SET status = 'preparing' WHERE id = 2"))
    conn.execute(text("UPDATE orders SET status = 'ready_for_dispatch' WHERE id = 3"))

    orders = conn.execute(text("SELECT COUNT(*) FROM orders")).scalar()
    products = conn.execute(text("SELECT COUNT(*) FROM products")).scalar()
    users = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()

print(f"cleaned: {n_oi} order_items, {n_o} orders, {n_c} cart_items, "
      f"{n_p} products, {n_bp} buyer_profiles, {n_sp} supplier_profiles, {n_u} users")
print(f"baseline: {orders} orders, {products} products, {users} users")
