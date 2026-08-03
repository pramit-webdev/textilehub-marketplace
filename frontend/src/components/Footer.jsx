import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-stone-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-base">🧵</span>
              <span className="font-display text-lg font-bold text-stone-900">
                Textile<span className="text-brand-600">Hub</span>
              </span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-stone-500">
              India's B2B textile marketplace connecting fabric buyers with vetted suppliers.
              Discover, compare and order fabrics — powered by AI.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-stone-900">Marketplace</h4>
            <ul className="mt-3 space-y-2 text-sm text-stone-500">
              <li><Link to="/products" className="hover:text-stone-900">Browse Fabrics</Link></li>
              <li><Link to="/compare" className="hover:text-stone-900">Compare Products</Link></li>
              <li><Link to="/auth?mode=register" className="hover:text-stone-900">Become a Buyer</Link></li>
              <li><Link to="/auth?mode=register&role=supplier" className="hover:text-stone-900">Become a Supplier</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-stone-900">Fabrics</h4>
            <ul className="mt-3 space-y-2 text-sm text-stone-500">
              <li><Link to="/products?fabric=Silk" className="hover:text-stone-900">Silk</Link></li>
              <li><Link to="/products?fabric=Cotton" className="hover:text-stone-900">Cotton</Link></li>
              <li><Link to="/products?fabric=Linen" className="hover:text-stone-900">Linen</Link></li>
              <li><Link to="/products?fabric=Denim" className="hover:text-stone-900">Denim</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-stone-100 pt-6 text-xs text-stone-400">
          © {new Date().getFullYear()} TextileHub. Built for the Marketplace Hackathon.
        </div>
      </div>
    </footer>
  );
}
