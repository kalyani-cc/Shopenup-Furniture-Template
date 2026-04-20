"use client";

import type { Product } from "@/lib/store-data";
import { sdk } from "@/lib/config";
import { getAuthHeaders, getCompleteHeaders } from "@/lib/shopenup/cookies";

const GUEST_WISHLIST_KEY = "sofa_new_guest_wishlist";

export type FavouriteProduct = Product & {
  variantId?: string;
  wishlistItemId?: string;
};

type WishlistItem = {
  id: string;
  product_variant_id?: string;
  product_variant?: {
    id?: string;
    title?: string;
    prices?: Array<{ amount?: number }>;
    product?: {
      id?: string;
      handle?: string;
      title?: string;
      description?: string;
      thumbnail?: string;
      collection?: { handle?: string; title?: string };
    };
  };
};

type WishlistResponse = {
  wishlist?: {
    id: string;
    items?: WishlistItem[];
  };
};

function emitWishlistChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sofa_new:wishlist_changed"));
  }
}

function slugify(value?: string): string {
  if (!value) {
    return "uncategorized";
  }
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function readGuestWishlist(): FavouriteProduct[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(GUEST_WISHLIST_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as FavouriteProduct[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGuestWishlist(items: FavouriteProduct[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(items));
}

async function getWishlistFromApi(): Promise<WishlistResponse["wishlist"] | null> {
  const authHeaders = await getAuthHeaders();
  if (!("authorization" in authHeaders)) {
    return null;
  }

  try {
    const res = await sdk.client.fetch<WishlistResponse>("/store/customers/me/wishlists", {
      method: "GET",
      headers: await getCompleteHeaders(),
      query: {
        fields:
          "items.id,items.product_variant_id,items.*product_variant.id,items.*product_variant.title,items.*product_variant.*prices,items.*product_variant.*product,items.*product_variant.*product.collection",
      },
      cache: "no-store",
    });
    return res.wishlist ?? null;
  } catch {
    // no wishlist yet or unauthorized
    return null;
  }
}

async function ensureWishlistExists(): Promise<void> {
  const authHeaders = await getAuthHeaders();
  if (!("authorization" in authHeaders)) {
    return;
  }
  const existing = await getWishlistFromApi();
  if (existing) {
    return;
  }
  await sdk.client.fetch("/store/customers/me/wishlists", {
    method: "POST",
    headers: await getCompleteHeaders(),
    cache: "no-store",
  });
}

function mapWishlistItem(item: WishlistItem): FavouriteProduct | null {
  const variant = item.product_variant;
  const product = variant?.product;
  if (!variant?.id || !product) {
    return null;
  }

  const price = variant.prices?.[0]?.amount ?? 0;
  return {
    id: product.id || product.handle || variant.id,
    slug: product.handle || product.id || variant.id,
    variantId: variant.id,
    wishlistItemId: item.id,
    name: product.title || "Untitled Product",
    description: product.description || "No description available.",
    image: product.thumbnail,
    price,
    category: product.collection?.handle || slugify(product.collection?.title),
  };
}

export async function listWishlistProducts(): Promise<FavouriteProduct[]> {
  const authHeaders = await getAuthHeaders();
  if (!("authorization" in authHeaders)) {
    return readGuestWishlist();
  }

  const wishlist = await getWishlistFromApi();
  if (!wishlist?.items?.length) {
    return [];
  }
  return wishlist.items.map(mapWishlistItem).filter((item): item is FavouriteProduct => Boolean(item));
}

export async function getWishlistCount(): Promise<number> {
  const items = await listWishlistProducts();
  return items.length;
}

export async function isFavourite(variantId?: string): Promise<boolean> {
  if (!variantId) {
    return false;
  }
  const items = await listWishlistProducts();
  return items.some((item) => item.variantId === variantId);
}

export async function addToWishlist(product: Product): Promise<void> {
  if (!product.variantId) {
    throw new Error("Variant not available for wishlist.");
  }

  const authHeaders = await getAuthHeaders();
  if (!("authorization" in authHeaders)) {
    const items = readGuestWishlist();
    if (!items.some((item) => item.variantId === product.variantId)) {
      writeGuestWishlist([...items, product]);
      emitWishlistChanged();
    }
    return;
  }

  await ensureWishlistExists();
  const existing = await listWishlistProducts();
  if (existing.some((item) => item.variantId === product.variantId)) {
    return;
  }

  await sdk.client.fetch("/store/customers/me/wishlists/items", {
    method: "POST",
    headers: await getCompleteHeaders(),
    body: { variant_id: product.variantId },
    cache: "no-store",
  });
  emitWishlistChanged();
}

export async function removeFromWishlist(variantId?: string): Promise<void> {
  if (!variantId) {
    return;
  }

  const authHeaders = await getAuthHeaders();
  if (!("authorization" in authHeaders)) {
    const next = readGuestWishlist().filter((item) => item.variantId !== variantId);
    writeGuestWishlist(next);
    emitWishlistChanged();
    return;
  }

  const items = await listWishlistProducts();
  const target = items.find((item) => item.variantId === variantId);
  if (!target?.wishlistItemId) {
    return;
  }

  await sdk.client.fetch(`/store/customers/me/wishlists/items/${target.wishlistItemId}`, {
    method: "DELETE",
    headers: await getCompleteHeaders(),
    cache: "no-store",
  });
  emitWishlistChanged();
}

