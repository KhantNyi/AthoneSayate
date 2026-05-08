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
        ink: "#17201c",
        paper: "#f7f4ec",
        moss: "#5e7c62",
        river: "#3d7485",
        plum: "#7d536d",
        amber: "#c3833d",
        coral: "#bd5b4b"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(26, 34, 30, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
