/**
 * 제품 껍데기 — v1.2 가 요구하는 것들이 실제로 동작하는가
 * ======================================================
 *
 * "파일에 있다" 나 "CSS 클래스가 있다" 로는 통과시키지 않는다.
 * 눌러 보고, 재어 보고, 닫아 보고, 닫힌 뒤에 다시 눌러 본다.
 *
 * 여기서 보는 것 넷
 *   기기 미리보기  진짜 390px 인가 · 위아래가 잘리지 않는가 · 재귀하지 않는가 ·
 *                  나가는 길 셋(X · 바깥 · ESC)이 다 열려 있고 닫은 뒤 복구되는가
 *   더보기 시트    라벨대로 '더 보이는가'(화면 이동이 아니라) · 폰에서 고객 화면으로
 *                  건너갈 길이 있는가
 *   색 조합 6종    이름만이 아니라 실제로 픽셀이 바뀌는가 · 밝기와 따로 노는가 ·
 *                  중립색은 그대로인가
 *   안내 코스 셋   실제 화면 위를 도는가 · 뒤가 비어 있지 않은가 ·
 *                  끝난 뒤 흐린 막이 남지 않는가
 */
import { launch, recorder, go, BASE } from "./lib.mjs";

const { log, finish } = recorder("제품 껍데기 (미리보기 · 시트 · 색 조합 · 안내)");
const browser = await launch();
const errs = [];

// ═══ 1. PC — 기기 미리보기 ═══════════════════════════════════
const pc = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p = await pc.newPage();
p.on("pageerror", (e) => errs.push(String(e).slice(0, 130)));

await go(p, "/customers", 2000);

const mobBtn = p.getByRole("button", { name: "폰에서 보기" });
log("PC — '폰에서 보기' 가 있다", (await mobBtn.count()) > 0);
log(
  "PC — 'PC 에서 보기' 는 없다 (같은 기기 미리보기 금지)",
  (await p.getByRole("button", { name: "PC 에서 보기" }).count()) === 0,
);

await mobBtn.first().click();
await p.waitForTimeout(2500);

const dlg = p.locator('[role="dialog"][aria-label*="미리보기"]');
log("미리보기가 열린다", (await dlg.count()) === 1);

const frame = await p.evaluate(() => {
  const f = document.querySelector("iframe[title*='미리보기']");
  if (!f) return null;
  const d = f.contentDocument;
  const header = d.querySelector("header");
  const nav = d.querySelector("nav[class*='fixed']");
  return {
    src: f.getAttribute("src"),
    w: f.contentWindow.innerWidth,
    h: f.contentWindow.innerHeight,
    scrollTop: d.documentElement.scrollTop,
    headerTop: header?.getBoundingClientRect().top ?? null,
    headerBottom: header?.getBoundingClientRect().bottom ?? null,
    navBottom: nav?.getBoundingClientRect().bottom ?? null,
    overflowX: d.documentElement.scrollWidth - d.documentElement.clientWidth,
    // 미리보기 안에 또 미리보기 단추가 있으면 재귀가 열린다
    innerBtns: [...d.querySelectorAll("button")].filter((x) =>
      /폰에서 보기|PC 에서 보기/.test(
        x.getAttribute("aria-label") || x.textContent || "",
      ),
    ).length,
    text: (d.body.innerText || "").replace(/\s+/g, " ").length,
  };
});

log("미리보기 주소에 표식이 붙는다", !!frame?.src?.includes("preview=mobile"), frame?.src);
log("진짜 390px 뷰포트다", frame?.w === 390, `w=${frame?.w} h=${frame?.h}`);
log("맨 위에서 시작한다", frame?.scrollTop === 0, `scrollTop=${frame?.scrollTop}`);
log("머리글 상단 잘림 0", frame?.headerTop === 0, `top=${frame?.headerTop}`);
log("머리글이 실제로 보인다", frame?.headerBottom > 0, `bottom=${frame?.headerBottom}`);
log(
  "하단 네비 하단 잘림 0",
  frame?.navBottom !== null && Math.abs(frame.navBottom - frame.h) < 2,
  `nav=${frame?.navBottom} vs ${frame?.h}`,
);
log("미리보기 안 가로 넘침 0", frame?.overflowX === 0, `over=${frame?.overflowX}`);
log("미리보기 안에서 다시 열 수 없다 (재귀 차단)", frame?.innerBtns === 0, `${frame?.innerBtns}개`);
log("같은 화면이 실제로 그려졌다", frame?.text > 200, `${frame?.text}자`);

