/**
 * 손가락과 눈 — 누를 수 있는 크기인가, 읽을 수 있는 대비인가
 * ==========================================================
 *
 * 주 사용자는 40~60대이고 대개 폰으로 쓴다. 그래서 두 가지를 실제 그려진
 * 화면에서 잰다. 색 토큰이나 클래스 이름을 보는 게 아니라, 브라우저가
 * 계산한 색과 실제 상자 크기를 쓴다.
 *
 * 손가락 — 짧은 쪽 24px 이상, 넓이는 44×44 만큼.
 *   높이만 44px 로 잡으면 '삭제' 같은 두 글자 단추가 35px 폭으로 남는다.
 *   세로로만 넉넉하고 가로로는 좁은, 빗나가기 쉬운 과녁이다.
 *   세로 막대그래프처럼 좁아도 긴 것은 넓이로 통과시킨다.
 *
 * 눈 — WCAG AA (본문 4.5:1, 큰 글씨 3:1).
 *   반투명 겹침은 실제로 합성해서 잰다. bg-white/[0.07] 을 그냥 흰색으로
 *   세면 죄다 1.00:1 로 나와 아무것도 못 잡는다. 그라데이션 위의 글자는
 *   계산으로 잴 수 없으므로 건너뛴다 (거짓 실패만 잔뜩 만든다).
 */
import { launch, recorder, go } from "./lib.mjs";

const dark = process.argv.includes("--dark");
const big = process.argv.includes("--big");
const mode = `${big ? "큰글씨" : "기본글씨"}·${dark ? "어두움" : "밝음"}`;

const { log, finish } = recorder(`손가락 · 눈 (390px · ${mode})`);
const browser = await launch();
const p = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();

await go(p, "/", 2500);
await p.evaluate(
  ({ dark, big }) => {
    const raw = localStorage.getItem("jeongtong-ax-v1");
    if (!raw) return;
    const r = JSON.parse(raw);
    r.settings = r.settings || {};
    if (dark) r.settings.theme = "dark";
    if (big) r.settings.fontScale = "large";
    localStorage.setItem("jeongtong-ax-v1", JSON.stringify(r));
  },
  { dark, big },
);

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
];

for (const [path, label] of PAGES) {
  await go(p, path, 1600);
  const r = await p.evaluate(() => {
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
    /*
      사진 위에 덮개(그라데이션)를 깔고 그 위에 글자를 얹는 경우.

      이 함수는 조상만 거슬러 올라가며 바탕을 찾는다. 그런데 덮개는
      보통 **형제**로 놓인다 — 사진 <img> 와 나란히 absolute inset-0
      짜리 <span> 을 하나 깔고, 글자는 그 위에 온다.

      그러면 조상 어디에도 바탕색이 없어 계속 올라가다 body 의 미색을
      집고, "흰 글자가 미색 위에 있다(1.33:1)" 는 엉뚱한 결론이 나온다.
      실제로 매장 사진 띠의 흰 글자가 그렇게 걸렸는데, 화면을 찍어
      화소를 재 보니 **10.16:1** 이었다.

      조상에 그라데이션이 있으면 이 함수는 이미 판단을 포기한다
      ("gradient" 를 돌려주면 부르는 쪽이 건너뛴다). 덮개가 형제로
      놓였을 때도 똑같이 포기해야 앞뒤가 맞는다 — 재지 못하는 것을
      틀렸다고 하면 안 된다.

      (덮개를 '못 재니 통과' 로 두는 것이 느슨해 보이지만, 그 자리는
       사람이 눈으로 보고 화소로 재야 하는 자리다. 검사기가 잘못된
       숫자로 빨간불을 켜면 진짜 빨간불을 아무도 안 보게 된다.)
    */
    const coveredByOverlay = (el) => {
      const box = el.getBoundingClientRect();
      for (let a = el.parentElement; a; a = a.parentElement) {
        /*
          형제만 보면 놓친다. 덮개는 보통 사진과 나란히, 즉 글자보다
          **한 겹 더 안쪽**에 놓인다.

              <figure>
                <div class="relative">      ← 여기 안에
                  <img>
                  <span class="absolute inset-0 …">   ← 덮개
                </div>
                <figcaption class="absolute bottom-0">글자</figcaption>
              </figure>

          그래서 조상의 자식이 아니라 조상의 **하위 전체**에서 찾는다.
          글자를 품고 있는 것은 제외한다 — 그건 덮개가 아니라 부모다.
        */
        for (const sib of a.querySelectorAll("*")) {
          if (sib === el || sib.contains(el) || el.contains(sib)) continue;
          const cs = getComputedStyle(sib);
          if (cs.position !== "absolute" && cs.position !== "fixed") continue;
          if (cs.backgroundImage === "none" && rgba(cs.backgroundColor)?.a === 0) continue;
          const r = sib.getBoundingClientRect();
          // 글자 상자를 덮고 있는가
          if (r.left <= box.left + 1 && r.right >= box.right - 1 &&
              r.top <= box.top + 1 && r.bottom >= box.bottom - 1) return true;
        }
        if (a.tagName === "BODY") break;
      }
      return false;
    };

    const bgOf = (el) => {
      if (coveredByOverlay(el)) return "gradient";
      const stack = [];
      for (let a = el; a; a = a.parentElement) {
        const s = getComputedStyle(a);
        if (s.backgroundImage && s.backgroundImage !== "none") return "gradient";
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

    const small = [];
    for (const el of document.querySelectorAll("button, a, [role='button'], input, select")) {
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none") continue;
      if (box.width <= 2 || box.height <= 2) continue; // 초점 전까지 숨은 건너뛰기 링크
      if (s.display.includes("inline") && el.closest("p, li")) continue; // 문단 속 글자 링크
      if (Math.min(box.width, box.height) >= 24 && box.width * box.height >= 44 * 44) continue;
      small.push(
        `${el.tagName} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 14)}" ${Math.round(box.width)}×${Math.round(box.height)}`,
      );
    }

    const lowc = [];
    for (const el of document.querySelectorAll("body *")) {
      if (el.children.length) continue;
      const txt = (el.textContent || "").trim();
      if (!txt) continue;
      const s = getComputedStyle(el);
      const fgc = rgba(s.color);
      if (!fgc || fgc.a === 0) continue;
      const bg = bgOf(el);
      if (bg === "gradient" || bg === null) continue;
      const fg = lumOf(fgc.a < 1 ? over(fgc, { r: bg * 255, g: bg * 255, b: bg * 255, a: 1 }) : fgc);
      const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
      const px = parseFloat(s.fontSize);
      const need = px >= 24 || (px >= 18.66 && Number(s.fontWeight) >= 700) ? 3 : 4.5;
      if (ratio < need) lowc.push(`"${txt.slice(0, 16)}" ${ratio.toFixed(2)}:1 (필요 ${need})`);
    }

    return { small: [...new Set(small)], lowc: [...new Set(lowc)] };
  });

  log(`${label} — 손가락이 닿는 크기다`, r.small.length === 0, r.small.slice(0, 4).join(" | "));
  log(`${label} — 글자 대비가 기준을 넘는다`, r.lowc.length === 0, r.lowc.slice(0, 4).join(" | "));
}

await browser.close();
process.exit(finish() ? 1 : 0);
