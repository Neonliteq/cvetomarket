import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User } from "@shared/schema";
import { apiRequest } from "./queryClient";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: Record<string, any>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const data = await apiRequest("POST", "/api/auth/login", { email, password });
    setUser(data.user);
    return data.user;
  };

  const register = async (body: Record<string, any>) => {
    const data = await apiRequest("POST", "/api/auth/register", body);
    setUser(data.user);
  };

  const logout = async () => {
    if (user) {
      const storageKey = `push_registered_endpoint_${user.id}`;
      const endpoint = localStorage.getItem(storageKey);
      if (endpoint) {
        try {
          const res = await fetch("/api/push/unsubscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint }),
            credentials: "include",
          });
          if (res.ok) {
            localStorage.removeItem(storageKey);
          }
        } catch {
        }
      }
    }
    await apiRequest("POST", "/api/auth/logout", {});
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