// 나가는 길 셋
await p.keyboard.press("Escape");
await p.waitForTimeout(400);
log("ESC 로 닫힌다", (await dlg.count()) === 0);

const restored = await p.evaluate(() => ({
  overflow: document.body.style.overflow,
  pad: document.body.style.paddingRight,
  hit: document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.tagName ?? null,
}));
log(
  "닫으면 배경 스크롤 잠금이 풀린다",
  restored.overflow === "" || restored.overflow === "visible",
  `overflow=${restored.overflow}`,
);
log("닫으면 여백 보정도 되돌아온다", restored.pad === "" || restored.pad === "0px", `pad=${restored.pad}`);
log("닫은 뒤 화면을 다시 누를 수 있다", restored.hit !== null, restored.hit);

await mobBtn.first().click();
await p.waitForTimeout(1400);
await p.getByRole("button", { name: "미리보기 닫기" }).click();
await p.waitForTimeout(400);
log("X 로 닫힌다", (await dlg.count()) === 0);

await mobBtn.first().click();
await p.waitForTimeout(1400);
await p.mouse.click(20, 400);
await p.waitForTimeout(400);
log("바깥을 눌러도 닫힌다", (await dlg.count()) === 0);

// ═══ 2. 색 조합 6종 ═══════════════════════════════════════════
const KEYS = ["navy", "teal", "burgundy", "graphite", "indigo", "forest"];
const setPalette = async (key, theme) => {
  await p.evaluate(
    ({ key, theme }) => {
      const raw = JSON.parse(localStorage.getItem("jeongtong-ax-v1") || "{}");
      raw.settings = { ...(raw.settings || {}), palette: key };
      if (theme) raw.settings.theme = theme;
      localStorage.setItem("jeongtong-ax-v1", JSON.stringify(raw));
    },
    { key, theme },
  );
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(900);
};
const readTokens = () =>
  p.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    const nav = document.querySelector('aside nav a[class*="from-deep-700"]');
    return {
      palette: document.documentElement.dataset.palette,
      shell: v("--c-deep-800"),
      primary: v("--c-aqua-650"),
      accent: v("--c-gold"),
      text: v("--c-aqua-700"),
      chart: v("--chart-count"),
      ink: v("--c-ink"),
      card: v("--c-card"),
      bg: v("--c-bg"),
      activePainted: nav ? getComputedStyle(nav).backgroundImage !== "none" : false,
    };
  });

await go(p, "/", 1500);
const seen = {};
for (const k of KEYS) {
  await setPalette(k);
  const t = await readTokens();
  seen[k] = t;
  log(`${k} — 조합이 붙는다`, t.palette === k, t.palette);
  log(
    `${k} — 색 토큰이 모두 있다`,
    [t.shell, t.primary, t.accent, t.text, t.chart].every(Boolean),
    `${t.shell} / ${t.primary} / ${t.accent}`,
  );
  log(`${k} — 활성 메뉴가 실제로 칠해진다`, t.activePainted);
}
for (const key of ["shell", "primary", "accent", "text", "chart"]) {
  const vals = new Set(KEYS.map((k) => seen[k][key]));
  log(`여섯 조합의 ${key} 이 서로 다르다`, vals.size === 6, `${vals.size}종`);
}
for (const key of ["ink", "card", "bg"]) {
  const vals = new Set(KEYS.map((k) => seen[k][key]));
  log(`중립색 ${key} 은 조합과 무관하다`, vals.size === 1, [...vals].join(" | "));
}

// 밝기와 직교하는가
await setPalette("navy", "dark");
const dn = await readTokens();
log("다크 + 네이비가 동시에 성립한다", dn.palette === "navy" && dn.card === "23 33 31", `${dn.palette} / ${dn.card}`);
log("다크에서도 껍데기는 조합을 따른다", dn.shell === "24 49 81", dn.shell);

