import { sdk } from "@/lib/config";
import { getCompleteHeaders, getCartId, setCartId, removeCartId } from "@/lib/shopenup/cookies";

export type StoreCartItem = {
  id: string;
  title?: string;
  quantity: number;
  unit_price?: number;
  subtotal?: number;
  total?: number;
  product_title?: string;
  variant_title?: string;
  thumbnail?: string;
};

export type StoreCart = {
  id: string;
  items: StoreCartItem[];
  subtotal?: number;
  total?: number;
  currency_code?: string;
  region_id?: string;
  payment_collections?: Array<{ id: string }>;
  completed_at?: string | null;
};

type Region = { id: string };

type RawStoreCart = StoreCart & {
  items?: Array<StoreCartItem & { quantity?: number }>;
};

function normalizeCart(cart: StoreCart): StoreCart {
  const items = Array.isArray(cart.items) ? cart.items.filter((item) => (item.quantity || 0) > 0) : [];
  return {
    ...cart,
    items,
  };
}

function emitCartChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sofa_new:cart_changed"));
  }
}

async function headers() {
  return getCompleteHeaders();
}

async function getDefaultRegionId(): Promise<string> {
  const response = await sdk.client.fetch<{ regions: Region[] }>("/store/regions", {
    query: { limit: 1 },
    cache: "no-store",
    headers: await headers(),
  });

  const regionId = response.regions?.[0]?.id;
  if (!regionId) {
    throw new Error("No region found for cart creation.");
  }

  return regionId;
}

async function createCart(): Promise<StoreCart> {
  const regionId = await getDefaultRegionId();
  const response = await sdk.client.fetch<{ cart: StoreCart }>("/store/carts", {
    method: "POST",
    body: { region_id: regionId },
    cache: "no-store",
    headers: await headers(),
  });
  setCartId(response.cart.id);
  emitCartChanged();
  return response.cart;
}

export async function retrieveCart(): Promise<StoreCart | null> {
  const cartId = getCartId();
  if (!cartId) {
    return null;
  }

  try {
    const response = await sdk.client.fetch<{ cart: StoreCart }>(`/store/carts/${cartId}`, {
      cache: "no-store",
      headers: await headers(),
    });
    if (response.cart?.completed_at) {
      removeCartId();
      emitCartChanged();
      return null;
    }
    return normalizeCart(response.cart);
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    const looksLikeNotFound = /not found/i.test(message);
    const looksLikeInvalid = /invalid/i.test(message);

    // Only clear cart id when it's truly invalid/non-existent.
    // For transient errors (500, network, misconfig), keep the cart id so "retry" doesn't wipe the cart.
    if (looksLikeNotFound || looksLikeInvalid) {
      removeCartId();
      emitCartChanged();
      return null;
    }

    throw e;
  }
}

async function getOrCreateCart(): Promise<StoreCart> {
  const cartId = getCartId();
  try {
    const existing = await retrieveCart();
    if (existing) {
      return existing;
    }
  } catch (e) {
    // If we have a cart id but retrieval failed, don't create a new cart (would overwrite the id).
    // Let the caller show an error and allow the user to retry.
    if (cartId) {
      throw e;
    }
  }

  return createCart();
}

export async function addToCart(variantId: string, quantity = 1): Promise<StoreCart> {
  if (!variantId) {
    throw new Error("Variant not available for this product.");
  }

  const cart = await getOrCreateCart();
  const response = await sdk.client.fetch<{ cart: StoreCart }>(`/store/carts/${cart.id}/line-items`, {
    method: "POST",
    body: {
      variant_id: variantId,
      quantity,
    },
    cache: "no-store",
    headers: await headers(),
  });
  emitCartChanged();
  return normalizeCart(response.cart);
}

export async function updateCartItem(lineId: string, quantity: number): Promise<StoreCart> {
  const cart = await getOrCreateCart();
  const response = await sdk.client.fetch<{ cart: StoreCart }>(`/store/carts/${cart.id}/line-items/${lineId}`, {
    method: "POST",
    body: { quantity },
    cache: "no-store",
    headers: await headers(),
  });
  emitCartChanged();
  return normalizeCart(response.cart);
}

export async function removeCartItem(lineId: string): Promise<StoreCart> {
  const cart = await getOrCreateCart();
  try {
    // Prefer quantity=0 update to avoid implementations that clear the entire cart on DELETE.
    const updated = await sdk.client.fetch<{ cart: StoreCart }>(`/store/carts/${cart.id}/line-items/${lineId}`, {
      method: "POST",
      body: { quantity: 0 },
      cache: "no-store",
      headers: await headers(),
    });
    emitCartChanged();
    return normalizeCart(updated.cart);
  } catch {
    const response = await sdk.client.fetch<{ cart: StoreCart }>(`/store/carts/${cart.id}/line-items/${lineId}`, {
      method: "DELETE",
      cache: "no-store",
      headers: await headers(),
    });
    emitCartChanged();
    return normalizeCart(response.cart);
  }
}

