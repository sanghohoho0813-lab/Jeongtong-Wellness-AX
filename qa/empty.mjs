/**
 * 0의 벽 — 실제 운영을 막 시작한 매장이 보는 화면
 * ================================================
 *
 * 샘플 데이터를 비우면 모든 숫자가 0이 된다. 그때 두 가지가 지켜져야 한다.
 *
 *   1) 고장난 것처럼 보이지 않을 것 — NaN, undefined, 빈 카드
 *   2) **사실이 아닌 말을 하지 않을 것**
 *
 * 2번이 실제로 깨져 있었다. 브리핑은 고객이 한 명도 없는 개업 첫날에도
 * "오늘의 관리 과제를 모두 완료한 상태입니다" 라고 했고, 방문기록은
 * "우측 상단의 방문 기록 버튼" 을 가리켰는데 폰에서는 그 자리에 없었다.
 * 재방문은 구간마다 "챙길 것이 없다는 뜻입니다" 를 세 번 반복했다.
 * 완료한 것이 없는데 완료했다고 하면, 그 다음부터 화면을 못 믿는다.
 */
import { launch, recorder, go } from "./lib.mjs";

const { log, finish } = recorder("0의 벽 (고객 0명)");
const browser = await launch();
const p = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(String(e).slice(0, 130)));

await go(p, "/", 2500);
// '실제 운영 시작' 과 같은 상태 — 고객·방문·이용권만 비우고 직원·설정·상품은 남긴다
await p.evaluate(() => {
  const raw = localStorage.getItem("jeongtong-ax-v1");
  if (!raw) return;
  const r = JSON.parse(raw);
  r.customers = [];
  r.visits = [];
  r.memberships = [];
  r.taskOverrides = [];
  localStorage.setItem("jeongtong-ax-v1", JSON.stringify(r));
});

const PAGES = [
  ["/", "대시보드"],
  ["/customers", "고객목록"],
  ["/briefing", "브리핑"],
  ["/retention", "재방문"],
  ["/visits", "방문기록"],
  ["/analytics", "성과"],
  ["/settings", "설정"],
];

for (const [path, label] of PAGES) {
  await go(p, path, 1800);
  const r = await p.evaluate(() => {
    const main = document.querySelector("main") || document.body;
    const t = main.innerText;
    return {
      len: t.trim().length,
      broken: (t.match(/NaN|Infinity|undefined|null%/) || [])[0] || "",
      // 하지 않은 일을 했다고 말하는 문장
      lie: (t.match(/모두 완료한 상태|모두 처리하셨습니다|우측 상단/) || [])[0] || "",
      guide: /등록|가져오기|시작|추가|없습니다|쌓입니다|드립니다/.test(t),
    };
  });
  log(`${label} — 깨진 값이 없다`, !r.broken, r.broken);
  log(`${label} — 화면이 비어 보이지 않는다`, r.len > 60 && r.guide, `${r.len}자`);
  log(`${label} — 하지 않은 일을 했다고 말하지 않는다`, !r.lie, r.lie);
}

// 막다른 길이 없어야 한다 — 고객이 없는 화면에는 고객 등록으로 가는 길이 있어야 한다
for (const [path, label] of [["/briefing", "브리핑"], ["/retention", "재방문"], ["/visits", "방문기록"]]) {
  await go(p, path, 1800);
  const cta = await p.evaluate(() =>
    [...document.querySelectorAll("main button, main a")]
      .map((e) => e.textContent.trim())
      .filter((s) => /고객 등록|명부 가져오기/.test(s)),
  );
  log(`${label} — 여기서 고객 등록으로 갈 수 있다`, cta.length > 0, cta.slice(0, 2).join(" | "));
}

log("자바스크립트 오류 없음", errs.length === 0, errs.slice(0, 2).join(" | "));

await browser.close();
process.exit(finish() ? 1 : 0);
