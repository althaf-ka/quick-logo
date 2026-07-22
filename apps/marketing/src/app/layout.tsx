import socialImage from "@quicklogo/assets/brand/logo.jpg";
import favicon from "@quicklogo/assets/favicon.ico";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "@quicklogo/ui/globals.css";
import "lenis/dist/lenis.css";

import { SmoothScroll } from "@/components/smooth-scroll";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: "QuickLogo — Build a brand that looks like you mean it",
    template: "%s | QuickLogo",
  },
  description: siteConfig.description,
  icons: {
    icon: [{ url: favicon.src, type: "image/x-icon", sizes: "any" }],
  },
  openGraph: {
    title: "QuickLogo",
    description: siteConfig.description,
    siteName: siteConfig.name,
    type: "website",
    images: [
      {
        url: socialImage.src,
        width: socialImage.width,
        height: socialImage.height,
        alt: "QuickLogo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "QuickLogo",
    description: siteConfig.description,
    images: [socialImage.src],
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#171717",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background min-h-screen overflow-x-hidden antialiased">
        <a
          href="#main-content"
          className="bg-background text-foreground focus-visible:ring-ring fixed top-3 left-3 z-50 -translate-y-20 border px-3 py-2 text-sm transition-transform outline-none focus-visible:translate-y-0 focus-visible:ring-2"
        >
          Skip to content
        </a>
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
