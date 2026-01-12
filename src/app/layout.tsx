import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import prisma from "@/lib/db";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Dynamic metadata from Supabase
export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await prisma.settings.findUnique({
      where: { organizationId: 'showcase-template' },
    });
    
    return {
      title: settings?.seoTitle || 'TrueGauge',
      description: settings?.seoDescription || 'Business health dashboard for smart operators',
      keywords: settings?.seoKeywords?.split(', ') || ['business dashboard'],
      verification: {
        google: 'DjU512waQEVyJE_TGwyBb0rqvvUiaomWeaBkyb-v-Yg',
      },
      openGraph: {
        title: settings?.ogTitle || 'TrueGauge - Precision Business Health',
        description: settings?.ogDescription || 'Your instrument panel for business clarity',
        siteName: 'TrueGauge',
        type: 'website',
        url: 'https://truegauge.app',
        images: [
          {
            url: 'https://truegauge.app/og-image.png?v=2',
            width: 1200,
            height: 630,
            alt: 'TrueGauge - Precision Business Health',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: settings?.ogTitle || 'TrueGauge - Precision Business Health',
        description: settings?.ogDescription || 'Your instrument panel for business clarity',
      },
      robots: {
        index: settings?.robotsIndex ?? true,
        follow: settings?.robotsFollow ?? true,
      },
      icons: {
        icon: [
          { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
          { url: "/favicon.png", sizes: "32x32", type: "image/png" },
          { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
          { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: "/apple-touch-icon.png",
      },
    };
  } catch {
    return {
      title: 'TrueGauge',
      description: 'Business health dashboard for smart operators',
      icons: {
        icon: [
          { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
          { url: "/favicon.png", sizes: "32x32", type: "image/png" },
          { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
          { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: "/apple-touch-icon.png",
      },
    };
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ backgroundColor: '#000' }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased pt-8 bg-black`}
      >
        {children}
      </body>
    </html>
  );
}
