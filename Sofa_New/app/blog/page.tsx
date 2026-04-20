import { PageHero } from "@/components/pages/page-hero";
import { BlogCard } from "@/components/ui/blog-card";
import { blogPosts } from "@/lib/store-data";

export default function BlogPage() {
  return (
    <main>
      <PageHero
        title="News & Blogs"
        description="Insights and inspiration to build comfortable and elegant spaces."
      />
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-6 md:grid-cols-3">
          {blogPosts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </section>
    </main>
  );
}
