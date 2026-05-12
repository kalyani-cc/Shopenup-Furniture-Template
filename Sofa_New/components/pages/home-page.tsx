import Image from "next/image";
import Link from "next/link";
import { listCategories } from "@/lib/shopenup/categories";
import { listCollections } from "@/lib/shopenup/collections";
import { listProducts } from "@/lib/shopenup/product";
import { listBlogPosts } from "@/lib/shopenup/blog";
import { BlogCard } from "@/components/ui/blog-card";
import { CategoryCard } from "@/components/ui/category-card";
import { CollectionCard } from "@/components/ui/collection-card";
import { ProductCard } from "@/components/ui/product-card";
import { SectionTitle } from "@/components/ui/section-title";
import { HomeHeroBanner } from "@/components/pages/home-hero-banner";

export async function HomePage() {
  const [products, collections, blogPosts] = await Promise.all([
    listProducts(),
    listCollections(),
    listBlogPosts(3),
  ]);
  const categories = await listCategories(100, products);
  const collectionsWithHandles = collections.filter((c) => c.handle);
  const productsByCategory = new Map<string, (typeof products)[number][]>();
  const productsByCollection = new Map<string, (typeof products)[number][]>();

  for (const product of products) {
    const categoryKey = product.category?.toLowerCase();
    if (categoryKey) {
      const list = productsByCategory.get(categoryKey) || [];
      list.push(product);
      productsByCategory.set(categoryKey, list);
    }

    const collectionKey = product.collection?.toLowerCase();
    if (collectionKey) {
      const list = productsByCollection.get(collectionKey) || [];
      list.push(product);
      productsByCollection.set(collectionKey, list);
    }
  }

  const getCollectionProducts = (handle?: string, title?: string) => {
    const byHandle = handle ? productsByCollection.get(handle.toLowerCase()) : undefined;
    if (byHandle?.length) {
      return byHandle;
    }
    if (!title) {
      return [];
    }
    const normalized = title.toLowerCase().trim();
    return products.filter((p) => (p.collectionLabel || "").toLowerCase().trim() === normalized);
  };

  const whyChooseItems = [
    {
      icon: "⬛",
      title: "Fast & Free Shipping",
      description: "Quick doorstep delivery on eligible orders with careful handling.",
    },
    {
      icon: "▣",
      title: "Easy To Shop",
      description: "Simple browsing and smooth checkout for a better shopping experience.",
    },
    {
      icon: "⬢",
      title: "24/7 Support",
      description: "Our team is available anytime to help with products and orders.",
    },
    {
      icon: "↺",
      title: "Hassle Free Returns",
      description: "Easy return process so you can shop with full confidence.",
    },
  ];

  return (
    <main className="bg-stone-50">
      <HomeHeroBanner />

      <section id="shop-categories" className="mx-auto max-w-7xl px-6 py-14">
        <SectionTitle
          title="Shop by Category"
          description="Discover everything you need through the categories."
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <CategoryCard
              key={category.slug}
              category={category}
              image={productsByCategory.get(category.slug.toLowerCase())?.[0]?.image}
            />
          ))}
        </div>
      </section>

      {collectionsWithHandles.length > 0 ? (
        <section className="mx-auto max-w-7xl px-6 py-14">
          <SectionTitle
            title="Shop by Collection"
            description="Browse curated collections from our catalog."
            action={
              <Link href="/shop" className="text-sm font-semibold text-brand-dark">
                View All
              </Link>
            }
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {collectionsWithHandles.slice(0, 6).map((collection) => {
              const linkedProducts = getCollectionProducts(collection.handle, collection.title);
              return (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  image={linkedProducts[0]?.image}
                  productsCount={linkedProducts.length}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <h2 className="text-4xl font-bold tracking-tight text-stone-900">Why Choose Us</h2>
            <p className="mt-3 max-w-xl text-stone-600">
              Discover reliable service, smooth shopping, and quality furniture selected for modern homes.
            </p>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {whyChooseItems.map((item) => (
                <article key={item.title} className="space-y-2">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand/15 text-xl">
                    <span aria-hidden className="text-base font-semibold text-black">
                      {item.icon}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-stone-900">{item.title}</h3>
                  <p className="text-sm text-stone-600">{item.description}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="relative">
            <div
              className="pointer-events-none absolute -left-6 -top-6 h-28 w-44 opacity-50"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(190,141,74,0.9) 2px, transparent 0)",
                backgroundSize: "20px 20px",
              }}
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-2xl bg-stone-100">
              <Image
                src="/images/mid-century-modern-living-room-interior-design-with-monstera-tree_53876-129805.avif"
                alt="Modern living room furniture"
                width={900}
                height={650}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <SectionTitle
          title="Featured Products"
          description="Explore the best of Furnisy featured collection."
          action={
            <Link href="/shop" className="text-sm font-semibold text-brand-dark">
              View All
            </Link>
          }
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <SectionTitle
          title="News & Blogs"
          action={
            <Link href="/blog" className="text-sm font-semibold text-brand-dark">
              View All
            </Link>
          }
        />
        <div className="grid gap-6 md:grid-cols-3">
          {blogPosts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </section>
    </main>
  );
}
