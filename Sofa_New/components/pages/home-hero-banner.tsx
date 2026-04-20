"use client";

import Image from "next/image";
import Link from "next/link";

/** Home hero content only — navigation is global (`SiteNavbar`). */
export function HomeHeroBanner() {
  return (
    <section
      className="relative overflow-hidden text-white"
      style={{
        backgroundColor: "#a8743d",
        backgroundImage:
          "radial-gradient(120% 60% at 15% 10%, rgba(255,255,255,0.08), transparent 55%), linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0) 22%, rgba(0,0,0,0.08) 40%, rgba(255,255,255,0.04) 58%, rgba(0,0,0,0.08) 80%, rgba(255,255,255,0.03)), repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 5px), linear-gradient(135deg, #b68449 0%, #a8743d 45%, #966532 100%)",
        backgroundSize: "100% 100%, 100% 100%, 220px 100%, 100% 100%",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.09]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(255 255 255) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-6 pb-14 pt-8 md:pb-16 lg:pb-20 lg:pt-10">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-12">
          <div className="space-y-5 lg:max-w-xl">
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-5xl lg:text-[2.75rem]">
              Modern Interior Design Studio
            </h1>
            <p className="text-base leading-relaxed text-white/75 md:text-lg">
              Showcase your collections in an elegant way that drives engagement and helps customers
              quickly find the perfect pieces for their homes.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center rounded-full border-2 border-white bg-brand px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
              >
                Shop Now
              </Link>
              <Link
                href="/#shop-categories"
                className="inline-flex items-center justify-center rounded-full border-2 border-white/90 bg-transparent px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Explore
              </Link>
            </div>
          </div>

          <div className="relative flex min-h-[280px] justify-end md:min-h-[340px] lg:min-h-[400px]">
            <div
              className="absolute bottom-8 right-0 h-[min(100%,320px)] w-[min(100%,380px)] opacity-[0.12] md:bottom-12"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgb(255 255 255) 1px, transparent 0)",
                backgroundSize: "14px 14px",
              }}
              aria-hidden
            />
            <div className="relative z-[1] h-[280px] w-full max-w-[520px] md:h-[340px] lg:h-[400px]">
              <Image
                src="/images/Home_banner.png"
                alt="Modern furniture showcase"
                fill
                className="object-contain object-bottom"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
