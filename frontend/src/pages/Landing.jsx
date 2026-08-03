import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import ProductCard from "../components/ProductCard";
import { Spinner } from "../components/Spinner";

const HERO_IMG =
  "https://images.unsplash.com/photo-1603252109303-2751441dd157?q=80&w=1600&auto=format&fit=crop";

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/api/categories"),
      api.get("/api/products?featured=true&page_size=8"),
    ])
      .then(([cats, prods]) => {
        setCategories(cats);
        setFeatured(prods.items);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(id) {
    if (!user || user.role !== "buyer") {
      toast("Log in as a buyer to add items to your cart");
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

  function submitSearch(e) {
    e.preventDefault();
    navigate(`/products?search=${encodeURIComponent(search)}`);
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-950 text-white">
        <div className="absolute inset-0 opacity-25">
          <img src={HERO_IMG} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-brand-950 via-brand-950/90 to-brand-900/40" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide backdrop-blur">
              🧵 India's B2B Fabric Marketplace
            </span>
            <h1 className="font-display mt-5 text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
              Source fabrics your customers will love
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-brand-100 sm:text-lg">
              Browse verified cotton, silk, linen & denim suppliers. Compare prices,
              check MOQs, and order in bulk — with Loom, your AI sourcing assistant, by your side.
            </p>
            <form onSubmit={submitSearch} className="mt-8 flex max-w-xl overflow-hidden rounded-full bg-white p-1.5 shadow-2xl">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Try "organic cotton for shirts" or "silk under ₹500"'
                className="flex-1 bg-transparent px-4 text-sm text-stone-800 outline-none"
              />
              <button className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
                Search
              </button>
            </form>
            <div className="mt-6 flex flex-wrap gap-3 text-xs text-brand-100">
              <span>✨ AI natural-language search</span>
              <span>·</span>
              <span>🎙️ Voice assistant</span>
              <span>·</span>
              <span>📦 Direct from mills</span>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products" className="rounded-full bg-accent-500 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-accent-600">
                Browse Fabrics
              </Link>
              <Link to="/auth?mode=register" className="rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20">
                Become a Buyer
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-stone-900 sm:text-3xl">Shop by fabric</h2>
            <p className="mt-1 text-sm text-stone-500">Eight fabric families, hundreds of options.</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {categories.map((cat, i) => (
            <Link
              key={cat.id}
              to={`/products?category=${cat.id}`}
              className={`group rounded-2xl p-4 text-center transition hover:-translate-y-0.5 hover:shadow-lg ${
                i % 2 === 0 ? "bg-brand-50 hover:bg-brand-100" : "bg-accent-50 hover:bg-accent-100"
              }`}
            >
              <span className="text-2xl">
                {["☁️", "🦋", "🌿", "🐑", "👖", "🧪", "💧", "🔀"][i % 8]}
              </span>
              <div className="mt-2 text-sm font-semibold text-stone-800">{cat.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-stone-900 sm:text-3xl">Featured fabrics</h2>
              <p className="mt-1 text-sm text-stone-500">Hand-picked by our textile experts this week.</p>
            </div>
            <Link to="/products" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
              View all →
            </Link>
          </div>
          {loading ? (
            <Spinner />
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} onAddToCart={handleAdd} adding={addingId === p.id} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* AI promo + CTA */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid items-center gap-10 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 to-brand-700 p-8 text-white sm:p-12 lg:grid-cols-2">
          <div>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-widest">MEET LOOM</span>
            <h2 className="font-display mt-4 text-3xl font-bold sm:text-4xl">
              Your AI sourcing assistant, always one tap away
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-brand-100">
              Describe what you need in plain language — or just talk. Loom searches the
              live catalog, recommends fabrics based on your profile, compares products
              side by side, and answers questions about stock, MOQs and prices.
            </p>
            <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              {["Natural language search", "Voice-based assistance", "Smart recommendations", "Product comparison"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-[10px]">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => window.scrollTo({ top: 0 })}
              className="mt-8 rounded-full bg-white px-6 py-3 text-sm font-bold text-brand-800 shadow-lg hover:bg-brand-50"
            >
              ✨ Try the assistant (bottom-right)
            </button>
          </div>
          <div className="hidden lg:block">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <div className="space-y-3">
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-accent-500 px-3.5 py-2 text-[13px]">
                    I need breathable white fabric for summer shirts, under ₹300 per meter.
                  </div>
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white/90 px-3.5 py-2 text-[13px] text-stone-700">
                  Perfect! **Premium Combed Cotton Poplin** (₹245/m, MOQ 100) is my top pick —
                  it's breathable, enzyme-washed and colour-fast. I can also show you the
                  Organic Cotton Canvas if you need more structure. Want me to compare them?
                </div>
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-br-sm bg-brand-600 px-3.5 py-2 text-[13px]">Yes, compare!</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
        <h2 className="font-display text-center text-2xl font-bold text-stone-900 sm:text-3xl">
          From discovery to delivery — the full marketplace loop
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: "🔍", title: "Discover", text: "Search, filter and explore fabrics from vetted Indian mills." },
            { icon: "✨", title: "Get AI help", text: "Ask Loom to recommend, compare and answer product questions." },
            { icon: "🛒", title: "Order in bulk", text: "Add to cart, check MOQs, and place orders with any supplier." },
            { icon: "📦", title: "Track & fulfill", text: "Suppliers update status from pending to completed in real time." },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl border border-stone-200 bg-white p-6">
              <span className="text-3xl">{s.icon}</span>
              <h3 className="mt-3 font-semibold text-stone-900">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-stone-500">{s.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
