import { NextRequest, NextResponse } from "next/server";
import { getProductByHandle, getProductById, listProducts } from "@/lib/shopenup/product";

/**
 * Proxies catalog data from the Shopenup store API (`GET /store/products`).
 *
 * Query:
 * - `limit` — optional, default 100, max 10000 (list mode)
 * - `id` — optional product id (`GET /store/products/:id`, same as storefront)
 * - `handle` — optional product handle (list filter; single product prefer `id`)
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const id = url.searchParams.get("id")?.trim();
  const handle = url.searchParams.get("handle")?.trim();
  const rawLimit = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(rawLimit)
    ? Math.min(10000, Math.max(1, Math.floor(rawLimit)))
    : 100;

  try {
    if (id) {
      const product = await getProductById(id);
      return NextResponse.json({ product: product ?? null });
    }
    if (handle) {
      const product = await getProductByHandle(handle);
      return NextResponse.json({ product: product ?? null });
    }

    const products = await listProducts(limit);
    return NextResponse.json({ products });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch products";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
