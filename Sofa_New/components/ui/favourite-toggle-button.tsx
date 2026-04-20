"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/store-data";
import { addToWishlist, isFavourite, removeFromWishlist } from "@/lib/shopenup/wishlist";
import { useAuth } from "@/components/providers/auth-provider";

type FavouriteToggleButtonProps = {
  product: Product;
  className?: string;
};

export function FavouriteToggleButton({ product, className }: FavouriteToggleButtonProps) {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [favourite, setFavourite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    void isFavourite(product.variantId).then((value) => {
      if (mounted) {
        setFavourite(value);
      }
    });
    return () => {
      mounted = false;
    };
  }, [product.variantId]);

  const toggle = async () => {
    if (!product.variantId || loading) {
      return;
    }

    if (!isLoggedIn && !favourite) {
      router.push("/account");
      return;
    }

    setLoading(true);
    try {
      if (favourite) {
        await removeFromWishlist(product.variantId);
        setFavourite(false);
      } else {
        await addToWishlist(product);
        setFavourite(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      disabled={!product.variantId || loading}
      onClick={() => void toggle()}
      className={
        className ||
        "rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-brand hover:text-brand disabled:opacity-60"
      }
      aria-label={favourite ? "Remove from favourites" : "Add to favourites"}
      title={favourite ? "Remove from favourites" : "Add to favourites"}
    >
      {favourite ? "♥" : "♡"}
    </button>
  );
}

