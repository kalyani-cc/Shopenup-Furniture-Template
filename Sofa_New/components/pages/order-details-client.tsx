"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { sdk } from "@/lib/config";
import { getCompleteHeaders } from "@/lib/shopenup/cookies";
import { formatCurrency, formatOrderDisplayStatus } from "@/lib/utils";

type Address = {
  first_name?: string | null;
  last_name?: string | null;
  address_1?: string | null;
  address_2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  province?: string | null;
  country_code?: string | null;
  phone?: string | null;
};

type LineItem = {
  id: string;
  title?: string | null;
  product_title?: string | null;
  product_id?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  total?: number | null;
  thumbnail?: string | null;
  variant?: { product?: { title?: string | null; thumbnail?: string | null } | null } | null;
};

type Fulfillment = {
  id: string;
  delivered_at?: string | null;
};

type StoreOrderDetail = {
  id: string;
  display_id?: number | string;
  email?: string | null;
  status?: string | null;
  fulfillment_status?: string | null;
  payment_status?: string | null;
  created_at?: string | null;
  total?: number | null;
  subtotal?: number | null;
  tax_total?: number | null;
  shipping_total?: number | null;
  discount_total?: number | null;
  shipping_address?: Address | null;
  billing_address?: Address | null;
  items?: LineItem[] | null;
  fulfillments?: Fulfillment[] | null;
  customer_id?: string | null;
};

type ReviewDraft = {
  itemId: string;
  productId: string;
  productTitle: string;
  title: string;
  content: string;
  rating: number;
};

type StoreReview = {
  id: string;
  product_id?: string | null;
  customer_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  title?: string | null;
  content?: string | null;
  rating?: number | null;
  created_at?: string | null;
};

type ReviewRatingSummary = {
  product_id: string;
  average_rating?: number | null;
  total_reviews?: number | null;
};

type ProductReviewState = {
  loading: boolean;
  error?: string;
  items: StoreReview[];
};

function clampRating(value: number): number {
  if (Number.isNaN(value)) return 1;
  return Math.min(5, Math.max(1, Math.round(value)));
}

function formatAddress(a: Address | null | undefined): string {
  if (!a) {
    return "";
  }
  const lines = [
    [a.first_name, a.last_name].filter(Boolean).join(" ").trim(),
    [a.address_1, a.address_2].filter(Boolean).join(", "),
    [a.city, a.province, a.postal_code].filter(Boolean).join(", "),
    a.country_code || "",
    a.phone ? `Phone: ${a.phone}` : "",
  ].filter((line) => line && String(line).length > 0);
  return lines.join("\n");
}

