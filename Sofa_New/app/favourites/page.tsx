import { PageHero } from "@/components/pages/page-hero";
import { FavouritesClient } from "@/components/pages/favourites-client";

export default function FavouritesPage() {
  return (
    <main>
      <PageHero title="Favourites" description="Your saved products in one place." />
      <FavouritesClient />
    </main>
  );
}

