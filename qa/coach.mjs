/**
 * AX 코치 — 실증 준비도 · Mission · 실제 Event 검증
 * ==================================================
 *
 * 이 스위트가 지키는 것은 기능이 아니라 **정직성**이다. 셋만 본다.
 *
 *   1. 사람이 눌러서 완료되는 길이 없다 (카드에 「완료」 단추가 없다)
 *   2. 실제 업무를 하면 **그때** 완료된다 (브리핑에서 진짜로 처리해 본다)
 *   3. 잴 수 없는 것은 0% 가 아니라 「아직 측정 전」이라고 적는다
 *
 * 2번이 핵심이다. 브라우저를 켜서 실제로 과제를 처리하고, 코치 화면에
 * 돌아와 그 기록이 잡히는지 본다. 저장소를 손으로 고쳐서 흉내 내지
 * 않는다 — 그러면 검증기 자체가 거짓말이 된다.
 */
import { launch, recorder, go, BASE } from "./lib.mjs";

const { log, finish } = recorder("AX 코치 (준비도 · Mission · 실제 Event 검증)");
const browser = await launch();
const errs = [];

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => errs.push(String(e).slice(0, 140)));
const text = () => p.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " "));

/* ── 1. 화면이 열리고, 넷을 나눠 보여 준다 ── */
await go(p, "/coach", 1500);
const body = await text();
log("코치 화면이 열린다", /우리 매장 AX 실증 준비도/.test(body));
log(
  "실증 영역 넷을 보여 준다",
  (await p.locator("[data-coach-area]").count()) === 4,
  `${await p.locator("[data-coach-area]").count()}개`,
);
log("어려운 말(Evidence Coverage)을 화면에 쓰지 않는다", !/Evidence Coverage/i.test(body));
log(
  "시연 자료임을 준비도 옆에 적는다",
  /DEMO/.test(body) && /실제 성과가 아닙니다/.test(body),
);

/* ── 2. 잴 수 없는 것은 0% 가 아니라 「아직 측정 전」 ── */
const adoption = await p
  .locator('[data-coach-area="adoption"]')
  .innerText()
  .catch(() => "");
log(
  "고객 화면 연결 전에는 고객 직접사용이 '아직 측정 전'",
  /아직 측정 전/.test(adoption) && !/\b0%/.test(adoption),
  adoption.replace(/\s+/g, " ").slice(0, 70),
);
log(
  "목표치를 함께 적어 검산할 수 있다",
  /목표 \d+건/.test(body),
);

/* ── 3. Mission — 최대 셋 · 갈 곳 하나 · 「완료」 단추 없음 ── */
const cards = p.locator("[data-coach-mission]");
const n = await cards.count();
log("오늘 할 일은 최대 3개", n > 0 && n <= 3, `${n}개`);
log(
  "카드에 사람이 누르는 「완료」 단추가 없다",
  (await p.getByRole("button", { name: /^완료$/ }).count()) === 0,
);
log(
  "카드마다 무엇이 생겨야 완료인지 적혀 있다",
  (await p.locator("text=/완료$/").count()) > 0 && /완료$|완료 ·/.test(body),
);
for (let i = 0; i < n; i++) {
  const card = cards.nth(i);
  const links = await card.locator("a").count();
  log(`Mission ${i + 1} — 갈 곳이 하나다`, links === 1, `${links}개`);
  const box = await card.locator("a").first().boundingBox();
  log(
    `Mission ${i + 1} — 단추가 손가락 크기(48px 이상)`,
    !!box && box.height >= 48,
    box ? `${Math.round(box.height)}px` : "없음",
  );
}
log(
  "실제 대상이 없는 Mission 은 띄우지 않는다 (연결 전 고객요청 Mission 없음)",
  !/고객이 남긴 요청 확인하기/.test(body),
);

/* 대상 고객을 다시 줄 세우지 않는다 — 그건 브리핑의 몫이다 */
log(
  "코치 화면이 고객 목록을 다시 나열하지 않는다",
  (await p.locator('[data-coach-mission] a[href^="/customers/"]').count()) <= 1,
);

