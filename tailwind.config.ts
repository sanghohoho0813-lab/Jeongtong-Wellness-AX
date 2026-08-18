import type { Config } from "tailwindcss";

/**
 * 중립/표면 색상과 soft aqua·gold 램프는 CSS 변수(RGB triplet) 기반 —
 * 라이트/다크 테마 전환 시 globals.css 의 변수만 바뀐다.
 * aqua 400~600, deep, 포인트 컬러(sky/violet/emerald/amber 계열)는 고정.
 */
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        stone: {
          bg: v("--c-bg"),
          "bg-deep": v("--c-bg-deep"),
          line: v("--c-line"),
        },
        card: {
          DEFAULT: v("--c-card"),
          soft: v("--c-card-soft"),
        },
        aqua: {
          50: v("--c-aqua-50"),
          100: v("--c-aqua-100"),
          200: v("--c-aqua-200"),
          300: "#8FCFCB",
          400: "#2AB3AF",
          500: "#149D9A",
          600: "#128B89",
          700: v("--c-aqua-700"),
          800: v("--c-aqua-800"),
        },
        // Deep Teal / Emerald — Hero 및 강조 영역 (테마 무관 고정)
        deep: {
          950: "#06211F",
          900: "#0A2E2C",
          800: "#0C3937",
          700: "#0F4A47",
          600: "#136058",
          line: "rgba(255,255,255,0.14)",
          sub: "#9CC8C3",
          faint: "#6E9A95",
        },
        ink: {
          DEFAULT: v("--c-ink"),
          soft: v("--c-ink-soft"),
          sub: v("--c-ink-sub"),
          faint: v("--c-ink-faint"),
        },
        gold: {
          DEFAULT: "#C9A86A",
          deep: v("--c-gold-deep"),
          soft: v("--c-gold-soft"),
        },
        danger: "#CC4B44",
        warn: "#DB9A32",
        positive: "#2E9E6B",
      },
      borderRadius: {
        card: "18px",
        "card-lg": "22px",
        btn: "12px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(26,34,38,0.04), 0 6px 18px rgba(26,34,38,0.05)",
        "card-hover":
          "0 2px 6px rgba(26,34,38,0.06), 0 12px 32px rgba(26,34,38,0.09)",
        hero: "0 8px 20px rgba(10,46,44,0.22), 0 24px 56px rgba(10,46,44,0.18)",
        float: "0 3px 10px rgba(26,34,38,0.07), 0 16px 40px rgba(26,34,38,0.10)",
        nav: "0 -2px 16px rgba(26,34,38,0.08)",
        "inner-soft": "inset 0 1px 0 rgba(255,255,255,0.5)",
      },
      fontSize: {
        "kpi-lg": [
          "clamp(1.625rem, 1.25rem + 1.4vw, 2.375rem)",
          { lineHeight: "1.1", fontWeight: "800", letterSpacing: "-0.02em" },
        ],
        "page-title": [
          "clamp(1.375rem, 1.2rem + 0.8vw, 1.75rem)",
          { lineHeight: "1.25", fontWeight: "800", letterSpacing: "-0.01em" },
        ],
        "section-title": [
          "clamp(1.0625rem, 1rem + 0.35vw, 1.25rem)",
          { lineHeight: "1.3", fontWeight: "700", letterSpacing: "-0.01em" },
        ],
      },
    },
  },
  plugins: [],
};
export default config;
