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
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        {favouriteCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold text-white shadow-sm">
            {favouriteCount}
          </span>
        ) : null}
      </Link>
      <Link href="/cart" className={idle} aria-label="Cart" title="Cart">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
        {cartCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold text-white shadow-sm">
            {cartCount}
          </span>
        ) : null}
      </Link>
    </>
  );
}

