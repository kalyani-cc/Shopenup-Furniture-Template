import { sdk } from "@/lib/config";
import { getCompleteHeaders } from "@/lib/shopenup/cookies";

export type StoreCollection = {
  id: string;
  handle?: string;
  title?: string;
  description?: string | null;
};

/**
 * Lists storefront collections from the backend (same endpoint as Shopenup Storefront productService.getCollections).
 */
export async function listCollections(limit = 100): Promise<StoreCollection[]> {
  try {
    const response = await sdk.client.fetch<{ collections?: StoreCollection[] }>("/store/collections", {
      query: { limit },
      next: { tags: ["collections"], revalidate: 60 },
      headers: await getCompleteHeaders(),
    });
    return response.collections || [];
  } catch {
    return [];
  }
}