/* ── 4. 핵심 — 실제로 일해야 완료된다 ── */
const missionTypes = await p.evaluate(() =>
  [...document.querySelectorAll("[data-coach-mission]")].map((el) =>
    el.getAttribute("data-coach-mission"),
  ),
);
log("오늘 할 일에 '오늘 챙길 고객' 이 들어 있다", missionTypes.includes("briefing_action"));

const beforeState = await p.evaluate(() => {
  const el = document.querySelector('[data-coach-mission="briefing_action"]');
  return el ? el.getAttribute("data-verified") : null;
});
log("처리 전에는 완료가 아니다", beforeState === "0");

// 코치 화면만 열었다 닫았다 해서는 아무것도 완료되지 않는다
await go(p, "/", 1000);
await go(p, "/coach", 1200);
log(
  "화면을 오가는 것만으로는 완료되지 않는다",
  (await p.evaluate(() => {
    const el = document.querySelector('[data-coach-mission="briefing_action"]');
    return el ? el.getAttribute("data-verified") : null;
  })) === "0",
);

// 브리핑에서 실제로 한 건 처리한다 (사람이 하는 것과 같은 순서로)
await go(p, "/briefing", 1500);
/*
  과제 카드 **안**의 단추를 눌러야 한다. 화면 위쪽 상태 거르개에도
  「처리완료」 라는 같은 이름의 칩이 있어서, 그냥 이름으로 찾으면
  목록을 걸러 버리고 아무 일도 일어나지 않는다 (처음에 그랬다).
*/
const firstTask = p.locator('[data-tour="task-card"]').first();
log("브리핑에 처리할 과제가 있다", (await firstTask.count()) > 0);
const doneBtn = firstTask.getByRole("button", { name: "처리완료" }).first();
await doneBtn.click();
await p.waitForTimeout(400);
const save = p.getByRole("button", { name: "완료 저장" }).first();
log("처리 결과 입력 칸이 열린다", (await save.count()) > 0);
await save.click();
await p.waitForTimeout(700);

await go(p, "/coach", 1800);
const afterCard = p.locator('[data-coach-mission="briefing_action"]');
log(
  "실제로 처리하니 그 Mission 이 완료로 바뀐다",
  (await afterCard.getAttribute("data-verified")) === "1",
  (await afterCard.innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 60),
);
const after = await text();
log("완료 표시에 '확인했어요' 라고 적는다", /실제 처리기록을 확인했어요/.test(after));
log("오늘 몇 개 중 몇 개인지 센다", /오늘 \d개 중 [1-9]\d*개 완료/.test(after));

/* 준비도가 실제로 올라간다 */
const actionPct = await p.evaluate(() => {
  const el = document.querySelector('[data-coach-area="action"]');
  const m = (el?.textContent || "").match(/(\d+)%/);
  return m ? Number(m[1]) : -1;
});
log("고객관리 실행 준비도가 0% 를 넘는다", actionPct > 0, `${actionPct}%`);

/* 새로고침해도 완료가 유지된다 (이력이 저장된다) */
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(1200);
log(
  "새로고침해도 완료가 남는다",
  (await p
    .locator('[data-coach-mission="briefing_action"]')
    .getAttribute("data-verified")) === "1",
);

/* ── 5. 대시보드에서 코치로 들어가는 길 ── */
await go(p, "/", 1500);
const entry = p.locator('[data-tour="coach-entry"]');
log("대시보드에 코치로 가는 자리가 있다", (await entry.count()) === 1);
log(
  "그 자리에 준비도와 오늘 할 일이 한 줄로 있다",
  /실증 준비도/.test((await entry.innerText().catch(() => "")) || ""),
);
await entry.getByRole("link", { name: /AX 코치 열기/ }).click();
await p.waitForTimeout(1200);
log("눌러서 코치 화면으로 간다", p.url().endsWith("/coach"));

