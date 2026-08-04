import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { EmptyState, Spinner } from "../components/Spinner";
import { formatINR, productImage, FALLBACK_IMG } from "../lib/format";

export default function Compare() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { addItem } = useCart();
  const { toast } = useToast();

  const [selected, setSelected] = useState([]);
  const [products, setProducts] = useState([]);
  const [comparison, setComparison] = useState("");
  const [loading, setLoading] = useState(true);
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    setSelected(JSON.parse(localStorage.getItem("compare") || "[]"));
  }, []);

  useEffect(() => {
    if (selected.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all(selected.map((id) => api.get(`/api/products/${id}`)))
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selected]);

  function toggle(id) {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : selected.length < 4 ? [...selected, id] : selected;
    setSelected(next);
    localStorage.setItem("compare", JSON.stringify(next));
  }

  async function runComparison() {
    if (products.length < 2 || !token) return;
    setAiBusy(true);
    setComparison("");
    try {
      const res = await api.post("/api/ai/compare", { product_ids: products.map((p) => p.id) }, token);
      setComparison(res.comparison);
    } catch {
      toast("Could not run comparison", "error");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-bold text-stone-900 sm:text-3xl">Compare fabrics</h1>
      <p className="mt-1 text-sm text-stone-500">
        Add 2–4 fabrics from product pages. Loom's AI will give you a side-by-side verdict.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/products" className="rounded-full bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800">
          + Pick from marketplace
        </Link>
      </div>

      {loading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon="⇄"
            title="Nothing to compare yet"
            subtitle='Open any product page and press "Add to compare", or browse the marketplace.'
            action={
              <Link to="/products" className="rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white">Browse fabrics</Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-40 border-b border-stone-200 pb-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-400">Feature</th>
                  {products.map((p) => (
                    <th key={p.id} className="border-b border-stone-200 px-3 pb-3 text-left align-top">
                      <img src={productImage(p, FALLBACK_IMG)} alt="" className="h-24 w-full rounded-xl object-cover" onError={(e) => (e.currentTarget.src = FALLBACK_IMG)} />
                      <div className="mt-2 font-semibold text-stone-900">{p.name}</div>
                      <div className="text-[11px] text-stone-400">{p.supplier_name}</div>
                      <button onClick={() => toggle(p.id)} className="mt-1 text-[11px] font-semibold text-red-500 hover:text-red-700">Remove ✕</button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="align-top">
                {[
                  ["Price", (p) => <span className="font-bold">{formatINR(p.price)} / unit</span>],
                  ["Fabric", (p) => p.fabric_type],
                  ["Category", (p) => p.category?.name],
                  ["MOQ", (p) => p.moq],
                  ["Stock", (p) => (p.stock > 0 ? `${p.stock} units` : <span className="font-semibold text-red-600">Out of stock</span>)],
                  ["Colors", (p) => (p.colors || []).join(", ")],
                  ["Specifications", (p) =>
                    Object.entries(p.specifications || {})
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" · ")
                  ],
                ].map(([label, render]) => (
                  <tr key={label}>
                    <td className="border-b border-stone-100 py-3 pr-3 text-xs font-semibold uppercase tracking-wide text-stone-400">{label}</td>
                    {products.map((p) => (
                      <td key={p.id} className="border-b border-stone-100 px-3 py-3 text-stone-700">{render(p)}</td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="py-4" />
                  {products.map((p) => (
                    <td key={p.id} className="px-3 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={async () => { if (!user || user.role !== "buyer") { toast("Log in as buyer"); navigate("/auth?mode=login"); return; } await addItem(p.id, 1); toast("Added to cart"); }}
                          className="flex-1 rounded-full bg-brand-700 px-4 py-2 text-xs font-bold text-white hover:bg-brand-800"
                        >
                          Add to cart
                        </button>
                        <Link to={`/products/${p.id}`} className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:border-stone-400">View</Link>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-stone-900">Loom's verdict</h2>
                <p className="text-xs text-stone-500">AI-powered side-by-side analysis of your shortlist.</p>
              </div>
              <button
                onClick={runComparison}
                disabled={aiBusy || !token}
                className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-60"
              >
                {aiBusy ? "Analysing…" : "✨ Compare with AI"}
              </button>
            </div>
            {!token && <p className="mt-2 text-xs text-brand-700">Log in to use the AI comparison.</p>}
            {comparison && (
              <div className="mt-4 whitespace-pre-line rounded-xl bg-white p-4 text-sm leading-relaxed text-stone-700 ring-1 ring-brand-100">
                {comparison}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
