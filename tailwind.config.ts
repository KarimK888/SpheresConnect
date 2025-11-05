import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/context/**/*.{ts,tsx}",
    "./src/hooks/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
    "./src/styles/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#167050",
          foreground: "#F4F7F5"
        },
        accent: {
          DEFAULT: "#B33A50",
          foreground: "#FFE4EA"
        },
        background: "#111111",
        muted: {
          DEFAULT: "#222222",
          foreground: "#F1F0F5"
        },
        border: "#2A2A2A",
        card: {
          DEFAULT: "#1B1B1B",
          foreground: "#F9F9FB"
        }
      }
    }
  },
  plugins: []
};

export default config;
