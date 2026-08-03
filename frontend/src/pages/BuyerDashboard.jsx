import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Spinner, EmptyState } from "../components/Spinner";
import { OrderStatusBadge, OrderStatusTracker } from "../components/OrderStatus";
import { formatDate, formatINR } from "../lib/format";
import ProductCard from "../components/ProductCard";

export default function BuyerDashboard() {
  const { user, token, refresh } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/buyer/me/profile", token),
      api.get("/api/buyer/orders", token),
      api.post("/api/ai/recommendations", { limit: 6 }, token).then((ids) =>
        api.get("/api/products?page_size=60").then(({ items }) =>
          items.filter((p) => ids.includes(p.id))
        )
      ).catch(() => []),
    ])
      .then(([p, o, rec]) => {
        setProfile(p);
        setOrders(o);
        setRecommended(rec);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const activeOrders = orders.filter((o) => !["completed", "cancelled"].includes(o.status));
  const pastOrders = orders.filter((o) => ["completed", "cancelled"].includes(o.status));

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-stone-900 sm:text-3xl">Buyer dashboard</h1>
          <p className="mt-1 text-sm text-stone-500">Welcome back, {user?.full_name} 👋</p>
        </div>
        <Link to="/products" className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
          + Browse new fabrics
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Profile */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-stone-900">My profile</h2>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700">Onboarded</span>
          </div>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between gap-2"><dt className="text-stone-500">Company</dt><dd className="font-medium text-right">{profile?.company_name || "—"}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-stone-500">Business type</dt><dd className="font-medium text-right">{profile?.business_type || "—"}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-stone-500">Industry</dt><dd className="font-medium text-right">{profile?.industry || "—"}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-stone-500">Preferred fabrics</dt><dd className="font-medium text-right">{profile?.preferred_fabrics?.join(", ") || "—"}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-stone-500">Order qty</dt><dd className="font-medium text-right">{profile?.typical_order_qty || "—"}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-stone-500">Budget</dt><dd className="font-medium text-right">{profile?.budget_range || "—"}</dd></div>
          </dl>
          <Link to="/onboarding" className="mt-5 block rounded-full border border-stone-300 py-2 text-center text-sm font-semibold text-stone-700 hover:border-brand-500 hover:text-brand-700">
            Edit profile
          </Link>
        </div>

        {/* Active orders */}
        <div className="lg:col-span-2">
          <h2 className="font-semibold text-stone-900">Current orders</h2>
          {activeOrders.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                icon="📦"
                title="No active orders"
                subtitle="Place your first bulk order to start tracking it here."
                action={
                  <Link to="/products" className="rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white">Browse fabrics</Link>
                }
              />
            </div>
          ) : (
            <div className="mt-3 space-y-4">
              {activeOrders.map((o) => (
                <div key={o.id} className="rounded-2xl border border-stone-200 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs text-stone-400">Order #{o.id} · {formatDate(o.created_at)}</span>
                      <div className="font-semibold text-stone-900">{o.supplier_name}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{formatINR(o.total)}</span>
                      <OrderStatusBadge status={o.status} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <OrderStatusTracker status={o.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-500">
                    {o.items.map((i) => (
                      <span key={i.id} className="rounded-full bg-stone-100 px-2.5 py-1">{i.product_name} × {i.quantity}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Past orders */}
      {pastOrders.length > 0 && (
        <div className="mt-10">
          <h2 className="font-semibold text-stone-900">Order history</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {pastOrders.map((o, i) => (
              <div key={o.id} className={`flex flex-wrap items-center justify-between gap-2 p-4 text-sm ${i > 0 ? "border-t border-stone-100" : ""}`}>
                <div>
                  <span className="font-medium text-stone-900">#{o.id} · {o.supplier_name}</span>
                  <span className="ml-2 text-xs text-stone-400">{formatDate(o.created_at)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatINR(o.total)}</span>
                  <OrderStatusBadge status={o.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI recommendations */}
      {recommended.length > 0 && (
        <div className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-stone-900">✨ Recommended for you</h2>
            <span className="text-xs text-stone-400">Based on your profile &amp; order history</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
