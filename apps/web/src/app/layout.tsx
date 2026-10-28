import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import type { ReactNode } from "react";
import { Toasts } from "@/components/Toasts";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
});

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Sharad Utsav 2026 · Tickets",
  description: "Book tickets for Sharad Utsav 2026 at Radha Krishna Temple, Allen, Texas. Tuesday 10 to Saturday 14 November 2026.",
};

export const viewport: Viewport = {
  themeColor: "#2c2c2c",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
      <body className="min-h-dvh bg-night font-sans text-white antialiased">
        {children}
        <Toasts />
      </body>
    </html>
  );
}
