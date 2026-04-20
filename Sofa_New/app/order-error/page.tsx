import Link from "next/link";
import { PageHero } from "@/components/pages/page-hero";

type OrderErrorPageProps = {
  searchParams?: {
    reason?: string;
  };
};

function humanizeReason(reason?: string) {
  if (!reason) {
    return "We could not place your order. Please try again.";
  }
  if (reason === "missing-order-id") {
    return "Payment may have been processed but no order ID was returned. Please retry checkout.";
  }
  return reason;
}

export default function OrderErrorPage({ searchParams }: OrderErrorPageProps) {
  const reason = humanizeReason(searchParams?.reason);

  return (
    <main>
      <PageHero title="Order Not Placed" description="There was a problem while placing your order." />
      <section className="mx-auto max-w-3xl px-6 py-14">
        <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Failed</p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">Something went wrong</h2>
          <p className="mt-3 text-stone-600">{reason}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/checkout"
              className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Retry Checkout
            </Link>
            <Link
              href="/cart"
              className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-brand hover:text-brand"
            >
              Back to Cart
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

