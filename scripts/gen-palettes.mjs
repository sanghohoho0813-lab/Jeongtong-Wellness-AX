/**
 * v1.2 THEME LIBRARY 6종을 실제 CSS 변수로 굽는다.
 *
 * 손으로 색을 고르지 않는다. 지금 쓰는 딥틸 조합은 대비를 하나씩 재서
 * 맞춰 둔 값이라, 나머지 다섯도 같은 기준을 통과해야 한다.
 * 그래서 v1.2 표의 6색에서 출발해 OKLCH 로 밝기만 움직이며
 * **필요한 대비가 나올 때까지 내려가거나 올라간다.**
 */

// ── sRGB ↔ OKLab ───────────────────────────────────────────────
const srgbToLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToRgb(h) {
  const s = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
}
function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
}

function rgbToOklab([R, G, B]) {
  const r = srgbToLin(R / 255), g = srgbToLin(G / 255), b = srgbToLin(B / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function oklabToRgb([L, a, bb]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * bb) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * bb) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * bb) ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [linToSrgb(r) * 255, linToSrgb(g) * 255, linToSrgb(b) * 255];
}
const toLCH = ([L, a, b]) => [L, Math.hypot(a, b), Math.atan2(b, a)];
const fromLCH = ([L, C, h]) => [L, C * Math.cos(h), C * Math.sin(h)];

/** 밝기 L 과 채도 배율만 바꾼 색 */
function shift(hex, L, chromaScale = 1) {
  const [, C, h] = toLCH(rgbToOklab(hexToRgb(hex)));
  return rgbToHex(oklabToRgb(fromLCH([L, C * chromaScale, h])));
}

// ── 대비 ───────────────────────────────────────────────────────
const lum = ([r, g, b]) =>
  0.2126 * srgbToLin(r / 255) + 0.7152 * srgbToLin(g / 255) + 0.0722 * srgbToLin(b / 255);
