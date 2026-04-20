import { PageHero } from "@/components/pages/page-hero";
import { ContactFormClient } from "@/components/pages/contact-form-client";

export default function ContactPage() {
  return (
    <main>
      <PageHero
        title="Contact"
        description="Get in touch with the Furnisy team for support or partnership requests."
      />
      <section className="mx-auto max-w-3xl px-6 py-14">
        <ContactFormClient />
      </section>
    </main>
  );
}
