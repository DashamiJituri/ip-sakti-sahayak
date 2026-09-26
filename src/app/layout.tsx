import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import FallingLeaves from "@/components/FallingLeaves";

export const metadata: Metadata = {
  title: "IP-SAKTI Sahayak — Ayurveda IP & Regulatory Assistant",
  description:
    "A multilingual, source-cited assistant for Intellectual Property and regulatory guidance in Ayurveda, across national and international regimes. SIH26045, Ministry of Ayush.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef7ef" },
    { media: "(prefers-color-scheme: dark)", color: "#09110b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Loaded via <link>, not next/font, so the build never depends on network access to
            fonts.googleapis.com. Falls back to the system stack in globals.css if this is blocked. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans bg-paper text-ink antialiased">
        <ThemeProvider>
          <LanguageProvider>
            <FallingLeaves />
            <div className="relative z-[1]">{children}</div>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
