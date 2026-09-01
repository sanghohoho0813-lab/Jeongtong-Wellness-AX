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
 *
 * 덮임      — 화면에 있고 자리도 잡았는데, 그 자리를 눌러 보면 다른 것이
 *             잡히는 경우. 히어로가 '예약하기' 카드의 윗부분을 덮어 글자가
 *             잘려 보이던 것이 이것이었다. 넘침도 0, 대비도 정상이라
 *             앞의 두 자로는 잡히지 않았다. elementFromPoint 로 직접 짚는다.
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
  ["/welcome", "고객용 화면"],
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
  ["/why", "WhyAX"],
  ["/intro", "기획의도"],
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
    /*
      제자리에 있는데 다른 것에 덮인 요소.
      링크가 단추를 감싼 것처럼 서로 품고 있는 관계는 덮인 게 아니다.
    */
    const covered = [];
    for (const el of document.querySelectorAll("main a, main button, main h1, main h2, main li")) {
      const box = el.getBoundingClientRect();
      if (box.width < 8 || box.height < 8) continue;
      if (box.bottom < 0 || box.top > innerHeight) continue;
      /*
        한 점만 짚으면 못 쓴다. 요소의 위 모서리에는 아이콘도 있고, 줄
        왼쪽의 강조 막대(row-accent 의 ::before)도 있어서 애먼 것이 잡힌다.
        위쪽 띠에서 왼쪽·가운데·오른쪽 세 점을 짚고, **셋 다 같은 남의
        요소**에 막힐 때만 덮였다고 본다. 진짜로 위에 깔린 판은 셋을 다
        가리고, 아이콘 하나는 그러지 못한다.
      */
      const y = box.top + Math.min(6, box.height / 2);
      const hits = [box.left + 4, box.left + box.width / 2, box.right - 4].map((x) =>
        document.elementFromPoint(x, y),
      );
      const foreign = hits.filter(
        (h) => h && !el.contains(h) && !h.contains(el) && !(el.closest("a") && el.closest("a") === h.closest("a")),
      );
      if (foreign.length < 3) continue;
      if (new Set(foreign).size !== 1) continue;
      const hit = foreign[0];
      /*
        떠 있는 막대(하단 네비 · 머리글 · 알림 띠) 위로 지나가는 것은
        덮인 게 아니다. 스크롤하면 드러난다 — 실제로 300px 만 내리면
        그 자리에서 자기 자신이 잡힌다.

        찾으려는 것은 **아무리 굴려도 안 나오는** 경우다. 히어로가 카드
        위를 덮고 함께 흐르던 것이 그랬다(그 요소는 fixed 가 아니었다).
        그래서 fixed·sticky 로 떠 있는 것에 가린 경우는 넘긴다. 단,
        페이지가 굴러가지 않으면(문서가 화면보다 짧으면) 정말로 못 보므로
        그때는 넘기지 않는다.
      */
      const hitPos = getComputedStyle(hit).position;
      const scrollable = document.documentElement.scrollHeight > innerHeight + 4;
      if (scrollable && (hitPos === "fixed" || hitPos === "sticky")) continue;
      covered.push(`${el.tagName} "${(el.textContent || "").trim().slice(0, 14)}" ← ${hit.tagName}.${String(hit.className).split(" ")[0]}`);
    }

    return {
      over: document.documentElement.scrollWidth - W,
      bleed: [...new Set(bleed)],
      covered: [...new Set(covered)],
      screens: +(document.body.scrollHeight / 844).toFixed(1),
    };
  });
  log(`${label} — 가로로 밀리지 않는다`, r.over === 0, `넘침 ${r.over}px · 높이 ${r.screens}화면`);
  log(`${label} — 화면 밖으로 나간 조각이 없다`, r.bleed.length === 0, r.bleed.slice(0, 3).join(" | "));
  log(`${label} — 다른 것에 덮인 것이 없다`, r.covered.length === 0, r.covered.slice(0, 3).join(" | "));
}

log("자바스크립트 오류 없음", errs.length === 0, errs.slice(0, 2).join(" | "));
console.log(`   (기준 ${BASE})`);

await browser.close();
process.exit(finish() ? 1 : 0);
