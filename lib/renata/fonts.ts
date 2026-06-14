import { Outfit, JetBrains_Mono } from "next/font/google";
import { GeistSans } from "geist/font/sans";

export const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const geist = GeistSans;

/**
 * Combined className string to apply modern font variables.
 */
export const renataFontVariables = `${outfit.variable} ${geist.variable} ${jetbrainsMono.variable}`;
