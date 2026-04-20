import { PageHero } from "@/components/pages/page-hero";
import { OrderDetailsClient } from "@/components/pages/order-details-client";

type PageProps = {
  params: { id: string };
};

export default function OrderDetailsPage({ params }: PageProps) {
  return (
    <main>
      <PageHero title="Order details" description="Review items, delivery address, and totals for this order." />
      <section className="mx-auto max-w-4xl px-6 py-10">
        <OrderDetailsClient orderId={params.id} />
      </section>
    </main>
  );
}
