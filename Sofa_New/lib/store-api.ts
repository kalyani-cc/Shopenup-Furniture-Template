import { categories as fallbackCategories, type Category, type Product } from "@/lib/store-data";
import { sdk } from "@/lib/config";
import { getCompleteHeaders } from "@/lib/shopenup/cookies";

type StoreCollection = {
  id: string;
  handle?: string;
  title?: string;
};

type StoreProduct = {
  id: string;
  handle?: string;
  title?: string;
  description?: string;
  collection?: StoreCollection | null;
  variants?: Array<{
    calculated_price?: {
      calculated_amount?: number;
      original_amount?: number;
    };
    prices?: Array<{
      amount?: number;
    }>;
  }>;
};

async function fetchBackend<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T | null> {
  try {
    return await sdk.client.fetch<T>(path, {
      query: params,
      next: { revalidate: 60 },
      headers: await getCompleteHeaders(),
    });
  } catch {
    return null;
  }
}

function getPrice(product: StoreProduct): { price: number; oldPrice?: number } {
  const variant = product.variants?.[0];
  const calculated = variant?.calculated_price?.calculated_amount;
  const original = variant?.calculated_price?.original_amount;
  const variantPrice = variant?.prices?.[0]?.amount;
  const amount = calculated ?? variantPrice ?? 0;
  const oldAmount = original && original > amount ? original : undefined;

  return {
    price: amount,
    oldPrice: oldAmount,
  };
}

function mapProduct(product: StoreProduct): Product {
  const mappedPrice = getPrice(product);

  return {
    slug: product.handle || product.id,
    name: product.title || "Untitled Product",
    category: product.collection?.handle || "uncategorized",
    description: product.description || "No description available.",
    price: mappedPrice.price,
    oldPrice: mappedPrice.oldPrice,
  };
}

export async function listStoreProducts(limit = 100): Promise<StoreProduct[]> {
  const data = await fetchBackend<{ products?: StoreProduct[] }>("/store/products", {
    limit,
  });
  return data?.products || [];
}

export async function listStoreCollections(limit = 100): Promise<StoreCollection[]> {
  const data = await fetchBackend<{ collections?: StoreCollection[] }>("/store/collections", {
    limit,
  });
  return data?.collections || [];
}

export async function getStoreProductByHandle(handle: string): Promise<StoreProduct | null> {
  const data = await fetchBackend<{ products?: StoreProduct[] }>("/store/products", {
    handle,
    limit: 1,
  });
  return data?.products?.[0] || null;
}

export async function getProducts(): Promise<Product[]> {
  const products = await listStoreProducts(100);
  const mapped = products.map(mapProduct);
  return mapped;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const products = await getProducts();
  return products.find((item) => item.slug === slug) || null;
}

export async function getCategories(): Promise<Category[]> {
  const collections = await listStoreCollections(100);
  const mapped =
    collections
      .filter((collection) => collection.handle)
      .map((collection) => ({
        slug: collection.handle as string,
        name: collection.title || collection.handle || "Category",
        description: "Products in this category.",
        products: 0,
      })) || [];

  if (!mapped.length) {
    return fallbackCategories;
  }

  const allProducts = await getProducts();
  return mapped.map((category) => ({
    ...category,
    products: allProducts.filter((product) => product.category === category.slug).length,
  }));
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const categories = await getCategories();
  return categories.find((item) => item.slug === slug) || null;
}

export async function getProductsByCategory(slug: string): Promise<Product[]> {
  const products = await getProducts();
  return products.filter((item) => item.category === slug);
}
