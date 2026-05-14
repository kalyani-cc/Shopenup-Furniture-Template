import { sdk } from "@/lib/config";
import { type Product } from "@/lib/store-data";
import { getCompleteHeaders } from "@/lib/shopenup/cookies";

type StoreCollection = {
  id: string;
  handle?: string;
  title?: string;
};

type StoreCategory = {
  id: string;
  handle?: string;
  name?: string;
  title?: string;
};

type StoreRegion = {
  id: string;
};

type StoreProduct = {
  id: string;
  handle?: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  images?: Array<{ url?: string }>;
  collection?: StoreCollection | null;
  categories?: StoreCategory[];
  variants?: Array<{
    id?: string;
    calculated_price?:
      | number
      | {
          calculated_amount?: number;
          original_amount?: number;
        };
    price?: number;
    prices?: Array<{
      amount?: number;
    }>;
  }>;
};

type ProductRating = {
  product_id: string;
  average_rating: number;
  total_reviews: number;
};

export type StoreReview = {
  id: string;
  product_id?: string | null;
  customer_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  title?: string | null;
  content?: string | null;
  rating?: number | null;
  created_at?: string | null;
};


let cachedRegionId: string | null = null;

/** Optional fixed region (same idea as passing region_id for storefront pricing). */
function regionIdFromEnv(): string | undefined {
  const id = process.env.NEXT_PUBLIC_SHOPENUP_DEFAULT_REGION_ID?.trim();
  return id || undefined;
}

