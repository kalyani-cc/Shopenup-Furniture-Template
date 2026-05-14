"use client";

import { useEffect, useState } from "react";
import { listProductReviews, type StoreReview } from "@/lib/shopenup/product";

type ProductReviewsProps = {
  productId: string;
};

export function ProductReviews({ productId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<StoreReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 4;


  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await listProductReviews(productId);
        setReviews(data);
      } catch {
        setReviews([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [productId]);

  if (loading) {
    return (
      <div className="mt-10 animate-pulse space-y-4">
        <div className="h-6 w-48 rounded bg-stone-200" />
        <div className="space-y-3">
          <div className="h-24 rounded-xl bg-stone-100" />
          <div className="h-24 rounded-xl bg-stone-100" />
        </div>
      </div>
    );
  }

  return (
    <section className="mt-14 border-t border-stone-200 pt-10">
      <h2 className="text-2xl font-semibold text-stone-900">Customer Reviews</h2>

      {!reviews.length ? (
        <div className="mt-6 rounded-2xl border border-stone-100 bg-stone-50 p-8 text-center">
          <p className="text-stone-500">No reviews yet for this product.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {reviews
              .slice((currentPage - 1) * reviewsPerPage, currentPage * reviewsPerPage)
              .map((review) => {

                const name = [review.first_name, review.last_name].filter(Boolean).join(" ").trim() || "Customer";
                const date = review.created_at ? new Date(review.created_at).toLocaleDateString() : "";
                const rating = Math.min(5, Math.max(1, Math.round(Number(review.rating || 0))));

                return (
                  <div key={review.id} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-stone-900">{name}</p>
                        <p className="text-xs text-stone-500">{date}</p>
                      </div>
                      <div className="flex text-amber-500">
                        {Array.from({ length: 5 }, (_, i) => (
                          <span key={i} className="text-lg leading-none">
                            {i < rating ? "★" : "☆"}
                          </span>
                        ))}
                      </div>
                    </div>
                    {review.title && (
                      <h3 className="mt-4 font-bold text-stone-900">{review.title}</h3>
                    )}
                    {review.content ? (
                      <p className="mt-2 text-sm leading-relaxed text-stone-600">{review.content}</p>
                    ) : (
                      <p className="mt-4 text-xs italic text-stone-400">Verified rating — no written review provided.</p>
                    )}

                  </div>
                );
              })}
          </div>

          {reviews.length > reviewsPerPage && (
            <div className="flex items-center justify-between border-t border-stone-200 pt-6">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-brand hover:text-brand disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-stone-600">
                Page {currentPage} of {Math.ceil(reviews.length / reviewsPerPage)}
              </span>
              <button
                type="button"
                disabled={currentPage === Math.ceil(reviews.length / reviewsPerPage)}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(reviews.length / reviewsPerPage)))}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-brand hover:text-brand disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </section>

  );
}
