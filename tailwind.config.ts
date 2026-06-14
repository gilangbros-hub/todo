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
        // Stitch Light Mode System Colors
        "sys-bg": "#f8f9fa",
        "sys-surface": "#ffffff",
        "sys-elevated": "#ffffff",
        "sys-border": "rgba(0, 0, 0, 0.05)",
        "sys-text": "#111827",
        "sys-muted": "#4B5563",
        "sys-faint": "#bac9cc",
        "sys-glass": "rgba(255, 255, 255, 0.7)",
        // Accents
        "sys-primary": "#006875",
        "sys-primary-container": "#00e5ff",
        "sys-secondary": "#6366f1", // Using Indigo override
        "sys-success": "#10B981",
        "sys-warning": "#F59E0B",
        "sys-error": "#ba1a1a",
        "ai-gradient-start": "#00E5FF",
        "ai-gradient-end": "#7000FF",
      },
      fontFamily: {
        outfit: ["var(--font-outfit)", "system-ui", "sans-serif"],
        geist: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "600" }],
        "headline-lg": ["32px", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-lg-mobile": ["24px", { lineHeight: "1.2", fontWeight: "600" }],
        "title-md": ["20px", { lineHeight: "1.4", fontWeight: "500" }],
        "body-lg": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "label-md": ["12px", { lineHeight: "1", letterSpacing: "0.05em", fontWeight: "600" }],
        "code-sm": ["13px", { lineHeight: "1.5", fontWeight: "400" }],
      },
      borderRadius: {
        "sm": "0.25rem",
        "md": "0.75rem",
        "lg": "1rem",
        "xl": "1.5rem",
        "3xl": "24px",
        "full": "9999px",
      },
      boxShadow: {
        "neo-glow": "0 0 40px rgba(0, 229, 255, 0.15)",
        "neo-floating": "0 10px 40px -10px rgba(99, 102, 241, 0.08)",
      },
      backgroundImage: {
        "neo-gradient": "linear-gradient(to right bottom, rgba(255,255,255,0.7), rgba(255,255,255,0.5))",
        "ai-gradient": "linear-gradient(to right, #00E5FF, #7000FF)",
      }
    },
  },
  plugins: [],
};

export default config;
