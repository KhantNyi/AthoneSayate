import type { Config } from "tailwindcss";
import sharedPreset from "../../packages/shared/src/tailwind-preset";

const config: Config = {
  presets: [sharedPreset],
  darkMode: "class",
  future: {
    hoverOnlyWhenSupported: true
  },
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      keyframes: {
        "fade-rise": {
          from: { opacity: "0", transform: "translateY(22px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "phone-float": {
          "0%, 100%": { transform: "translateY(0) rotate(-1.2deg)" },
          "50%": { transform: "translateY(-14px) rotate(-1.2deg)" }
        }
      },
      animation: {
        "fade-rise": "fade-rise 0.7s cubic-bezier(0.21, 1, 0.32, 1) both",
        "phone-float": "phone-float 7s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