export function OrderDetailsClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { customer, isLoading: authLoading } = useAuth();
  const [order, setOrder] = useState<StoreOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMessageByItemId, setReviewMessageByItemId] = useState<Record<string, string>>({});
  const [productReviewsById, setProductReviewsById] = useState<Record<string, ProductReviewState>>({});

  const extractReviews = (payload: unknown): StoreReview[] => {
    if (!payload || typeof payload !== "object") {
      return [];
    }
    const data = payload as {
      reviews?: unknown;
      review?: unknown;
      data?: unknown;
      ratings?: unknown;
    };
    const raw =
      (Array.isArray(data.reviews) && data.reviews) ||
      (Array.isArray(data.data) && data.data) ||
      (data.review && Array.isArray((data.review as { items?: unknown }).items)
        ? ((data.review as { items: unknown[] }).items as unknown[])
        : []);

    const mapped = raw
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const r = item as StoreReview;
        if (!r.content && !r.title) {
          return null;
        }
        return {
          id: r.id || `${r.product_id || "review"}-${Math.random().toString(36).slice(2)}`,
          product_id: r.product_id,
          customer_id: r.customer_id,
          first_name: r.first_name,
          last_name: r.last_name,
          title: r.title,
          content: r.content,
          rating: r.rating,
          created_at: r.created_at,
        } as StoreReview;
      })
      .filter((review): review is StoreReview => Boolean(review));

    if (mapped.length) {
      return mapped;
    }

    // Some backends return aggregate ratings only: { ratings: [{ product_id, average_rating, total_reviews }] }.
    if (Array.isArray(data.ratings)) {
      const first = (data.ratings as ReviewRatingSummary[]).find((r) => r && r.product_id);
      if (first) {
        const count = Number(first.total_reviews || 0);
        const avg = Number(first.average_rating || 0);
        if (count > 0) {
          return [
            {
              id: `summary-${first.product_id}`,
              product_id: first.product_id,
              title: "Overall rating",
              content: `${count} review${count === 1 ? "" : "s"} submitted for this product.`,
              rating: avg,
            },
          ];
        }
      }
    }

    return [];
  };

  const loadProductReviews = async (productId: string) => {
    setProductReviewsById((prev) => ({
      ...prev,
      [productId]: {
        loading: true,
        error: "",
        items: prev[productId]?.items || [],
      },
    }));

    try {
      const response = await sdk.client.fetch<unknown>("/store/reviews", {
        method: "GET",
        headers: await getCompleteHeaders(),
        cache: "no-store",
        query: {
          product_ids: productId,
        },
      });
      const reviews = extractReviews(response);
      setProductReviewsById((prev) => ({
        ...prev,
        [productId]: {
          loading: false,
          error: "",
          items: reviews,
        },
      }));
    } catch (e) {
      setProductReviewsById((prev) => ({
        ...prev,
        [productId]: {
          loading: false,
          error: e instanceof Error ? e.message : "Failed to load previous reviews.",
          items: prev[productId]?.items || [],
        },
      }));
    }
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!customer) {
      router.replace(`/account?next=${encodeURIComponent(`/order-details/${orderId}`)}`);
      return;
    }

    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await sdk.client.fetch<{ order?: StoreOrderDetail }>(`/store/orders/${orderId}`, {
          method: "GET",
          query: {
            fields:
              "id,display_id,email,status,fulfillment_status,payment_status,created_at,total,subtotal,tax_total,shipping_total,discount_total,customer_id," +
              "shipping_address.*,billing_address.*,items.*,items.product_id,items.product_title,items.title,items.thumbnail,items.total,items.unit_price,items.quantity," +
              "fulfillments.id,fulfillments.delivered_at",
          },
          headers: await getCompleteHeaders(),
          cache: "no-store",
        });
        const o = data.order;
        if (!mounted) {
          return;
        }
        if (!o) {
          setOrder(null);
          setError("Order not found.");
          return;
        }
        if (o.customer_id && customer.id && o.customer_id !== customer.id) {
          setOrder(null);
          setError("You do not have access to this order.");
          return;
        }
        setOrder(o);
      } catch (e) {
        if (mounted) {
          setOrder(null);
          setError(e instanceof Error ? e.message : "Failed to load order.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [authLoading, customer, orderId, router]);

  if (authLoading) {
    return <p className="text-sm text-stone-600">Checking your session…</p>;
  }

  if (!customer) {
    return <p className="text-sm text-stone-600">Redirecting to account…</p>;
  }

  if (loading) {
    return <p className="text-sm text-stone-600">Loading order…</p>;
  }

  if (error || !order) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-800">{error || "Order not found."}</p>
        <Link href="/account" className="mt-4 inline-block text-sm font-semibold text-brand-dark">
          Back to account
        </Link>
      </div>
    );
  }

  const ship = formatAddress(order.shipping_address || undefined);
  const bill = formatAddress(order.billing_address || undefined);
  const items = order.items || [];
  const isDelivered =
    String(order.fulfillment_status || "").toLowerCase() === "delivered" ||
    String(order.status || "").toLowerCase() === "completed" ||
    Boolean(order.fulfillments?.some((f) => Boolean(f.delivered_at)));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/account" className="text-sm font-semibold text-brand-dark hover:underline">
          ← Back to account
        </Link>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Order</p>
            <h1 className="mt-1 text-2xl font-bold text-stone-900">#{order.display_id ?? order.id}</h1>
            <p className="mt-1 text-sm text-stone-600">
              Placed {order.created_at ? new Date(order.created_at).toLocaleString() : "—"}
            </p>
            {order.email ? <p className="mt-1 text-sm text-stone-600">{order.email}</p> : null}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Status</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">{formatOrderDisplayStatus(order)}</p>
            {order.payment_status ? (
              <p className="mt-1 text-xs text-stone-500">Payment: {order.payment_status}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold text-stone-900">Shipping address</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-stone-600">{ship || "—"}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-stone-900">Billing address</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-stone-600">{bill || "—"}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold text-stone-900">Items</h2>
        <div className="mt-4 space-y-3">
          {items.length ? (
            items.map((item) => {
              const title =
                item.product_title || item.title || item.variant?.product?.title || "Product";
              const image = item.thumbnail || item.variant?.product?.thumbnail || undefined;
              const quantity = item.quantity ?? 1;
              const lineTotal = item.total ?? (item.unit_price || 0) * quantity;
              const itemMsg = reviewMessageByItemId[item.id];
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {image ? (
                      <Image
                        src={image}
                        alt={title}
                        width={56}
                        height={56}
                        className="h-14 w-14 shrink-0 rounded-md border border-stone-200 object-cover"
                      />
                    ) : (
                      <div className="h-14 w-14 shrink-0 rounded-md border border-stone-200 bg-stone-100" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-stone-900">{title}</p>
                      <p className="text-xs text-stone-500">Qty: {quantity}</p>
                      {itemMsg ? <p className="mt-1 text-xs text-stone-600">{itemMsg}</p> : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <p className="text-sm font-semibold text-stone-900">{formatCurrency(lineTotal)}</p>
                    <button
                      type="button"
                      disabled={!isDelivered || !item.product_id || reviewSubmitting}
                      onClick={() => {
                        if (!item.product_id) {
                          setReviewMessageByItemId((prev) => ({
                            ...prev,
                            [item.id]: "Review unavailable for this item.",
                          }));
                          return;
                        }
                        setReviewDraft({
                          itemId: item.id,
                          productId: item.product_id,
                          productTitle: title,
                          title: "",
                          content: "",
                          rating: 0,
                        });
                        if (!productReviewsById[item.product_id]) {
                          void loadProductReviews(item.product_id);
                        }
                      }}
                      className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 transition hover:border-brand hover:text-brand disabled:opacity-60"
                      aria-label={isDelivered ? "Write a review" : "Reviews available after delivery"}
                      title={isDelivered ? "Write a review" : "Available after delivery"}
                    >
                      Review
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-stone-500">No line items returned for this order.</p>
          )}
        </div>

        <div className="mt-6 space-y-2 border-t border-stone-200 pt-4 text-sm">
          {order.subtotal != null ? (
            <div className="flex justify-between text-stone-600">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
          ) : null}
          {order.discount_total != null && order.discount_total > 0 ? (
            <div className="flex justify-between text-stone-600">
              <span>Discount</span>
              <span>-{formatCurrency(order.discount_total)}</span>
            </div>
          ) : null}
          {order.shipping_total != null ? (
            <div className="flex justify-between text-stone-600">
              <span>Shipping</span>
              <span>{formatCurrency(order.shipping_total)}</span>
            </div>
          ) : null}
          {order.tax_total != null ? (
            <div className="flex justify-between text-stone-600">
              <span>Tax</span>
              <span>{formatCurrency(order.tax_total)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-stone-200 pt-3 text-base font-semibold text-stone-900">
            <span>Total</span>
            <span>{formatCurrency(order.total ?? 0)}</span>
          </div>
        </div>
      </div>

      {reviewDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-stone-900">Write a review</h3>
                <p className="mt-1 text-xs text-stone-600">Only available after delivery.</p>
              </div>
              <button
                type="button"
                onClick={() => setReviewDraft(null)}
                className="rounded-lg border border-stone-200 px-2 py-1 text-sm text-stone-700 hover:bg-stone-50"
                aria-label="Close review dialog"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <p className="text-xs uppercase tracking-wide text-stone-500">Product</p>
                <p className="mt-1 text-sm font-semibold text-stone-900">{reviewDraft.productTitle}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-stone-900">Rating</p>
                <div className="mt-2 flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, idx) => {
                    const value = idx + 1;
                    const active = value <= reviewDraft.rating;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setReviewDraft((d) => (d ? { ...d, rating: value } : d))}
                        className={`text-xl leading-none ${active ? "text-amber-500" : "text-stone-300"}`}
                        aria-label={`${value} star${value === 1 ? "" : "s"}`}
                      >
                        ★
                      </button>
                    );
                  })}
                </div>
                {reviewDraft.rating <= 0 ? (
                  <p className="mt-1 text-xs text-stone-500">Select a rating to continue.</p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-stone-900" htmlFor="review-title">
                  Title (optional)
                </label>
                <input
                  id="review-title"
                  value={reviewDraft.title}
                  onChange={(e) => setReviewDraft((d) => (d ? { ...d, title: e.target.value } : d))}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand"
                  placeholder="Short summary"
                />
              </div>

              <div className="grid gap-2">
                <p className="text-sm font-semibold text-stone-900">Previous reviews</p>
                {productReviewsById[reviewDraft.productId]?.loading ? (
                  <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
                    Loading previous reviews...
                  </p>
                ) : productReviewsById[reviewDraft.productId]?.error ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {productReviewsById[reviewDraft.productId]?.error}
                  </p>
                ) : productReviewsById[reviewDraft.productId]?.items?.length ? (
                  <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                    {productReviewsById[reviewDraft.productId].items.map((rev) => {
                      const name = [rev.first_name, rev.last_name].filter(Boolean).join(" ").trim() || "Customer";
                      const isMine = Boolean(customer?.id && rev.customer_id && rev.customer_id === customer.id);
                      return (
                        <div key={rev.id} className="rounded-lg border border-stone-200 bg-white px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-stone-700">
                              {name}
                              {isMine ? " (You)" : ""}
                            </p>
                            <p className="text-xs text-amber-600">
                              {"★".repeat(clampRating(Number(rev.rating || 0)))}
                            </p>
                          </div>
                          {rev.title ? <p className="mt-1 text-sm font-medium text-stone-900">{rev.title}</p> : null}
                          {rev.content ? <p className="mt-1 text-sm text-stone-600">{rev.content}</p> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
                    No previous reviews for this product yet.
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-stone-900" htmlFor="review-content">
                  Review
                </label>
                <textarea
                  id="review-content"
                  value={reviewDraft.content}
                  onChange={(e) => setReviewDraft((d) => (d ? { ...d, content: e.target.value } : d))}
                  className="min-h-28 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand"
                  placeholder="Share your experience…"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewDraft(null)}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-stone-400"
                  disabled={reviewSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={reviewSubmitting || !reviewDraft.content.trim() || reviewDraft.rating <= 0}
                  onClick={async () => {
                    if (!customer) return;
                    const draft = reviewDraft;
                    if (!draft) return;

                    try {
                      setReviewSubmitting(true);
                      await sdk.client.fetch("/store/reviews", {
                        method: "POST",
                        headers: await getCompleteHeaders(),
                        cache: "no-store",
                        body: {
                          product_id: draft.productId,
                          title: draft.title.trim() || undefined,
                          content: draft.content.trim(),
                          rating: clampRating(draft.rating),
                          first_name: customer.first_name || order.shipping_address?.first_name || "Customer",
                          last_name: customer.last_name || order.shipping_address?.last_name || "",
                          status: "approved",
                        },
                      });
                      setReviewMessageByItemId((prev) => ({
                        ...prev,
                        [draft.itemId]: "Thanks! Your review was submitted.",
                      }));
                      setProductReviewsById((prev) => {
                        const existing = prev[draft.productId]?.items || [];
                        const optimistic: StoreReview = {
                          id: `local-${Date.now()}`,
                          product_id: draft.productId,
                          customer_id: customer.id,
                          first_name: customer.first_name || "You",
                          last_name: customer.last_name || "",
                          title: draft.title.trim() || undefined,
                          content: draft.content.trim(),
                          rating: clampRating(draft.rating),
                          created_at: new Date().toISOString(),
                        };
                        return {
                          ...prev,
                          [draft.productId]: {
                            loading: false,
                            error: "",
                            items: [optimistic, ...existing],
                          },
                        };
                      });
                      setReviewDraft(null);
                    } catch (e) {
                      setReviewMessageByItemId((prev) => ({
                        ...prev,
                        [draft.itemId]: e instanceof Error ? e.message : "Failed to submit review.",
                      }));
                    } finally {
                      setReviewSubmitting(false);
                    }
                  }}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {reviewSubmitting ? "Submitting…" : "Submit review"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
