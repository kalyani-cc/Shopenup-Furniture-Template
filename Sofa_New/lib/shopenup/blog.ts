import { sdk } from "@/lib/config";
import { getCompleteHeaders } from "@/lib/shopenup/cookies";
import { blogPosts as fallbackPosts, type BlogPost } from "@/lib/store-data";

type StoreBlogPost = {
  id: string;
  title?: string;
  subtitle?: string;
  author?: string;
  thumbnail_image?: string;
  tags?: string[];
  created_at?: string;
  body?: any;
};

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function mapBlogPost(post: StoreBlogPost): BlogPost {
  return {
    slug: post.id,
    title: post.title || "Untitled Post",
    date: formatDate(post.created_at),
    category: post.tags?.[0] || "Blog",
    author: post.author || "Admin",
    excerpt: post.subtitle || "Read our latest blog post.",
    image: post.thumbnail_image,
    content: post.body,
  };
}

/**
 * Lists blog posts from the backend.
 * Endpoint: GET /store/blog/articles
 */
export async function listBlogPosts(limit = 10): Promise<BlogPost[]> {
  try {
    const response = await sdk.client.fetch<any>("/store/blog/articles", {
      next: { tags: ["blogs"], revalidate: 60 },
      headers: await getCompleteHeaders(),
    });

    // Handle both { articles: [] } and [ ] response formats
    const rows: StoreBlogPost[] = Array.isArray(response)
      ? response
      : (response?.articles || []);

    if (!rows.length) {
      return fallbackPosts;
    }

    return rows.map(mapBlogPost);
  } catch (error) {
    console.error("Failed to fetch blogs from API, using fallback data:", error);
    return fallbackPosts;
  }
}

/**
 * Fetches a single blog post by its ID.
 * Endpoint: GET /store/blog/articles/:id
 */
export async function getBlogPostBySlug(id: string): Promise<BlogPost | null> {
  try {
    const response = await sdk.client.fetch<any>(`/store/blog/articles/${id}`, {
      next: { tags: ["blogs"], revalidate: 60 },
      headers: await getCompleteHeaders(),
    });

    // Handle both { article: {} } and direct object response formats
    const post = response?.article || response;

    if (!post || !post.id) {
      return fallbackPosts.find((p) => p.slug === id) || null;
    }

    return mapBlogPost(post);
  } catch {
    return fallbackPosts.find((p) => p.slug === id) || null;
  }
}
