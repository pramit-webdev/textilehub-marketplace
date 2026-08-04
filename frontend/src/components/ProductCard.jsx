import { Link } from "react-router-dom";
import { formatINR, pluralize, productImage, FALLBACK_IMG } from "../lib/format";

export default function ProductCard({ product, onAddToCart, adding = false }) {
  const img = productImage(product, FALLBACK_IMG);
  const inStock = product.stock > 0;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-stone-200/60">
      <Link to={`/products/${product.id}`} className="relative block aspect-[4/3] overflow-hidden bg-stone-100">
        <img
          src={img}
          alt={product.name}
          loading="lazy"
          onError={(e) => (e.currentTarget.src = FALLBACK_IMG)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          {product.is_featured && (
            <span className="rounded-full bg-accent-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              Featured
            </span>
          )}
          {!inStock && (
            <span className="rounded-full bg-stone-900/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              Out of stock
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-600">
            {product.fabric_type}
          </span>
          <span className="truncate text-[11px] text-stone-400">{product.supplier_name}</span>
        </div>
        <Link to={`/products/${product.id}`} className="mt-1 line-clamp-1 font-semibold text-stone-900 hover:text-brand-700">
          {product.name}
        </Link>
        <p className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed text-stone-500">
          {product.description}
        </p>

        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <div className="text-lg font-bold text-stone-900">{formatINR(product.price)}</div>
            <div className="text-[11px] text-stone-400">per unit · MOQ {product.moq}</div>
          </div>
          <button
            onClick={() => onAddToCart?.(product.id)}
            disabled={!inStock || adding}
            className="rounded-full bg-brand-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {adding ? "Adding…" : "+ Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
