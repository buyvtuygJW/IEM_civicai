import { createContext, useContext, useEffect, useState } from "react";
import { setAuthToken, fetchMe } from "../api";

const AuthContext = createContext(null);

const STORAGE_KEY = "civicai_token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    setAuthToken(token);
    setLoading(true);
    fetchMe()
      .then((res) => {
        if (!cancelled) setUser(res.data);
      })
      .catch(() => {
        // token expired/invalid — clear it silently
        if (!cancelled) {
          localStorage.removeItem(STORAGE_KEY);
          setAuthToken(null);
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = (accessToken, userData) => {
    localStorage.setItem(STORAGE_KEY, accessToken);
    setAuthToken(accessToken);
    setToken(accessToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isGovernment: user?.role === "government" }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
