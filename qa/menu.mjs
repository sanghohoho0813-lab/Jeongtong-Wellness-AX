/**
 * 목차 넷 — 줄이되 잃지 않았는가
 * ================================
 *
 * 목차를 열한 개에서 넷으로 줄였다. 줄이는 일은 쉽고, 줄이면서 **아무것도
 * 잃지 않는 일**은 어렵다. 이 묶음이 보는 것은 셋이다.
 *
 *   1. 정말 넷인가 — PC 와 폰이 같은 넷인가 (배운 것을 다시 배우지 않는다)
 *   2. 내려온 화면이 살아 있는가 — 주소도, 가는 길도
 *   3. 색이 조용해졌는가 — 아이콘 색이 한 계열인가
 *
 * 2번이 핵심이다. 목차에서 뺀 화면이 실제로 못 가는 화면이 되면 그건
 * 정리가 아니라 삭제다. 그래서 여기서는 화면을 지어내지 않고 **실제로
 * 눌러서** 간다 — 탭으로, 더보기로, 검색으로.
 */
import { launch, recorder, go, BASE } from "./lib.mjs";

const { log, finish } = recorder("목차 넷 (줄이되 잃지 않았는가)");
const browser = await launch();
const errs = [];

/* 목차에서 내려온 화면들 — 하나도 죽지 않았어야 한다 */
const MOVED = [
  ["/briefing", "오늘"],
  ["/coach", "AX 코치"],
  ["/visits", "방문"],
  ["/retention", "재방문"],
  ["/service", "서비스"],
  ["/branches", "지점"],
  ["/settings", "설정"],
  ["/welcome", "정통대왕쑥뜸원"],
];

// ═══ 1. PC — 목차는 넷 ═══════════════════════════════════════
const pc = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
pc.on("pageerror", (e) => errs.push(String(e).slice(0, 140)));
await go(pc, "/", 1600);

const sideLinks = pc.locator("aside nav a");
const sideCount = await sideLinks.count();
log("PC 목차가 넷이다", sideCount === 4, `${sideCount}개`);

const sideLabels = await pc.evaluate(() =>
  [...document.querySelectorAll("aside nav a")].map((a) =>
    (a.querySelector("span > span")?.textContent || "").trim(),
  ),
);
log(
  "목차 이름이 '오늘 · 고객 · 성과 · 더보기'",
  ["오늘", "고객", "성과", "더보기"].every((k) => sideLabels.includes(k)),
  sideLabels.join(" / "),
);

/* 이름 두 글자만으로는 안에 무엇이 있는지 모른다 — 한 줄 설명이 붙어 있는가 */
const hasDesc = await pc.evaluate(() =>
  [...document.querySelectorAll("aside nav a")].every(
    (a) => a.querySelectorAll("span > span").length >= 2,
  ),
);
log("목차마다 안에 무엇이 있는지 한 줄로 적혀 있다", hasDesc);

/* 손가락·눈 — 넷으로 줄였으면 남은 넷은 커야 한다 */
const sideBoxes = [];
for (let i = 0; i < sideCount; i++) sideBoxes.push(await sideLinks.nth(i).boundingBox());
log(
  "목차 한 줄이 손가락 크기(48px 이상)",
  sideBoxes.every((b) => b && b.height >= 48),
  sideBoxes.map((b) => Math.round(b?.height ?? 0)).join(" / "),
);

// ═══ 2. 색 — 같은 계열, 톤만 다르게 ═══════════════════════════
/*
  "항목마다 이모티콘 색상이 다 달라서 어지럽다" 가 출발점이었다.
  그래서 **색상(hue)이 몇 가지인지**를 실제로 잰다. 눈으로는
  "비슷해 보인다" 로 넘어가지만 숫자는 넘어가지 않는다.
*/
const hues = await pc.evaluate(() => {
  const rgbToHue = (r, g, b) => {
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (d === 0) return null; // 무채색 — 색상이 없다
    let h;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return ((h * 60) + 360) % 360;
  };
  return [...document.querySelectorAll("aside nav a")]
    .filter((a) => a.getAttribute("aria-current") !== "page") // 활성은 통째로 칠해진다
    .map((a) => {
      const tile = a.querySelector("span[class*='rounded-xl']");
      const c = (getComputedStyle(tile).backgroundColor.match(/[\d.]+/g) || []).map(Number);
      return rgbToHue(c[0], c[1], c[2]);
    })
    .filter((h) => h !== null);
});
const spread = hues.length ? Math.max(...hues) - Math.min(...hues) : 0;
log(
  "아이콘 색이 한 계열이다 (색상 차 12도 이내)",
  hues.length >= 2 && spread <= 12,
  `${hues.map((h) => Math.round(h)).join("° / ")}° — 차 ${Math.round(spread)}°`,
);

