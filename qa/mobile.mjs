/**
 * 폰이 기준이다 — 거리와 길이를 숫자로 못 박는다
 * ================================================
 *
 * 대표님 내외는 폰으로 쓰신다. 그런데 화면은 늘 PC 에서 만들어진다.
 * 그래서 "폰에서도 되는지" 는 매번 사람이 사진을 찍어 봐야 알았고,
 * 한 번 고쳐 놔도 다음 기능이 들어오면 조용히 되돌아갔다.
 *
 * 여기서 재는 것은 예쁨이 아니라 **거리**다.
 *
 *   1. 첫 화면 안에 오늘 할 일이 있는가 (첫 일거리까지의 거리)
 *   2. 화면이 몇 장인가 (길어지면 찾지 못한다)
 *   3. 손끝이 닿는가 · 가로로 새지 않는가 · 글자가 잘리지 않는가
 *
 * 1번이 핵심이다. 화면을 여는 이유가 첫 장 밖에 있으면, 그 화면은
 * 열 때마다 한 번 더 쓸어내려야 하는 화면이다. 하루에 수십 번이면
 * 그건 기능이 아니라 일이다.
 *
 * 상한은 지금 값에 15% 쯤 여유를 둔 숫자다. 내용이 조금 느는 것은
 * 막지 않고, 다시 열 화면짜리가 되는 것만 막는다.
 */
import { launch, recorder, go, BASE } from "./lib.mjs";

const { log, finish } = recorder("폰 (거리 · 길이 · 손끝)");
const browser = await launch();
const errs = [];

/** 화면 장수 상한 — 360px 기준(가장 좁은 폰). 실측 + 여유 15% */
const MAX_SCREENS = {
  "/": 7,
  "/briefing": 4.5,
  "/coach": 6,
  "/customers": 4,
  "/visits": 4,
  "/retention": 5,
  "/analytics": 3.5,
  "/service": 4.5,
  "/branches": 3,
  "/settings": 3, // 접기 전 10.6 이었다 — 다시 늘어나면 여기서 걸린다
  "/more": 2.5,
  "/guide": 7,
};

/**
 * 「첫 일거리」 — 그 화면을 연 이유.
 * 이것이 첫 장(화면 높이) 안에 있어야 한다.
 */
const FIRST_WORK = [
  ["/customers", '[data-tour="customer-row"]', "첫 고객"],
  ["/briefing", '[data-tour="task-card"]', "첫 과제"],
  ["/coach", "[data-coach-mission]", "오늘 할 일 첫 장"],
];

// ═══ 1. 길이 — 360px 에서 몇 장인가 ══════════════════════════
const narrow = await (
  await browser.newContext({ viewport: { width: 360, height: 780 } })
).newPage();
narrow.on("pageerror", (e) => errs.push(String(e).slice(0, 120)));

