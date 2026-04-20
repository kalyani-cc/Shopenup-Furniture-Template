import type { Metadata } from "next";
import { ReactNode, Suspense } from "react";
import { Footer } from "@/components/layout/footer";
import { SiteNavbar } from "@/components/layout/site-navbar";
import { AuthProvider } from "@/components/providers/auth-provider";
import { StorefrontProvider } from "@/components/providers/storefront-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Furnisy Storefront",
  description: "Modern furniture storefront built with Next.js and Tailwind CSS"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <StorefrontProvider>
            <Suspense fallback={<div className="h-[72px] border-b border-white/10 bg-brand-dark" aria-hidden />}>
              <SiteNavbar />
            </Suspense>
            {children}
            <Footer />
          </StorefrontProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
