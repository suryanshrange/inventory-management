import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skip profile bootstrap on auth pages — avoids expected-401 console noise
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    if (path === "/login" || path === "/register") {
      setLoading(false);
      return;
    }
    let mounted = true;
    api
      .get("/auth/profile")
      .then((r) => { if (mounted) setUser(r.data); })
      .catch((err) => {
        if (err?.response?.status && err.response.status !== 401) {
          console.error("Profile fetch failed:", err);
        }
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout request failed:", err);
    }
    setUser(null);
  };

  const can = (...roles) => user && roles.includes(user.role);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
