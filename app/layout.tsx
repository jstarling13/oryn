import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Oryn — Stop paying more than you should.",
  description:
    "Oryn tracks what you pay every vendor, benchmarks it against market rates, and drafts negotiation emails for you. Most clients recover the cost of Oryn in the first renegotiation.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://oryn.ai"),
  openGraph: {
    title: "Oryn — Stop paying more than you should.",
    description:
      "AI-powered vendor cost optimization for restaurants, contractors, and retail shops.",
    siteName: "Oryn",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Oryn",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Oryn — Stop paying more than you should.",
    description:
      "AI-powered vendor cost optimization for restaurants, contractors, and retail shops.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={inter.variable}>
        <body className="min-h-screen bg-white text-gray-900 antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
