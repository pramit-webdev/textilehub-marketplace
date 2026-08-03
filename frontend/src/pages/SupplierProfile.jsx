import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Spinner } from "../components/Spinner";

export default function SupplierProfile() {
  const { token, refresh } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/api/supplier/me/profile", token)
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Spinner />;
  if (!profile) return null;

  function set(key, value) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/supplier/me/profile", profile, token);
      const me = await api.get("/api/auth/me", token);
      refresh(me);
      toast("Profile updated");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    { key: "business_name", label: "Business name" },
    { key: "business_type", label: "Business type" },
    { key: "contact_phone", label: "Contact phone" },
    { key: "business_address", label: "Business address" },
    { key: "operating_hours", label: "Operating hours" },
    { key: "min_order_qty", label: "Minimum order quantity" },
    { key: "website", label: "Website" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-bold text-stone-900 sm:text-3xl">Supplier profile</h1>
      <p className="mt-1 text-sm text-stone-500">Keep your business information accurate — buyers see it on your products.</p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-stone-200 bg-white p-6">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-xs font-medium text-stone-600">{f.label}</label>
            <input value={profile[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Product categories</label>
          <input
            value={(profile.product_categories || []).join(", ")}
            onChange={(e) => set("product_categories", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Fabric types</label>
          <input
            value={(profile.fabric_types || []).join(", ")}
            onChange={(e) => set("fabric_types", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">About your business</label>
          <textarea rows={4} value={profile.description || ""} onChange={(e) => set("description", e.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
        </div>
        <button disabled={saving} className="w-full rounded-full bg-brand-700 py-3 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-60">
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
