import Link from "next/link";
import Image from "next/image";
import { Product } from "@/lib/store-data";
import { FavouriteToggleButton } from "@/components/ui/favourite-toggle-button";
import { formatCurrency } from "@/lib/utils";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
      {product.image ? (
        <Image
          src={product.image}
          alt={product.name}
          className="mb-4 h-44 w-full rounded-xl bg-stone-100 object-cover"
          width={400}
          height={176}
        />
      ) : (
        <div className="mb-4 h-44 rounded-xl bg-stone-100" />
      )}
      {product.badge ? (
        <span className="mb-3 inline-flex rounded-full bg-brand/15 px-2 py-1 text-xs font-semibold uppercase text-brand-dark">
          {product.badge}
        </span>
      ) : null}
      <h3 className="text-lg font-semibold text-stone-900">{product.name}</h3>
      <div className="mt-4 flex items-end justify-between">
        <div>
          {product.oldPrice ? (
            <p className="text-sm text-stone-400 line-through">{formatCurrency(product.oldPrice)}</p>
          ) : null}
          <p className="text-lg font-semibold text-stone-900">{formatCurrency(product.price)}</p>
        </div>
        <div className="flex items-center gap-2">
          <FavouriteToggleButton product={product} />
          <Link
            href={`/product/${encodeURIComponent(product.id || product.slug)}`}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-brand hover:text-brand"
          >
            View
          </Link>
        </div>
      </div>
    </article>
  );
}
