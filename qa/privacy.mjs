/**
 * 화면 공유 모드 — 실명이 한 글자라도 새는가
 * ============================================
 *
 * 화면 공유 모드는 심사 · 시연 · 외부 촬영 자리에서 켜는 기능이다.
 * 켰는데 새면, 그 자리에서는 되돌릴 수가 없다.
 *
 * 그런데 새고 있었다. 설명 영상을 찍으려고 모드를 켜고 화면을 돌다가
 * 알았다 — 목록과 카드는 「김○연」 인데, 방문 기록 창을 여니 제목이
 * 「(실명 그대로) — 방문 · 상담 기록」 이었다. 창 제목 · 저장 알림 · 케어
 * 리포트 · 고객 화면 미리보기 · 방문 입력칸의 고객 고르기, 모두
 * 실명을 그대로 쓰고 있었다.
 *
 * 한 곳씩 찾아 고치는 것만으로는 다음에 또 샌다. 그래서 여기서는
 * **실명 목록을 들고 화면 전체를 훑는다.** 어느 화면이든, 어느 창이든,
 * 어느 알림이든 실명이 한 번이라도 나오면 실패다.
 */
import { launch, recorder, go, BASE } from "./lib.mjs";

const { log, finish } = recorder("화면 공유 모드 (실명이 새는가)");
const browser = await launch();
const errs = [];

/*
  실명 목록은 **코드에 적지 않는다.** 이 저장소는 공개 저장소다.
  화면 공유 모드를 켜기 전에, 앱이 실제로 들고 있는 고객 명부에서
  이름을 읽어 온다 — 명부가 바뀌어도 검사가 따라간다.
  (가림 규칙은 「첫 글자 · ○ · 끝 글자」 라서, 가린 뒤에도 이 문자열이
  그대로 나오면 가려지지 않은 것이다. 두 글자 이하 이름은 가림 뒤에도
  원래 글자와 겹칠 수 있어 뺀다.)
*/
let REAL = [];

const p = await (
  await browser.newContext({ viewport: { width: 390, height: 844 } })
).newPage();
p.on("pageerror", (e) => errs.push(String(e).slice(0, 120)));

await go(p, "/", 1200);
REAL = await p.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem("jeongtong-ax-v1") || "{}");
  return [...new Set((raw.customers || []).map((c) => c.name).filter((n) => n && n.length >= 3))];
});
log("전제 — 앱 명부에서 확인할 이름을 읽었다", REAL.length >= 5, `${REAL.length}명`);
await p.evaluate(() => {
  const k = "jeongtong-ax-v1";
  const raw = JSON.parse(localStorage.getItem(k) || "{}");
  raw.settings = { ...(raw.settings || {}), privacyMode: true };
  localStorage.setItem(k, JSON.stringify(raw));
});
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(800);

/** 지금 화면에 보이는 글 + 알림(토스트)에 실명이 있나 */
const leaked = () =>
  p.evaluate((names) => {
    const text = document.body.innerText || "";
    // <select> 의 보기는 innerText 에 안 잡히므로 따로 본다
    const opts = [...document.querySelectorAll("option")]
      .map((o) => o.textContent || "")
      .join(" ");
    const all = text + " " + opts + " " + document.title;
    return names.filter((n) => all.includes(n));
  }, REAL);

log(
  "전제 — 화면 공유 모드가 켜져 있다",
  /화면 공유 모드/.test(await p.evaluate(() => document.body.innerText)),
);

// ── 1. 화면마다 ──
const SCREENS = [
  "/", "/briefing", "/coach", "/customers", "/visits", "/retention",
  "/analytics", "/customers/c-04", "/customers/c-04/preview",
];
for (const path of SCREENS) {
  await go(p, path, 1100);
  const hit = await leaked();
  log(`${path} — 실명이 보이지 않는다`, hit.length === 0, hit.join(", "));
}

// ── 2. 창을 열어서 (창 제목이 샜던 자리) ──
const DIALOGS = [
  ["방문 기록 창", /방문 · 상담 기록/],
  ["고객 정보 수정 창", /정보 수정/],
  ["이용권 등록 창", /이용권/],
  ["케어 리포트", /케어 리포트/],
];
for (const [label, name] of DIALOGS) {
  await go(p, "/customers/c-04", 1300);
  const btn = p.getByRole("button", { name }).first();
  if (!(await btn.count())) {
    log(`${label} — 여는 단추가 있다`, false, "못 찾음");
    continue;
  }
  await btn.click();
  await p.waitForTimeout(800);
  const opened = (await p.locator('[role="dialog"]').count()) > 0;
  const hit = await leaked();
  log(`${label} — 열어도 실명이 보이지 않는다`, opened && hit.length === 0,
    opened ? hit.join(", ") : "창이 안 열림");
  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);
}

// ── 3. 아래 [기록] 단추 → 고르기 → 기록 창 ──
await go(p, "/", 1200);
await p.getByRole("button", { name: "방문 기록하기" }).click();
await p.waitForTimeout(700);
log("기록할 고객 고르기 — 실명이 보이지 않는다", (await leaked()).length === 0,
  (await leaked()).join(", "));
await p.locator('[role="dialog"] li button, [role="dialog"] ul button').first().click().catch(() => {});
await p.waitForTimeout(800);
log("고른 뒤 열린 기록 창 — 실명이 보이지 않는다", (await leaked()).length === 0,
  (await leaked()).join(", "));
await p.keyboard.press("Escape");

// ── 4. 저장 알림 (토스트) — 브리핑에서 실제로 처리해 본다 ──
await go(p, "/briefing", 1400);
const card = p.locator('[data-tour="task-card"]').first();
await card.getByRole("button", { name: "보류" }).first().click();
await p.waitForTimeout(500);
const holdSave = p.getByRole("button", { name: /보류 저장|저장/ }).first();
if (await holdSave.count()) {
  await holdSave.click();
  await p.waitForTimeout(250); // 알림이 떠 있는 동안 본다
}
log("처리 알림(토스트)에 실명이 없다", (await leaked()).length === 0,
  (await leaked()).join(", "));

// ── 5. 빠른 찾기 ──
await go(p, "/", 1100);
await p.getByRole("button", { name: "고객 찾기 열기" }).click();
await p.waitForTimeout(400);
await p.keyboard.type("김", { delay: 30 });
await p.waitForTimeout(500);
log("빠른 찾기 결과에 실명이 없다", (await leaked()).length === 0,
  (await leaked()).join(", "));
await p.keyboard.press("Escape");

// ── 6. 끄면 다시 보인다 (가림이 저장값을 망가뜨리지 않았는가) ──
await p.evaluate(() => {
  const k = "jeongtong-ax-v1";
  const raw = JSON.parse(localStorage.getItem(k) || "{}");
  raw.settings = { ...(raw.settings || {}), privacyMode: false };
  localStorage.setItem(k, JSON.stringify(raw));
});
await go(p, "/customers", 1300);
log(
  "모드를 끄면 이름이 원래대로 보인다 (자료는 그대로다)",
  (await leaked()).length > 0,
);

log("자바스크립트 오류 없음", errs.length === 0, errs.slice(0, 2).join(" | "));
console.log(`   (기준 ${BASE})`);
await browser.close();
finish();
