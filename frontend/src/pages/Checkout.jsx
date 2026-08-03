import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { formatINR } from "../lib/format";

export default function Checkout() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { cart, clearCart } = useCart();
  const { toast } = useToast();

  const [form, setForm] = useState({
    shipping_name: "",
    shipping_phone: "",
    shipping_address: "",
    shipping_city: "",
    shipping_country: "India",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
  }

  async function placeOrder(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const orders = await api.post("/api/checkout", form, token);
      await clearCart();
      navigate("/checkout/success", { state: { orders } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-stone-900">Checkout</h1>
      <p className="mt-1 text-sm text-stone-500">
        Payment is outside this prototype — orders go straight to suppliers for confirmation.
      </p>

      {cart.items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
          Your cart is empty.{" "}
          <button onClick={() => navigate("/products")} className="font-semibold text-brand-700">
            Browse fabrics →
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          <form onSubmit={placeOrder} className="space-y-4">
            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <h2 className="font-semibold text-stone-900">Shipping information</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600">Full name *</label>
                  <input required value={form.shipping_name} onChange={(e) => set("shipping_name", e.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600">Phone</label>
                  <input value={form.shipping_phone} onChange={(e) => set("shipping_phone", e.target.value)} placeholder="+91 …" className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-stone-600">Street address *</label>
                  <input required value={form.shipping_address} onChange={(e) => set("shipping_address", e.target.value)} placeholder="Building, street, area" className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600">City *</label>
                  <input required value={form.shipping_city} onChange={(e) => set("shipping_city", e.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600">Country *</label>
                  <input required value={form.shipping_country} onChange={(e) => set("shipping_country", e.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-stone-600">Order notes (optional)</label>
                  <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Shade requirements, sample request, delivery deadline…" className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <h2 className="font-semibold text-stone-900">Order review</h2>
              <div className="mt-4 space-y-3">
                {cart.items.map((item) => (
                  <div key={item.product_id} className="flex items-center justify-between text-sm">
                    <span className="text-stone-700">
                      {item.product_name} <span className="text-stone-400">× {item.quantity}</span>
                    </span>
                    <span className="font-medium">{formatINR(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-stone-200 pt-3 font-bold">
                  <span>Total ({cart.total_items} items)</span>
                  <span>{formatINR(cart.subtotal)}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">{error}</div>
            )}

            <button disabled={busy} className="w-full rounded-full bg-brand-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-700/20 hover:bg-brand-800 disabled:opacity-60">
              {busy ? "Placing order…" : `Place order · ${formatINR(cart.subtotal)}`}
            </button>
          </form>

          <div className="h-fit rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="font-semibold text-stone-900">What happens next?</h2>
            <ol className="mt-4 space-y-3 text-sm text-stone-600">
              <li className="flex gap-2"><span className="font-bold text-brand-700">1.</span> Your order is split per supplier automatically.</li>
              <li className="flex gap-2"><span className="font-bold text-brand-700">2.</span> Each supplier receives it as a pending order.</li>
              <li className="flex gap-2"><span className="font-bold text-brand-700">3.</span> Suppliers accept, prepare and dispatch — you track the status live.</li>
              <li className="flex gap-2"><span className="font-bold text-brand-700">4.</span> No payment needed — this is a prototype.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