function contrast(a, b) {
  const [x, y] = [lum(hexToRgb(a)), lum(hexToRgb(b))];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/**
 * 배경 bg 위에서 target 대비가 나올 때까지 L 을 움직인다.
 * dir=-1 은 어둡게(밝은 배경용), +1 은 밝게(어두운 배경용).
 */
function meet(hex, bgs, target, dir) {
  const [, C, h] = toLCH(rgbToOklab(hexToRgb(hex)));
  let L = toLCH(rgbToOklab(hexToRgb(hex)))[0];
  for (let i = 0; i < 400; i++) {
    const c = rgbToHex(oklabToRgb(fromLCH([L, C, h])));
    if (bgs.every((bg) => contrast(c, bg) >= target)) return c;
    L += dir * 0.0025;
    if (L < 0.02 || L > 0.99) break;
  }
  return rgbToHex(oklabToRgb(fromLCH([Math.min(0.99, Math.max(0.02, L)), C, h])));
}

const trip = (hex) => hexToRgb(hex).join(" ");

/**
 * 색 변수는 두 가지 모양으로 쓰인다.
 *   --c-* 는 tailwind 가 rgb(var(--x) / <alpha>) 로 감싸므로 **삼원색 숫자**
 *   --chart-* 는 그대로 색으로 쓰이므로 **hex**
 * 섞어 쓰면 조용히 색이 사라진다.
 */
const val = (name, hex) =>
  name.startsWith("--chart-") ? hex : `${trip(hex)}; /* ${hex} */`.replace(/;.*$/, "") + `; /* ${hex} */`;

// ── v1.2 THEME LIBRARY 표 ──────────────────────────────────────
const THEMES = [
  { key: "navy",     no: "01", name: "Executive Navy",  shell: "#0F2747", primary: "#1D4ED8", accent: "#D4A94F" },
  { key: "teal",     no: "02", name: "Teal Champagne",  shell: "#073B3F", primary: "#0E7377", accent: "#C9A76A" },
  { key: "burgundy", no: "03", name: "Burgundy Gold",   shell: "#3A1523", primary: "#7C2845", accent: "#C5A15A" },
  { key: "graphite", no: "04", name: "Graphite Copper", shell: "#20242A", primary: "#424A52", accent: "#C37B4A" },
  { key: "indigo",   no: "05", name: "Indigo Lavender", shell: "#25265B", primary: "#4C51BF", accent: "#B59AE7" },
  { key: "forest",   no: "06", name: "Forest Sand",     shell: "#173D32", primary: "#2E6B55", accent: "#C9A66B" },
];

/** 표면색 — 팔레트가 바꾸지 않는 중립. 대비 검사의 기준이 된다. */
const LIGHT_CARD = "#ffffff";
const LIGHT_BG = "#f4f3ef";
const DARK_CARD = "#17211f";
const DARK_CARD_SOFT = "#1c2825";

function build(t) {
  const { shell, primary, accent } = t;

  // 껍데기 램프 — 늘 어두운 면(히어로 · 활성 메뉴 · 공개 머리글)
  const deep = {
    950: shift(shell, 0.22),
    900: shift(shell, 0.27),
    800: shift(shell, 0.31),
    700: shift(shell, 0.37),
    600: shift(shell, 0.43),
    // 딥 위의 보조 글자 — 4.5:1 이상 (v1.2 Dark Shell 규정과 같은 방향)
    sub: meet(shift(shell, 0.78, 0.5), [shift(shell, 0.27)], 4.5, +1),
    faint: meet(shift(shell, 0.65, 0.5), [shift(shell, 0.27)], 3.2, +1),
  };

  // 주 색 램프 — 고정값(테마 무관 자리) : 단추 그라데이션 · 아이콘
  const aquaFixed = {
    300: shift(primary, 0.79, 0.75),
    400: shift(primary, 0.68),
    500: shift(primary, 0.60),
    600: shift(primary, 0.55),
    // 650·850 은 흰 글자를 얹는 주 단추 — 흰색 대비 4.5 이상을 강제한다
    650: meet(shift(primary, 0.52), [LIGHT_CARD], 4.5, -1),
    850: meet(shift(primary, 0.44), [LIGHT_CARD], 6.0, -1),
  };

  // 라이트 — 부드러운 바탕 3단
  const lightSoft = {
    50: shift(primary, 0.965, 0.16),
    100: shift(primary, 0.945, 0.2),
    200: shift(primary, 0.90, 0.28),
  };
  // 라이트 — 글자로 쓰는 주 색. 흰 카드 · 아이보리 배경 · soft 위 모두에서 AA
  const light700 = meet(shift(primary, 0.50, 0.85), [LIGHT_CARD, LIGHT_BG, lightSoft[50]], 4.6, -1);
  const light800 = meet(shift(primary, 0.46, 0.8), [LIGHT_CARD, LIGHT_BG, lightSoft[100]], 5.6, -1);

  const goldSoftLight = shift(accent, 0.955, 0.3);
  const goldDeepLight = meet(shift(accent, 0.52, 0.78), [LIGHT_CARD, goldSoftLight], 5.1, -1);

  // 다크 — 표면은 중립 그대로, 색만 뒤집는다
  const darkSoft = {
    50: shift(primary, 0.30, 0.55),
    100: shift(primary, 0.345, 0.6),
    200: shift(primary, 0.42, 0.65),
  };
  const dark700 = meet(shift(primary, 0.76, 0.85), [DARK_CARD, DARK_CARD_SOFT], 5.5, +1);
  const dark800 = meet(shift(primary, 0.83, 0.75), [DARK_CARD, DARK_CARD_SOFT], 7.0, +1);
  const goldSoftDark = shift(accent, 0.26, 0.4);
  const goldDeepDark = meet(shift(accent, 0.83, 0.6), [DARK_CARD, goldSoftDark], 5.0, +1);

  // 선택된 칩 — 배경과 글자를 한 쌍으로
  const selLight = meet(shift(primary, 0.32, 0.55), [LIGHT_CARD], 8.0, -1);
  const selDark = dark700;
  const selInkDark = shift(shell, 0.18);

  // 차트 2색 — 건수(주 색) / 금액(강조색). 표면 위에서 3:1 이상.
  const chartCountLight = meet(shift(primary, 0.58), [LIGHT_CARD], 3.0, -1);
  const chartMoneyLight = meet(shift(accent, 0.62, 0.85), [LIGHT_CARD], 3.0, -1);
  const chartCountDark = meet(shift(primary, 0.62), [DARK_CARD_SOFT], 3.0, +1);
  const chartMoneyDark = meet(shift(accent, 0.63), [DARK_CARD_SOFT], 3.0, +1);

  return {
    light: {
      "--c-deep-950": deep[950], "--c-deep-900": deep[900], "--c-deep-800": deep[800],
      "--c-deep-700": deep[700], "--c-deep-600": deep[600],
      "--c-deep-sub": deep.sub, "--c-deep-faint": deep.faint,
      "--c-aqua-300": aquaFixed[300], "--c-aqua-400": aquaFixed[400],
      "--c-aqua-500": aquaFixed[500], "--c-aqua-600": aquaFixed[600],
      "--c-aqua-650": aquaFixed[650], "--c-aqua-850": aquaFixed[850],
      "--c-gold": accent, "--c-gold-lite": shift(accent, 0.88, 0.55),
      "--c-aqua-50": lightSoft[50], "--c-aqua-100": lightSoft[100], "--c-aqua-200": lightSoft[200],
      "--c-aqua-700": light700, "--c-aqua-800": light800,
      "--c-gold-soft": goldSoftLight, "--c-gold-deep": goldDeepLight,
      "--c-sel": selLight, "--c-sel-ink": "#ffffff",
      "--chart-count": chartCountLight, "--chart-money": chartMoneyLight,
    },
    dark: {
      "--c-aqua-50": darkSoft[50], "--c-aqua-100": darkSoft[100], "--c-aqua-200": darkSoft[200],
      "--c-aqua-700": dark700, "--c-aqua-800": dark800,
      "--c-gold-soft": goldSoftDark, "--c-gold-deep": goldDeepDark,
      "--c-sel": selDark, "--c-sel-ink": selInkDark,
      "--chart-count": chartCountDark, "--chart-money": chartMoneyDark,
    },
    audit: {
      "aqua-700 / 흰 카드": contrast(light700, LIGHT_CARD).toFixed(2),
      "aqua-700 / 아이보리": contrast(light700, LIGHT_BG).toFixed(2),
      "aqua-800 / 흰 카드": contrast(light800, LIGHT_CARD).toFixed(2),
      "gold-deep / gold-soft": contrast(goldDeepLight, goldSoftLight).toFixed(2),
      "aqua-650 흰글자": contrast(aquaFixed[650], "#ffffff").toFixed(2),
      "deep-sub / deep-900": contrast(deep.sub, deep[900]).toFixed(2),
      "흰글자 / deep-800": contrast("#ffffff", deep[800]).toFixed(2),
      "sel-ink / sel (라이트)": contrast("#ffffff", selLight).toFixed(2),
      "다크 aqua-700 / 카드": contrast(dark700, DARK_CARD).toFixed(2),
      "다크 gold-deep / 카드": contrast(goldDeepDark, DARK_CARD).toFixed(2),
      "다크 sel-ink / sel": contrast(selInkDark, selDark).toFixed(2),
    },
  };
}

// ── 출력 ──────────────────────────────────────────────────────
const mode = process.argv[2];
if (mode === "audit") {
  for (const t of THEMES) {
    const b = build(t);
    console.log(`\n${t.no} ${t.name} (${t.key})`);
    for (const [k, v] of Object.entries(b.audit)) {
      const n = Number(v);
      const need = /흰글자 \/ deep|sel-ink|deep-sub/.test(k) ? 4.5 : k.startsWith("차트") ? 3 : 4.5;
      console.log(`   ${n >= (k.includes("차트") ? 3 : 4.5) ? "OK " : "!! "} ${k.padEnd(24)} ${v}`);
    }
  }
} else {
  const out = [];
  for (const t of THEMES) {
    if (t.key === "teal") continue; // 기본 조합은 지금 값을 그대로 둔다
    const b = build(t);
    out.push(`/* ${t.no} ${t.name} */`);
    out.push(`:root[data-palette="${t.key}"] {`);
    for (const [k, v] of Object.entries(b.light)) out.push(`  ${k}: ${val(k, v)};`);
    out.push(`}`);
    out.push(`:root[data-palette="${t.key}"][data-theme="dark"] {`);
    for (const [k, v] of Object.entries(b.dark)) out.push(`  ${k}: ${val(k, v)};`);
    out.push(`}`);
    out.push("");
  }
  console.log(out.join("\n"));
}
