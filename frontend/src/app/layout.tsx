import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers/Providers";
import { SITE_META } from "@/lib/tsData";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: SITE_META.title,
    template: "%s | BoggersTheFish — TS",
  },
  description: SITE_META.description,
  metadataBase: new URL(SITE_META.url),
  keywords: [
    "Thinking System",
    "TS-OS",
    "BoggersTheFish",
    "BoggersTheAI",
    "constraint graph",
    "wave propagation",
    "self-improving AI",
    "cognitive architecture",
    "living graph",
    "QLoRA",
    "FastAPI",
  ],
  authors: [{ name: SITE_META.author, url: SITE_META.url }],
  creator: SITE_META.author,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_META.url,
    title: SITE_META.title,
    description: SITE_META.description,
    siteName: "BoggersTheFish — TS",
    images: [
      {
        url: SITE_META.ogImage,
        width: 1200,
        height: 630,
        alt: "TS — Thinking System / Thinking Wave",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_META.title,
    description: SITE_META.description,
    creator: SITE_META.twitter,
    images: [SITE_META.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-black text-[#F0F0F0] font-sans antialiased min-h-screen overflow-x-hidden">
        <Providers>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
