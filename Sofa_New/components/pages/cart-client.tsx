"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { removeCartItem, retrieveCart, updateCartItem, type StoreCart } from "@/lib/shopenup/cart";
import { formatCurrency } from "@/lib/utils";

export function CartClient() {
  const [cart, setCart] = useState<StoreCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCart = async () => {
    try {
      setLoading(true);
      const data = await retrieveCart();
      setCart(data);
    } catch {
      setError("Failed to load cart.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const subtotal = useMemo(() => {
    if (!cart?.items?.length) {
      return 0;
    }
    return cart.items.reduce((sum, item) => {
      const lineTotal = item.total ?? item.subtotal ?? (item.unit_price || 0) * item.quantity;
      return sum + lineTotal;
    }, 0);
  }, [cart]);

  if (loading) {
    return <section className="mx-auto max-w-7xl px-6 py-14">Loading cart...</section>;
  }

  if (!cart || !cart.items.length) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
          <h2 className="text-xl font-semibold text-stone-900">Your cart is empty</h2>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          <Link href="/shop" className="mt-4 inline-block text-sm font-medium text-brand-dark">
            Continue Shopping
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-4">
        {cart.items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-card sm:p-5 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              {item.thumbnail ? (
                <Image
                  src={item.thumbnail}
                  alt={item.product_title || item.title || "Cart item"}
                  width={72}
                  height={72}
                  className="h-[72px] w-[72px] rounded-lg border border-stone-200 object-cover"
                />
              ) : (
                <div className="h-[72px] w-[72px] rounded-lg border border-stone-200 bg-stone-100" />
              )}
              <div className="min-w-0">
                <h3 className="line-clamp-2 text-base font-semibold text-stone-900 sm:text-lg">
                  {item.product_title || item.title}
                </h3>
                {item.variant_title ? <p className="text-sm text-stone-500">{item.variant_title}</p> : null}
                <p className="mt-2 text-sm text-stone-600">Qty: {item.quantity}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded border border-stone-300 px-2 py-1 text-xs"
                    onClick={async () => {
                      const qty = Math.max(1, item.quantity - 1);
                      const updated = await updateCartItem(item.id, qty);
                      setCart(updated);
                    }}
                  >
                    -
                  </button>
                  <button
                    type="button"
                    className="rounded border border-stone-300 px-2 py-1 text-xs"
                    onClick={async () => {
                      const updated = await updateCartItem(item.id, item.quantity + 1);
                      setCart(updated);
                    }}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                    onClick={async () => {
                      const updated = await removeCartItem(item.id);
                      setCart(updated);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
            <p className="self-end text-lg font-semibold text-stone-900 md:self-auto">
              {formatCurrency(item.total ?? item.subtotal ?? (item.unit_price || 0) * item.quantity)}
            </p>
          </div>
        ))}
      </div>
      <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
        <h2 className="text-xl font-semibold text-stone-900">Order Summary</h2>
        <div className="mt-4 flex items-center justify-between text-stone-700">
          <p>Subtotal</p>
          <p>{formatCurrency(subtotal)}</p>
        </div>
        {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
        <Link
          href="/checkout"
          className="mt-6 block w-full rounded-xl bg-brand px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Checkout
        </Link>
        <Link href="/shop" className="mt-4 block text-center text-sm font-medium text-brand-dark">
          Continue Shopping
        </Link>
      </aside>
    </section>
  );
}
