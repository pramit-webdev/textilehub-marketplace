import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { EmptyState, Spinner } from "../components/Spinner";
import { formatINR, FALLBACK_IMG } from "../lib/format";

export default function Cart() {
  const { cart, loading, updateQuantity, removeItem } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-stone-900">Shopping cart</h1>

      {cart.items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon="🛒"
            title="Your cart is empty"
            subtitle="Browse the marketplace and add fabrics you'd like to order in bulk."
            action={
              <Link to="/products" className="rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800">
                Browse fabrics
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            {cart.items.map((item) => (
              <div key={item.product_id} className="flex gap-4 rounded-2xl border border-stone-200 bg-white p-4">
                <Link to={`/products/${item.product_id}`}>
                  <img
                    src={item.image_url || FALLBACK_IMG}
                    alt=""
                    className="h-24 w-24 rounded-xl object-cover"
                    onError={(e) => (e.currentTarget.src = FALLBACK_IMG)}
                  />
                </Link>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link to={`/products/${item.product_id}`} className="font-semibold text-stone-900 hover:text-brand-700">
                        {item.product_name}
                      </Link>
                      <div className="mt-0.5 text-xs text-stone-500">by {item.supplier_name}</div>
                      {item.quantity > item.stock && (
                        <div className="mt-1 text-xs font-semibold text-red-600">
                          Only {item.stock} units available
                        </div>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await removeItem(item.product_id);
                          toast("Removed from cart");
                        } catch {
                          toast("Could not remove item", "error");
                        }
                      }}
                      className="text-stone-400 hover:text-red-600"
                      aria-label="Remove"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center rounded-full border border-stone-300">
                      <button
                        onClick={() => updateQuantity(item.product_id, Math.max(1, item.quantity - 1))}
                        className="px-3 py-1.5 text-stone-500 hover:text-stone-900"
                      >
                        −
                      </button>
                      <span className="w-10 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        className="px-3 py-1.5 text-stone-500 hover:text-stone-900"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-lg font-bold text-stone-900">{formatINR(item.unit_price * item.quantity)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="h-fit rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="font-semibold text-stone-900">Order summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone-500">Items ({cart.total_items})</dt>
                <dd className="font-medium">{formatINR(cart.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">Shipping</dt>
                <dd className="font-medium text-emerald-600">Negotiable with supplier</dd>
              </div>
              <div className="flex justify-between border-t border-stone-200 pt-3 text-base">
                <dt className="font-semibold">Estimated total</dt>
                <dd className="font-bold">{formatINR(cart.subtotal)}</dd>
              </div>
            </dl>
            <button
              onClick={() => navigate("/checkout")}
              className="mt-6 w-full rounded-full bg-brand-700 py-3 text-sm font-bold text-white shadow-lg shadow-brand-700/20 hover:bg-brand-800"
            >
              Proceed to checkout
            </button>
            <Link to="/products" className="mt-3 block text-center text-sm font-medium text-brand-700 hover:text-brand-800">
              ← Continue shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
