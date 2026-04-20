import { notFound } from "next/navigation";
import { blogPosts } from "@/lib/store-data";

type BlogDetailPageProps = {
  params: { slug: string };
};

export default function BlogDetailPage({ params }: BlogDetailPageProps) {
  const post = blogPosts.find((item) => item.slug === params.slug);
  if (!post) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <p className="text-sm uppercase tracking-wide text-brand-dark">
        {post.date} • {post.category}
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-stone-900">{post.title}</h1>
      <p className="mt-4 text-lg text-stone-600">{post.excerpt}</p>
      <article className="mt-10 space-y-5 text-stone-700">
        <p>
          This article page is scaffolded from the Furnisy blog architecture and can be
          connected to CMS or API content. The layout is ready for long-form text,
          sections, and related product cards.
        </p>
        <p>
          Replace this placeholder content with your actual rich blog data, then add
          metadata, social preview cards, and author profile widgets.
        </p>
      </article>
    </main>
  );
}
