/**
 * 화면이 무너지지 않는가 — 좁은 폰 · 긴 글 · 큰 글씨 · 어두운 화면을 한꺼번에
 * ==========================================================================
 *
 * 하나씩만 켜면 대개 지나간다. 겹칠 때 무너진다. 그래서 셋을 동시에 켠다.
 *
 * 두 가지를 잰다.
 *   가로 넘침 — 화면 폭보다 내용이 넓어 좌우로 스크롤이 생기는 것.
 *               폰에서 이게 생기면 손가락이 자꾸 옆으로 미끄러진다.
 *   밖으로    — 넘침이 0이어도, 어떤 조각이 부모 밖으로 나가 잘려 보이지 않는 것.
 *               긴 이름이 상태 배지를 화면 밖으로 밀어내던 것이 이 경우였다.
 *
 * 스스로 가로 스크롤을 가진 상자(필터 칩 줄 같은 것) 안은 의도된 것이므로 뺀다.
 */
import { launch, recorder, go, seedExtremes, BASE } from "./lib.mjs";

const big = process.argv.includes("--big");
const dark = process.argv.includes("--dark");
const mode = `${big ? "큰글씨" : "기본글씨"}·${dark ? "어두움" : "밝음"}`;

const { log, finish } = recorder(`화면 무너짐 (390px · 극단 데이터 · ${mode})`);
const browser = await launch();
const p = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(String(e).slice(0, 130)));

await go(p, "/", 2500);
await seedExtremes(p, { big, dark });

const PAGES = [
  ["/welcome", "공개첫화면"],
  ["/", "대시보드"],
  ["/customers", "고객목록"],
  ["/customers/c-01", "고객상세"],
  ["/briefing", "브리핑"],
  ["/retention", "재방문"],
  ["/visits", "방문기록"],
  ["/settings", "설정"],
  ["/analytics", "성과"],
  ["/service", "서비스표준"],
  ["/more", "더보기"],
  ["/branches", "지점"],
  ["/guide", "가이드"],
];

for (const [path, label] of PAGES) {
  await go(p, path, 1700);
  const r = await p.evaluate(() => {
    const W = document.documentElement.clientWidth;
    const bleed = [];
    for (const el of document.querySelectorAll("body *")) {
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height || box.right <= W + 1) continue;
      let scrollable = false;
      for (let a = el.parentElement; a; a = a.parentElement) {
        const s = getComputedStyle(a);
        if (s.overflowX === "auto" || s.overflowX === "scroll") { scrollable = true; break; }
      }
      if (scrollable) continue;
      // 초점을 받기 전까지 화면 밖에 숨겨 두는 건너뛰기 링크는 의도된 것이다
      if (/건너뛰기/.test(el.textContent || "")) continue;
      if (getComputedStyle(el).position === "absolute" && !(el.textContent || "").trim()) continue;
      bleed.push(`${el.tagName}.${String(el.className).split(" ")[0]} "${(el.textContent || "").trim().slice(0, 16)}"`);
    }
    return {
      over: document.documentElement.scrollWidth - W,
      bleed: [...new Set(bleed)],
      screens: +(document.body.scrollHeight / 844).toFixed(1),
    };
  });
  log(`${label} — 가로로 밀리지 않는다`, r.over === 0, `넘침 ${r.over}px · 높이 ${r.screens}화면`);
  log(`${label} — 화면 밖으로 나간 조각이 없다`, r.bleed.length === 0, r.bleed.slice(0, 3).join(" | "));
}

log("자바스크립트 오류 없음", errs.length === 0, errs.slice(0, 2).join(" | "));
console.log(`   (기준 ${BASE})`);

await browser.close();
process.exit(finish() ? 1 : 0);