/*
  진하기는 달라야 한다 — 같은 색에 같은 진하기면 그냥 같은 칸이다.

  색 자체는 하나(deep-700)이고 **투명도**로 단계를 준다. 그래서 여기서
  재는 것은 밝기가 아니라 알파값이다. 처음에 밝기로 쟀더니 세 칸이 모두
  56 으로 나왔다 — 합성 전 원색을 읽고 있었던 것이다.
*/
const alphas = await pc.evaluate(() =>
  [...document.querySelectorAll("aside nav a")]
    .filter((a) => a.getAttribute("aria-current") !== "page")
    .map((a) => {
      const tile = a.querySelector("span[class*='rounded-xl']");
      const c = (getComputedStyle(tile).backgroundColor.match(/[\d.]+/g) || []).map(Number);
      return c.length > 3 ? c[3] : 1;
    }),
);
log(
  "같은 색 안에서 진하기는 한 단계씩 다르다",
  alphas.length >= 3 && new Set(alphas).size === alphas.length,
  alphas.join(" / "),
);

/*
  대비 — 여기서 재는 이유.

  `reach.mjs` 는 390px 에서 돈다. 그 폭에서는 사이드바가 아예 없다.
  그래서 PC 목차의 글자 대비는 지금까지 아무도 재지 않았다. 목차에
  작은 설명 줄(12px)을 새로 넣었으니, 그 줄이 「있으나 마나 한 회색」
  이 되지 않았는지 1440px 에서 직접 잰다.
*/
const scanContrast = (page) => page.evaluate(() => {
  const rgba = (c) => {
    const m = c.match(/[\d.]+/g);
    if (!m) return null;
    const [r, g, b, a = 1] = m.map(Number);
    return { r, g, b, a };
  };
  const lumOf = ({ r, g, b }) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const over = (top, bottom) => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  });
  const bgOf = (el) => {
    const stack = [];
    for (let a = el; a; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.backgroundImage && s.backgroundImage !== "none") return null; // 칠해진 면은 건너뛴다
      const c = rgba(s.backgroundColor);
      if (!c || c.a === 0) continue;
      stack.push(c);
      if (c.a === 1) break;
    }
    if (!stack.length) return null;
    let base = stack.pop();
    while (stack.length) base = over(stack.pop(), base);
    return lumOf(base);
  };
  const bad = [];
  for (const el of document.querySelectorAll("aside nav *, [data-section-tabs] *")) {
    if (el.children.length) continue;
    const txt = (el.textContent || "").trim();
    if (!txt) continue;
    const s = getComputedStyle(el);
    const fgc = rgba(s.color);
    if (!fgc || fgc.a === 0) continue;
    const bg = bgOf(el);
    if (bg === null) continue;
    const fg = lumOf(fgc.a < 1 ? over(fgc, { r: bg * 255, g: bg * 255, b: bg * 255, a: 1 }) : fgc);
    const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
    const px = parseFloat(s.fontSize);
    const need = px >= 24 || (px >= 18.66 && Number(s.fontWeight) >= 700) ? 3 : 4.5;
    if (ratio < need) bad.push(`"${txt.slice(0, 14)}" ${ratio.toFixed(2)}:1 (필요 ${need})`);
  }
  return [...new Set(bad)];
});

const lowLight = await scanContrast(pc);
log(
  "PC 목차 글자 대비가 기준을 넘는다 — 밝음 (설명 줄 포함)",
  lowLight.length === 0,
  lowLight.slice(0, 4).join(" | "),
);

