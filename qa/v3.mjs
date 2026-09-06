/**
 * Unified v3.0 게이트 — 단계 표시 · KPI 계약 · 기준선 · 증적 · 9테마 피커
 * =====================================================================
 *
 * v3.0 이 새로 요구한 것들은 대부분 "정직하게 말하는가" 에 대한 것이다.
 *   · 지금 보는 게 시연 자료인지 실제인지 화면이 말하는가 (§15)
 *   · 무엇을 재기로 했고 기준선이 있는지 없는지 적혀 있는가 (§4)
 *   · 시연 자료로 개선율을 꾸미지 않는가 (§4.2 P0)
 *   · 증적을 사람이 읽을 수 있는 표로 내보낼 수 있는가 (§9)
 *   · 테마 9종이 실제로 고를 수 있게 나와 있는가 (Q-1)
 *
 * 그래서 이 스위트의 핵심 검사는 "있다" 가 아니라 **"없을 때 없다고
 * 말한다"** 와 **"시연에서는 개선율을 절대 적지 않는다"** 다.
 */
import { readFileSync } from "node:fs";
import { launch, recorder, go, BASE } from "./lib.mjs";

const { log, finish } = recorder("v3.0 게이트 (단계 · KPI 계약 · 기준선 · 증적 · 9테마)");
const browser = await launch();
const errs = [];

const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  acceptDownloads: true,
});
const p = await ctx.newPage();
p.on("pageerror", (e) => errs.push(String(e).slice(0, 130)));

const text = () => p.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " "));

/* ── 1. 단계 표시 — 시연 빌드는 DEMO 라고 적혀 있어야 한다 ── */
await go(p, "/", 1200);
const stage = await p.evaluate(() => {
  const el = document.querySelector("[data-stage]");
  return el ? { stage: el.getAttribute("data-stage"), text: el.textContent || "" } : null;
});
log("단계 칩 — 화면에 있다", !!stage);
log("단계 칩 — 시연 빌드는 DEMO 로 표시한다", stage?.stage === "DEMO", stage?.text.trim());
await p.locator("[data-stage]").first().click();
await p.waitForTimeout(300);
log(
  "단계 칩 — 누르면 뜻을 풀어 준다",
  /견본 자료|성과가 아닙니다/.test(await text()),
);

/* ── 2. KPI 계약 — 기준선이 없으면 없다고 적는다 ── */
await go(p, "/analytics", 1200);
const kpi = p.locator('[data-tour="kpi-contract"]');
log("KPI 계약 — 성과 화면 맨 위에 있다", (await kpi.count()) === 1);
const kpiText = ((await kpi.innerText().catch(() => "")) || "").replace(/\s+/g, " ");
log("KPI 계약 — COST · REVENUE · SCALE 셋이 있다", /COST/.test(kpiText) && /REVENUE/.test(kpiText) && /SCALE/.test(kpiText));
log(
  "KPI 계약 — 기준선이 없으면 UNKNOWN 이라고 적는다",
  (kpiText.match(/BASELINE STATUS: UNKNOWN/g) || []).length === 3,
  `${(kpiText.match(/BASELINE STATUS: UNKNOWN/g) || []).length}곳`,
);
log("KPI 계약 — 시연 자료에서는 개선율을 계산하지 않는다고 적는다", /개선율을 계산하지 않습니다/.test(kpiText));
log("KPI 계약 — 측정 지점이 셋 다 적혀 있다", (kpiText.match(/측정 지점/g) || []).length === 3);

/* ── 3. 설정 — 9테마 피커 · AX 담당자 · 기준선 입력 ── */
await go(p, "/settings", 1200);
const radios = p.getByRole("radiogroup", { name: "색 조합" }).getByRole("radio");
log("테마 — 고를 수 있는 조합이 9개다", (await radios.count()) === 9, `${await radios.count()}개`);
const dots = await radios.first().locator('span[style*="background-color"]').count();
log("테마 — 조합마다 색 점 여섯으로 미리 보인다", dots === 6, `${dots}점`);

