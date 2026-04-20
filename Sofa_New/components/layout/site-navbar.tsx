"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HeaderAuth } from "@/components/layout/header-auth";
import { HeaderIndicators } from "@/components/layout/header-indicators";
import { sdk } from "@/lib/config";
import { navItems } from "@/lib/store-data";

function cn(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type SearchSuggestion = {
  id: string;
  name: string;
  slug: string;
  image?: string;
};

type ProductSearchResponse = {
  products?: Array<{
    id: string;
    handle?: string;
    title?: string;
    thumbnail?: string;
  }>;
};

/** Global navigation — same look as the home page (dark brand bar, light links, accent underline). */
export function SiteNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const headerRef = useRef<HTMLElement | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    setSearchTerm(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    if (!mobileOpen) {
      setShowDropdown(false);
    }
  }, [mobileOpen]);

  useEffect(() => {
    const q = searchTerm.trim();
    if (!q || q.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setSearchLoading(false);
      return;
    }

    let mounted = true;
    const timer = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        const data = await sdk.client.fetch<ProductSearchResponse>("/store/products", {
          method: "GET",
          query: {
            q,
            limit: 6,
            fields: "id,title,handle,thumbnail",
          },
          cache: "no-store",
        });

        if (!mounted) {
          return;
        }

        const nextSuggestions = (data.products || [])
          .filter((p) => p.id && (p.handle || p.id))
          .map((p) => ({
            id: p.id,
            name: p.title || "Untitled Product",
            slug: p.handle || p.id,
            image: p.thumbnail,
          }));

        setSuggestions(nextSuggestions);
        setShowDropdown(true);
      } catch {
        if (mounted) {
          setSuggestions([]);
          setShowDropdown(true);
        }
      } finally {
        if (mounted) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [searchTerm]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  const submitSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = searchTerm.trim();
    setShowDropdown(false);
    if (!q) {
      router.push("/shop");
      return;
    }
    router.push(`/shop?q=${encodeURIComponent(q)}`);
    setMobileOpen(false);
  };

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 text-white"
      style={{
        backgroundColor: "#a8743d",
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.09) 1px, transparent 0), radial-gradient(120% 60% at 15% 10%, rgba(255,255,255,0.08), transparent 55%), linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0) 22%, rgba(0,0,0,0.08) 40%, rgba(255,255,255,0.04) 58%, rgba(0,0,0,0.08) 80%, rgba(255,255,255,0.03)), repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 5px), linear-gradient(135deg, #b68449 0%, #a8743d 45%, #966532 100%)",
        backgroundSize: "24px 24px, 100% 100%, 100% 100%, 220px 100%, 100% 100%",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-5 lg:gap-14 xl:gap-20">
          <Link href="/" className="shrink-0 text-xl font-bold tracking-tight text-white sm:text-2xl">
            Furnisy
          </Link>

          <nav className="hidden items-center gap-7 lg:flex xl:gap-9">
            {navItems.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "shrink-0 text-sm font-medium text-white/90 transition hover:text-white",
                    active && "border-b-[3px] border-brand pb-0.5 text-white"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/contact"
              className={cn(
                "shrink-0 text-sm font-medium text-white/90 transition hover:text-white",
                pathname === "/contact" && "border-b-[3px] border-brand pb-0.5 text-white"
              )}
            >
              Contact
            </Link>
          </nav>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-3 md:gap-4">
          <div className="relative hidden md:block md:w-48 lg:w-56">
            <form onSubmit={submitSearch}>
              <label htmlFor="site-navbar-search" className="sr-only">
                Search products
              </label>
              <input
                id="site-navbar-search"
                type="search"
                value={searchTerm}
                onFocus={() => {
                  if (searchTerm.trim().length >= 2) {
                    setShowDropdown(true);
                  }
                }}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </form>

            {showDropdown && searchTerm.trim().length >= 2 ? (
              <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
                {searchLoading ? (
                  <p className="px-2 py-3 text-sm text-stone-500">Searching...</p>
                ) : suggestions.length ? (
                  <div className="space-y-1">
                    {suggestions.map((item) => (
                      <Link
                        key={item.id}
                        href={`/product/${encodeURIComponent(item.id)}`}
                        onClick={() => {
                          setShowDropdown(false);
                          setSearchTerm(item.name);
                        }}
                        className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-stone-100"
                      >
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={36}
                            height={36}
                            className="h-9 w-9 rounded-md border border-stone-200 object-cover"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-md border border-stone-200 bg-stone-100" />
                        )}
                        <span className="line-clamp-1 text-sm text-stone-700">{item.name}</span>
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setShowDropdown(false);
                        router.push(`/shop?q=${encodeURIComponent(searchTerm.trim())}`);
                      }}
                      className="w-full rounded-lg px-2 py-2 text-left text-sm font-semibold text-brand-dark transition hover:bg-stone-100"
                    >
                      View all results
                    </button>
                  </div>
                ) : (
                  <p className="px-2 py-3 text-sm text-stone-500">No products found.</p>
                )}
              </div>
            ) : null}
          </div>

          <HeaderIndicators variant="hero" />
          <div className="hidden items-center gap-2 md:flex md:gap-3">
            <HeaderAuth variant="hero" />
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/30 text-white transition hover:bg-white/10 lg:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div
          className="border-t border-white/15 lg:hidden"
          style={{
            backgroundColor: "#a8743d",
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.09) 1px, transparent 0), radial-gradient(120% 60% at 15% 10%, rgba(255,255,255,0.08), transparent 55%), linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0) 22%, rgba(0,0,0,0.08) 40%, rgba(255,255,255,0.04) 58%, rgba(0,0,0,0.08) 80%, rgba(255,255,255,0.03)), repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 5px), linear-gradient(135deg, #b68449 0%, #a8743d 45%, #966532 100%)",
            backgroundSize: "24px 24px, 100% 100%, 100% 100%, 220px 100%, 100% 100%",
          }}
        >
          <nav className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-4">
            <form onSubmit={submitSearch} className="mb-2">
              <label htmlFor="site-mobile-search" className="sr-only">
                Search products
              </label>
              <input
                id="site-mobile-search"
                type="search"
                value={searchTerm}
                onFocus={() => {
                  if (searchTerm.trim().length >= 2) {
                    setShowDropdown(true);
                  }
                }}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-brand"
              />
            </form>
            {showDropdown && searchTerm.trim().length >= 2 ? (
              <div className="mb-3 rounded-xl border border-stone-200 bg-white p-2">
                {searchLoading ? (
                  <p className="px-2 py-2 text-sm text-stone-500">Searching...</p>
                ) : suggestions.length ? (
                  <>
                    <div className="space-y-1">
                      {suggestions.map((item) => (
                        <Link
                          key={item.id}
                          href={`/product/${encodeURIComponent(item.id)}`}
                          onClick={() => {
                            setShowDropdown(false);
                            setMobileOpen(false);
                          }}
                          className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-stone-100"
                        >
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              width={36}
                              height={36}
                              className="h-9 w-9 rounded-md border border-stone-200 object-cover"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-md border border-stone-200 bg-stone-100" />
                          )}
                          <span className="line-clamp-1 text-sm text-stone-700">{item.name}</span>
                        </Link>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDropdown(false);
                        setMobileOpen(false);
                        router.push(`/shop?q=${encodeURIComponent(searchTerm.trim())}`);
                      }}
                      className="mt-1 w-full rounded-lg px-2 py-2 text-left text-sm font-semibold text-brand-dark transition hover:bg-stone-100"
                    >
                      View all results
                    </button>
                  </>
                ) : (
                  <p className="px-2 py-2 text-sm text-stone-500">No products found.</p>
                )}
              </div>
            ) : null}
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  isNavActive(pathname, item.href) ? "bg-white/10 text-white" : "text-white/95 hover:bg-white/10"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/contact"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "rounded-lg px-3 py-2.5 text-sm font-medium transition",
                pathname === "/contact" ? "bg-white/10 text-white" : "text-white/95 hover:bg-white/10"
              )}
            >
              Contact
            </Link>
            <Link
              href="/account"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/95 hover:bg-white/10"
            >
              Account
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
