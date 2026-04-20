/**
 * Minimal Shopenup-compatible store client (public npm does not ship @shopenup/js-sdk).
 * Matches the subset of @shopenup/js-sdk used by this app: client.fetch, auth, store.customer, store.cart.
 */

export type ClientFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined>;
  headers?: HeadersInit;
  cache?: RequestCache;
  next?: { revalidate?: number; tags?: string[] };
};

const SHOPENUP_BACKEND_URL =
  process.env.NEXT_PUBLIC_SHOPENUP_BACKEND_URL || "http://localhost:9000";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SHOPENUP_PUBLISHABLE_KEY ||
  "pk_03d087dc82a71a3723b4ebfc54024a1b7ad03ab5c58b15d27129f8c482bfac5f";

function buildQueryString(query?: ClientFetchOptions["query"]): string {
  if (!query) {
    return "";
  }
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, String(entry)));
      return;
    }
    params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function mergeHeaders(base: Record<string, string>, extra?: HeadersInit): Record<string, string> {
  const out = { ...base };
  if (!extra) {
    return out;
  }
  const h = new Headers(extra);
  h.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

async function clientFetch<T>(path: string, options: ClientFetchOptions = {}): Promise<T> {
  const { query, method, body, headers: initHeaders, cache, next } = options;
  const url = `${SHOPENUP_BACKEND_URL}${path}${buildQueryString(query)}`;

  const headers = mergeHeaders(
    {
      ...(PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : {}),
    },
    initHeaders
  );

  if (body !== undefined && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method: method || "GET",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache,
    next,
  });

  if (!response.ok) {
    const errBody = (await response.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
    };
    const msg = errBody.message || errBody.error;
    throw new Error(msg || `Request failed: ${response.status} ${response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return (await response.json()) as T;
  }

  return undefined as T;
}

export const sdk = {
  client: {
    fetch: clientFetch,
  },

  auth: {
    async login(
      actor: "customer",
      method: "emailpass",
      payload: { email: string; password: string }
    ): Promise<string | { location: string }> {
      const data = await clientFetch<{ token?: string; location?: string }>(
        `/auth/${actor}/${method}`,
        {
          method: "POST",
          body: payload,
          cache: "no-store",
        }
      );
      if (data?.location) {
        return { location: data.location };
      }
      if (!data?.token) {
        throw new Error("No authentication token returned.");
      }
      return data.token;
    },

    async register(
      actor: "customer",
      method: "emailpass",
      payload: { email: string; password: string }
    ): Promise<string> {
      const data = await clientFetch<{ token?: string }>(`/auth/${actor}/${method}/register`, {
        method: "POST",
        body: payload,
        cache: "no-store",
      });
      if (!data?.token) {
        throw new Error("No registration token returned.");
      }
      return data.token;
    },

    async logout(): Promise<void> {
      /* JWT is stored in app cookie (_shopenup_jwt); no session DELETE unless you add session auth. */
    },
  },

  store: {
    customer: {
      async create(
        body: { email: string; first_name: string; last_name: string; phone?: string },
        _query: Record<string, never>,
        headers: HeadersInit
      ): Promise<{ customer: unknown }> {
        return clientFetch<{ customer: unknown }>("/store/customers", {
          method: "POST",
          body,
          headers,
          cache: "no-store",
        });
      },
    },

    cart: {
      async transferCart(cartId: string, _query: Record<string, never>, headers: HeadersInit): Promise<unknown> {
        return clientFetch(`/store/carts/${cartId}/customer`, {
          method: "POST",
          headers,
          cache: "no-store",
        });
      },
    },
  },
};
