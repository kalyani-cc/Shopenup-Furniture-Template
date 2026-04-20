import { PageHero } from "@/components/pages/page-hero";

export default function PrivacyPage() {
  return (
    <main>
      <PageHero title="Privacy Policy" description="How we collect and process your data." />
      <section className="mx-auto max-w-4xl space-y-4 px-6 py-14 text-stone-700">
        <p>
          This is a starter privacy page. Replace it with your legal text and data policy
          details before production launch.
        </p>
      </section>
    </main>
  );
}
