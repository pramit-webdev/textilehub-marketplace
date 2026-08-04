import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Spinner, EmptyState } from "../components/Spinner";
import { formatINR, productImage, FALLBACK_IMG } from "../lib/format";

const EMPTY_FORM = {
  name: "",
  description: "",
  category_id: "",
  fabric_type: "",
  price: "",
  moq: 1,
  stock: 0,
  colors: "",
  specifications: "",
  is_active: true,
  is_featured: false,
};

export default function SupplierProducts() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);

  const isNew = params.get("new") === "1";

  useEffect(() => {
    Promise.all([api.get("/api/supplier/products", token), api.get("/api/categories")])
      .then(([p, c]) => {
        setProducts(p.items);
        setCategories(c);
      })
      .catch(() => toast("Could not load your products", "error"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (isNew) openForm();
  }, [isNew]);

  function openForm(product = null) {
    setFormOpen(true);
    setEditing(product);
    if (product) {
      setForm({
        name: product.name,
        description: product.description,
        category_id: String(product.category_id),
        fabric_type: product.fabric_type,
        price: product.price,
        moq: product.moq,
        stock: product.stock,
        colors: (product.colors || []).join(", "),
        specifications: JSON.stringify(product.specifications || {}, null, 2),
        is_active: product.is_active,
        is_featured: product.is_featured,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setParams({});
  }

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        category_id: Number(form.category_id),
        price: Number(form.price),
        moq: Number(form.moq),
        stock: Number(form.stock),
        colors: form.colors.split(",").map((s) => s.trim()).filter(Boolean),
      };
      try {
        payload.specifications = form.specifications ? JSON.parse(form.specifications) : {};
      } catch {
        toast("Specifications must be valid JSON", "error");
        return;
      }
      if (editing) {
        await api.patch(`/api/supplier/products/${editing.id}`, payload, token);
        toast("Product updated");
      } else {
        await api.post("/api/supplier/products", payload, token);
        toast("Product created");
      }
      setFormOpen(false);
      setEditing(null);
      const fresh = await api.get("/api/supplier/products", token);
      setProducts(fresh.items);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(product) {
    try {
      await api.patch(`/api/supplier/products/${product.id}`, { is_active: !product.is_active }, token);
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, is_active: !product.is_active } : p)));
      toast(product.is_active ? "Product deactivated" : "Product is now available");
    } catch {
      toast("Could not update product", "error");
    }
  }

  async function remove(product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/supplier/products/${product.id}`, token);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast("Product deleted");
    } catch {
      toast("Could not delete product", "error");
    }
  }

  async function uploadImage(productId, file) {
    setUploadingId(productId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post(`/api/supplier/products/${productId}/images?is_primary=true`, fd, token, true);
      const fresh = await api.get("/api/supplier/products", token);
      setProducts(fresh.items);
      toast("Image uploaded");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setUploadingId(null);
    }
  }

  const stockStatus = useMemo(
    () => (product) =>
      product.stock === 0
        ? { label: "Out of stock", cls: "bg-red-50 text-red-600" }
        : product.stock <= 10
          ? { label: `Low (${product.stock})`, cls: "bg-amber-50 text-amber-700" }
          : { label: "In stock", cls: "bg-emerald-50 text-emerald-700" },
    []
  );

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-stone-900 sm:text-3xl">Inventory management</h1>
          <p className="mt-1 text-sm text-stone-500">{products.length} products · {user?.supplier_profile?.business_name}</p>
        </div>
        <button onClick={() => openForm()} className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
          + Add product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon="🧺"
            title="No products yet"
            subtitle="List your first fabric to start receiving orders."
            action={<button onClick={() => openForm()} className="rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white">+ Add product</button>}
          />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const st = stockStatus(p);
                return (
                  <tr key={p.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={productImage(p, FALLBACK_IMG)} alt="" className="h-12 w-14 rounded-lg object-cover" onError={(e) => (e.currentTarget.src = FALLBACK_IMG)} />
                        <div>
                          <div className="font-semibold text-stone-900">{p.name}</div>
                          <div className="text-xs text-stone-400">{p.fabric_type} · {p.category?.name} · MOQ {p.moq}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{formatINR(p.price)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`rounded-full px-3 py-1 text-xs font-bold ${p.is_active ? "bg-emerald-600 text-white" : "bg-stone-200 text-stone-500"}`}
                      >
                        {p.is_active ? "Available" : "Unavailable"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <label className={`cursor-pointer rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200 ${uploadingId === p.id ? "opacity-50" : ""}`}>
                          {uploadingId === p.id ? "…" : "📷 Image"}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadImage(p.id, e.target.files[0])} />
                        </label>
                        <button onClick={() => openForm(p)} className="rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200">Edit</button>
                        <button onClick={() => remove(p)} className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Product form modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm">
          <form onSubmit={submit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 scroll-thin">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900">{editing ? `Edit: ${editing.name}` : "Add new product"}</h2>
              <button type="button" onClick={() => { setFormOpen(false); setEditing(null); setParams({}); }} className="text-stone-400 hover:text-stone-700">✕</button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">Product name *</label>
                <input required value={form.name} onChange={(e) => set("name", e.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">Description *</label>
                <textarea required rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600">Category *</label>
                  <select required value={form.category_id} onChange={(e) => set("category_id", e.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500">
                    <option value="">Select…</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600">Fabric type *</label>
                  <input required value={form.fabric_type} onChange={(e) => set("fabric_type", e.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600">Price (₹) *</label>
                  <input required type="number" min="1" value={form.price} onChange={(e) => set("price", e.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600">MOQ *</label>
                  <input required type="number" min="1" value={form.moq} onChange={(e) => set("moq", e.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600">Stock *</label>
                  <input required type="number" min="0" value={form.stock} onChange={(e) => set("stock", e.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600">Colors</label>
                  <input value={form.colors} onChange={(e) => set("colors", e.target.value)} placeholder="Black, White, Navy" className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">Specifications (JSON)</label>
                <textarea rows={3} value={form.specifications} onChange={(e) => set("specifications", e.target.value)} placeholder='{"GSM": "120", "Width": "58 inch"}' className="w-full rounded-xl border border-stone-300 px-3 py-2.5 font-mono text-xs outline-none focus:border-brand-500" />
              </div>
              <div className="flex gap-5 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="accent-brand-600" />
                  Available to buyers
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.is_featured} onChange={(e) => set("is_featured", e.target.checked)} className="accent-brand-600" />
                  Featured on homepage
                </label>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => { setFormOpen(false); setEditing(null); setParams({}); }} className="flex-1 rounded-full border border-stone-300 py-2.5 text-sm font-semibold text-stone-600 hover:border-stone-400">
                Cancel
              </button>
              <button disabled={saving} className="flex-1 rounded-full bg-brand-700 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-60">
                {saving ? "Saving…" : editing ? "Save changes" : "Create product"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
