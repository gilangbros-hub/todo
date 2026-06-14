import type { Metadata } from "next";
import { renataFontVariables } from "@/lib/renata/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Renata",
  description: "Requirement Analytica — AI-powered Business Requirements Document analysis",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={renataFontVariables}>
      <body className="min-h-screen bg-sys-bg text-sys-text font-geist antialiased selection:bg-sys-primary-container/30">
        {children}
      </body>
    </html>
  );
}
