import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SelfHeal — Real-Time Reliability Monitor for Self-Healing Web Scrapers",
  description:
    "Automated drift detection, AI Flow self-healing, and human-in-the-loop approval monitor for Bright Data Scraper Studio collectors.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ToastProvider>
          <CustomCursor />
          <Header />
          <main className="container" style={{ paddingTop: "1.5rem", paddingBottom: "3rem" }}>
            <div className="page-fade-in">
              {children}
            </div>
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
