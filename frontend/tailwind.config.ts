import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "ts-purple": {
          DEFAULT: "#A020F0",
          light: "#C060FF",
          dark: "#8B00FF",
          dim: "#6600CC",
          faint: "rgba(160, 32, 240, 0.1)",
        },
        border: "rgba(160, 32, 240, 0.2)",
        background: "#000000",
        foreground: "#F0F0F0",
        muted: "#0D0D0D",
        "muted-foreground": "#666666",
        card: "#080808",
        "card-foreground": "#F0F0F0",
        accent: "#A020F0",
        "accent-foreground": "#FFFFFF",
        destructive: "#FF3333",
        ring: "#A020F0",
        input: "#1A1A1A",
        popover: "#080808",
        "popover-foreground": "#F0F0F0",
        primary: "#A020F0",
        "primary-foreground": "#FFFFFF",
        secondary: "#1A1A1A",
        "secondary-foreground": "#F0F0F0",
      },
      backgroundImage: {
        "grid-purple":
          "linear-gradient(rgba(160, 32, 240, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(160, 32, 240, 0.04) 1px, transparent 1px)",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-ts":
          "linear-gradient(135deg, #A020F0 0%, #8B00FF 50%, #6600CC 100%)",
        "gradient-ts-text":
          "linear-gradient(135deg, #C060FF 0%, #A020F0 50%, #8B00FF 100%)",
        "gradient-fade-up":
          "linear-gradient(to top, #000000 0%, transparent 100%)",
      },
      backgroundSize: {
        grid: "50px 50px",
      },
      fontFamily: {
        mono: [
          "var(--font-mono)",
          "JetBrains Mono",
          "Fira Code",
          "Monaco",
          "Consolas",
          "monospace",
        ],
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        propagate: "propagate 1.5s ease-out forwards",
        "wave-flow": "wave-flow 4s ease-in-out infinite",
        "node-float": "node-float 6s ease-in-out infinite",
        "grid-pulse": "grid-pulse 5s ease-in-out infinite",
        "text-glow": "text-glow 2s ease-in-out infinite",
        "border-glow": "border-glow 2s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "slide-in-right": "slide-in-right 0.4s ease-out forwards",
        "spin-slow": "spin 8s linear infinite",
        "ping-slow": "ping 3s cubic-bezier(0, 0, 0.2, 1) infinite",
        "bounce-gentle": "bounce-gentle 3s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": {
            boxShadow:
              "0 0 5px #A020F0, 0 0 10px #A020F0, 0 0 20px rgba(160, 32, 240, 0.3)",
          },
          "50%": {
            boxShadow:
              "0 0 15px #A020F0, 0 0 30px #A020F0, 0 0 60px rgba(160, 32, 240, 0.5)",
          },
        },
        propagate: {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(3)", opacity: "0" },
        },
        "wave-flow": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "node-float": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "33%": { transform: "translateY(-10px) rotate(0.5deg)" },
          "66%": { transform: "translateY(5px) rotate(-0.5deg)" },
        },
        "grid-pulse": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        "text-glow": {
          "0%, 100%": {
            textShadow: "0 0 10px rgba(160, 32, 240, 0.5)",
          },
          "50%": {
            textShadow:
              "0 0 20px rgba(160, 32, 240, 0.8), 0 0 40px rgba(160, 32, 240, 0.4)",
          },
        },
        "border-glow": {
          "0%, 100%": { borderColor: "rgba(160, 32, 240, 0.3)" },
          "50%": { borderColor: "rgba(160, 32, 240, 0.8)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "bounce-gentle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      boxShadow: {
        ts: "0 0 10px #A020F0, 0 0 20px rgba(160, 32, 240, 0.4)",
        "ts-lg":
          "0 0 20px #A020F0, 0 0 40px rgba(160, 32, 240, 0.5), 0 0 80px rgba(160, 32, 240, 0.2)",
        "ts-inner": "inset 0 0 20px rgba(160, 32, 240, 0.2)",
        "ts-card":
          "0 0 0 1px rgba(160, 32, 240, 0.15), 0 4px 20px rgba(0, 0, 0, 0.8)",
        "ts-card-hover":
          "0 0 0 1px rgba(160, 32, 240, 0.4), 0 8px 40px rgba(0, 0, 0, 0.9), 0 0 30px rgba(160, 32, 240, 0.15)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
