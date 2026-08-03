import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import ProductCard from "../components/ProductCard";
import { EmptyState, Spinner } from "../components/Spinner";
import { pluralize } from "../lib/format";

const FABRICS = ["Cotton", "Silk", "Linen", "Wool", "Denim", "Polyester", "Viscose", "Blends"];
const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name", label: "Name A–Z" },
];

export default function Products() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { toast } = useToast();

  const [categories, setCategories] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState(null);

  const search = params.get("search") || "";
  const category = params.get("category") || "";
  const fabric = params.get("fabric") || "";
  const inStock = params.get("in_stock") === "1";
  const sort = params.get("sort") || "featured";
  const [maxPrice, setMaxPrice] = useState(2500);

  useEffect(() => {
    api.get("/api/categories").then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (category) q.set("category", category);
    if (fabric) q.set("fabric_type", fabric);
    if (inStock) q.set("in_stock_only", "1");
    if (maxPrice) q.set("max_price", String(maxPrice));
    q.set("sort", sort);
    q.set("page_size", "48");
    api
      .get(`/api/products?${q.toString()}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, category, fabric, inStock, sort, maxPrice]);

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c.id) === category),
    [categories, category]
  );

  function setParam(key, value) {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }

  async function handleAdd(id) {
    if (!user || user.role !== "buyer") {
      toast("Log in as a buyer to add items");
      navigate("/auth?mode=login");
      return;
    }
    setAddingId(id);
    try {
      await addItem(id, 1);
      toast("Added to cart");
    } catch {
      toast("Could not add to cart", "error");
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-stone-900 sm:text-3xl">
            {selectedCategory?.name || "All fabrics"}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {data ? pluralize(data.total, "product") : "…"} {search && `matching “${search}”`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setParam("sort", e.target.value)}
            className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
        {search && (
          <button onClick={() => setParam("search", "")} className="rounded-full bg-stone-900 px-3 py-1.5 font-medium text-white">
            “{search}” ✕
          </button>
        )}
        <button
          onClick={() => setParam("fabric", "")}
          className={`rounded-full px-3 py-1.5 font-medium ${fabric ? "bg-brand-700 text-white" : "border border-stone-300 text-stone-500"}`}
        >
          {fabric || "All fabric types"}
        </button>
        <button
          onClick={() => setParam("in_stock", inStock ? "" : "1")}
          className={`rounded-full px-3 py-1.5 font-medium ${inStock ? "bg-emerald-600 text-white" : "border border-stone-300 text-stone-500"}`}
        >
          {inStock ? "✓ " : ""}In stock only
        </button>
        <label className="ml-1 flex items-center gap-2 rounded-full border border-stone-300 px-3 py-1.5 text-stone-500">
          Max ₹{maxPrice.toLocaleString("en-IN")}
          <input
            type="range"
            min={100}
            max={2500}
            step={100}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="w-24 accent-brand-600"
          />
        </label>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setParam("category", cat.id)}
            className={`rounded-xl px-2 py-2 text-center text-xs font-medium transition ${
              category === String(cat.id)
                ? "bg-brand-700 text-white"
                : "bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-brand-400"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : !data || data.items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon="🔎"
            title="No fabrics match your filters"
            subtitle="Try removing some filters or ask Loom (bottom-right) to find exactly what you need."
            action={
              <button onClick={() => setParams({})} className="rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800">
                Clear all filters
              </button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {data.items.map((p) => (
            <ProductCard key={p.id} product={p} onAddToCart={handleAdd} adding={addingId === p.id} />
          ))}
        </div>
      )}
    </div>
  );
}
