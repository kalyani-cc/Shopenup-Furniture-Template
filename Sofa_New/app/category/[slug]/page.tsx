import { notFound } from "next/navigation";
import { PageHero } from "@/components/pages/page-hero";
import { ProductCard } from "@/components/ui/product-card";
import { getCategoryByHandle } from "@/lib/shopenup/categories";
import { listProductsByCategory } from "@/lib/shopenup/product";

type CategoryPageProps = {
  params: { slug: string };
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const category = await getCategoryByHandle(params.slug);
  if (!category) {
    notFound();
  }

  const categoryProducts = await listProductsByCategory(category.slug);

  return (
    <main>
      <PageHero title={category.name} description={category.description} />
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {categoryProducts.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}
