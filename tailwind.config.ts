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
        poly: {
          dark: "#0d1117",
          card: "#161b22",
          border: "#30363d",
          accent: "#58a6ff",
          green: "#3fb950",
          red: "#f85149",
          yellow: "#d29922",
          muted: "#8b949e",
          text: "#e6edf3",
        },
      },
    },
  },
  plugins: [],
};

export default config;
