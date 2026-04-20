import { sdk } from "@/lib/config";
import { getCompleteHeaders } from "@/lib/shopenup/cookies";
import { categories as fallbackCategories, type Category, type Product } from "@/lib/store-data";
import { listProducts } from "@/lib/shopenup/product";

type StoreProductCategory = {
  id: string;
  handle?: string;
  name?: string;
  description?: string | null;
  product_count?: number;
};

/**
 * Raw product categories from the Store API (aligned with Shopenup Storefront getCategoriesList).
 */
export async function getCategoriesList(offset = 0, limit = 100) {
  return sdk.client.fetch<{ product_categories: StoreProductCategory[] }>("/store/product-categories", {
    query: {
      limit,
      offset,
      fields: "+category_children",
    },
    next: { tags: ["categories"], revalidate: 60 },
    headers: await getCompleteHeaders(),
  });
}

export async function listCategories(limit = 100, productsOverride?: Product[]): Promise<Category[]> {
  try {
    const response = await getCategoriesList(0, limit);
    const rows = response.product_categories || [];

    const mapped = rows
      .filter((c) => c.handle)
      .map((c) => {
        const slug = c.handle as string;
        const apiCount = typeof c.product_count === "number" ? c.product_count : undefined;
        return {
          slug,
          name: c.name || slug,
          description: (typeof c.description === "string" && c.description) || "Browse products in this category.",
          apiCount,
        };
      });

    const products = productsOverride ?? (await listProducts(100));

    if (!mapped.length) {
      return fallbackCategories.map((cat) => ({
        ...cat,
        products: products.filter((item) => item.category === cat.slug).length,
      }));
    }

    return mapped.map((category) => {
      const computed = products.filter((item) => item.category === category.slug).length;
      return {
        slug: category.slug,
        name: category.name,
        description: category.description,
        products: category.apiCount !== undefined ? category.apiCount : computed,
      };
    });
  } catch {
    const products = productsOverride ?? (await listProducts(100));
    return fallbackCategories.map((cat) => ({
      ...cat,
      products: products.filter((item) => item.category === cat.slug).length,
    }));
  }
}

export async function getCategoryByHandle(handle: string): Promise<Category | null> {
  const categories = await listCategories(100);
  return categories.find((item) => item.slug === handle) || null;
}
