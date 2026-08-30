/**
 * 태블릿 폭 — 글이 제 상자를 넘지 않는가
 * ========================================
 *
 * 폰(390)과 PC(1280~1440)는 이미 점검하고 있었는데, 그 사이가 비어
 * 있었다. 그런데 화면이 깨지기 가장 쉬운 곳이 바로 그 사이다.
 *
 *   - 폰에서는 칸이 하나라 글이 아래로 흐르면 그만이다
 *   - PC 에서는 자리가 남아돈다
 *   - 768~1024 는 **여러 칸으로 쪼개졌는데 칸마다 좁다.** 3단 격자의
 *     한 칸이 177px 인데 '1,100,000원' 은 189px 이 필요한 식이다
 *
 * 실제로 이 점검을 처음 돌렸을 때 두 개가 잡혔다.
 *   /welcome  30회권 가격이 카드 밖으로 12px 삐져나옴
 *   /analytics 세로축 눈금 '500만원'(50px)이 36px 자리에 들어가 막대 위로 겹침
 *
 * 무엇을 재는가
 * -------------
 * scrollWidth > clientWidth 이면 그 요소 안의 글이 상자보다 크다는 뜻이다.
 * 다만 그것만으로는 잘못 잡는 것이 많아, 아래는 뺀다.
 *
 *   말줄임(text-overflow: ellipsis)  — 넘치면 '…' 로 끝내겠다고 정해 둔 자리
 *   가로 스크롤(overflow-x: auto)     — 손으로 밀어 보라고 만든 자리
 *   sr-only                           — 화면에서 안 보이게 1px 상자에 가둔
 *                                       접근성 링크('본문으로 건너뛰기').
 *                                       넘치는 것이 정상이다
 *
 * 처음 만든 검사기는 이 셋을 안 뺐고, 그래서 실패 20건 중 18건이
 * 검사기가 틀린 것이었다. 검사기가 틀리면 진짜 두 건이 묻힌다.
 */
import { launch, recorder, BASE } from "./lib.mjs";

const { log, finish } = recorder("태블릿 폭 (768 · 1024)");
const browser = await launch();

const PAGES = [
  ["/", "대시보드"],
  ["/customers", "고객목록"],
  ["/briefing", "브리핑"],
  ["/analytics", "성과"],
  ["/retention", "재방문"],
  ["/visits", "방문기록"],
  ["/settings", "설정"],
  ["/service", "서비스표준"],
  ["/welcome", "공개첫화면"],
  ["/my", "MY WELLNESS"],
  ["/my/passes", "이용권"],
  ["/my/care", "케어기록"],
  ["/why", "Why AX"],
  ["/intro", "기획의도"],
];

/** 상자보다 큰 글을 찾는다 — 위 주석의 세 가지는 빼고 */
const FIND_OVERFLOW = `() => {
  const srOnly = (el) => {
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.clip !== "auto" && cs.clip !== "") return true;
      if (cs.clipPath !== "none") return true;
      const r = a.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) return true;
      if (cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) return true;
    }
    return false;
  };
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    if (el.children.length) continue;
    const t = (el.textContent || "").trim();
    if (!t) continue;
    if (el.scrollWidth <= el.clientWidth + 2) continue;
    const cs = getComputedStyle(el);
    if (cs.textOverflow === "ellipsis") continue;
    if (cs.overflowX === "auto" || cs.overflowX === "scroll") continue;
    if (srOnly(el)) continue;
    out.push(t.slice(0, 22) + " (" + el.scrollWidth + ">" + el.clientWidth + ")");
  }
  return out;
}`;

for (const [w, h] of [
  [768, 1024],
  [1024, 768],
]) {
  const p = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
  for (const [path, name] of PAGES) {
    await p.goto(BASE + path, { waitUntil: "networkidle" });
    // 지연 로딩 이미지와 아래쪽 카드까지 실제로 그려 놓고 잰다
    await p.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 80));
      }
      window.scrollTo(0, 0);
    });
    await p.waitForTimeout(400);

    // 문자열을 evaluate 에 그냥 넘기면 '식'으로 읽혀 함수 자체가 돌아온다.
    // 괄호로 싸서 그 자리에서 부른다.
    const over = await p.evaluate(`(${FIND_OVERFLOW})()`);
    log(
      `${w}px ${name} — 글이 상자를 넘지 않는다`,
      over.length === 0,
      over.slice(0, 3).join(" | "),
    );

    const docOver = await p.evaluate(
      (vw) => document.documentElement.scrollWidth > vw + 1,
      w,
    );
    log(`${w}px ${name} — 화면이 가로로 넘치지 않는다`, !docOver);
  }
  await p.close();
}

await browser.close();
finish();
