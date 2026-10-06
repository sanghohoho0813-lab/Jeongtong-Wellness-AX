/**
 * 하루 업무 — 실제 순서대로 돌려 본다
 * ====================================
 *
 * 화면이 「있다」 가 아니라, 하루 동안 실제로 하는 일을 그 순서대로 해 보고
 * **저장된 자료가 맞는지**를 본다. 여기서 잡으려는 것은 화면이 깨지는 일이
 * 아니라 숫자가 조용히 틀어지는 일이다.
 *
 *   이용권 판매 → 손님 방문 기록(이용권 자동 차감) → 같은 날 또 기록하려 함(경고)
 *   → 현장 결제 방문(차감 없음) → 기록 목록에서 하루 정산 확인 → 잘못 넣은 기록 삭제
 *   (이용권 되돌림 · 되돌리기) → 번호 없는 새 손님 등록 → 화면 공유 모드에서 실명
 *
 * 폰(390px) 기준. 견본 자료에는 이용권이 없어서, 이용권은 여기서 직접 판다.
 */
import { launch, recorder, go } from "./lib.mjs";

const { log, finish } = recorder("하루 업무 (실제 순서 · 저장된 자료)");
const browser = await launch();
const p = await (
  await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(String(e).slice(0, 140)));
p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 140)));

const KEY = "jeongtong-ax-v1";
const st = () => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const toastText = async () => (await p.locator('[aria-live="polite"]').innerText()).replace(/\s+/g, " ");
const dlg = () => p.locator('[role="dialog"]').last();

await go(p, "/", 1200);
await p.evaluate(() => localStorage.setItem("jt-backup-snooze", new Date().toISOString().slice(0, 10)));
const first = (await st()).customers[0];
const NAME = first.name;
const CID = first.id;

async function openRecordFor(name) {
  await go(p, "/", 900);
  await p.getByRole("button", { name: "방문 기록하기" }).click();
  await p.waitForTimeout(500);
  await p.getByRole("textbox", { name: "고객 찾기" }).fill(name);
  await p.waitForTimeout(250);
  const row = dlg().locator("ul button").first();
  const rowText = await row.innerText();
  await row.click();
  await p.waitForTimeout(800);
  return rowText;
}

// ── 1. 이용권 판매 ──
await go(p, `/customers/${CID}`, 1200);
await p.getByText("눌러서 이용권 등록").click();
await p.waitForTimeout(500);
await dlg().locator("button", { hasText: "10회권" }).first().click();
await dlg().getByRole("button", { name: /^(등록|저장|이용권 등록)/ }).last().click();
await p.waitForTimeout(600);
let s = await st();
const M = s.memberships.find((m) => m.customerId === CID);
log("이용권 판매 — 10회권이 잔여 10회로 생긴다", M?.remainingCount === 10, JSON.stringify(M?.remainingCount));

// ── 2. 손님이 오심 → 기록: 이용권이 기본으로 골라져 있다 ──
let rowText = await openRecordFor(NAME);
log("이름을 그대로 치면 그분이 맨 위", rowText.includes(NAME) && !rowText.includes(NAME + "2"), rowText.replace(/\n/g, " "));
const sel = await dlg().locator("select").evaluateAll((els) => els.map((e) => e.options[e.selectedIndex]?.text || ""));
log("기록 창 — 이용권이 미리 골라져 있다 (사용 안 함이 기본이 아님)", sel.some((t) => /잔여 10회/.test(t)), sel.join(" / "));
log("기록 창 — 미리 고른 이유를 알려 준다", /이용권이 있어 미리 골랐습니다/.test(await dlg().innerText()));
const recBtn = dlg().getByRole("button", { name: /^(적용됨|추천일 적용)$/ });
log("다음 관리일 — 추천일이 기본값 (따로 누를 필요 없음)", (await recBtn.innerText().catch(() => "")) === "적용됨");
await dlg().getByRole("button", { name: "기록 저장" }).click();
await p.waitForTimeout(400);
const t1 = await toastText();
s = await st();
log("저장하면 이용권이 1회 빠진다 (10 → 9)", s.memberships.find((m) => m.id === M.id)?.remainingCount === 9);
log("저장 알림에 남은 횟수가 나온다", /이용권 9회 남음/.test(t1), t1);

// ── 3. 같은 날 같은 분을 또 기록하려 함 ──
await go(p, "/", 900);
await p.getByRole("button", { name: "방문 기록하기" }).click();
await p.waitForTimeout(500);
await p.getByRole("textbox", { name: "고객 찾기" }).fill(NAME);
await p.waitForTimeout(250);
const sheetRow = await dlg().locator("ul button").first().innerText();
log("고르기 화면 — 「오늘 기록함」 표시", /오늘 기록함/.test(sheetRow), sheetRow.replace(/\n/g, " "));
log("고르기 화면 — 이용권 잔여가 보인다", /이용권 9회/.test(sheetRow));
await dlg().locator("ul button").first().click();
await p.waitForTimeout(800);
const warn = dlg().locator("[data-same-day]");
log("기록 창 — 같은 날 기록이 있으면 저장 전에 경고", (await warn.count()) === 1 && /이미 방문 기록이 있습니다/.test(await warn.innerText()));

// ── 4. 현장 결제로 바꿔 저장 → 이용권은 그대로 ──
await dlg().locator("select").nth(1).selectOption("");
await dlg().getByPlaceholder("예: 60000").fill("45000");
await dlg().getByRole("button", { name: "기록 저장" }).click();
await p.waitForTimeout(500);
s = await st();
log("「사용 안 함」 으로 바꾸면 차감하지 않는다 (9 그대로)", s.memberships.find((m) => m.id === M.id)?.remainingCount === 9);
log("같은 날 두 번째 기록도 막지는 않는다 (하루 두 번 오시는 분)", s.visits.filter((v) => v.customerId === CID && v.visitedAt.slice(0, 10) === new Date().toLocaleDateString("sv-SE")).length === 2);

