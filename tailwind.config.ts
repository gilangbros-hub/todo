import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "rpg-dark": "#0d0d1a",
        "rpg-card": "#1a1a2e",
        "rpg-border": "#2a2a4a",
        "rpg-normal": "#6b7280",
        "rpg-rare": "#4a9eff",
        "rpg-epic": "#a78bfa",
        "rpg-legendary": "#f0c040",
        // Oracle theme colors
        "oracle-surface": "#141311",
        "oracle-deepest": "#0e0d0b",
        "oracle-gold": "#ecc14f",
        "oracle-gold-container": "#c8a030",
        "oracle-gold-fixed": "#ffdf95",
        "oracle-sapphire": "#92ccff",
        "oracle-sapphire-container": "#006ea6",
        "oracle-stone": "#141210",
        "oracle-card": "#1a1815",
        "oracle-panel": "#201e1a",
        "oracle-container": "#211f1d",
        "oracle-text": "#e6e2de",
        "oracle-muted": "#9a9080",
        "oracle-faint": "#5a5248",
        "oracle-border": "rgba(200, 169, 110, 0.18)",
        "oracle-critical": "#e74c3c",
        "oracle-high": "#e67e22",
        "oracle-medium": "#f39c12",
        "oracle-low": "#27ae60",
      },
      fontFamily: {
        pixel: ["var(--font-pixel)", "monospace"],
        retro: ["var(--font-retro)", "monospace"],
        // Oracle theme fonts (CSS variable binding for next/font)
        "oracle-display": ["var(--font-oracle-display)", "Cinzel", "serif"],
        "oracle-body": ["var(--font-oracle-body)", "Inter", "sans-serif"],
        "oracle-mono": ["var(--font-oracle-mono)", "JetBrains Mono", "monospace"],
      },
      fontSize: {
        // Oracle theme font sizes
        "oracle-hero": ["56px", { lineHeight: "1.1", fontWeight: "700" }],
        "oracle-headline-lg": ["32px", { lineHeight: "1.2", fontWeight: "600" }],
        "oracle-headline-md": ["20px", { lineHeight: "1.3", fontWeight: "600" }],
        "oracle-body-lg": ["18px", { lineHeight: "1.6" }],
        "oracle-body-md": ["16px", { lineHeight: "1.5" }],
        "oracle-label-mono": ["14px", { lineHeight: "1.4" }],
        "oracle-label-sm": ["12px", { lineHeight: "1.4" }],
      },
      borderWidth: {
        "pixel": "4px",
      },
      borderRadius: {
        "pixel": "2px",
      },
      boxShadow: {
        "normal": "0 0 8px #6b7280",
        "rare": "0 0 8px #4a9eff",
        "epic": "0 0 8px #a78bfa",
        "legendary": "0 0 8px #f0c040",
        "overdue": "0 0 8px #ef4444",
        "normal-hover": "0 0 12px #6b7280",
        "rare-hover": "0 0 12px #4a9eff",
        "epic-hover": "0 0 12px #a78bfa",
        "legendary-hover": "0 0 12px #f0c040",
        // Oracle theme shadows
        "oracle-glow": "0 0 15px rgba(236, 193, 79, 0.4)",
        "oracle-glow-sm": "0 0 8px rgba(236, 193, 79, 0.25)",
        "oracle-glow-lg": "0 0 30px rgba(236, 193, 79, 0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
