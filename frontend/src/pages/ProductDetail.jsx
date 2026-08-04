import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import ProductCard from "../components/ProductCard";
import { EmptyState, Spinner } from "../components/Spinner";
import { formatINR, pluralize, FALLBACK_IMG } from "../lib/format";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { addItem } = useCart();
  const { toast } = useToast();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [color, setColor] = useState("");
  const [activeImg, setActiveImg] = useState(0);
  const [similar, setSimilar] = useState([]);
  const [qaOpen, setQaOpen] = useState(false);
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaAnswer, setQaAnswer] = useState("");
  const [qaBusy, setQaBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setLoading(true);
    setProduct(null);
    setLoadError("");
    api
      .get(`/api/products/${id}`)
      .then((p) => {
        setProduct(p);
        setColor(p.colors?.[0] || "");
        if (token) {
          api.post(`/api/ai/similar/${p.id}`, undefined, token).then((ids) => {
            api.get("/api/products?page_size=60").then((all) => {
              setSimilar(all.items.filter((x) => ids.includes(x.id) && x.id !== p.id).slice(0, 4));
            });
          }).catch(() => {});
        }
      })
      .catch((e) => {
        setProduct(null);
        setLoadError(e.status === 404 ? "" : "Could not load this product. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [id, token]);

  if (loading) return <Spinner />;
  if (!product)
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <EmptyState
          icon="😕"
          title={loadError ? "Something went wrong" : "Product not found"}
          subtitle={loadError}
          action={
            <Link to="/products" className="rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white">
              Back to marketplace
            </Link>
          }
        />
      </div>
    );

  const images = product.images?.length ? product.images : [{ url: FALLBACK_IMG, is_primary: true }];
  const inStock = product.stock > 0;

  async function handleAdd() {
    if (!user || user.role !== "buyer") {
      toast("Log in as a buyer to add items");
      navigate("/auth?mode=login");
      return;
    }
    setAdding(true);
    try {
      await addItem(product.id, quantity);
      toast("Added to cart");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setAdding(false);
    }
  }

  async function askQA(e) {
    e.preventDefault();
    if (!qaQuestion.trim() || !token) return;
    setQaBusy(true);
    setQaAnswer("");
    try {
      const res = await api.post("/api/ai/product-qa", { product_id: product.id, question: qaQuestion }, token);
      setQaAnswer(res.reply);
    } catch {
      setQaAnswer("Could not reach the assistant right now.");
    } finally {
      setQaBusy(false);
    }
  }

  function addToCompare() {
    const stored = JSON.parse(localStorage.getItem("compare") || "[]");
    if (!stored.includes(product.id)) stored.push(product.id);
    localStorage.setItem("compare", JSON.stringify(stored));
    toast("Added to compare list");
    navigate("/compare");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="text-xs text-stone-400">
        <Link to="/products" className="hover:text-brand-700">Marketplace</Link>
        {" / "}
        <Link to={`/products?category=${product.category?.id}`} className="hover:text-brand-700">
          {product.category?.name}
        </Link>
        {" / "}
        <span className="text-stone-600">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <img
              src={images[activeImg]?.url || FALLBACK_IMG}
              alt={product.name}
              className="aspect-[4/3] w-full object-cover"
              onError={(e) => (e.currentTarget.src = FALLBACK_IMG)}
            />
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-3">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`h-20 w-24 overflow-hidden rounded-xl border-2 transition ${
                    i === activeImg ? "border-brand-600" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.src = FALLBACK_IMG)} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-700">
              {product.fabric_type}
            </span>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
              {product.category?.name}
            </span>
            {product.is_featured && (
              <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-bold text-accent-700">⭐ Featured</span>
            )}
          </div>

          <h1 className="font-display mt-3 text-3xl font-bold text-stone-900">{product.name}</h1>
          <p className="mt-1 text-sm text-stone-500">
            Sold by <span className="font-semibold text-stone-700">{product.supplier_name}</span>
          </p>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-stone-900">{formatINR(product.price)}</span>
            <span className="text-sm text-stone-400">per unit</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${inStock ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
              {inStock ? `${pluralize(product.stock, "unit")} in stock` : "Out of stock"}
            </span>
          </div>

          <p className="mt-4 leading-relaxed text-stone-600">{product.description}</p>

          {product.colors?.length > 0 && (
            <div className="mt-6">
              <div className="text-sm font-semibold text-stone-800">Available colors</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      color === c ? "border-brand-600 bg-brand-50 text-brand-800" : "border-stone-300 text-stone-600 hover:border-stone-400"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {Object.keys(product.specifications || {}).length > 0 && (
            <div className="mt-6">
              <div className="text-sm font-semibold text-stone-800">Specifications</div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.entries(product.specifications).map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-stone-100 px-3 py-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">{k}</div>
                    <div className="text-sm font-medium text-stone-800">{String(v)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center rounded-full border border-stone-300">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-4 py-2.5 text-stone-500 hover:text-stone-900">−</button>
              <input
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="w-14 border-x border-stone-200 py-2.5 text-center text-sm outline-none"
              />
              <button onClick={() => setQuantity(quantity + 1)} className="px-4 py-2.5 text-stone-500 hover:text-stone-900">+</button>
            </div>
            <button
              onClick={handleAdd}
              disabled={!inStock || adding}
              className="flex-1 rounded-full bg-brand-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-700/20 transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {adding ? "Adding…" : inStock ? `Add to cart · ${formatINR(product.price * quantity)}` : "Out of stock"}
            </button>
          </div>

          <div className="mt-3 flex gap-3">
            <button
              onClick={addToCompare}
              className="flex-1 rounded-full border border-stone-300 px-6 py-2.5 text-sm font-semibold text-stone-700 hover:border-brand-500 hover:text-brand-700"
            >
              ⇄ Add to compare
            </button>
            <button
              onClick={() => setQaOpen(!qaOpen)}
              className="flex-1 rounded-full border border-stone-300 px-6 py-2.5 text-sm font-semibold text-stone-700 hover:border-brand-500 hover:text-brand-700"
            >
              ✨ Ask Loom about this fabric
            </button>
          </div>

          {qaOpen && (
            <form onSubmit={askQA} className="mt-4 rounded-2xl border border-brand-200 bg-brand-50 p-4">
              <div className="text-sm font-semibold text-brand-900">Ask Loom about {product.name}</div>
              <div className="mt-2 flex gap-2">
                <input
                  value={qaQuestion}
                  onChange={(e) => setQaQuestion(e.target.value)}
                  placeholder="e.g. What is the MOQ and does it shrink?"
                  className="flex-1 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm outline-none focus:border-brand-500"
                />
                <button className="rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50" disabled={!token || qaBusy}>
                  {qaBusy ? "…" : "Ask"}
                </button>
              </div>
              {!token && <p className="mt-2 text-xs text-brand-700">Log in to use the AI assistant.</p>}
              {qaAnswer && (
                <div className="mt-3 rounded-xl bg-white p-3 text-sm leading-relaxed text-stone-700 ring-1 ring-brand-100">
                  {qaAnswer}
                </div>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Similar */}
      {similar.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold text-stone-900">You may also like</h2>
          <p className="mt-1 text-sm text-stone-500">AI-powered similar product suggestions.</p>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} onAddToCart={async () => { await addItem(p.id, 1); toast("Added to cart"); }} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
