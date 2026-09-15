import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { apiErr } from "@/lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = anon, object = user
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/auth/me").then((r) => setUser(r.data)).catch(() => setUser(false));
  }, []);

  const login = useCallback(async (email, password) => {
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data);
      return true;
    } catch (e) {
      setError(apiErr(e));
      return false;
    }
  }, []);

  const register = useCallback(async (name, email, password) => {
    setError("");
    try {
      const { data } = await api.post("/auth/register", { name, email, password });
      setUser(data);
      return true;
    } catch (e) {
      setError(apiErr(e));
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch (_) {}
    setUser(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, error, login, register, logout, setError }}>
      {children}
    </AuthContext.Provider>
  );
}
