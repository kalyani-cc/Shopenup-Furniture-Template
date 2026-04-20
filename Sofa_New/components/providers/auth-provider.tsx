"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getAuthHeaders } from "@/lib/shopenup/cookies";
import { getCustomer, logoutCustomer } from "@/lib/shopenup/customer";
import type { StoreCustomer } from "@/lib/types/store-customer";

type AuthContextValue = {
  customer: StoreCustomer | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<StoreCustomer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      if (!("authorization" in headers) || !headers.authorization) {
        setCustomer(null);
        return;
      }
      const nextCustomer = await getCustomer();
      setCustomer(nextCustomer);
    } catch {
      setCustomer(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await logoutCustomer();
    setCustomer(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      customer,
      isLoading,
      isLoggedIn: Boolean(customer),
      refresh,
      logout,
    }),
    [customer, isLoading, refresh, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
