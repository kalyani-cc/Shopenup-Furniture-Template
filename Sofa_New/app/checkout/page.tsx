import { PageHero } from "@/components/pages/page-hero";
import { CheckoutClient } from "@/components/pages/checkout-client";

export default function CheckoutPage() {
  return (
    <main>
      <PageHero title="Checkout" description="Complete your order details and place order." />
      <CheckoutClient />
    </main>
  );
}
