"use client";

import { useState } from "react";
import { addToCart } from "@/lib/shopenup/cart";

type AddToCartButtonProps = {
  variantId?: string;
};

export function AddToCartButton({ variantId }: AddToCartButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex min-w-0 flex-wrap items-stretch gap-3">
        <div className="inline-flex h-12 shrink-0 overflow-hidden rounded-lg border border-stone-300 bg-white">
          <button
            type="button"
            className="flex w-11 items-center justify-center text-sm text-stone-700 transition hover:bg-stone-50"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
          >
            -
          </button>
          <span className="flex min-w-[2.75rem] items-center justify-center border-x border-stone-300 px-2 text-sm font-semibold tabular-nums text-stone-900">
            {quantity}
          </span>
          <button
            type="button"
            className="flex w-11 items-center justify-center text-sm text-stone-700 transition hover:bg-stone-50"
            onClick={() => setQuantity((q) => q + 1)}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <button
          type="button"
          disabled={!variantId || loading}
          onClick={async () => {
            if (!variantId) {
              setMessage("This product is currently unavailable.");
              return;
            }

            try {
              setLoading(true);
              setMessage("");
              await addToCart(variantId, quantity);
              setMessage(`Added ${quantity} item${quantity > 1 ? "s" : ""} to cart.`);
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Failed to add item.");
            } finally {
              setLoading(false);
            }
          }}
          className="inline-flex h-12 min-w-[10rem] flex-1 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60 sm:min-w-[11rem]"
        >
          {loading ? "Adding..." : "Add To Cart"}
        </button>
      </div>
      {message ? <p className="text-xs text-stone-600">{message}</p> : null}
    </div>
  );
}
