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
import { retrieveCart } from "@/lib/shopenup/cart";
import { getWishlistCount } from "@/lib/shopenup/wishlist";
import { useAuth } from "@/components/providers/auth-provider";

type StorefrontContextValue = {
  cartCount: number;
  favouriteCount: number;
  refreshCartCount: () => Promise<void>;
  refreshFavouriteCount: () => Promise<void>;
};

const StorefrontContext = createContext<StorefrontContextValue | undefined>(undefined);

function countCartItems(cart: Awaited<ReturnType<typeof retrieveCart>>): number {
  if (!cart?.items?.length) {
    return 0;
  }
  return cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
}

export function StorefrontProvider({ children }: { children: ReactNode }) {
  const { customer } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [favouriteCount, setFavouriteCount] = useState(0);

  const refreshCartCount = useCallback(async () => {
    try {
      const cart = await retrieveCart();
      setCartCount(countCartItems(cart));
    } catch {
      setCartCount(0);
    }
  }, []);

  const refreshFavouriteCount = useCallback(async () => {
    try {
      const count = await getWishlistCount();
      setFavouriteCount(count);
    } catch {
      setFavouriteCount(0);
    }
  }, []);

  useEffect(() => {
    void refreshCartCount();
    void refreshFavouriteCount();
  }, [refreshCartCount, refreshFavouriteCount, customer?.id]);

  useEffect(() => {
    const onCartChanged = () => void refreshCartCount();
    const onWishlistChanged = () => void refreshFavouriteCount();
    window.addEventListener("sofa_new:cart_changed", onCartChanged);
    window.addEventListener("sofa_new:wishlist_changed", onWishlistChanged);
    return () => {
      window.removeEventListener("sofa_new:cart_changed", onCartChanged);
      window.removeEventListener("sofa_new:wishlist_changed", onWishlistChanged);
    };
  }, [refreshCartCount, refreshFavouriteCount]);

  const value = useMemo<StorefrontContextValue>(
    () => ({
      cartCount,
      favouriteCount,
      refreshCartCount,
      refreshFavouriteCount,
    }),
    [cartCount, favouriteCount, refreshCartCount, refreshFavouriteCount]
  );

  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront() {
  const ctx = useContext(StorefrontContext);
  if (!ctx) {
    throw new Error("useStorefront must be used within StorefrontProvider");
  }
  return ctx;
}

