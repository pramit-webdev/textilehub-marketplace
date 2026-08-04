import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Spinner, EmptyState } from "../components/Spinner";
import { OrderStatusBadge } from "../components/OrderStatus";
import { formatINR } from "../lib/format";

function StatCard({ label, value, icon, tone = "brand" }) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    stone: "bg-stone-100 text-stone-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${tones[tone]}`}>{icon}</span>
      </div>
      <div className="mt-3 text-3xl font-bold text-stone-900">{value}</div>
      <div className="text-xs font-medium text-stone-500">{label}</div>
    </div>
  );
}

export default function SupplierDashboard() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [chart, setChart] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/supplier/dashboard", token).then(setStats).catch(() => setError("Could not load your dashboard. Try refreshing."));
    api.get("/api/supplier/orders/stats/last7days", token).then(setChart).catch(() => {});
  }, [token]);

  if (error && !stats) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <EmptyState icon="⚠️" title="Something went wrong" subtitle={error} />
      </div>
    );
  }
  if (!stats) return <Spinner />;

  const maxRevenue = Math.max(1, ...Object.values(chart || {}).map((d) => d.revenue));
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-stone-900 sm:text-3xl">Supplier dashboard</h1>
          <p className="mt-1 text-sm text-stone-500">
            {user?.supplier_profile?.business_name || user?.full_name} · overview of your marketplace activity
          </p>
        </div>
        <Link to="/supplier/products?new=1" className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
          + Add product
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total products" value={stats.total_products} icon="🧺" />
        <StatCard label="Active" value={stats.active_products} icon="🟢" tone="emerald" />
        <StatCard label="Out of stock" value={stats.out_of_stock} icon="⛔" tone="red" />
        <StatCard label="Low stock (≤10)" value={stats.low_stock} icon="⚠️" tone="amber" />
        <StatCard label="Pending orders" value={stats.pending_orders} icon="⏳" tone="violet" />
        <StatCard label="Total orders" value={stats.total_orders} icon="📦" tone="stone" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* 7 day chart */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="font-semibold text-stone-900">Last 7 days</h2>
          <p className="text-xs text-stone-400">Order value (₹)</p>
          <div className="mt-6 flex h-44 items-end gap-3">
            {chart &&
              Object.values(chart).map((d, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold text-stone-400">{d.orders > 0 ? d.orders : ""}</span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-brand-700 to-brand-400 transition-all"
                    style={{ height: `${Math.max(4, (d.revenue / maxRevenue) * 140)}px` }}
                    title={`₹${d.revenue.toLocaleString("en-IN")}`}
                  />
                  <span className="text-[10px] text-stone-400">{days[i]}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Recent orders */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-stone-900">Recent orders</h2>
            <Link to="/supplier/orders" className="text-xs font-semibold text-brand-700 hover:text-brand-800">View all →</Link>
          </div>
          {stats.recent_orders.length === 0 ? (
            <div className="mt-4">
              <EmptyState icon="📭" title="No orders yet" subtitle="Orders from buyers will appear here." />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {stats.recent_orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-stone-900">#{o.id} · {o.buyer_name}</div>
                    <div className="text-xs text-stone-400">{o.items.map((i) => i.product_name).slice(0, 2).join(", ")}{o.items.length > 2 ? "…" : ""}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{formatINR(o.total)}</div>
                    <OrderStatusBadge status={o.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {stats.low_stock > 0 && (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="font-semibold text-amber-800">⚠️ Inventory alerts</div>
          <p className="mt-1 text-sm text-amber-700">
            {stats.out_of_stock > 0 && `${stats.out_of_stock} product(s) are out of stock. `}
            {stats.low_stock > 0 && `${stats.low_stock} product(s) have 10 units or fewer remaining. `}
            Restock soon to keep your listings visible to buyers.
          </p>
          <Link to="/supplier/products" className="mt-3 inline-block rounded-full bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700">
            Manage inventory →
          </Link>
        </div>
      )}
    </div>
  );
}
