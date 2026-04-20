"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { addToCart } from "@/lib/shopenup/cart";
import {
  listWishlistProducts,
  removeFromWishlist,
  type FavouriteProduct,
} from "@/lib/shopenup/wishlist";
import { formatCurrency } from "@/lib/utils";

export function FavouritesClient() {
  const [items, setItems] = useState<FavouriteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const data = await listWishlistProducts();
      setItems(data);
    } catch {
      setError("Failed to load favourites.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return <section className="mx-auto max-w-7xl px-6 py-14">Loading favourites...</section>;
  }

  if (!items.length) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
          <h2 className="text-xl font-semibold text-stone-900">No favourites yet</h2>
          <p className="mt-2 text-sm text-stone-600">
            Save products with the Favourite button to quickly find them here later.
          </p>
          <Link href="/shop" className="mt-4 inline-block text-sm font-medium text-brand-dark">
            Browse Products
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-14">
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      <div className="grid gap-4">
        {items.map((item) => (
          <div
            key={item.variantId || item.slug}
            className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-card"
          >
            <div className="flex items-center gap-4">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  width={72}
                  height={72}
                  className="h-[72px] w-[72px] rounded-lg border border-stone-200 object-cover"
                />
              ) : (
                <div className="h-[72px] w-[72px] rounded-lg border border-stone-200 bg-stone-100" />
              )}
              <div>
                <Link
                  href={`/product/${encodeURIComponent(item.id || item.slug)}`}
                  className="text-lg font-semibold text-stone-900 hover:text-brand"
                >
                  {item.name}
                </Link>
                <p className="mt-2 font-semibold text-stone-900">{formatCurrency(item.price)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!item.variantId}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-brand hover:text-brand disabled:opacity-60"
                onClick={async () => {
                  try {
                    if (!item.variantId) {
                      return;
                    }
                    await addToCart(item.variantId, 1);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Failed to add to cart.");
                  }
                }}
              >
                Add to Cart
              </button>
              <button
                type="button"
                disabled={!item.variantId}
                className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                onClick={async () => {
                  try {
                    await removeFromWishlist(item.variantId);
                    await load();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Failed to remove favourite.");
                  }
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

