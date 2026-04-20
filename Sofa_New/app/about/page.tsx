import { PageHero } from "@/components/pages/page-hero";

export default function AboutPage() {
  return (
    <main>
      <PageHero
        title="About Furnisy"
        description="We design modern furniture experiences focused on quality and comfort."
      />
      <section className="mx-auto max-w-4xl space-y-5 px-6 py-14 text-stone-700">
        <p>
          Furnisy provides the essential pieces to build a stunning online furniture
          business. This page mirrors the informational structure shown in the source
          website.
        </p>
        <p>
          You can expand this page with mission, team members, customer stories, and
          sustainability statements.
        </p>
      </section>
    </main>
  );
}
