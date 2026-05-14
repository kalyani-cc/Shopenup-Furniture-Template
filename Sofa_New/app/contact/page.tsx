import Image from "next/image";
import Link from "next/link";
import { ContactFormClient } from "@/components/pages/contact-form-client";
import { MailIcon } from "../../components/ui/contact-method";


export default function ContactPage() {
  return (
    <main className="bg-[#fcfaf8] min-h-screen">
      <section className="mx-auto max-w-7xl px-6 py-20 lg:py-32">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-start">


          {/* Left Column */}
          <div className="space-y-10 lg:sticky lg:top-32">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-6">GET IN TOUCH</h4>
              <h1 className="text-3xl font-bold text-stone-900 leading-tight lg:text-4xl">
                We're here to make your project <span className="text-brand">clear and calm</span>
              </h1>
              <p className="mt-6 text-base leading-relaxed text-stone-500">
                We work with homeowners and businesses who want thoughtful design and dependable execution. Tell us your location, timeline, and which rooms matter most — we will follow up with a structured reply and, when it fits, schedule a consultation or site visit.
              </p>

            </div>

            <div className="relative pt-4 pb-12 pr-12 max-w-lg">
              {/* Main Image */}
              <div className="relative overflow-hidden rounded-[2.5rem] shadow-lg">
                <Image
                  src="/images/Contemporary_living_room.webp"
                  alt="Modern Hallway"
                  width={600}
                  height={450}
                  className="w-full object-cover aspect-[4/3]"
                />
              </div>

              {/* Overlapping Image */}
              <div className="absolute -bottom-4 -right-2 w-[65%] overflow-hidden rounded-[2rem] border-[10px] border-[#fcfaf8] shadow-2xl">
                <Image
                  src="/images/Contemporary_living_room.webp"
                  alt="Interior Showcase"
                  width={400}
                  height={300}
                  className="w-full object-cover aspect-[4/3]"
                />
              </div>
            </div>
          </div>

          {/* Right Column (Form) */}
          <ContactFormClient />

        </div>
      </section>
    </main>
  );
}