/* ── 6. 기존 화면이 그대로인지 ── */
await go(p, "/briefing", 1200);
log("브리핑은 그대로 고객을 줄 세운다", (await p.locator('[data-tour="task-card"]').count()) > 0);
await go(p, "/analytics", 1200);
log("성과 화면의 KPI 계약이 그대로 있다", (await p.locator('[data-tour="kpi-contract"]').count()) === 1);

/* ── 7. PC — 메뉴에 있고, 화면이 열린다 ── */
const pc = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await go(pc, "/", 1500);
/*
  목차가 넷으로 줄면서 AX 코치는 사이드바가 아니라 '오늘' 묶음의
  큰 탭에 있다. 자리가 바뀌었을 뿐 한 번에 닿는 것은 그대로다 —
  탭은 화면 맨 위에 늘 펼쳐져 있다 (qa/menu.mjs 가 따로 본다).
*/
log(
  "PC '오늘' 묶음 탭에 AX 코치가 있다",
  (await pc.locator('[data-section-tabs] a[href="/coach"]').count()) === 1,
);
await go(pc, "/coach", 1500);
const pcText = (await pc.evaluate(() => document.body.innerText)).replace(/\s+/g, " ");
log("PC 에서도 준비도와 오늘 할 일이 보인다", /실증 준비도/.test(pcText) && /오늘 이것만 해보세요/.test(pcText));
log(
  "브리핑과 무엇이 다른지 화면에 적어 둔다",
  /AX 코치와 오늘의 실행 브리핑은 무엇이 다른가요/.test(pcText),
);

/* ── 8. 실증 리포트 한 장 — 심사장에서 들고 나갈 종이 ── */
await go(p, "/coach", 1500);
const sheetCard = p.locator('[data-tour="coach-sheet"]');
log("한 장으로 뽑아 가는 자리가 있다", (await sheetCard.count()) === 1);
await sheetCard.getByRole("button", { name: "실증 리포트 보기" }).click();
await p.waitForTimeout(700);
const sheet = (await text()).replace(/\s+/g, " ");
log("리포트가 열린다", /AX 실증 리포트/.test(sheet));
log("네 영역이 표로 들어 있다", /무엇이 얼마나 쌓였나/.test(sheet));
log("최근 기간 실적이 들어 있다", /최근 \d+일에 실제로 일어난 일/.test(sheet));
log("도입 전 기준선 칸이 있다", /도입 전 기준선/.test(sheet));
log(
  "기준선이 없으면 없다고 적는다 (지어내지 않는다)",
  /도입 전 값이 아직 입력되지 않았습니다/.test(sheet),
);
log(
  "종이에도 단계를 박는다 — 맥락 없이 돌아다녀도 시연 자료임을 안다",
  /DEMO/.test(sheet) && /실제 성과가 아닙니다/.test(sheet),
);
log("인쇄 단추가 있다", (await p.getByRole("button", { name: "인쇄하기" }).count()) === 1);

/*
  종이에 실제로 무엇이 나가는지 — 화면에서 잘 보이는 것과 다르다.
  리포트는 모달 안에 있어서, 걷어내기가 어긋나면 뒤 화면이 빈 종이 몇
  장으로 먼저 나오고 리포트가 그 뒤에 찍힌다. 인쇄 매체로 바꿔 본다.
*/
await p.evaluate(() => {
  const region = document.querySelector(".print-region");
  let el = region;
  while (el && el.parentElement !== document.body) el = el.parentElement;
  document.body.classList.add("print-report");
  el?.classList.add("print-root");
});
await p.emulateMedia({ media: "print" });
await p.waitForTimeout(400);
const paper = await p.evaluate(() => {
  const r = document.querySelector(".print-region");
  const shown = [...document.body.children].filter(
    (c) => getComputedStyle(c).display !== "none",
  ).length;
  return { h: Math.round(r.getBoundingClientRect().height), shown, len: (r.innerText || "").length };
});
log("종이에는 리포트 하나만 나간다 (뒤 화면은 걷힌다)", paper.shown === 1, `body 자식 ${paper.shown}개`);
log("종이 위에서 리포트가 잘리지 않는다", paper.h > 400 && paper.len > 500, `${paper.h}px · 글 ${paper.len}자`);
await p.emulateMedia({ media: "screen" });
await p.evaluate(() => {
  document.body.classList.remove("print-report");
  document.querySelector(".print-root")?.classList.remove("print-root");
});
log(
  "인과를 단정하지 않는다",
  /관리가 재방문을 만들었다는 뜻은 아니며/.test(sheet) &&
    !/AX 로 재방문시켰|덕분에 재방문/.test(sheet),
);
log("예상 매출을 만들지 않는다고 적는다", /예상 매출 · AI 확률 · 개선율을 만들어 적지 않습니다/.test(sheet));
await p.keyboard.press("Escape");
await p.waitForTimeout(400);