export async function updateCart(payload: {
  email?: string;
  shipping_address?: Record<string, unknown>;
  billing_address?: Record<string, unknown>;
}): Promise<StoreCart> {
  const cart = await getOrCreateCart();
  const response = await sdk.client.fetch<{ cart: StoreCart }>(`/store/carts/${cart.id}`, {
    method: "POST",
    body: payload,
    cache: "no-store",
    headers: await headers(),
  });
  return normalizeCart(response.cart);
}

export async function listShippingOptions(): Promise<
  Array<{ id: string; name?: string; price_type?: string; provider_id?: string }>
> {
  const cart = await getOrCreateCart();
  const response = await sdk.client.fetch<{
    shipping_options?: Array<{ id: string; name?: string; price_type?: string; provider_id?: string }>;
  }>("/store/shipping-options", {
    query: { cart_id: cart.id },
    cache: "no-store",
    headers: await headers(),
  });
  return response.shipping_options || [];
}

export async function addShippingMethod(
  optionId: string,
  data?: Record<string, unknown>
): Promise<StoreCart> {
  const cart = await getOrCreateCart();
  const response = await sdk.client.fetch<{ cart: StoreCart }>(`/store/carts/${cart.id}/shipping-methods`, {
    method: "POST",
    body: data ? { option_id: optionId, data } : { option_id: optionId },
    cache: "no-store",
    headers: await headers(),
  });
  return normalizeCart(response.cart);
}

export async function initializePaymentSessions(): Promise<StoreCart> {
  const cart = await getOrCreateCart();
  return cart;
}

export async function listPaymentProviders(regionId?: string): Promise<Array<{ id: string }>> {
  if (!regionId) {
    return [];
  }

  const response = await sdk.client.fetch<{ payment_providers?: Array<{ id: string }> }>(
    "/store/payment-providers",
    {
      query: { region_id: regionId },
      cache: "no-store",
      headers: await headers(),
    }
  );
  return response.payment_providers || [];
}

async function getOrCreatePaymentCollectionId(cartId: string): Promise<string> {
  try {
    const created = await sdk.client.fetch<{ payment_collection?: { id: string } }>("/store/payment-collections", {
      method: "POST",
      body: { cart_id: cartId },
      cache: "no-store",
      headers: await headers(),
    });
    if (created.payment_collection?.id) {
      return created.payment_collection.id;
    }
  } catch {
    // continue with fallback read
  }

  const cartResponse = await sdk.client.fetch<{ cart: StoreCart }>(`/store/carts/${cartId}`, {
    cache: "no-store",
    headers: await headers(),
  });
  const existingId = cartResponse.cart.payment_collections?.[0]?.id;
  if (!existingId) {
    throw new Error("Unable to initialize payment collection for this cart.");
  }
  return existingId;
}

async function cleanupZeroQuantityItems(cartId: string): Promise<void> {
  const current = await sdk.client.fetch<{ cart: RawStoreCart }>(`/store/carts/${cartId}`, {
    cache: "no-store",
    headers: await headers(),
  });

  const zeroQtyItems = (current.cart.items || []).filter((item) => (item.quantity || 0) <= 0);
  if (!zeroQtyItems.length) {
    return;
  }

  for (const item of zeroQtyItems) {
    if (!item.id) {
      continue;
    }
    try {
      await sdk.client.fetch(`/store/carts/${cartId}/line-items/${item.id}`, {
        method: "DELETE",
        cache: "no-store",
        headers: await headers(),
      });
    } catch {
      // If cleanup for one line fails, continue trying other invalid lines.
    }
  }
}

export async function setPaymentSession(providerId: string): Promise<StoreCart> {
  const cart = await getOrCreateCart();
  const paymentCollectionId = await getOrCreatePaymentCollectionId(cart.id);

  await sdk.client.fetch<{ payment_collection: { id: string } }>(
    `/store/payment-collections/${paymentCollectionId}/payment-sessions`,
    {
      method: "POST",
      body: { provider_id: providerId },
      cache: "no-store",
      headers: await headers(),
    }
  );

  const response = await sdk.client.fetch<{ cart: StoreCart }>(`/store/carts/${cart.id}`, {
    cache: "no-store",
    headers: await headers(),
  });

  return normalizeCart(response.cart);
}

export async function completeCart(): Promise<{ order?: { id: string }; type?: string }> {
  const cart = await getOrCreateCart();
  await cleanupZeroQuantityItems(cart.id);
  const response = await sdk.client.fetch<{ order?: { id: string }; type?: string }>(
    `/store/carts/${cart.id}/complete`,
    {
      method: "POST",
      cache: "no-store",
      headers: await headers(),
    }
  );
  removeCartId();
  emitCartChanged();
  return response;
}