// ── 5. 기록 목록 — 하루 단위 정산 ──
await go(p, "/visits", 1300);
const head = p.locator("[data-day-header]").first();
const headText = (await head.innerText()).replace(/\s+/g, " ");
log("기록 목록 — 날짜 머리글에 오늘 방문 · 이용권 · 결제 합계", /오늘/.test(headText) && /방문 2/.test(headText) && /이용권 1회/.test(headText) && /45,000원/.test(headText), headText);
const firstTop = await p.evaluate(() => {
  const c = document.querySelector("[data-day-header]")?.nextElementSibling;
  return c ? Math.round(c.getBoundingClientRect().top) : 9999;
});
log("폰에서 첫 기록이 첫 화면 안에 있다", firstTop < 844 - 120, `${firstTop}px`);
const cho = [...NAME].map((ch) => "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"[Math.floor((ch.charCodeAt(0) - 0xac00) / 588)]).join("");
await p.getByRole("textbox", { name: "고객명으로 기록 찾기" }).fill(cho);
await p.waitForTimeout(400);
const found = await p.locator("main").innerText();
log(`기록 목록 — 초성(${cho})으로 찾는다`, found.includes(NAME));
await p.getByRole("textbox", { name: "고객명으로 기록 찾기" }).fill("");

// ── 6. 잘못 넣은 기록 지우기 → 이용권 되돌림 → 되돌리기 ──
const usedVisit = s.visits.find((v) => v.membershipId === M.id);
await go(p, "/visits", 1200);
const cards = p.locator("main .relative.overflow-hidden");
const n = await cards.count();
let deleted = false;
for (let i = 0; i < n && !deleted; i++) {
  if (/이용권 차감/.test(await cards.nth(i).innerText())) {
    await cards.nth(i).getByRole("button", { name: "삭제" }).click();
    await p.waitForTimeout(400);
    await dlg().getByRole("button", { name: "삭제" }).click();
    await p.waitForTimeout(400);
    deleted = true;
  }
}
s = await st();
log("이용권을 쓴 기록을 지우면 1회가 돌아온다 (9 → 10)", deleted && s.memberships.find((m) => m.id === M.id)?.remainingCount === 10);
await p.locator('[aria-live="polite"]').getByRole("button", { name: "되돌리기" }).click();
await p.waitForTimeout(400);
s = await st();
log("되돌리기 — 기록과 차감이 함께 돌아온다", !!s.visits.find((v) => v.id === usedVisit?.id) && s.memberships.find((m) => m.id === M.id)?.remainingCount === 9);

// ── 7. 번호를 안 주시는 새 손님 ──
await go(p, "/", 900);
await p.getByRole("button", { name: "방문 기록하기" }).click();
await p.waitForTimeout(500);
await p.getByRole("textbox", { name: "고객 찾기" }).fill("번호없는손님");
await p.getByRole("button", { name: /처음 오신 분 등록하고 기록/ }).click();
await p.waitForTimeout(600);
log("새 손님 — 연락처가 필수가 아니라고 알려 준다", /비워 두어도 등록됩니다/.test(await dlg().innerText()));
await dlg().getByRole("button", { name: /^(등록|저장|고객 등록)/ }).last().click();
await p.waitForTimeout(900);
s = await st();
const newbie = s.customers.find((c) => c.name === "번호없는손님");
log("연락처 없이 등록된다", !!newbie && !newbie.phone);
log("등록하자마자 그분의 기록 창이 열린다", /번호없는손님/.test(await dlg().innerText().catch(() => "")) && (await dlg().getByRole("button", { name: "기록 저장" }).count()) === 1);
await p.keyboard.press("Escape");
await go(p, "/customers", 900);
await p.getByRole("button", { name: /고객 등록/ }).first().click();
await p.waitForTimeout(500);
await dlg().getByPlaceholder("예: 김영희").fill(NAME);
await p.waitForTimeout(200);
log("같은 이름을 다시 등록하려 하면 알려 준다", /같은 이름의 고객이 이미 있습니다/.test(await dlg().innerText()));
await p.keyboard.press("Escape");

// ── 8. 화면 공유 모드 — 새로 생긴 알림 · 확인 창에도 실명이 없는가 ──
await p.evaluate((k) => {
  const r = JSON.parse(localStorage.getItem(k));
  r.settings = { ...r.settings, privacyMode: true };
  localStorage.setItem(k, JSON.stringify(r));
}, KEY);
await openRecordFor(NAME.slice(0, 1));
await dlg().getByRole("button", { name: "기록 저장" }).click();
await p.waitForTimeout(300);
const pt = await toastText();
log("공유 모드 — 방문 저장 알림에 실명 없음", !pt.includes(NAME), pt);
await go(p, "/visits", 1200);
await p.locator("main").getByRole("button", { name: "삭제" }).first().click();
await p.waitForTimeout(400);
const ct = await dlg().innerText();
log("공유 모드 — 기록 삭제 확인 창에 실명 없음", !s.customers.some((c) => c.name.length >= 3 && ct.includes(c.name)), ct.slice(0, 60));
await dlg().getByRole("button", { name: "삭제" }).click();
await p.waitForTimeout(300);
const dt = await toastText();
log("공유 모드 — 삭제 알림에 실명 없음", !s.customers.some((c) => c.name.length >= 3 && dt.includes(c.name)), dt);

log("자바스크립트 · 콘솔 오류 없음", errs.length === 0, errs.slice(0, 2).join(" | "));
await browser.close();
finish();
