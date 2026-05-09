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
      },
      fontFamily: {
        pixel: ["var(--font-pixel)", "monospace"],
        retro: ["var(--font-retro)", "monospace"],
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
      },
    },
  },
  plugins: [],
};

export default config;
