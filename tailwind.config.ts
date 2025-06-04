import type { Config } from "tailwindcss";

export default {
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
        brand: {
          white: {
            primary: "#fafafa",
            secondary: "#f3f3f3",
            dark: "#DEDEDE",
          },
          purple: {
            primary: "#7258DB",
          },
          blue: {
            primary: "#0047FF",
            primaryLight: "#EEF3FF",
          },
          palette: {
            primary: "#047857",
            primaryLight: "#f0fdfa",
          },
          black: {
            primary: "#282828",
            secondary: "#757575",
            light: "#E7E7E9",
            ultralight: "#DCDCDC",
          },
          red: {
            primary: "#FF3A44",
            primaryLight: "#FFF2F3",
          },
          pink: {
            primary: "#F62B8C",
            secondary: "#F572B1",
          },
          yellow: {
            primary: "#fec700",
            secondary: "#e63513",
          },
          gold: {
            primary: "#cca579",
          },
          green: {
            primary: "#009A00",
            dark: "#171a18",
            primaryLight: "#c6db00",
            secondary: "#0fde24",
          },
          background: "#f7f7f7",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
