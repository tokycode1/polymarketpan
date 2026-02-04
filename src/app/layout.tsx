import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OneM-Tools | Polymarket Scanner",
  description:
    "OneM-Tools - Professional Polymarket market scanner. Scan and filter high-probability markets with real-time data.",
  keywords: ["OneM-Tools", "polymarket", "prediction markets", "scanner", "trading", "crypto"],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔧</text></svg>",
  },
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