/* ── 9. 백업 띠 — 보이는 자리에서, 그러나 잔소리가 되지 않게 ── */
const KEY = "jeongtong-ax-v1";
const SNOOZE = "jt-backup-snooze";
// 한 번도 백업하지 않은 상태로 만든다 (견본은 lastBackupAt 이 없다)
await p.evaluate(
  ([k, sk]) => {
    localStorage.removeItem(sk);
    const raw = JSON.parse(localStorage.getItem(k) || "{}");
    if (raw.settings) delete raw.settings.lastBackupAt;
    localStorage.setItem(k, JSON.stringify(raw));
  },
  [KEY, SNOOZE],
);
await go(p, "/", 1500);
const banner = p.locator("[data-backup-reminder]");
log("백업이 밀리면 화면 위에 띠가 뜬다", (await banner.count()) === 1);
const bannerText = ((await banner.innerText().catch(() => "")) || "").replace(/\s+/g, " ");
log(
  "한 번도 안 받았으면 그렇게 적는다",
  /아직 한 번도 백업 파일을 받지 않으셨습니다/.test(bannerText),
  bannerText.slice(0, 50),
);
log("그 자리에서 바로 받는 단추가 있다", (await banner.getByRole("button", { name: "지금 받기" }).count()) === 1);

// 받으면 사라진다 (실제로 파일이 내려오는지까지 본다)
const [dl] = await Promise.all([
  p.waitForEvent("download", { timeout: 15000 }).catch(() => null),
  banner.getByRole("button", { name: "지금 받기" }).click(),
]);
log("누르면 백업 파일이 실제로 내려온다", !!dl);
await p.waitForTimeout(800);
log("받고 나면 띠가 사라진다", (await p.locator("[data-backup-reminder]").count()) === 0);

// 오늘은 나중에 — 닫으면 오늘은 안 뜬다
await p.evaluate(
  ([k, sk]) => {
    localStorage.removeItem(sk);
    const raw = JSON.parse(localStorage.getItem(k) || "{}");
    if (raw.settings) delete raw.settings.lastBackupAt;
    localStorage.setItem(k, JSON.stringify(raw));
  },
  [KEY, SNOOZE],
);
await go(p, "/", 1300);
await p.locator("[data-backup-reminder]").getByRole("button", { name: "오늘은 나중에" }).click();
await p.waitForTimeout(400);
log("「오늘은 나중에」 를 누르면 내려간다", (await p.locator("[data-backup-reminder]").count()) === 0);
await go(p, "/customers", 1300);
log("다른 화면으로 옮겨도 오늘은 다시 뜨지 않는다", (await p.locator("[data-backup-reminder]").count()) === 0);
await p.evaluate((sk) => localStorage.removeItem(sk), SNOOZE);

/* ── 10. 금칙어 — 의료 표현은 쓰지 않는다 ── */
log(
  "의료 표현을 쓰지 않는다",
  !/(치료|치유|환자|진단|처방|의학적|시술)/.test(pcText + after + sheet),
);

log("자바스크립트 오류 없음", errs.length === 0, errs.slice(0, 2).join(" | "));
console.log(`   (기준 ${BASE})`);
await browser.close();
finish();
