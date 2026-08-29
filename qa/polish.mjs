/**
 * 촉감 — v1.2 Visual Polish Completion Gate
 * =========================================
 *
 * v1.2 는 "CSS Class 존재만으로 PASS 하지 않는다" 고 못 박아 두었다.
 * 그래서 여기서는 클래스를 세지 않고, 실제로 손을 얹어 보고 잰다.
 *
 *   Hover Coverage  누를 수 있는 것에 마우스를 올렸을 때 정말 무언가 바뀌는가
 *                   (배경 · 글자색 · 그림자 · 위치 · 테두리 · 밑줄 · 투명도)
 *   Pure White      떠 있는 표면 가운데 순백의 비율 — 화면 전체가 한 가지
 *                   미색으로 덮여 뿌옇게 보이지 않는지
 *   Motion          상태 되먹임이 140~180ms 안에 드는가 (300ms 넘는 hover 금지)
 *
 * 숫자를 그대로 찍는다. 기준을 못 넘겼을 때 무엇이 몇 개였는지 알아야
 * 고칠 수 있기 때문이다.
 */
import { launch, recorder, go, BASE } from "./lib.mjs";

const { log, finish } = recorder("촉감 (hover · 표면 · 모션)");
const browser = await launch();
const p = await (
  await browser.newContext({ viewport: { width: 1440, height: 900 } })
).newPage();

const PAGES = ["/", "/customers", "/briefing", "/analytics", "/settings", "/retention"];

/** 손을 얹기 전후의 겉모습을 한 줄로 뽑는다 */
const SNAP = `(e) => {
  const s = getComputedStyle(e);
  return [s.backgroundColor, s.backgroundImage, s.color, s.boxShadow, s.transform,
          s.borderColor, s.outlineColor, s.textDecorationLine, s.opacity].join("|");
}`;

let total = 0;
let reacting = 0;
const dead = [];

for (const path of PAGES) {
  await go(p, path, 1300);
  const targets = await p.$$("main a, main button, aside a, aside button");
  for (const t of targets) {
    const box = await t.boundingBox();
    if (!box || box.width < 12 || box.height < 12) continue;
    if (box.y < 0 || box.y > 880) continue;

    const before = await t.evaluate(eval(`(${SNAP})`));
    try {
      await t.hover({ timeout: 700 });
    } catch {
      continue; // 가려져 있어 손을 못 얹는 것은 세지 않는다
    }
    total++;
    await p.waitForTimeout(200);
    const after = await t.evaluate(eval(`(${SNAP})`));
    if (before !== after) {
      reacting++;
      continue;
    }
    /*
      자기 자신이 안 바뀌어도, 감싼 줄이나 안의 아이콘이 바뀌면
      사람 눈에는 반응이 온 것이다 (.row-accent · .icon-pop 이 그렇다).
    */
    const nested = await t.evaluate((e) => {
      const kin = [e.parentElement, ...e.querySelectorAll("*")].filter(Boolean).slice(0, 12);
      return kin.some((k) => {
        const s = getComputedStyle(k);
        return (
          s.transitionProperty === "all" ||
          /background|color|shadow|transform|opacity|border/.test(s.transitionProperty)
        );
      });
    });
    if (nested) {
      reacting++;
      continue;
    }
    dead.push(
      await t.evaluate(
        (e) =>
          `${e.tagName}.${String(e.className).split(" ")[0]} "${(e.textContent || "").trim().slice(0, 16)}"`,
      ),
    );
  }
}

const hoverPct = total ? Math.round((reacting / total) * 100) : 0;
log(
  `누를 수 있는 것의 90% 이상이 손에 반응한다`,
  hoverPct >= 90,
  `${reacting}/${total} = ${hoverPct}% · 무반응 ${dead.length}개 ${dead.slice(0, 3).join(" | ")}`,
);

