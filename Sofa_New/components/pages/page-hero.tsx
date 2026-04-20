import Image from "next/image";
import Link from "next/link";

const DEFAULT_SPLIT_IMAGE =
  "/images/mid-century-modern-living-room-interior-design-with-monstera-tree_53876-129805.avif";

type Cta = {
  label: string;
  href: string;
};

type PageHeroProps = {
  title: string;
  description: string;
  /** Matches the home banner layout (text + image + optional pill CTAs) using the light palette. */
  variant?: "simple" | "split";
  imageSrc?: string;
  imageAlt?: string;
  primaryCta?: Cta;
  secondaryCta?: Cta;
};

export function PageHero({
  title,
  description,
  variant = "simple",
  imageSrc = DEFAULT_SPLIT_IMAGE,
  imageAlt = "Furnisy furniture showcase",
  primaryCta,
  secondaryCta,
}: PageHeroProps) {
  if (variant === "split") {
    return (
      <section className="relative overflow-hidden border-b border-stone-200 bg-gradient-to-b from-stone-50 via-stone-100/90 to-stone-100">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.2]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgb(120 113 108) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-6 py-12 md:py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-12">
            <div className="space-y-5 lg:max-w-xl">
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-stone-900 md:text-5xl lg:text-[2.75rem]">
                {title}
              </h1>
              <p className="text-base leading-relaxed text-stone-600 md:text-lg">{description}</p>
              {primaryCta || secondaryCta ? (
                <div className="flex flex-wrap gap-4 pt-2">
                  {primaryCta ? (
                    <Link
                      href={primaryCta.href}
                      className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
                    >
                      {primaryCta.label}
                    </Link>
                  ) : null}
                  {secondaryCta ? (
                    <Link
                      href={secondaryCta.href}
                      className="inline-flex items-center justify-center rounded-full border-2 border-stone-300 bg-white/70 px-8 py-3.5 text-sm font-semibold text-stone-800 transition hover:border-brand hover:text-brand-dark"
                    >
                      {secondaryCta.label}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="relative flex min-h-[260px] justify-end md:min-h-[320px] lg:min-h-[380px]">
              <div
                className="absolute bottom-8 right-0 h-[min(100%,300px)] w-[min(100%,380px)] opacity-[0.14] md:bottom-10"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, rgb(120 113 108) 1px, transparent 0)",
                  backgroundSize: "14px 14px",
                }}
                aria-hidden
              />
              <div className="relative z-[1] h-[260px] w-full max-w-[520px] md:h-[320px] lg:h-[380px]">
                <Image
                  src={imageSrc}
                  alt={imageAlt}
                  fill
                  className="object-contain object-bottom"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-stone-200 bg-stone-100">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-stone-900">{title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-600 md:text-lg">{description}</p>
      </div>
    </section>
  );
}
