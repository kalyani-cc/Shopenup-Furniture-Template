import Image from "next/image";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/ui/add-to-cart-button";
import { FavouriteToggleButton } from "@/components/ui/favourite-toggle-button";
import { ProductCard } from "@/components/ui/product-card";
import { ProductReviews } from "@/components/ui/product-reviews";

import { getProductByHandle, getProductById, listProductsByCategory } from "@/lib/shopenup/product";
import { formatCurrency } from "@/lib/utils";

type ProductPageProps = {
  params: { id: string };
};

export default async function ProductPage({ params }: ProductPageProps) {
  const segment = decodeURIComponent(params.id);
  const product =
    (await getProductById(segment)) || (await getProductByHandle(segment));
  if (!product) {
    notFound();
  }

  const relatedProductsRaw = product.category ? await listProductsByCategory(product.category) : [];
  const relatedProducts = relatedProductsRaw
    .filter((p) => p.id && p.id !== product.id)
    .slice(0, 4);

  const rating = Number(product.rating || 0);
  const reviewCount = Number(product.reviewCount || 0);
  const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(rating));

  return (
    <main className="mx-auto max-w-7xl px-6 py-14">
      <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_1fr]">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            className="h-[460px] w-full rounded-3xl bg-stone-200 object-cover"
            width={800}
            height={460}
          />
        ) : (
          <div className="h-[460px] rounded-3xl bg-stone-200" />
        )}
        <div className="rounded-2xl border border-stone-200 bg-white p-7 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark">Best Sellers</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-stone-900">{product.name}</h1>
          <p className="mt-3 max-w-xl text-stone-600">{product.description}</p>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-amber-500" aria-label={`${rating.toFixed(1)} out of 5`}>
              {stars.map((filled, idx) => (
                <span key={idx}>{filled ? "★" : "☆"}</span>
              ))}
            </span>
            <span className="font-medium text-stone-700">({rating.toFixed(1)})</span>
            <span className="text-stone-400">|</span>
            <span className="text-stone-600">{reviewCount} ratings</span>
          </div>
          <div className="mt-6 border-t border-stone-200 pt-5">
            {product.oldPrice ? (
              <p className="text-lg text-stone-400 line-through">{formatCurrency(product.oldPrice)}</p>
            ) : null}
            <p className="text-3xl font-semibold text-stone-900">{formatCurrency(product.price)}</p>
          </div>
          <div className="mt-6 border-t border-stone-200 pt-5">
            <p className="mb-3 text-sm font-semibold text-stone-700">Select Quantity</p>
            <div className="flex flex-wrap items-start gap-3">
              <AddToCartButton variantId={product.variantId} />
              <FavouriteToggleButton
                product={product}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-stone-300 bg-white text-lg leading-none text-stone-800 transition hover:border-brand hover:text-brand disabled:opacity-60"
              />
            </div>
          </div>
        </div>
      </div>

      <ProductReviews productId={product.id || ""} />

      {relatedProducts.length ? (

        <section className="mt-14 border-t border-stone-200 pt-10">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-stone-900">Related products</h2>
              <p className="mt-1 text-sm text-stone-600">More items from the same category.</p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id || p.slug} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
