import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

// PRD §13.1 type spec: Fraunces for display/headings only, Inter for body/UI,
// IBM Plex Mono for all numeric figures.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Career Explorer | Wanderlust Careers",
  description:
    "Wanderlust Careers labor-market dashboard for posting trends, salaries, and adjacent titles.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas font-sans text-ink">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