async function getDefaultRegionId(): Promise<string | undefined> {
  const fromEnv = regionIdFromEnv();
  if (fromEnv) {
    cachedRegionId = fromEnv;
    return fromEnv;
  }

  if (cachedRegionId) {
    return cachedRegionId;
  }

  try {
    const response = await sdk.client.fetch<{ regions?: StoreRegion[] }>("/store/regions", {
      query: { limit: 50 },
      next: { tags: ["regions"], revalidate: 300 },
      headers: await getCompleteHeaders(),
    });

    const regionId = response.regions?.[0]?.id;
    if (regionId) {
      cachedRegionId = regionId;
      return regionId;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

/**
 * With `*variants.calculated_price`, Shopenup runs setPricingContext(), which requires a valid region_id.
 * Storefront-style listing uses the same fields; we fall back to variant prices when region is missing or invalid.
 */
const PRODUCT_FIELDS_WITH_CALCULATED_PRICE =
  "*categories,*collection,*variants.calculated_price,*variants.prices,*variants.id,thumbnail,images,title,description,handle";

const PRODUCT_FIELDS_WITHOUT_CALCULATED_PRICE =
  "*categories,*collection,*variants.prices,*variants.id,thumbnail,images,title,description,handle";

function mapPrice(product: StoreProduct): { price: number; oldPrice?: number } {
  const variant = product.variants?.[0];
  let calculated: number | undefined;
  let original: number | undefined;
  const cp = variant?.calculated_price;
  if (typeof cp === "number") {
    calculated = cp;
  } else if (cp && typeof cp === "object") {
    calculated = cp.calculated_amount;
    original = cp.original_amount;
  }
  const variantPrice =
    typeof variant?.price === "number" ? variant.price : variant?.prices?.[0]?.amount;
  const amount = calculated ?? variantPrice ?? 0;
  const oldAmount = original && original > amount ? original : undefined;

  return {
    price: amount,
    oldPrice: oldAmount,
  };
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

function mapProduct(product: StoreProduct): Product {
  const mappedPrice = mapPrice(product);
  const image = product.thumbnail || product.images?.[0]?.url;
  const primaryCategory = product.categories?.[0];
  const categoryLabel =
    primaryCategory?.name || primaryCategory?.title || product.collection?.title || "Uncategorized";
  const categorySlug =
    primaryCategory?.handle ||
    slugify(primaryCategory?.name || primaryCategory?.title) ||
    product.collection?.handle ||
    slugify(product.collection?.title);

  const collectionHandle =
    product.collection?.handle || slugify(product.collection?.title) || "";
  const collectionLabel =
    product.collection?.title || product.collection?.handle || "Uncategorized";

  return {
    id: product.id,
    slug: product.handle || product.id,
    variantId: product.variants?.[0]?.id,
    name: product.title || "Untitled Product",
    category: categorySlug,
    categoryLabel,
    collection: collectionHandle || collectionLabel,
    collectionLabel,
    description: product.description || "No description available.",
    price: mappedPrice.price,
    oldPrice: mappedPrice.oldPrice,
    rating: 0,
    reviewCount: 0,
    image,
  };
}

type FetchStoreProductsOptions = {
  limit: number;
  handle?: string;
};

async function fetchStoreProductsFromApi(options: FetchStoreProductsOptions): Promise<StoreProduct[]> {
  const headers = await getCompleteHeaders();
  const next = { tags: ["products"], revalidate: 60 };
  const limit = options.handle ? 1 : options.limit;

  const withCalculatedPrice = async (regionId: string) =>
    sdk.client.fetch<{ products?: StoreProduct[] }>("/store/products", {
      query: {
        limit,
        ...(options.handle ? { handle: options.handle } : {}),
        region_id: regionId,
        fields: PRODUCT_FIELDS_WITH_CALCULATED_PRICE,
      },
      next,
      headers,
    });

  const withoutCalculatedPrice = () =>
    sdk.client.fetch<{ products?: StoreProduct[] }>("/store/products", {
      query: {
        limit,
        ...(options.handle ? { handle: options.handle } : {}),
        fields: PRODUCT_FIELDS_WITHOUT_CALCULATED_PRICE,
      },
      next,
      headers,
    });

  const regionId = await getDefaultRegionId();

  if (regionId) {
    try {
      const res = await withCalculatedPrice(regionId);
      const list = res.products || [];
      if (list.length || options.handle) {
        return list;
      }
    } catch {
      if (!regionIdFromEnv()) {
        cachedRegionId = null;
      }
    }
  }

  try {
    const res = await withoutCalculatedPrice();
    return res.products || [];
  } catch {
    return [];
  }
}

/** Single product by id — `GET /store/products/:id` (same as Shopenup storefront retrieve). */
async function fetchStoreProductByIdFromApi(productId: string): Promise<StoreProduct | null> {
  const headers = await getCompleteHeaders();
  const next = { tags: ["products"], revalidate: 60 };
  const path = `/store/products/${encodeURIComponent(productId)}`;

  const withCalculatedPrice = async (regionId: string) =>
    sdk.client.fetch<{ product?: StoreProduct }>(path, {
      query: {
        region_id: regionId,
        fields: PRODUCT_FIELDS_WITH_CALCULATED_PRICE,
      },
      next,
      headers,
    });

  const withoutCalculatedPrice = () =>
    sdk.client.fetch<{ product?: StoreProduct }>(path, {
      query: {
        fields: PRODUCT_FIELDS_WITHOUT_CALCULATED_PRICE,
      },
      next,
      headers,
    });

  const regionId = await getDefaultRegionId();

  if (regionId) {
    try {
      const res = await withCalculatedPrice(regionId);
      if (res.product) {
        return res.product;
      }
    } catch {
      if (!regionIdFromEnv()) {
        cachedRegionId = null;
      }
    }
  }

  try {
    const res = await withoutCalculatedPrice();
    return res.product ?? null;
  } catch {
    return null;
  }
}

async function fetchRatingsForProductIds(productIds: string[]): Promise<Record<string, { rating: number; reviewCount: number }>> {
  if (!productIds.length) {
    return {};
  }
  try {
    const response = await sdk.client.fetch<{ ratings?: ProductRating[] }>("/store/reviews", {
      query: { product_ids: productIds.join(",") },
      cache: "no-store",
      headers: await getCompleteHeaders(),
    });

    const map: Record<string, { rating: number; reviewCount: number }> = {};
    (response.ratings || []).forEach((r) => {
      map[r.product_id] = {
        rating: r.average_rating || 0,
        reviewCount: r.total_reviews || 0,
      };
    });
    return map;
  } catch {
    return {};
  }
}

export async function listProductReviews(productId: string): Promise<StoreReview[]> {
  if (!productId) {
    return [];
  }
  try {
    const response = await sdk.client.fetch<any>(`/store/products/${productId}/reviews`, {
      cache: "no-store",
      headers: await getCompleteHeaders(),
    });

    const raw =
      (Array.isArray(response.reviews) && response.reviews) ||
      (Array.isArray(response.data) && response.data) ||
      (Array.isArray(response.items) && response.items) ||
      (response.review && Array.isArray(response.review.items) ? response.review.items : []);


    const extracted = (raw || [])
      .map((item: any) => {
        if (!item || typeof item !== "object") return null;
        return {
          id: item.id || Math.random().toString(36).slice(2),
          product_id: item.product_id,
          customer_id: item.customer_id,
          first_name: item.first_name,
          last_name: item.last_name,
          title: item.title,
          content: item.content,
          rating: item.rating,
          created_at: item.created_at,
        } as StoreReview;
      })
      .filter((r: StoreReview | null): r is StoreReview => Boolean(r && r.rating != null));

    if (extracted.length > 0) {
      return extracted;
    }

    // Fallback: If no individual reviews, check for summary ratings
    if (Array.isArray(response.ratings)) {
      const summary = response.ratings.find((r: any) => r.product_id === productId);
      if (summary && summary.total_reviews > 0) {
        return [
          {
            id: `summary-${productId}`,
            product_id: productId,
            title: "Customer Rating Summary",
            content: `There are ${summary.total_reviews} verified rating(s) for this product.`,
            rating: summary.average_rating,
            created_at: new Date().toISOString(),
          },
        ];
      }
    }

    return [];


  } catch {
    return [];
  }
}


export async function listProducts(limit = 100): Promise<Product[]> {
  try {
    const raw = await fetchStoreProductsFromApi({ limit });
    const products = raw.map(mapProduct);
    const ratingsMap = await fetchRatingsForProductIds(
      products.map((p) => p.id).filter((id): id is string => Boolean(id))
    );
    return products.map((p) => ({
      ...p,
      rating: p.id ? ratingsMap[p.id]?.rating || 0 : 0,
      reviewCount: p.id ? ratingsMap[p.id]?.reviewCount || 0 : 0,
    }));
  } catch {
    return [];
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  const trimmed = id?.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const raw = await fetchStoreProductByIdFromApi(trimmed);
    if (!raw) {
      return null;
    }
    const mapped = mapProduct(raw);
    const ratingsMap = await fetchRatingsForProductIds(raw.id ? [raw.id] : []);
    if (mapped.id && ratingsMap[mapped.id]) {
      mapped.rating = ratingsMap[mapped.id].rating;
      mapped.reviewCount = ratingsMap[mapped.id].reviewCount;
    }
    return mapped;
  } catch {
    return null;
  }
}

export async function getProductByHandle(handle: string): Promise<Product | null> {
  try {
    const raw = await fetchStoreProductsFromApi({ limit: 1, handle });
    const product = raw[0];
    if (!product) {
      return null;
    }
    const mapped = mapProduct(product);
    const ratingsMap = await fetchRatingsForProductIds(product.id ? [product.id] : []);
    if (mapped.id && ratingsMap[mapped.id]) {
      mapped.rating = ratingsMap[mapped.id].rating;
      mapped.reviewCount = ratingsMap[mapped.id].reviewCount;
    }
    return mapped;
  } catch {
    return null;
  }
}

export async function listProductsByCategory(categorySlug: string): Promise<Product[]> {
  const products = await listProducts(100);
  return products.filter((item) => item.category === categorySlug);
}
