import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user, token } = useAuth();
  const [cart, setCart] = useState({ items: [], total_items: 0, subtotal: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === "buyer" && token) {
      setLoading(true);
      api
        .get("/api/cart", token)
        .then(setCart)
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setCart({ items: [], total_items: 0, subtotal: 0 });
    }
  }, [user?.role, token, user?.id]);

  async function addItem(productId, quantity = 1) {
    if (!token) return null;
    const data = await api.post("/api/cart/items", { product_id: productId, quantity }, token);
    setCart(data);
    return data;
  }

  async function updateQuantity(productId, quantity) {
    const data = await api.patch(`/api/cart/items/${productId}`, { product_id: productId, quantity }, token);
    setCart(data);
    return data;
  }

  async function removeItem(productId) {
    const data = await api.delete(`/api/cart/items/${productId}`, token);
    setCart(data);
    return data;
  }

  async function clearCart() {
    await api.delete("/api/cart", token);
    setCart({ items: [], total_items: 0, subtotal: 0 });
  }

  return (
    <CartContext.Provider
      value={{ cart, loading, addItem, updateQuantity, removeItem, clearCart, setCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
