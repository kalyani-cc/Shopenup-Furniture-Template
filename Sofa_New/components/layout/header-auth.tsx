"use client";

import Link from "next/link";

type HeaderAuthProps = {
  variant?: "default" | "hero";
};

export function HeaderAuth({ variant = "default" }: HeaderAuthProps) {
  const isHero = variant === "hero";
  return (
    <Link
      href="/account"
      className={
        isHero
          ? "rounded-full px-3 py-2 text-sm font-medium text-white/95 transition hover:bg-white/10"
          : "text-sm font-medium text-stone-700 transition hover:text-brand"
      }
      aria-label="Account"
    >
      {isHero ? (
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/35 text-lg leading-none">
          <span aria-hidden>👤</span>
        </span>
      ) : (
        "Account"
      )}
    </Link>
  );
}
