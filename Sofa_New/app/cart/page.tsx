import { PageHero } from "@/components/pages/page-hero";
import { CartClient } from "@/components/pages/cart-client";

export default function CartPage() {
  return (
    <main>
      <PageHero title="Cart" description="Review selected products before checkout." />
      <CartClient />
    </main>
  );
}
