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
      /**
       * xs — 요즘 쓰이는 폰 중 좁은 축(360px, 갤럭시 A 계열)과
       * 보통 폰(390~430px)을 가르는 지점.
       * 좁은 폰에서만 글자·여백을 한 단계 줄일 때 쓴다.
       */
      screens: { xs: "400px" },
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
          300: v("--c-aqua-300"),
          400: v("--c-aqua-400"),
          500: v("--c-aqua-500"),
          600: v("--c-aqua-600"),
          /* 650·850 은 **밝기(라이트/다크)와 무관하게 고정** — 주 버튼
             그라데이션 전용이다. 예전 from-aqua-500 은 흰 글자 대비가
             3.32 였고, 700/800 은 밝기에 따라 뒤집혀 흰 글자가 묻혔다.
             색 조합(팔레트)이 바뀌면 함께 바뀐다. */
          650: v("--c-aqua-650"),
          850: v("--c-aqua-850"),
          700: v("--c-aqua-700"),
          800: v("--c-aqua-800"),
        },
        /*
          껍데기 색 — Hero · 활성 메뉴 · 공개 화면 머리글처럼 **늘 어두운 면**.
          밝기(라이트/다크)로는 바뀌지 않고, 색 조합(팔레트)으로만 바뀐다.
          기본값은 지금까지 쓰던 Deep Teal 그대로다.
        */
        deep: {
          950: v("--c-deep-950"),
          900: v("--c-deep-900"),
          800: v("--c-deep-800"),
          700: v("--c-deep-700"),
          600: v("--c-deep-600"),
          line: "rgba(255,255,255,0.14)",
          sub: v("--c-deep-sub"),
          faint: v("--c-deep-faint"),
        },
        /* 선택된 칩·세그먼트 (배경/글자 한 쌍) */
        sel: v("--c-sel"),
        "sel-ink": v("--c-sel-ink"),
        ink: {
          DEFAULT: v("--c-ink"),
          soft: v("--c-ink-soft"),
          sub: v("--c-ink-sub"),
          faint: v("--c-ink-faint"),
        },
        gold: {
          DEFAULT: v("--c-gold"),
          /*
            늘 어두운 면(공개 화면 머리글·히어로·강조 가격 카드) 위에 얹는 금색.
            gold-soft / gold-deep 는 테마 변수라 다크 모드에서 뒤집힌다 —
            바탕이 함께 뒤집히는 카드에서는 그게 맞지만, 테마와 무관하게
            늘 딥그린인 면에서는 글자만 까매져 안 보이게 된다. 그래서 고정값.
          */
          lite: v("--c-gold-lite"),
          deep: v("--c-gold-deep"),
          soft: v("--c-gold-soft"),
        },
        danger: "#CC4B44",
        /* 글자 전용 상태색 — 테마에 따라 값이 바뀐다 (globals.css 설명 참고) */
        "danger-text": v("--c-danger-text"),
        "warn-text": v("--c-warn-text"),
        "positive-text": v("--c-positive-text"),
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
