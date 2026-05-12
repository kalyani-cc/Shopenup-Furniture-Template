import Link from "next/link";
import type { StoreCollection } from "@/lib/shopenup/collections";

type CollectionCardProps = {
  collection: StoreCollection;
  image?: string;
  productsCount?: number;
};

export function CollectionCard({ collection, image, productsCount = 0 }: CollectionCardProps) {
  const handle = collection.handle;
  if (!handle) {
    return null;
  }

  const title = collection.title || handle;

  return (
    <article className="group">
      <Link href={`/shop?collection=${encodeURIComponent(handle)}`} className="block">
        <div className="overflow-hidden rounded-2xl bg-stone-100">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={title}
              className="aspect-[2/1] h-full w-full object-contain bg-stone-50 transition duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="aspect-[2/1] h-full w-full bg-stone-100" />
          )}
        </div>
        <div className="mt-4 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            {productsCount} Product{productsCount === 1 ? "" : "s"}
          </p>
          <h3 className="text-lg font-semibold text-stone-900 transition group-hover:text-brand-dark">
            {title}
          </h3>
        </div>
      </Link>
    </article>
  );
}
