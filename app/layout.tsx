import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "SelfHeal — Real-Time Reliability Monitor for Self-Healing Web Scrapers",
  description:
    "Automated drift detection, AI Flow self-healing, and human-in-the-loop approval monitor for Bright Data Scraper Studio collectors.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Header />
        <main className="container" style={{ padding: "2rem 1.5rem" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
