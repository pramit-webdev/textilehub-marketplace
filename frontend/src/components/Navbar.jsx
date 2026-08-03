import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

function NavLinks({ onClick }) {
  const { user } = useAuth();
  const { cart } = useCart();

  if (!user) {
    return (
      <>
        <NavLink to="/products" onClick={onClick} className={({ isActive }) => `nav-link ${isActive ? "text-brand-700 font-semibold" : "text-stone-600 hover:text-stone-900"}`}>
          Browse Fabrics
        </NavLink>
        <NavLink to="/compare" onClick={onClick} className={({ isActive }) => `nav-link ${isActive ? "text-brand-700 font-semibold" : "text-stone-600 hover:text-stone-900"}`}>
          Compare
        </NavLink>
      </>
    );
  }

  if (user.role === "supplier") {
    return (
      <>
        <NavLink to="/supplier" end onClick={onClick} className={({ isActive }) => `nav-link ${isActive ? "text-brand-700 font-semibold" : "text-stone-600 hover:text-stone-900"}`}>
          Dashboard
        </NavLink>
        <NavLink to="/supplier/products" onClick={onClick} className={({ isActive }) => `nav-link ${isActive ? "text-brand-700 font-semibold" : "text-stone-600 hover:text-stone-900"}`}>
          Inventory
        </NavLink>
        <NavLink to="/supplier/orders" onClick={onClick} className={({ isActive }) => `nav-link ${isActive ? "text-brand-700 font-semibold" : "text-stone-600 hover:text-stone-900"}`}>
          Orders
        </NavLink>
      </>
    );
  }

  return (
    <>
      <NavLink to="/products" onClick={onClick} className={({ isActive }) => `nav-link ${isActive ? "text-brand-700 font-semibold" : "text-stone-600 hover:text-stone-900"}`}>
        Browse Fabrics
      </NavLink>
      <NavLink to="/compare" onClick={onClick} className={({ isActive }) => `nav-link ${isActive ? "text-brand-700 font-semibold" : "text-stone-600 hover:text-stone-900"}`}>
        Compare
      </NavLink>
      <NavLink to="/dashboard" onClick={onClick} className={({ isActive }) => `nav-link ${isActive ? "text-brand-700 font-semibold" : "text-stone-600 hover:text-stone-900"}`}>
        My Orders
      </NavLink>
      <Link to="/cart" onClick={onClick} className="relative text-stone-600 hover:text-stone-900" aria-label="Cart">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
        {cart.total_items > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-[10px] font-bold text-white">
            {cart.total_items}
          </span>
        )}
      </Link>
    </>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    logout();
    setOpen(false);
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to={user?.role === "supplier" ? "/supplier" : "/"} className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-lg">🧵</span>
          <span className="font-display text-xl font-bold tracking-tight text-stone-900">
            Textile<span className="text-brand-600">Hub</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          <NavLinks />
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <span className="hidden text-sm text-stone-500 lg:block">
                Hi, <span className="font-semibold text-stone-800">{user.full_name.split(" ")[0]}</span>
              </span>
              <Link
                to={user.role === "supplier" ? "/supplier" : "/dashboard"}
                className="rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:border-stone-400"
              >
                {user.role === "supplier" ? "Supplier Portal" : "My Account"}
              </Link>
              <button onClick={handleLogout} className="text-sm font-medium text-stone-500 hover:text-red-600">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/auth?mode=login" className="text-sm font-medium text-stone-700 hover:text-stone-900">
                Log in
              </Link>
              <Link
                to="/auth?mode=register"
                className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-700 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" d="M6 18 18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-stone-200 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-4 text-base">
            <NavLinks onClick={() => setOpen(false)} />
            <div className="mt-2 flex flex-col gap-3 border-t border-stone-100 pt-4">
              {user ? (
                <button onClick={handleLogout} className="text-left text-sm font-medium text-red-600">
                  Logout
                </button>
              ) : (
                <>
                  <Link to="/auth?mode=login" onClick={() => setOpen(false)} className="font-medium text-stone-700">
                    Log in
                  </Link>
                  <Link
                    to="/auth?mode=register"
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-brand-700 px-4 py-2 text-center text-sm font-semibold text-white"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