for (const [path, max] of Object.entries(MAX_SCREENS)) {
  await go(narrow, path, 1100);
  const m = await narrow.evaluate(() => ({
    screens:
      document.documentElement.scrollHeight / window.innerHeight,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  log(
    `${path} — ${max}장 안이다`,
    m.screens <= max,
    `${m.screens.toFixed(1)}장`,
  );
  log(`${path} — 가로로 새지 않는다`, m.overflow <= 1, `${m.overflow}px`);
}

// ═══ 2. 거리 — 첫 화면 안에 일이 있는가 ═══════════════════════
const phone = await (
  await browser.newContext({ viewport: { width: 390, height: 844 } })
).newPage();
phone.on("pageerror", (e) => errs.push(String(e).slice(0, 120)));

for (const [path, sel, what] of FIRST_WORK) {
  await go(phone, path, 1300);
  const y = await phone.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    return Math.round(el.getBoundingClientRect().top + window.scrollY);
  }, sel);
  log(
    `${path} — ${what}이 첫 화면 안에 있다`,
    y !== null && y < 844,
    y === null ? "못 찾음" : `y=${y} / 844`,
  );
}

// ═══ 3. 백업 띠 — 알림 하나가 그날 할 일을 가리지 않는다 ══════
const KEY = "jeongtong-ax-v1";
const SNOOZE = "jt-backup-snooze";
await phone.evaluate(
  ([k, sk]) => {
    localStorage.removeItem(sk);
    const raw = JSON.parse(localStorage.getItem(k) || "{}");
    if (raw.settings) delete raw.settings.lastBackupAt;
    localStorage.setItem(k, JSON.stringify(raw));
  },
  [KEY, SNOOZE],
);
await go(phone, "/", 1500);
const band = phone.locator("[data-backup-reminder]");
log("백업 띠가 떠 있다 (이 검사의 전제)", (await band.count()) === 1);
const bandH = await band.evaluate((el) => Math.round(el.getBoundingClientRect().height));
log(
  "폰에서 백업 띠가 100px 을 넘지 않는다",
  bandH <= 100,
  `${bandH}px (전에는 180px 이었다)`,
);
log(
  "줄여도 받는 단추와 닫는 단추는 그대로 하나씩이다",
  (await band.getByRole("button", { name: "지금 받기" }).count()) === 1 &&
    (await band.getByRole("button", { name: "오늘은 나중에" }).count()) === 1,
);
const closeBox = await band
  .getByRole("button", { name: "오늘은 나중에" })
  .boundingBox();
log(
  "닫기(✕)가 손끝 크기다",
  !!closeBox && closeBox.width >= 40 && closeBox.height >= 40,
  closeBox ? `${Math.round(closeBox.width)}×${Math.round(closeBox.height)}` : "없음",
);
await phone.evaluate((sk) => localStorage.setItem(sk, new Date().toISOString().slice(0, 10)), SNOOZE);

// ═══ 4. 설정 — 접히고, 펴지고, 바로가기가 열면서 데려간다 ══════
await go(phone, "/settings", 1500);
const heads = phone.locator("main button[aria-expanded]");
const headCount = await heads.count();
log("설정이 접힌 목록으로 열린다 (아홉 칸)", headCount >= 8, `${headCount}칸`);
/*
  접혔다 = 화면에 없다.

  처음엔 `main input` 개수를 셌는데, 접힌 칸의 입력칸도 DOM 에는 그대로
  있어서 늘 실패했다. 사람이 보는 것은 DOM 이 아니라 **그려진 것**이다 —
  높이가 0 이면 없는 것으로 센다.
*/
const visibleInputs = (page) =>
  page.evaluate(
    () =>
      [...document.querySelectorAll("main input")].filter(
        (i) => i.getBoundingClientRect().height > 0,
      ).length,
  );
const inputsClosed = await visibleInputs(phone);
log("접혀 있을 때는 안쪽 입력칸이 화면에 없다", inputsClosed === 0, `${inputsClosed}개`);
log(
  "칸마다 무엇이 들어 있는지 한 줄로 적혀 있다",
  /글자 크기/.test(await phone.evaluate(() => document.body.innerText)) &&
    /전체 백업/.test(await phone.evaluate(() => document.body.innerText)),
);
const headBox = await heads.first().boundingBox();
log(
  "설정 한 칸이 손끝 크기다 (48px 이상)",
  !!headBox && headBox.height >= 48,
  headBox ? `${Math.round(headBox.height)}px` : "없음",
);

// 눌러서 펴진다
await heads.nth(1).click();
await phone.waitForTimeout(400);
log(
  "누르면 그 칸이 펴진다",
  (await heads.nth(1).getAttribute("aria-expanded")) === "true",
);

/*
  바로가기 칩 — 눌렀는데 제목까지만 데려다주면, 거기서 또 눌러야 한다.
  그건 바로가기가 아니라 일을 하나 늘린 것이다.
*/
await go(phone, "/settings", 1400);
await phone.locator('main a[href="#set-data"]').first().click();
await phone.waitForTimeout(600);
const dataOpen = await phone.evaluate(() => {
  const card = document.getElementById("set-data");
  const btn = card?.querySelector("button[aria-expanded]");
  return btn?.getAttribute("aria-expanded") === "true";
});
log("바로가기를 누르면 그 칸이 열린 채로 도착한다", dataOpen);

/* 주소로 바로 들어와도 열려 있어야 한다 (화면 공유 띠의 「설정에서 끄기」) */
await go(phone, "/settings#set-privacy", 1500);
const privacyOpen = await phone.evaluate(() => {
  const card = document.getElementById("set-privacy");
  const btn = card?.querySelector("button[aria-expanded]");
  return btn?.getAttribute("aria-expanded") === "true";
});
log("주소로 바로 들어와도 그 칸이 열려 있다", privacyOpen);

// ═══ 5. 거르개 칩 — 한 줄로 넘긴다 · 잘리지 않는다 ════════════
await go(phone, "/briefing", 1500);
const rows = await phone.evaluate(() => {
  const groups = [...document.querySelectorAll('[role="group"][aria-label*="거르기"]')];
  return groups.map((g) => {
    const kids = [...g.children];
    const tops = new Set(kids.map((k) => Math.round(k.getBoundingClientRect().top)));
    return {
      label: g.getAttribute("aria-label"),
      lines: tops.size,
      n: kids.length,
      scrollable: g.scrollWidth > g.clientWidth,
      clipped: kids.some((k) => k.scrollWidth > k.clientWidth + 1),
      short: kids.some((k) => k.getBoundingClientRect().height < 40),
    };
  });
});
log("브리핑 거르개가 두 줄이다 (유형 · 상태)", rows.length === 2, `${rows.length}줄`);
for (const r of rows) {
  log(`「${r.label}」 — 폰에서 한 줄에 선다`, r.lines === 1, `${r.lines}줄 · 칩 ${r.n}개`);
  log(`「${r.label}」 — 칩 글자가 잘리지 않는다`, !r.clipped);
  log(`「${r.label}」 — 칩이 손끝 크기다`, !r.short);
}
log(
  "옆으로 더 있으면 실제로 넘길 수 있다",
  rows.some((r) => r.scrollable),
  rows.map((r) => (r.scrollable ? "넘김" : "다 보임")).join(" · "),
);
log(
  "유형 칩에 건수가 함께 적혀 있다 (히어로에서 내려온 값)",
  /신규 후속관리\s*\d/.test(
    (await phone.evaluate(() => document.body.innerText)).replace(/\s+/g, " "),
  ),
);

// ═══ 6. 사용 방법 — 차례를 두 번 그리지 않는다 ════════════════
await go(phone, "/guide", 1600);
const guide = await phone.evaluate(() => {
  const first = document.getElementById("g1");
  return {
    beforeFirst: first
      ? Math.round(first.getBoundingClientRect().top + window.scrollY)
      : null,
    tocVisible: !!document.querySelector('nav[aria-label="차례"]')
      ?.getBoundingClientRect().height,
  };
});
log("폰에서는 차례를 따로 그리지 않는다", guide.tocVisible === false);
log(
  "본문 첫 항목까지 두 화면 안이다",
  guide.beforeFirst !== null && guide.beforeFirst <= 844 * 2,
  `${guide.beforeFirst}px (전에는 2,446px)`,
);
log(
  "접힌 제목이 열여덟 개 다 있다 (차례를 뺀 대신)",
  (await phone.locator('[id^="g"] button[aria-expanded], [id^="g"] button').count()) >= 18,
  `${await phone.locator('[id^="g"] button').count()}개`,
);

// ═══ 7. PC 는 접지 않는다 (좁아서 한 일이 넓은 화면까지 가지 않게) ══
const pc = await (
  await browser.newContext({ viewport: { width: 1440, height: 900 } })
).newPage();
await go(pc, "/settings", 1600);
const pcInputs = await visibleInputs(pc);
log(
  "PC 설정은 접히지 않고 그대로 펼쳐져 있다",
  pcInputs > 0,
  `보이는 입력칸 ${pcInputs}개`,
);
await go(pc, "/guide", 1600);
log(
  "PC 사용 방법에는 차례가 그대로 있다",
  (await pc.locator('nav[aria-label="차례"]').count()) === 1,
);

log("자바스크립트 오류 없음", errs.length === 0, errs.slice(0, 2).join(" | "));
console.log(`   (기준 ${BASE})`);
await browser.close();
finish();
