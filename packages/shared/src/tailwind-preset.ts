// Shared Tailwind preset — the half of the design system that lives in
// utility classes (the CSS custom properties themselves are in theme.css).
// Apps pull this in via `presets: [preset]` and keep app-specific
// keyframes/animations in their own config.
const preset = {
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
        display: [
          "var(--font-display)",
          "var(--font-body)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ]
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
      }
    }
  }
};

export default preset;
