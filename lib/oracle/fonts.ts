import { Cinzel, Inter, JetBrains_Mono } from "next/font/google";

export const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oracle-display",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-oracle-body",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-oracle-mono",
  display: "swap",
});

/**
 * Combined className string to apply all Oracle font CSS variables.
 * Use this on the Oracle layout root element.
 */
export const oracleFontVariables = `${cinzel.variable} ${inter.variable} ${jetbrainsMono.variable}`;
