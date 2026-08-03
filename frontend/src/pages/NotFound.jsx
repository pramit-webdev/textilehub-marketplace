import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <span className="text-6xl">🧵</span>
      <h1 className="mt-4 font-display text-4xl font-bold text-stone-900">404 — thread not found</h1>
      <p className="mt-3 text-sm leading-relaxed text-stone-500">
        The page you're looking for has unraveled. It may have moved, or never existed in this
        weave of the marketplace.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-full bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
      >
        Back to the loom →
      </Link>
    </div>
  );
}
