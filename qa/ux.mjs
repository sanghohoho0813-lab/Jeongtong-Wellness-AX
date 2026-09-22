/**
 * UI/UX 2차 — 화면을 24장 찍어 보고 찾은 것들이 다시 생기지 않게
 * ==============================================================
 *
 *   · 정렬 칩이 flex 안에서 줄어들어 "관리 우선" 이 "관리 우" 로 잘렸다
 *   · 방문 없는 고객이 "최근 -" 로 나왔다 — 60대 눈에 '-' 는 뜻이 없다
 *   · KPI 계약 카드가 폰에서 두 화면 분량의 글이었다
 *   · 설정은 9.8화면인데 위로 돌아갈 길이 엄지뿐이었다
 *   · 직원 화면 어디에도 tel: 이 없어 번호를 외워 옮겨 적어야 했다
 *
 * 전화 링크는 **번호가 있을 때만**, **화면 공유 모드에서는 절대** 나오지
 * 않아야 한다 — 그 둘을 함께 본다.
 */
import { launch, recorder, go, BASE } from "./lib.mjs";

const { log, finish } = recorder("UI/UX 2차 (칩 · 문구 · KPI 접기 · 맨 위로 · 전화)");
const browser = await launch();
const errs = [];
const KEY = "jeongtong-ax-v1";

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => errs.push(String(e).slice(0, 130)));
const text = () => p.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " "));

/* ── 1. 정렬 칩 — 잘리지 않는다 · 옆으로 더 있다는 힌트 ── */
await go(p, "/customers", 1200);
const chips = await p.evaluate(() =>
  ["관리 우선", "최근 방문순", "방문 많은순", "이름순"].map((label) => {
    const el = [...document.querySelectorAll("button")].find(
      (b) => (b.textContent || "").trim() === label,
    );
    return el
      ? { label, ok: el.scrollWidth <= el.clientWidth + 1, w: el.clientWidth }
      : { label, ok: false, w: 0 };
  }),
);
log(
  "정렬 칩 — 넷 다 글이 칩 안에 다 들어간다",
  chips.every((c) => c.ok),
  chips.map((c) => `${c.label}:${c.ok ? "ok" : "잘림"}`).join(" · "),
);
log("고객 줄 — 방문 없는 분은 '아직 방문 없음' 이라고 적는다", /아직 방문 없음/.test(await text()));
log("고객 줄 — '최근 -' 가 남아 있지 않다", !/최근 -/.test(await text()));

/* ── 2. KPI 계약 — 폰에서는 접혀 있고, 누르면 펼쳐진다 ── */
await go(p, "/analytics", 1200);
const kpi = p.locator('[data-tour="kpi-contract"]');
const fold = kpi.getByRole("button", { name: "어떻게 재나요 · 개선율" });
log("KPI 카드 — 폰에서 줄마다 펼침 단추가 있다 (3)", (await fold.count()) === 3, `${await fold.count()}개`);
const before = ((await kpi.innerText()) || "").replace(/\s+/g, " ");
log("KPI 카드 — 접힌 상태에서는 측정 지점 설명이 안 보인다", !/측정 지점/.test(before));
log("KPI 카드 — 접혀도 현재값 · 기준선은 보인다", /현재값/.test(before) && /도입 전 값 없음/.test(before));
const cardH = () => kpi.evaluate((el) => el.getBoundingClientRect().height);
const folded = await cardH();
await fold.first().click();
await p.waitForTimeout(300);
const after = ((await kpi.innerText()) || "").replace(/\s+/g, " ");
log(
  "KPI 카드 — 펼치면 그 줄의 측정 지점 · 개선율이 나온다",
  (after.match(/측정 지점/g) || []).length === 1 && (after.match(/개선율/g) || []).length >= 1,
);
// 셋 다 펼친 높이 = 접기 전 원래 카드. 접은 것이 실제로 짧아야 뜻이 있다.
// 누른 줄은 이름이 "접기" 로 바뀌므로, 남은 첫 단추를 두 번 더 누른다
for (let i = 1; i < 3; i++) await fold.first().click();
await p.waitForTimeout(300);
const opened = await cardH();
log(
  "KPI 카드 — 접으면 다 펼친 것보다 25% 이상 짧고, 폰 한 화면 반 근처다",
  folded <= opened * 0.75 && folded <= 844 * 1.55,
  `접힘 ${Math.round(folded)}px · 다 펼침 ${Math.round(opened)}px`,
);

