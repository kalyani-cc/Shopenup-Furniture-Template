import { PageHero } from "@/components/pages/page-hero";
import { AccountAuth } from "@/components/pages/account-auth";

export default function AccountPage() {
  return (
    <main>
      <PageHero
        title="My Account"
        description="Sign in to manage your orders, wishlist, and profile settings."
      />
      <AccountAuth />
    </main>
  );
}
