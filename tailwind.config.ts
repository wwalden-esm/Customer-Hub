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
          border: "#E2E0E1",
          "border-hover": "#C5C3C4",
          muted: "#9E9B9E",
        },
        hub: {
          accent: "var(--hub-accent, #F4333F)",
          "accent-light": "var(--hub-accent-light, #FEF2F2)",
          "accent-border": "var(--hub-accent-border, rgba(244,51,63,0.25))",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        label: ["10px", { lineHeight: "1", fontWeight: "800", letterSpacing: "0.09em" }],
        badge: ["11px", { lineHeight: "1.2", fontWeight: "700" }],
      },
      borderRadius: {
        card: "4px",
      },
    },
  },
  plugins: [],
};
export default config;