/* 어두운 화면에서도 같은 줄을 읽을 수 있는가 */
const setTheme = async (theme) => {
  await pc.evaluate((t) => {
    const raw = JSON.parse(localStorage.getItem("jeongtong-ax-v1") || "{}");
    raw.settings = { ...(raw.settings || {}), theme: t };
    localStorage.setItem("jeongtong-ax-v1", JSON.stringify(raw));
  }, theme);
  await pc.reload({ waitUntil: "networkidle" });
  await pc.waitForTimeout(900);
};
await setTheme("dark");
const lowDark = await scanContrast(pc);
log(
  "PC 목차 글자 대비가 기준을 넘는다 — 어두움",
  lowDark.length === 0,
  lowDark.slice(0, 4).join(" | "),
);
await setTheme("light");

// ═══ 3. 묶음 안의 큰 탭 ═══════════════════════════════════════
const tabsOf = (page) => page.locator("[data-section-tabs] a");

await go(pc, "/briefing", 1400);
log(
  "'오늘' 묶음에 들어가면 위쪽에 탭이 셋 있다",
  (await tabsOf(pc).count()) === 3,
  `${await tabsOf(pc).count()}개`,
);
log(
  "탭에 브리핑과 AX 코치가 들어 있다",
  (await pc.locator('[data-section-tabs] a[href="/coach"]').count()) === 1 &&
    (await pc.locator('[data-section-tabs] a[href="/briefing"]').count()) === 1,
);
log(
  "묶음 안에 있어도 목차의 '오늘' 이 칠해져 있다",
  (await pc.locator('aside nav a[href="/"][aria-current="page"]').count()) === 1,
);
log(
  "지금 보는 탭이 색만이 아니라 칠해진 바탕으로 표시된다",
  await pc.evaluate(() => {
    const a = document.querySelector('[data-section-tabs] a[aria-current="page"]');
    return !!a && getComputedStyle(a).backgroundImage !== "none";
  }),
);

/* 탭을 눌러 실제로 옮겨진다 */
await pc.locator('[data-section-tabs] a[href="/coach"]').click();
await pc.waitForTimeout(1200);
log("탭을 누르면 그 화면으로 간다", pc.url().endsWith("/coach"));
log(
  "옮겨 가도 탭은 그대로 셋이다",
  (await tabsOf(pc).count()) === 3,
);

await go(pc, "/visits", 1400);
log(
  "'고객' 묶음 탭이 셋이다 (목록 · 방문 기록 · 재방문)",
  (await tabsOf(pc).count()) === 3 &&
    (await pc.locator('[data-section-tabs] a[href="/retention"]').count()) === 1,
);
log(
  "묶음 안에 있어도 목차의 '고객' 이 칠해져 있다",
  (await pc.locator('aside nav a[href="/customers"][aria-current="page"]').count()) === 1,
);

/* 갈 곳이 하나뿐인 화면에는 탭을 그리지 않는다 (장식이 된다) */
await go(pc, "/analytics", 1400);
log("갈 곳이 하나인 화면에는 탭을 그리지 않는다", (await tabsOf(pc).count()) === 0);

// ═══ 4. 내려온 화면이 전부 살아 있다 ══════════════════════════
for (const [href, needle] of MOVED) {
  await go(pc, href, 1200);
  const body = (await pc.evaluate(() => document.body.innerText || "")).replace(/\s+/g, " ");
  log(`${href} — 주소가 그대로 열린다`, body.includes(needle), body.slice(0, 50));
}

// ═══ 5. 폰 — PC 와 같은 넷 ═══════════════════════════════════
const m = await (await browser.newContext({ viewport: { width: 360, height: 780 } })).newPage();
m.on("pageerror", (e) => errs.push(String(e).slice(0, 140)));
await go(m, "/", 1600);

