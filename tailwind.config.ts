import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        paper: "#f8fafc",
        moss: "#16a34a",
        river: "#2563eb",
        amber: "#f59e0b",
        coral: "#f05a3f"
      },
      boxShadow: {
        soft: "0 16px 36px rgba(15, 23, 42, 0.07)"
      }
    }
  },
  plugins: []
};

export default config;
