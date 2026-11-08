import type { Metadata, Viewport } from "next";
import "./globals.css";
import { brand } from "@/config/brand";
import { isConfigured, isDemoMode, siteUrl } from "@/config/env";
import { getDictionary } from "@/lib/i18n/server";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${brand.name} — Stays across Pakistan`, template: `%s · ${brand.name}` },
  description: "Find and book verified apartments, villas, farmhouses, hotels and mountain cabins across Pakistan.",
  openGraph: { siteName: brand.name, type: "website", locale: "en_PK" },
};
export const viewport: Viewport = { themeColor: "#164B3A", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dir } = await getDictionary();
  return (
    <html lang={locale} dir={dir}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..700&family=Noto+Nastaliq+Urdu:wght@400..700&display=swap" />
      </head>
      <body className="min-h-dvh antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
        {!isConfigured() && (
          <div className="bg-gold/25 px-4 py-2 text-center text-sm">
            Setup needed: add your Supabase keys to <code>.env.local</code> (see README, step 3). Data and sign-in are disabled until then.
          </div>
        )}
        {isDemoMode() && (
          <div className="bg-charcoal px-4 py-1.5 text-center text-[13px] text-ivory/90">
            Preview version. Listings marked “Demo listing” are examples, not real properties, and can’t be booked.
          </div>
        )}
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
