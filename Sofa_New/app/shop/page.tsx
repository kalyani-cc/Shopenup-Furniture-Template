import Link from "next/link";
import { ProductCard } from "@/components/ui/product-card";
import { getCategoriesList } from "@/lib/shopenup/categories";
import { listCollections } from "@/lib/shopenup/collections";
import { listProducts } from "@/lib/shopenup/product";

/** Default upper bound for the price filter when `maxPrice` is not in the URL. */
const DEFAULT_MAX_PRICE = 10000;

function parseNumber(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return parsed;
}

function prettyLabel(value: string): string {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildShopUrl(next: {
  q?: string;
  minPrice?: string;
  maxPrice?: string;
  category?: string;
  collection?: string;
}): string {
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.minPrice) params.set("minPrice", next.minPrice);
  if (next.maxPrice) params.set("maxPrice", next.maxPrice);
  if (next.category) params.set("category", next.category);
  if (next.collection) params.set("collection", next.collection);
  const query = params.toString();
  return query ? `/shop?${query}` : "/shop";
}

type ShopPageProps = {
  searchParams?: {
    q?: string;
    minPrice?: string;
    maxPrice?: string;
    category?: string;
    collection?: string;
  };
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const [products, categoriesResponse, collectionsFromApi] = await Promise.all([
    listProducts(),
    getCategoriesList(0, 100).catch(() => ({ product_categories: [] as { handle?: string; name?: string }[] })),
    listCollections(100),
  ]);
  const q = (searchParams?.q || "").trim().toLowerCase();
  const selectedCategory = (searchParams?.category || "").trim().toLowerCase();
  const selectedCollection = (searchParams?.collection || "").trim().toLowerCase();
  const minPrice = parseNumber(searchParams?.minPrice) ?? 0;
  const maxPrice = parseNumber(searchParams?.maxPrice) ?? DEFAULT_MAX_PRICE;

  const categoryOptionPairsFromApi = (categoriesResponse.product_categories || [])
    .filter((c) => c.handle)
    .map((c) => [c.handle as string, (c.name || c.handle) as string] as [string, string]);

  const categoryOptionPairs =
    categoryOptionPairsFromApi.length > 0
      ? categoryOptionPairsFromApi.sort((a, b) => a[1].localeCompare(b[1]))
      : Array.from(
          new Map(
            products
              .filter((p) => p.category)
              .map((p) => [p.category, p.categoryLabel || prettyLabel(p.category)])
          ).entries()
        ).sort((a, b) => a[1].localeCompare(b[1]));

  const collectionOptionsFromApi = collectionsFromApi
    .filter((c) => c.handle)
    .map((c) => ({
      value: (c.handle as string).toLowerCase(),
      label: c.title || c.handle || "Collection",
    }));

  const collectionOptions =
    collectionOptionsFromApi.length > 0
      ? collectionOptionsFromApi.sort((a, b) => a.label.localeCompare(b.label))
      : Array.from(
          new Set(
            products
              .map((p) => p.collection?.trim())
              .filter((value): value is string => Boolean(value))
          )
        )
          .map((value) => ({
            value: value.toLowerCase(),
            label:
              products.find((p) => (p.collection || "").toLowerCase() === value.toLowerCase())?.collectionLabel ||
              value,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));

  const filteredProducts = products.filter((product) => {
    const matchesQuery = q
      ? `${product.name} ${product.description} ${product.category} ${product.collection || ""}`
          .toLowerCase()
          .includes(q)
      : true;

    const matchesCategory = selectedCategory ? product.category.toLowerCase() === selectedCategory : true;
    const productCollection = (product.collection || "").toLowerCase();
    const matchesCollection = selectedCollection ? productCollection === selectedCollection : true;
    const matchesMinPrice = minPrice !== undefined ? product.price >= minPrice : true;
    const matchesMaxPrice = maxPrice !== undefined ? product.price <= maxPrice : true;

    return matchesQuery && matchesCategory && matchesCollection && matchesMinPrice && matchesMaxPrice;
  });

  const hasActiveFilters = Boolean(
    q ||
      selectedCategory ||
      selectedCollection ||
      minPrice !== 0 ||
      maxPrice !== DEFAULT_MAX_PRICE
  );

  const filterPanel = (
    <>
      <div className="mb-5 flex items-center justify-between border-b border-stone-200 pb-3">
        <h2 className="text-lg font-semibold text-stone-900">Filters</h2>
        <Link href="/shop" className="text-xs font-semibold text-brand-dark hover:underline">
          Reset
        </Link>
      </div>

      <div className="mb-6 border-b border-stone-200 pb-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-700">Price</h3>
        <form action="/shop" method="GET" className="space-y-2">
          <input type="hidden" name="q" value={searchParams?.q || ""} />
          <input type="hidden" name="category" value={selectedCategory} />
          <input type="hidden" name="collection" value={selectedCollection} />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              name="minPrice"
              min={0}
              defaultValue={searchParams?.minPrice || "0"}
              placeholder="Min"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-brand"
            />
            <input
              type="number"
              name="maxPrice"
              min={0}
              defaultValue={searchParams?.maxPrice || String(DEFAULT_MAX_PRICE)}
              placeholder="Max"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-brand"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-brand hover:text-brand"
          >
            Apply price
          </button>
        </form>
      </div>

      <div className="mb-6 border-b border-stone-200 pb-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-700">Category</h3>
        <div className="space-y-2">
          <Link
            href={buildShopUrl({
              q: searchParams?.q || "",
              minPrice: searchParams?.minPrice || "",
              maxPrice: searchParams?.maxPrice || "",
              category: "",
              collection: selectedCollection,
            })}
            className={`block rounded-lg px-3 py-2 text-sm transition ${
              !selectedCategory ? "bg-brand/10 font-semibold text-brand-dark" : "text-stone-700 hover:bg-stone-100"
            }`}
          >
            All categories
          </Link>
          {categoryOptionPairs.map(([category, label]) => (
            <Link
              key={category}
              href={buildShopUrl({
                q: searchParams?.q || "",
                minPrice: searchParams?.minPrice || "",
                maxPrice: searchParams?.maxPrice || "",
                category,
                collection: selectedCollection,
              })}
              className={`block rounded-lg px-3 py-2 text-sm transition ${
                selectedCategory === category
                  ? "bg-brand/10 font-semibold text-brand-dark"
                  : "text-stone-700 hover:bg-stone-100"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-700">Collection</h3>
        <div className="max-h-56 space-y-2 overflow-auto pr-1">
          <Link
            href={buildShopUrl({
              q: searchParams?.q || "",
              minPrice: searchParams?.minPrice || "",
              maxPrice: searchParams?.maxPrice || "",
              category: selectedCategory,
              collection: "",
            })}
            className={`block rounded-lg px-3 py-2 text-sm transition ${
              !selectedCollection
                ? "bg-brand/10 font-semibold text-brand-dark"
                : "text-stone-700 hover:bg-stone-100"
            }`}
          >
            All collections
          </Link>
          {collectionOptions.map((opt) => (
            <Link
              key={opt.value}
              href={buildShopUrl({
                q: searchParams?.q || "",
                minPrice: searchParams?.minPrice || "",
                maxPrice: searchParams?.maxPrice || "",
                category: selectedCategory,
                collection: opt.value,
              })}
              className={`block rounded-lg px-3 py-2 text-sm transition ${
                selectedCollection === opt.value
                  ? "bg-brand/10 font-semibold text-brand-dark"
                  : "text-stone-700 hover:bg-stone-100"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <main>
      <section className="mx-auto max-w-7xl px-6 py-10 lg:py-14">
        <div className="grid items-start gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden rounded-2xl border border-stone-200 bg-white p-5 shadow-card lg:sticky lg:top-24 lg:block">
            {filterPanel}
          </aside>

          <div className="space-y-4">
            <details className="group rounded-2xl border border-stone-200 bg-white p-4 shadow-card lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between">
                <span className="text-base font-semibold text-stone-900">Filters</span>
                <span className="text-lg text-stone-500 group-open:hidden">▼</span>
                <span className="hidden text-lg text-stone-500 group-open:inline">▲</span>
              </summary>
              <div className="mt-4">{filterPanel}</div>
            </details>

          <div className="max-h-[60vh] overflow-y-auto rounded-2xl lg:max-h-none lg:overflow-visible">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-stone-600">
                {filteredProducts.length} result{filteredProducts.length === 1 ? "" : "s"} found
              </p>
              {hasActiveFilters ? (
                <p className="text-xs text-stone-500">Active filters applied</p>
              ) : null}
            </div>

            {!filteredProducts.length ? (
              <p className="rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
                No products found. Try changing filters or search terms.
              </p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.slug} product={product} />
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      </section>
    </main>
  );
}