// 다크 껍데기 글자가 흰 계열인가 (v1.2 Dark Shell)
const navInk = await p.evaluate(() => {
  const a = [...document.querySelectorAll("aside nav a")].find(
    (x) => !/from-deep-700/.test(x.className),
  );
  if (!a) return null;
  const c = (getComputedStyle(a).color.match(/\d+/g) || []).map(Number);
  return { color: getComputedStyle(a).color, whiteish: c.every((n) => n >= 229) };
});
log(
  "다크 메뉴 글자가 흰 계열이다 (최소 #E5E7EB)",
  navInk?.whiteish === true,
  navInk?.color,
);

// 설정에서 실제로 고를 수 있는가
await setPalette("teal", "light");
await go(p, "/settings", 1600);
const radios = p.locator('[role="radiogroup"][aria-label="색 조합"] [role="radio"]');
log("설정에 색 조합 6칸이 있다", (await radios.count()) === 6, `${await radios.count()}칸`);
await radios.nth(4).click();
await p.waitForTimeout(800);
const picked = await p.evaluate(() => ({
  applied: document.documentElement.dataset.palette,
  saved: JSON.parse(localStorage.getItem("jeongtong-ax-v1") || "{}").settings?.palette,
}));
log("설정에서 고르면 바로 반영된다", picked.applied === "indigo", picked.applied);
log("고른 조합이 저장된다", picked.saved === "indigo", picked.saved);
await setPalette("teal", "light");

// ═══ 3. 안내 코스 셋 ══════════════════════════════════════════
await go(p, "/guide", 1800);
for (const name of ["빠른 시작 · 4걸음", "전체 둘러보기", "시연 · 10걸음"]) {
  log(`가이드에 '${name}' 이 있다`, (await p.getByRole("button", { name }).count()) > 0);
}

async function walk(startLabel, expect, courseName) {
  await go(p, "/guide", 1600);
  await p.getByRole("button", { name: startLabel }).click();
  await p.waitForTimeout(1800);

  const card = p.locator("[data-tour-card]");
  log(`${courseName} — 안내가 열린다`, (await card.count()) === 1);

  const seen = [];
  for (let i = 0; i < expect + 2; i++) {
    if ((await card.count()) === 0) break;
    const info = await p.evaluate(() => {
      const c = document.querySelector("[data-tour-card]");
      if (!c) return null;
      const main = document.querySelector("main");
      return {
        route: location.pathname,
        head: c.querySelector("p.uppercase")?.textContent?.trim() ?? "",
        behind: main ? main.innerText.replace(/\s+/g, " ").trim().length : 0,
      };
    });
    if (!info) break;
    seen.push(info);
    await p
      .getByRole("button", { name: /다음|마치기|끝/ })
      .first()
      .click()
      .catch(() => {});
    await p.waitForTimeout(1400);
  }

  log(`${courseName} — ${expect}걸음이다`, seen.length === expect, `${seen.length}걸음`);
  log(
    `${courseName} — 걸음마다 뒤 화면에 내용이 있다`,
    seen.every((s) => s.behind > 80),
    seen.map((s) => `${s.route}:${s.behind}`).join(" ").slice(0, 100),
  );
  log(
    `${courseName} — 코스 이름이 표시된다`,
    seen.every((s) => s.head.includes(courseName)),
    seen[0]?.head,
  );

  await p.waitForTimeout(600);
  const after = await p.evaluate(() => ({
    cards: document.querySelectorAll("[data-tour-card]").length,
    dim: [...document.querySelectorAll("div")].filter((d) => {
      const s = getComputedStyle(d);
      return (
        s.position === "fixed" &&
        s.backdropFilter !== "none" &&
        d.getBoundingClientRect().width > 200
      );
    }).length,
    hit: document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.tagName ?? null,
  }));
  log(`${courseName} — 끝나면 안내가 사라진다`, after.cards === 0, `${after.cards}장`);
  log(`${courseName} — 흐린 막이 남지 않는다`, after.dim === 0, `${after.dim}겹`);
  log(`${courseName} — 화면을 다시 누를 수 있다`, after.hit !== null, after.hit);
  return seen;
}

await walk("빠른 시작 · 4걸음", 4, "빠른 시작 안내");
const demo = await walk("시연 · 10걸음", 10, "시연 모드");
log("시연은 Why AX 에서 시작한다", demo[0]?.route === "/why", demo[0]?.route);
log(
  "시연이 고객 화면까지 보여 준다",
  demo.some((s) => /\/preview$/.test(s.route)),
);
log(
  "시연이 기준 설정에서 끝난다",
  demo[demo.length - 1]?.route === "/settings",
  demo[demo.length - 1]?.route,
);

