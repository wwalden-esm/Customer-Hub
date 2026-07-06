import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        esm: {
          red: "#F4333F",
          "red-dark": "#C9272F",
          black: "#2D2826",
          grey: "#686468",
          "grey-light": "#F5F5F5",
          blue: "#1F4E79",
        },
        hub: {
          accent: "var(--hub-accent, #F4333F)",
          "accent-light": "var(--hub-accent-light, #FEF2F2)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
