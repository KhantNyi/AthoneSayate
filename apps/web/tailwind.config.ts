import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  future: {
    // hover: styles only apply on devices with a real pointer, so touch
    // taps never leave a stuck hover state behind (native iOS behavior).
    hoverOnlyWhenSupported: true
  },
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/shared/src/**/*.{js,ts,jsx,tsx}"
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
        glow: "0 16px 42px rgb(var(--river) / 0.24), inset 0 1px 0 rgb(255 255 255 / 0.34)"
      },
      borderRadius: {
        DEFAULT: "0.625rem"
      },
      transitionProperty: {
        // `scale` is used for press feedback; including it here lets the
        // stock `transition` / `transition-transform` utilities animate it.
        DEFAULT:
          "color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter, scale",
        transform: "transform, scale"
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.32, 0.72, 0, 1)",
        ios: "cubic-bezier(0.32, 0.72, 0, 1)",
        spring: "cubic-bezier(0.34, 1.36, 0.44, 1)"
      },
      transitionDuration: {
        DEFAULT: "200ms"
      },
      keyframes: {
        // Transform + opacity only: animating filter/blur on backdrop-filter
        // surfaces forces full repaints and drops frames on mobile Safari.
        "tab-in": {
          from: { opacity: "0", transform: "translateY(10px) scale(0.99)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(18px) scale(0.94)" },
          "60%": { opacity: "1", transform: "translateY(-2px) scale(1.01)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        "sheet-in": {
          from: { opacity: "0", transform: "translateY(24px) scale(0.97)" },
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
        "tab-in": "tab-in 0.3s cubic-bezier(0.21, 1, 0.32, 1) both",
        "toast-in": "toast-in 0.45s cubic-bezier(0.34, 1.36, 0.44, 1) both",
        "sheet-in": "sheet-in 0.45s cubic-bezier(0.32, 0.72, 0, 1) both",
        "fade-in": "fade-in 0.22s ease-out both",
        shimmer: "shimmer 1.8s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
