import { notFound } from "next/navigation";
import Image from "next/image";
import { getBlogPostBySlug } from "@/lib/shopenup/blog";

type BlogDetailPageProps = {
  params: { slug: string };
};

// Helper to render TipTap JSON or plain text content
function renderContent(content: any) {
  if (!content) return null;

  if (typeof content === "string") {
    return content.split('\n').map((line, i) => (
      <p key={i} className="min-h-[1.5rem]">{line}</p>
    ));
  }

  if (content.type === "doc" && Array.isArray(content.content)) {
    return content.content.map((block: any, idx: number) => {
      if (!block || !block.type) return null;
      
      const renderNodes = (nodes?: any[]) => {
        if (!nodes) return null;
        return nodes.map((n: any, i: number) => {
          if (n.type === "text") {
            let el: React.ReactNode = <span key={i}>{n.text}</span>;
            if (n.marks) {
              n.marks.forEach((mark: any) => {
                if (mark.type === "bold") el = <strong key={i}>{el}</strong>;
                if (mark.type === "italic") el = <em key={i}>{el}</em>;
                if (mark.type === "underline") el = <u key={i}>{el}</u>;
              });
            }
            return el;
          }
          return null;
        });
      };

      switch (block.type) {
        case "paragraph":
          return <p key={idx}>{renderNodes(block.content)}</p>;
        case "heading":
          const level = block.attrs?.level || 2;
          const Tag = `h${level}` as keyof JSX.IntrinsicElements;
          const sizeClasses = {
            1: "text-3xl mt-10 mb-4",
            2: "text-2xl mt-8 mb-3",
            3: "text-xl mt-6 mb-2",
            4: "text-lg mt-4 mb-2",
            5: "text-base mt-4 mb-2",
            6: "text-sm mt-4 mb-2",
          }[level as 1|2|3|4|5|6] || "text-xl mt-8 mb-3";
          
          return <Tag key={idx} className={`${sizeClasses} font-bold text-stone-900`}>{renderNodes(block.content)}</Tag>;
        case "bullet_list":
        case "bulletList":
          return (
            <ul key={idx} className="list-disc pl-6 space-y-2 my-4">
              {block.content?.map((item: any, i: number) => (
                <li key={i}>{renderNodes(item.content?.[0]?.content)}</li>
              ))}
            </ul>
          );
        case "ordered_list":
        case "orderedList":
          return (
            <ol key={idx} className="list-decimal pl-6 space-y-2 my-4">
              {block.content?.map((item: any, i: number) => (
                <li key={i}>{renderNodes(item.content?.[0]?.content)}</li>
              ))}
            </ol>
          );
        default:
          return <div key={idx}>{renderNodes(block.content)}</div>;
      }
    });
  }

  // Fallback for unknown object formats
  return <p>{JSON.stringify(content)}</p>;
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const post = await getBlogPostBySlug(params.slug);
  if (!post) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <div className="relative mb-8 h-[400px] w-full overflow-hidden rounded-2xl bg-stone-100">
        {post.image && (
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover"
          />
        )}
      </div>
      <p className="text-sm uppercase tracking-wide text-brand-dark">
        {post.date} • {post.category} • By {post.author}
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-stone-900">{post.title}</h1>
      {post.excerpt && (
        <p className="mt-4 text-xl text-stone-600 font-medium leading-relaxed">{post.excerpt}</p>
      )}
      
      <article className="mt-10 space-y-5 text-stone-700 leading-relaxed text-lg">
        {post.content ? (
          renderContent(post.content)
        ) : (
          <p>This article has no content yet.</p>
        )}
      </article>
    </main>
  );
}
