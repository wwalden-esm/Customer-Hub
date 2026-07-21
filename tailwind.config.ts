import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
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
          "red-dark": "#D2353D",
          "red-deeper": "#B23137",
          black: "#2D2826",
          grey: "#686468",
          "grey-light": "#EFEFF5",
          blue: "#1F4E79",
          "blue-brand": "#0056A7",
          purple: "#666699",
          lavender: "#DEDDEB",
          "red-text": "#C92A34",
          border: "#E2E0E1",
          "border-hover": "#C5C3C4",
          muted: "#757175",
          gradient: {
            1: "#F4333F",
            2: "#D2353D",
            3: "#B23137",
            4: "#912D30",
            5: "#71282A",
            6: "#522122",
            7: "#32191B",
            8: "#080C0F",
          },
        },
        hub: {
          accent: "var(--hub-accent, #F4333F)",
          "accent-light": "var(--hub-accent-light, #FEF2F2)",
          "accent-border": "var(--hub-accent-border, rgba(244,51,63,0.25))",
        },
      },
      fontFamily: {
        sans: [
          "New June",
          "Calibri",
          "Open Sans",
          "Helvetica Neue",
          "Arial Nova",
          "system-ui",
          "sans-serif",
        ],
      },
      fontSize: {
        label: ["10px", { lineHeight: "1", fontWeight: "800", letterSpacing: "0.09em" }],
        badge: ["11px", { lineHeight: "1.2", fontWeight: "700" }],
      },
      borderRadius: {
        card: "6px",
      },
    },
  },
  plugins: [],
};
export default config;
