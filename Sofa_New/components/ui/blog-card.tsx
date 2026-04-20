import Link from "next/link";
import { BlogPost } from "@/lib/store-data";

type BlogCardProps = {
  post: BlogPost;
};

export function BlogCard({ post }: BlogCardProps) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
      <div className="mb-4 h-40 rounded-xl bg-stone-100" />
      <p className="text-xs uppercase tracking-wide text-stone-500">
        {post.date} • {post.category} • {post.author}
      </p>
      <h3 className="mt-2 text-lg font-semibold text-stone-900">{post.title}</h3>
      <p className="mt-2 text-sm text-stone-600">{post.excerpt}</p>
      <Link href={`/blog/${post.slug}`} className="mt-4 inline-block text-sm font-medium text-brand-dark">
        Read Full Blog
      </Link>
    </article>
  );
}
