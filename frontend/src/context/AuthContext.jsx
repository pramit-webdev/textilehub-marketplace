import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

const STORAGE_KEY = "textilehub.user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("textilehub.token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/api/auth/me", token)
      .then((u) => {
        setUser(u);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      })
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [token]);

  function persist(data) {
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem("textilehub.token", data.access_token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
  }

  async function login(email, password) {
    const data = await api.post("/api/auth/login", { email, password });
    persist(data);
    return data.user;
  }

  async function register(payload) {
    const data = await api.post("/api/auth/register", payload);
    persist(data);
    return data.user;
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem("textilehub.token");
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refresh: (u) => setUser(u) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
