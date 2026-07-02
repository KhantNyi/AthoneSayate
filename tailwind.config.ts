import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--ink) / <alpha-value>)",
        paper: "rgb(var(--paper) / <alpha-value>)",
        // "white" is remapped to the themed surface token so the existing
        // bg-white/border-white classes flip automatically in dark mode.
        white: "rgb(var(--surface) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        bright: "#ffffff",
        moss: "rgb(var(--moss) / <alpha-value>)",
        river: "rgb(var(--river) / <alpha-value>)",
        amber: "rgb(var(--amber) / <alpha-value>)",
        coral: "rgb(var(--coral) / <alpha-value>)"
      },
      fontFamily: {
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        lift: "var(--shadow-lift)",
        glow: "0 8px 24px rgb(var(--river) / 0.28)"
      },
      borderRadius: {
        DEFAULT: "0.625rem"
      },
      keyframes: {
        "tab-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(16px) scale(0.97)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        "sheet-in": {
          from: { opacity: "0", transform: "translateY(28px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" }
        }
      },
      animation: {
        "tab-in": "tab-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        "toast-in": "toast-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        "sheet-in": "sheet-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.25s ease-out both",
        shimmer: "shimmer 1.8s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
