import Link from "next/link";
import { Category } from "@/lib/store-data";

type CategoryCardProps = {
  category: Category;
  image?: string;
};

export function CategoryCard({ category, image }: CategoryCardProps) {
  return (
    <article className="group">
      <Link href={`/category/${category.slug}`} className="block">
        <div className="overflow-hidden rounded-2xl bg-stone-100">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={category.name}
              className="aspect-[2/1] h-full w-full object-contain bg-stone-50 transition duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="aspect-[2/1] h-full w-full bg-stone-100" />
          )}
        </div>
        <div className="mt-4 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            {category.products} Product{category.products === 1 ? "" : "s"}
          </p>
          <h3 className="text-lg font-semibold text-stone-900 transition group-hover:text-brand-dark">
            {category.name}
          </h3>
        </div>
      </Link>
    </article>
  );
}
