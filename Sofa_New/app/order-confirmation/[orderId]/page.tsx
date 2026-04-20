import Link from "next/link";
import { PageHero } from "@/components/pages/page-hero";
import { OrderConfirmationClient } from "@/components/pages/order-confirmation-client";

type OrderConfirmationPageProps = {
  params: {
    orderId: string;
  };
};

export default function OrderConfirmationPage({ params }: OrderConfirmationPageProps) {
  return (
    <main>
      <PageHero title="Order Confirmed" description="Your order has been placed successfully." />
      <section className="mx-auto max-w-3xl px-6 py-14">
        <div className="rounded-2xl border border-green-200 bg-white p-8 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Success</p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">Thank you for your purchase</h2>
          <p className="mt-3 text-stone-600">
            Your order was placed successfully. Keep this order reference for tracking.
          </p>

          <div className="mt-5 rounded-xl bg-stone-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-stone-500">Order ID</p>
            <p className="mt-1 break-all text-sm font-semibold text-stone-900">{params.orderId}</p>
          </div>

          <OrderConfirmationClient orderId={params.orderId} />

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/shop"
              className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Continue Shopping
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-brand hover:text-brand"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