await go(p, "/guide", 1500);
await p.getByRole("button", { name: "빠른 시작 · 4걸음" }).click();
await p.waitForTimeout(1600);
await p.keyboard.press("Escape");
await p.waitForTimeout(500);
log("안내를 ESC 로 중간에 그만둘 수 있다", (await p.locator("[data-tour-card]").count()) === 0);

// ═══ 4. 폰 — 더보기 시트 · 반대쪽 미리보기 ════════════════════
const ph = await browser.newContext({ viewport: { width: 390, height: 844 } });
const m = await ph.newPage();
m.on("pageerror", (e) => errs.push("[폰] " + String(e).slice(0, 130)));
await go(m, "/", 2200);

log(
  "폰 — 'PC 에서 보기' 가 있다",
  (await m.locator('button[aria-label="PC 에서 보기"]').count()) > 0,
);
log(
  "폰 — '폰에서 보기' 는 없다",
  (await m.locator('button[aria-label="폰에서 보기"]').count()) === 0,
);

const before = m.url();
await m.getByRole("button", { name: "더보기" }).click();
await m.waitForTimeout(600);
const sheet = m.locator('[role="dialog"][aria-label="더보기"]');
log("더보기 — 시트가 덮여 열린다", (await sheet.count()) === 1);
log("더보기 — 보던 화면을 잃지 않는다", m.url() === before, `${before} → ${m.url()}`);
log(
  "더보기 — 고객 화면으로 건너갈 수 있다 (폰 왕복)",
  (await sheet.getByRole("link", { name: "고객 화면" }).count()) > 0,
);
log(
  "더보기 — Why AX 가 있다",
  (await sheet.getByRole("link", { name: /Why AX/ }).count()) > 0,
);
log(
  "더보기 — 기획의도가 있다",
  (await sheet.getByRole("link", { name: /기획의도/ }).count()) > 0,
);
log(
  "더보기 — 안내 코스를 여기서 시작할 수 있다",
  (await sheet.getByRole("button", { name: "빠른 시작 안내" }).count()) > 0,
);
log(
  "더보기 — 색 조합을 폰에서도 고를 수 있다",
  (await sheet.locator('[role="radiogroup"][aria-label="색 조합"] [role="radio"]').count()) === 6,
);
log(
  "더보기 — 가로 넘침 0",
  (await m.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )) === 0,
);

await m.keyboard.press("Escape");
await m.waitForTimeout(400);
log("더보기 — ESC 로 닫힌다", (await sheet.count()) === 0);
log(
  "더보기 — 닫으면 잠금이 풀린다",
  (await m.evaluate(() => document.body.style.overflow)) !== "hidden",
);

await m.locator('button[aria-label="PC 에서 보기"]').first().click();
await m.waitForTimeout(2500);
const pcFrame = await m.evaluate(() => {
  const f = document.querySelector("iframe[title*='미리보기']");
  if (!f) return null;
  return {
    w: f.contentWindow.innerWidth,
    scrollTop: f.contentDocument.documentElement.scrollTop,
    innerBtns: [...f.contentDocument.querySelectorAll("button")].filter((x) =>
      /폰에서 보기|PC 에서 보기/.test(
        x.getAttribute("aria-label") || x.textContent || "",
      ),
    ).length,
    outerOver:
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});
log("폰 → PC 미리보기가 1280px 다", pcFrame?.w === 1280, `w=${pcFrame?.w}`);
log("폰 → PC 미리보기가 맨 위에서 시작한다", pcFrame?.scrollTop === 0);
log("폰 → PC 미리보기 안에서 재귀하지 않는다", pcFrame?.innerBtns === 0, `${pcFrame?.innerBtns}개`);
log("폰 → PC 미리보기 겉이 밀리지 않는다", pcFrame?.outerOver === 0, `over=${pcFrame?.outerOver}`);

await m.keyboard.press("Escape");
await m.waitForTimeout(400);
log(
  "폰 → PC 미리보기가 닫힌다",
  (await m.locator('[role="dialog"][aria-label*="미리보기"]').count()) === 0,
);

log("자바스크립트 오류 없음", errs.length === 0, errs.slice(0, 2).join(" | "));
console.log(`   (기준 ${BASE})`);

await browser.close();
process.exit(finish() ? 1 : 0);
