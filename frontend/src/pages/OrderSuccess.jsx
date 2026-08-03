import { Link, useLocation } from "react-router-dom";
import { formatINR } from "../lib/format";

export default function OrderSuccess() {
  const location = useLocation();
  const orders = location.state?.orders || [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
        <svg className="h-10 w-10 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </div>
      <h1 className="font-display mt-6 text-3xl font-bold text-stone-900">Order placed!</h1>
      <p className="mt-2 text-sm text-stone-500">
        {orders.length > 1
          ? `Your cart was split into ${orders.length} orders — one per supplier.`
          : "Your order has been sent to the supplier."}
      </p>

      <div className="mt-8 space-y-3 text-left">
        {orders.map((order) => (
          <div key={order.id} className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-stone-400">Order #{order.id}</div>
                <div className="font-semibold text-stone-900">{order.supplier_name}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-stone-900">{formatINR(order.total)}</div>
                <div className="text-xs text-emerald-600">Pending · awaiting supplier</div>
              </div>
            </div>
            <div className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-500">
              {order.items.map((i) => `${i.product_name} × ${i.quantity}`).join(" · ")}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <Link to="/dashboard" className="rounded-full bg-brand-700 px-6 py-3 text-sm font-bold text-white hover:bg-brand-800">
          Track my orders
        </Link>
        <Link to="/products" className="rounded-full border border-stone-300 px-6 py-3 text-sm font-semibold text-stone-700 hover:border-stone-400">
          Continue browsing
        </Link>
      </div>
    </div>
  );
}
