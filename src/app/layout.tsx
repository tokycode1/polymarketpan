import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PolyScanner - Polymarket Tail-End Market Scanner",
  description:
    "Scan and filter high-probability markets on Polymarket. Find tail-end opportunities with real-time data.",
  keywords: ["polymarket", "prediction markets", "scanner", "trading"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased bg-poly-dark text-poly-text`}>
        {children}
      </body>
    </html>
  );
}
