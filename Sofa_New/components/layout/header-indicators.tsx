"use client";

import Link from "next/link";
import { useStorefront } from "@/components/providers/storefront-provider";

type HeaderIndicatorsProps = {
  variant?: "default" | "hero";
};

export function HeaderIndicators({ variant = "default" }: HeaderIndicatorsProps) {
  const { cartCount, favouriteCount } = useStorefront();
  const isHero = variant === "hero";
  const base =
    "relative inline-flex h-10 w-10 items-center justify-center rounded-full text-lg transition";
  const idle = isHero
    ? `${base} text-white hover:bg-white/10`
    : `${base} text-stone-700 hover:bg-stone-100 hover:text-brand`;

  return (
    <>
      <Link
        href="/favourites"
        className={idle}
        aria-label="Favourites"
        title="Favourites"
      >
        <span aria-hidden>♡</span>
        {favouriteCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold text-white">
            {favouriteCount}
          </span>
        ) : null}
      </Link>
      <Link href="/cart" className={idle} aria-label="Cart" title="Cart">
        <span aria-hidden>🛒</span>
        {cartCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold text-white">
            {cartCount}
          </span>
        ) : null}
      </Link>
    </>
  );
}