/* ── 3. 맨 위로 — 내려가야 나오고, 누르면 올라가고, 올라가면 사라진다 ── */
/*
  예전에는 설정 화면에서 쟀다. 설정이 폰에서 열 화면이던 시절 이야기다.
  이제 설정은 접힌 목록(2.3화면)이라 2,500px 까지 내려갈 수가 없다.
  늘 긴 화면인 「사용 방법」 으로 옮긴다 — 기능이 아니라 잴 자리가 바뀐 것이다.
*/
await go(p, "/guide", 1400);
log("맨 위로 — 첫 화면에는 없다", (await p.locator("[data-back-to-top]").count()) === 0);
await p.evaluate(() => window.scrollTo(0, 2500));
await p.waitForTimeout(400);
const btn = p.getByRole("button", { name: "맨 위로" });
log("맨 위로 — 한 화면 반 넘게 내리면 나타난다", (await btn.count()) === 1);
const box = await btn.boundingBox().catch(() => null);
log(
  "맨 위로 — 손가락 크기(44px 이상) · 하단 네비와 안 겹친다",
  !!box && box.width >= 44 && box.height >= 44 && box.y + box.height < 844 - 64,
  box ? `${Math.round(box.width)}×${Math.round(box.height)} y=${Math.round(box.y)}` : "없음",
);
await btn.click();
await p.waitForTimeout(900);
log("맨 위로 — 누르면 맨 위로 간다", (await p.evaluate(() => window.scrollY)) < 10);
await p.waitForTimeout(300);
log("맨 위로 — 위에 오면 사라진다", (await p.locator("[data-back-to-top]").count()) === 0);

/* ── 4. 전화 걸기 — 번호가 있을 때만 · 공유 모드에서는 절대 ── */
const original = await p.evaluate((k) => localStorage.getItem(k), KEY);
const withPhone = await p.evaluate((k) => {
  const raw = JSON.parse(localStorage.getItem(k) || "{}");
  if (!raw.customers?.length) return null;
  raw.customers[0].phone = "010-1234-5678";
  raw.settings = { ...(raw.settings || {}), privacyMode: false };
  localStorage.setItem(k, JSON.stringify(raw));
  return raw.customers[0].id;
}, KEY);
log("전화 — 검사용 번호를 넣을 고객이 있다", !!withPhone);
if (withPhone) {
  await go(p, "/briefing", 1200);
  const tel = p.locator('main a[href^="tel:"]');
  log("전화 — 브리핑에서 번호 있는 고객은 '전화 걸기' 가 나온다", (await tel.count()) >= 1, `${await tel.count()}개`);
  log("전화 — 링크가 tel:01012345678 이다", (await tel.first().getAttribute("href")) === "tel:01012345678");
  log("전화 — 단추 글에 '전화 걸기' 가 있다", /전화 걸기/.test((await tel.first().innerText().catch(() => "")) || ""));
  await go(p, `/customers/${withPhone}`, 1200);
  log("전화 — 고객 상세 머리에도 있다", (await p.locator('main a[href^="tel:"]').count()) >= 1);

  await p.evaluate((k) => {
    const raw = JSON.parse(localStorage.getItem(k) || "{}");
    raw.settings = { ...(raw.settings || {}), privacyMode: true };
    localStorage.setItem(k, JSON.stringify(raw));
  }, KEY);
  await go(p, "/briefing", 1200);
  log("전화 — 화면 공유 모드에서는 하나도 없다", (await p.locator('a[href^="tel:"]').count()) === 0);
  await go(p, `/customers/${withPhone}`, 1200);
  log("전화 — 공유 모드 고객 상세에도 없다", (await p.locator('a[href^="tel:"]').count()) === 0);
}
// 원상복구 — 다음 묶음이 번호 · 공유 모드를 물려받지 않게
await p.evaluate(([k, v]) => { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }, [KEY, original]);
await go(p, "/", 800);
log("정리 — 저장소를 원래대로 돌렸다", (await p.locator('a[href^="tel:"]').count()) === 0);

/* ── 5. PC — 접기 단추 없이 늘 펼쳐져 있다 ── */
const pc = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await go(pc, "/analytics", 1200);
const pcKpi = ((await pc.locator('[data-tour="kpi-contract"]').innerText()) || "").replace(/\s+/g, " ");
log("PC — KPI 카드는 측정 지점 셋이 늘 보인다", (pcKpi.match(/측정 지점/g) || []).length === 3);
log(
  "PC — 폰용 펼침 단추는 보이지 않는다",
  (await pc.locator('[data-tour="kpi-contract"]').getByRole("button", { name: "어떻게 재나요 · 개선율" }).count()) === 0,
);

log("자바스크립트 오류 없음", errs.length === 0, errs.slice(0, 2).join(" | "));
console.log(`   (기준 ${BASE})`);
await browser.close();
finish();
