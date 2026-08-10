import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette navy + abu (konsisten dengan brand konsultan)
        brand: {
          navy: "#0B1F3A",
          blue: "#1E3A8A",
          slate: "#475569",
          light: "#F1F5F9",
        },
      },
    },
  },
  plugins: [],
};

export default config;
