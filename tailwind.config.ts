import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        stone: {
          bg: "#F3F4F2",
          "bg-deep": "#EDEFEF",
        },
        card: {
          DEFAULT: "#FFFFFF",
          soft: "#FAFBFA",
        },
        aqua: {
          50: "#E9F7F6",
          100: "#DDF4F2",
          400: "#2AB3AF",
          500: "#149D9A",
          600: "#188F8D",
          700: "#0E7F7D",
          800: "#0A6866",
        },
        ink: {
          DEFAULT: "#182126",
          soft: "#30383D",
          sub: "#68757B",
          faint: "#93A0A6",
        },
        gold: {
          DEFAULT: "#C9A86A",
          soft: "#F4EDDE",
        },
        danger: "#D9534F",
        warn: "#E8A33D",
      },
      borderRadius: {
        card: "16px",
        btn: "12px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(24,33,38,0.05), 0 4px 14px rgba(24,33,38,0.05)",
        "card-hover":
          "0 2px 6px rgba(24,33,38,0.07), 0 8px 24px rgba(24,33,38,0.08)",
        nav: "0 -2px 12px rgba(24,33,38,0.06)",
      },
      fontSize: {
        "kpi-lg": [
          "clamp(1.5rem, 1.2rem + 1.2vw, 2.125rem)",
          { lineHeight: "1.15", fontWeight: "700" },
        ],
        "page-title": [
          "clamp(1.375rem, 1.2rem + 0.8vw, 1.75rem)",
          { lineHeight: "1.25", fontWeight: "700" },
        ],
        "section-title": [
          "clamp(1.125rem, 1.05rem + 0.4vw, 1.375rem)",
          { lineHeight: "1.3", fontWeight: "600" },
        ],
      },
    },
  },
  plugins: [],
};
export default config;
