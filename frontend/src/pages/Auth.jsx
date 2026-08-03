import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Auth() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { toast } = useToast();

  const mode = params.get("mode") === "register" ? "register" : "login";
  const next = params.get("next") || "";

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: params.get("role") === "supplier" ? "supplier" : "buyer",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
  }

  function routeAfter(user) {
    const target = next || (user.role === "supplier" ? "/supplier" : "/");
    if (!next && !user.is_onboarded) {
      navigate(user.role === "supplier" ? "/onboarding/supplier" : "/onboarding");
    } else {
      navigate(target);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = mode === "login" ? await login(form.email, form.password) : await register(form);
      toast(mode === "login" ? "Welcome back!" : "Account created!");
      routeAfter(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:px-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-stone-900">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          {mode === "login"
            ? "Log in to your TextileHub account."
            : "Join India's B2B textile marketplace."}
        </p>
      </div>

      <div className="mt-6 flex rounded-full bg-stone-100 p-1 text-sm font-medium">
        <button
          onClick={() => set("role", "buyer")}
          className={`flex-1 rounded-full py-2 transition ${form.role === "buyer" ? "bg-brand-700 text-white shadow" : "text-stone-500"}`}
        >
          🛍️ I'm a Buyer
        </button>
        <button
          onClick={() => set("role", "supplier")}
          className={`flex-1 rounded-full py-2 transition ${form.role === "supplier" ? "bg-brand-700 text-white shadow" : "text-stone-500"}`}
        >
          🏭 I'm a Supplier
        </button>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "register" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Full name</label>
            <input
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              required
              placeholder={form.role === "supplier" ? "e.g. Anita Deshmukh" : "e.g. Meera Nair"}
              className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-brand-500"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            required
            placeholder="you@company.com"
            className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            required
            minLength={6}
            placeholder="At least 6 characters"
            className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-brand-500"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        <button
          disabled={busy}
          className="w-full rounded-full bg-brand-700 py-3 text-sm font-bold text-white shadow-lg shadow-brand-700/20 transition hover:bg-brand-800 disabled:opacity-60"
        >
          {busy ? "Please wait…" : mode === "login" ? "Log in" : `Create ${form.role} account`}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-500">
        {mode === "login" ? "New to TextileHub?" : "Already have an account?"}{" "}
        <Link
          to={mode === "login" ? "/auth?mode=register" : "/auth?mode=login"}
          className="font-semibold text-brand-700 hover:text-brand-800"
        >
          {mode === "login" ? "Create an account" : "Log in"}
        </Link>
      </p>

      <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-4 text-xs leading-relaxed text-stone-500">
        <span className="font-semibold text-stone-700">Demo accounts</span> (password <code className="rounded bg-stone-100 px-1">demo1234</code>):
        <br />
        Buyer: <code className="rounded bg-stone-100 px-1">buyer@textilehub.in</code>
        <br />
        Supplier: <code className="rounded bg-stone-100 px-1">weaver@textilehub.in</code> · <code className="rounded bg-stone-100 px-1">mills@textilehub.in</code>
      </div>
    </div>
  );
}
