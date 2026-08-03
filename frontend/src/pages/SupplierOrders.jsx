import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Spinner, EmptyState } from "../components/Spinner";
import { OrderStatusBadge } from "../components/OrderStatus";
import { formatDateTime, formatINR, pluralize } from "../lib/format";

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "preparing", label: "Preparing" },
  { value: "ready_for_dispatch", label: "Ready for Dispatch" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function SupplierOrders() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    api
      .get("/api/supplier/orders", token)
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [token]);

  async function updateStatus(orderId, status) {
    try {
      await api.patch(`/api/supplier/orders/${orderId}/status`, { status }, token);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
      toast("Order status updated");
    } catch (err) {
      toast(err.message, "error");
    }
  }

  const counts = orders.reduce((acc, o) => ((acc[o.status] = (acc[o.status] || 0) + 1), acc), {});
  const visible = filter ? orders.filter((o) => o.status === filter) : orders;

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-bold text-stone-900 sm:text-3xl">Order management</h1>
      <p className="mt-1 text-sm text-stone-500">Review incoming orders and keep buyers updated on fulfilment.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={() => setFilter("")} className={`rounded-full px-4 py-2 text-xs font-semibold ${!filter ? "bg-stone-900 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200"}`}>
          All ({orders.length})
        </button>
        {STATUSES.filter((s) => s.value !== "cancelled").map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`rounded-full px-4 py-2 text-xs font-semibold ${filter === s.value ? "bg-stone-900 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200"}`}
          >
            {s.label} ({counts[s.value] || 0})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon="📭" title="No orders here" subtitle="New buyer orders will appear in this list." />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {visible.map((order) => (
            <div key={order.id} className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900">Order #{order.id}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="mt-0.5 text-xs text-stone-400">
                    {order.buyer_name} · {formatDateTime(order.created_at)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-stone-900">{formatINR(order.total)}</div>
                  <div className="text-xs text-stone-400">{pluralize(order.items.reduce((a, i) => a + i.quantity, 0), "unit")}</div>
                </div>
              </div>

              <div className="mt-4 space-y-2 border-t border-stone-100 pt-4">
                {order.items.map((i) => (
                  <div key={i.id} className="flex items-center justify-between text-sm">
                    <span className="text-stone-700">{i.product_name} <span className="text-stone-400">× {i.quantity}</span></span>
                    <span className="font-medium">{formatINR(i.unit_price * i.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid gap-2 rounded-xl bg-stone-50 p-3 text-xs text-stone-600 sm:grid-cols-2">
                <span>📍 {order.shipping_address}, {order.shipping_city}, {order.shipping_country}</span>
                <span>👤 {order.shipping_name} {order.shipping_phone ? `· ${order.shipping_phone}` : ""}</span>
                {order.notes && <span className="sm:col-span-2">📝 {order.notes}</span>}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-stone-500">Update status:</span>
                {STATUSES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => updateStatus(order.id, s.value)}
                    disabled={order.status === s.value}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      order.status === s.value
                        ? "bg-brand-700 text-white"
                        : "border border-stone-300 text-stone-600 hover:border-brand-500 hover:text-brand-700"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