const owner = p.getByLabel("AX 담당자 (KPI · 데이터 · 교육 책임)");
log("AX 담당자 — 입력칸이 있다", (await owner.count()) === 1);
await owner.fill("실장 김");
await p.waitForTimeout(400);
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(800);
log(
  "AX 담당자 — 새로고침해도 남는다",
  (await p.getByLabel("AX 담당자 (KPI · 데이터 · 교육 책임)").inputValue()) === "실장 김",
);

// 기준선 — 사람이 적는 값
await p.getByLabel("기준 시점").fill("2025-06");
await p.getByLabel("월평균 재방문 인원").fill("12");
await p.getByLabel("도입 전 고객 수").fill("100");
await p.getByLabel("도입 전 직원 수").fill("2");
await p.waitForTimeout(500);

/* ── 4. 성과 화면에 기준선이 반영되고, 시연에서는 개선율이 절대 없다 ── */
await go(p, "/analytics", 1200);
const k2 = ((await kpi.innerText().catch(() => "")) || "").replace(/\s+/g, " ");
log("기준선 — 재방문 인원이 성과 화면에 나온다", /월 재방문 12명/.test(k2));
log("기준선 — 시점이 함께 적힌다", /\(2025-06 기준\)/.test(k2));
log("기준선 — 직원 1인당 고객이 계산된다 (100÷2)", /50명 \/ 직원 1인/.test(k2));
log(
  "정직성 — 시연 자료에서는 기준선이 있어도 개선율(%)을 적지 않는다",
  !/% \(기준선 대비\)/.test(k2),
  /% \(기준선 대비\)/.test(k2) ? "개선율이 찍혔다 — P0" : "적지 않음",
);

/* ── 5. 증적 내보내기 — 표가 실제로 내려오고 유형·출처가 적혀 있다 ── */
/*
  헤드리스 크로미움은 한글 파일 이름을 "download" 로 갈아 끼운다 (실제
  브라우저는 그대로 둔다). 그래서 이름은 내려받기 이벤트가 아니라 앱이
  <a download> 에 적은 값으로 본다.
*/
await p.evaluate(() => {
  document.addEventListener(
    "click",
    (e) => {
      const a = e.target;
      if (a instanceof HTMLAnchorElement && a.download) window.__dlName = a.download;
    },
    true,
  );
});
const [dl] = await Promise.all([
  p.waitForEvent("download", { timeout: 15000 }).catch(() => null),
  p.getByRole("button", { name: "증적 내보내기" }).click(),
]);
const dlName = await p.evaluate(() => window.__dlName || "");
log("증적 — 파일이 내려온다", !!dl, dlName || "다운로드 없음");
if (dl) {
  const path = await dl.path();
  const csv = path ? readFileSync(path, "utf8") : "";
  log("증적 — 파일 이름이 AX_증적 로 시작한다", dlName.startsWith("AX_증적_"), dlName);
  log("증적 — 머리줄이 유형·일시·고객·담당·… 이다", /유형,일시,고객,담당,분류,내용/.test(csv));
  log("증적 — 기준선이 BASELINE 유형으로 들어 있다", /^BASELINE,/m.test(csv));
  log("증적 — 기준선 출처가 '수기' 라고 적혀 있다", /수기 기준선/.test(csv));
  log("증적 — 출처 칸에 단계(DEMO)가 적혀 있다", /DEMO/.test(csv));
}

/* ── 정리 — 다음 스위트를 위해 적은 것을 지운다 ── */
await go(p, "/settings", 1000);
for (const label of ["기준 시점", "월평균 재방문 인원", "도입 전 고객 수", "도입 전 직원 수", "AX 담당자 (KPI · 데이터 · 교육 책임)"]) {
  await p.getByLabel(label).fill("");
}
await p.waitForTimeout(400);
await go(p, "/analytics", 1000);
log(
  "정리 — 지우면 다시 UNKNOWN 으로 돌아온다",
  ((((await kpi.innerText().catch(() => "")) || "").match(/BASELINE STATUS: UNKNOWN/g)) || []).length === 3,
);

log("자바스크립트 오류 없음", errs.length === 0, errs.slice(0, 2).join(" | "));
console.log(`   (기준 ${BASE})`);

await browser.close();
finish();