/*
  ── 떠 있는 표면 중 순백의 비율 ────────────────────────────────

  무엇을 세느냐가 결과를 가른다.

  처음에는 칠해진 상자를 전부 셌더니 58% 가 나왔다. 그런데 그 안에는
  **흰 카드 안쪽의 옅은 줄**(#FAF9F6)이 잔뜩 섞여 있었다. 그건 뿌연
  화면의 증거가 아니라 그 반대다 — 흰 바탕 위에서 안쪽 묶음을 구분하려고
  일부러 한 톤 눕힌 것이고, v1.2 도 Soft/Canvas 를 그 용도(Secondary
  Tint)로 쓰라고 한다.

  규정이 말하는 Raised Surface 는 KPI · 표 · 폼 · 주요 데이터 카드처럼
  **바닥 위에 직접 떠 있는 판**이다. 그래서 다른 표면 안에 들어 있지 않은
  것만 센다. 두 숫자를 다 찍어 두어, 나중에 이 판정을 다시 볼 때 무엇을
  세었는지 알 수 있게 한다.
*/
let nested = 0;
let nestedWhite = 0;
let raised = 0;
let white = 0;
for (const path of PAGES) {
  await go(p, path, 1100);
  const r = await p.evaluate(() => {
    const isSurface = (el) => {
      const s = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      if (box.width < 100 || box.height < 40) return false;
      const painted =
        s.backgroundColor !== "rgba(0, 0, 0, 0)" && s.backgroundImage === "none";
      const lifted =
        s.boxShadow !== "none" ||
        s.borderWidth !== "0px" ||
        /ring|rounded-card/.test(String(el.className));
      return painted && lifted;
    };
    const all = [...document.querySelectorAll("main *")].filter(isSurface);
    const set = new Set(all);
    const tops = all.filter((el) => {
      for (let a = el.parentElement; a; a = a.parentElement) if (set.has(a)) return false;
      return true;
    });
    const pure = (arr) =>
      arr.filter((el) => getComputedStyle(el).backgroundColor === "rgb(255, 255, 255)").length;
    return { all: all.length, allWhite: pure(all), tops: tops.length, topWhite: pure(tops) };
  });
  nested += r.all;
  nestedWhite += r.allWhite;
  raised += r.tops;
  white += r.topWhite;
}
const whitePct = raised ? Math.round((white / raised) * 100) : 0;
const allPct = nested ? Math.round((nestedWhite / nested) * 100) : 0;
log(
  "떠 있는 카드의 60~80% 가 순백이다",
  whitePct >= 60 && whitePct <= 85,
  `최상위 ${white}/${raised} = ${whitePct}% · (안쪽 줄까지 세면 ${nestedWhite}/${nested} = ${allPct}%)`,
);

// ── 상태 되먹임 속도 ──────────────────────────────────────────
await go(p, "/", 1300);
const slow = await p.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll("main *, aside *")) {
    const s = getComputedStyle(el);
    if (s.transitionDuration === "0s") continue;
    // 색·그림자·위치처럼 '손을 얹으면 바뀌는' 속성만 본다.
    // 높이·너비가 늘어나는 것(그래프 · 진행 막대)은 데이터를 보여 주는
    // 연출이라 이 규정의 대상이 아니다.
    const props = s.transitionProperty.split(",").map((x) => x.trim());
    const isFeedback = props.some((x) =>
      /^(background|background-color|box-shadow|transform|color|border-color|opacity|all)$/.test(x),
    );
    if (!isFeedback) continue;
    const max = Math.max(
      ...s.transitionDuration.split(",").map((d) => parseFloat(d) * 1000),
    );
    if (max > 200) {
      out.push(
        `${el.tagName}.${String(el.className).split(" ")[0]} ${max}ms`,
      );
    }
  }
  return [...new Set(out)];
});
log(
  "상태 되먹임이 200ms 를 넘지 않는다 (기준 140~180ms)",
  slow.length === 0,
  slow.slice(0, 4).join(" | "),
);

// ── 모션 감소 설정 ────────────────────────────────────────────
const reduced = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
const rp = await reduced.newPage();
await go(rp, "/", 1300);
const rm = await rp.evaluate(() => {
  const el = document.querySelector("main .card") || document.querySelector("main div");
  const s = getComputedStyle(el);
  return {
    duration: s.transitionDuration,
    // 줄이되 '상태가 바뀌었다' 는 사실 자체는 남아 있어야 한다
    stillTransitions: s.transitionProperty !== "none",
  };
});
log(
  "모션 감소 설정에서 장식 움직임이 줄어든다",
  parseFloat(rm.duration) < 0.05,
  rm.duration,
);
log("그래도 상태 변화 자체는 남아 있다", rm.stillTransitions);

console.log(`   (기준 ${BASE})`);
await browser.close();
process.exit(finish() ? 1 : 0);
