import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import brandConfig from "@/lib/brand-config.json";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: brandConfig.seoTitle,
  description: brandConfig.seoDescription,
  keywords: brandConfig.seoKeywords,
  openGraph: {
    title: brandConfig.ogTitle,
    description: brandConfig.ogDescription,
    siteName: 'TrueGauge',
    type: 'website',
    url: 'https://truegauge.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: brandConfig.ogTitle,
    description: brandConfig.ogDescription,
  },
  robots: {
    index: brandConfig.robotsIndex,
    follow: brandConfig.robotsFollow,
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased pt-8`}
      >
        {children}
      </body>
    </html>
  );
}