const bottomLabels = await m.evaluate(() =>
  [...document.querySelectorAll("nav[class*='fixed'] a, nav[class*='fixed'] button")]
    .map((el) => (el.textContent || "").trim())
    .filter(Boolean),
);
log(
  "폰 아래 메뉴가 PC 와 같은 넷이다",
  ["오늘", "고객", "성과", "더보기"].every((k) => bottomLabels.includes(k)),
  bottomLabels.join(" / "),
);

/* 360px — 탭 셋이 한 줄에 들어가고 글자가 읽히는 크기인가 */
await go(m, "/briefing", 1500);
const tabGeom = await m.evaluate(() => {
  const els = [...document.querySelectorAll("[data-section-tabs] a")];
  return els.map((a) => {
    const r = a.getBoundingClientRect();
    const span = a.querySelector("span");
    return {
      top: Math.round(r.top),
      h: Math.round(r.height),
      font: parseFloat(getComputedStyle(span || a).fontSize),
      clipped: span ? span.scrollWidth > span.clientWidth + 1 : false,
    };
  });
});
log("360px — 탭 셋이 한 줄에 선다", new Set(tabGeom.map((t) => t.top)).size === 1,
  tabGeom.map((t) => t.top).join(" / "));
log("360px — 탭이 손가락 크기(48px 이상)", tabGeom.every((t) => t.h >= 48),
  tabGeom.map((t) => t.h).join(" / "));
log("360px — 탭 글자가 17px 이상", tabGeom.every((t) => t.font >= 17),
  tabGeom.map((t) => t.font).join(" / "));
log("360px — 탭 글자가 잘리지 않는다", tabGeom.every((t) => !t.clipped));
log(
  "360px — 가로로 넘치지 않는다",
  await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
);

// ═══ 6. 더보기 — 내려온 것이 여기 다 보인다 ═══════════════════
await go(m, "/more", 1500);
const moreText = (await m.evaluate(() => document.body.innerText || "")).replace(/\s+/g, " ");
for (const label of ["서비스 표준", "지점", "고객용 화면", "설정"])
  log(`더보기 화면에 '${label}' 이 있다`, moreText.includes(label));
log(
  "더보기 항목에 한 줄 설명이 붙어 있다",
  /케어 순서/.test(moreText) && /도입 전 기준선/.test(moreText),
);
const moreRows = await m.evaluate(() =>
  [...document.querySelectorAll("main ul a")].map((a) =>
    Math.round(a.getBoundingClientRect().height),
  ),
);
log(
  "더보기 줄이 크다 (56px 이상)",
  moreRows.length >= 4 && moreRows.every((h) => h >= 56),
  moreRows.join(" / "),
);

// ═══ 7. 검색은 여전히 화면 전부를 찾는다 ══════════════════════
/*
  목차를 줄였으니 검색이 더 중요해졌다. 목차에서 내려간 화면일수록
  이름을 쳐서 바로 가는 길이 살아 있어야 한다.
*/
await go(pc, "/", 1400);
const searchFor = async (word) => {
  await pc.keyboard.press("Control+k");
  await pc.waitForTimeout(450);
  await pc.keyboard.type(word, { delay: 15 });
  await pc.waitForTimeout(600);
  return pc.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]');
    return dlg ? (dlg.innerText || "").replace(/\s+/g, " ") : "";
  });
};
for (const [word, label] of [
  ["브리핑", "오늘 챙길 고객"],
  ["재방문", "재방문 관리"],
  ["코치", "AX 코치"],
  ["서비스", "서비스 표준"],
]) {
  const listed = await searchFor(word);
  log(
    `빠른 실행에서 '${word}' 로 「${label}」 이 나온다`,
    listed.includes(label),
    listed.slice(0, 70),
  );
  await pc.keyboard.press("Escape");
  await pc.waitForTimeout(300);
}

/* 찾는 데서 끝나지 않고 실제로 그 화면으로 간다 */
await searchFor("재방문");
await pc.keyboard.press("Enter");
await pc.waitForTimeout(1300);
log("찾아서 누르면 그 화면으로 간다", pc.url().endsWith("/retention"), pc.url());

log("자바스크립트 오류 없음", errs.length === 0, errs.slice(0, 2).join(" | "));
console.log(`   (기준 ${BASE})`);
await browser.close();
finish();
