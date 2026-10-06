/**
 * 현장 운영 — 이용권 챙길 분 · 같은 고객 합치기 · 마감 정산
 * ==========================================================
 *
 * daily.mjs 와 같은 원칙이다. 화면에 「있다」 가 아니라, 누르고 난 뒤
 * **저장된 자료가 맞는지** 를 본다.
 *
 *   1. 이용권 챙길 분 — 기한 임박 · 다 쓰심이 오늘 화면에 오르고, 넉넉한 이용권은
 *      안 오른다. 「연락함」 이 마지막 연락일로 남고 되돌려진다
 *   2. 같은 고객 합치기 — 두 번 등록된 분을 합치면 방문이 한곳에 모이고 명부가 한
 *      줄 줄며, 되돌리면 그대로 돌아온다
 *   3. 마감 정산 — 받은 돈 = 현장 결제 + 그날 판 이용권 (원 단위), 날짜 넘기기,
 *      CSV, 폰에서 옆으로 새지 않음
 *   4. 화면 공유 모드 — 새 카드 · 정산 · CSV 에 실명이 없다
 *   5. 가장 좁은 폰(360) + 큰 글씨 — 새 화면에 잘린 글자 · 밀려난 단추가 없다
 *
 * 견본 자료에는 이용권 · 금액이 없어서 필요한 것을 저장소에 직접 넣고 시작한다.
 */
import { launch, recorder, go } from "./lib.mjs";

const { log, finish } = recorder("현장 운영 (이용권 챙길 분 · 고객 합치기 · 마감 정산)");
const browser = await launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  acceptDownloads: true,
});
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(String(e).slice(0, 140)));
p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 140)));

const KEY = "jeongtong-ax-v1";
const st = () => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const put = (fn) =>
  p.evaluate(
    ([k, src]) => {
      const r = JSON.parse(localStorage.getItem(k));
      // eslint-disable-next-line no-new-func
      new Function("r", src)(r);
      localStorage.setItem(k, JSON.stringify(r));
    },
    [KEY, `(${fn})(r)`],
  );
const dlg = () => p.locator('[role="dialog"]').last();
const toastText = async () =>
  (await p.locator('[aria-live="polite"]').innerText()).replace(/\s+/g, " ");
const day = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("sv-SE");
};
const TODAY = day(0);

await go(p, "/", 1200);
await p.evaluate(() => localStorage.setItem("jt-backup-snooze", new Date().toISOString().slice(0, 10)));
let s = await st();
const [A, B, C] = s.customers;
const STAFF = s.staff.filter((x) => x.active);

// ── 1. 이용권 챙길 분 ──
log(
  "이용권이 하나도 없으면 카드를 그리지 않는다",
  (await p.locator("[data-pass-followup]").count()) === 0,
);

await put(
  `function (r) {
    const base = { branchId: r.branches[0].id, totalCount: 10, price: 450000, purchasedAt: "${day(-60)}" };
    r.memberships.push(
      { ...base, id: "qa-m-exp", customerId: "${A.id}", programName: "대왕쑥뜸 10회권", remainingCount: 4, expiresAt: "${day(5)}", status: "active" },
      { ...base, id: "qa-m-done", customerId: "${B.id}", programName: "대왕쑥뜸 10회권", remainingCount: 0, status: "exhausted" },
      { ...base, id: "qa-m-ok", customerId: "${C.id}", programName: "대왕쑥뜸 10회권", remainingCount: 9, status: "active" },
    );
    r.visits.push({ id: "qa-v-used", branchId: r.branches[0].id, customerId: "${B.id}", visitedAt: "${day(-3)}T11:00:00", type: "visit", programName: "대왕쑥뜸", membershipId: "qa-m-done", bodyParts: [] });
  }`,
);
await go(p, "/", 1400);
const card = p.locator("[data-pass-followup]");
const items = card.locator("li");
const itemTexts = (await items.allInnerTexts()).map((t) => t.replace(/\s+/g, " "));
log("기한 임박 · 다 쓰심 두 분이 오른다 (넉넉한 이용권은 안 오름)", itemTexts.length === 2, itemTexts.join(" | "));
log(
  "기한 임박이 맨 위 — 날짜 · 남은 날 · 잔여가 한 줄에",
  (await items.first().getAttribute("data-kind")) === "expiring" &&
    /5일 남음/.test(itemTexts[0]) &&
    /잔여 4회/.test(itemTexts[0]),
  itemTexts[0],
);
log("다 쓰심 — 마지막 사용일이 근거로 나온다", /다 쓰심/.test(itemTexts[1] ?? "") && /마지막/.test(itemTexts[1] ?? ""));
log("줄을 누르면 그 고객 화면으로 간다", (await items.first().locator(`a[href="/customers/${A.id}"]`).count()) === 1);

await items.first().getByRole("button", { name: "연락함" }).click();
await p.waitForTimeout(400);
s = await st();
log("「연락함」 — 마지막 연락일이 오늘로 남는다", s.customers.find((c) => c.id === A.id)?.lastContactDate === TODAY);
const after = (await items.allInnerTexts()).map((t) => t.replace(/\s+/g, " "));
log("연락한 분은 맨 아래로 내려가고 「연락함」 으로 보인다", /연락함 ·/.test(after.at(-1) ?? "") && (await items.first().getAttribute("data-kind")) === "exhausted", after.join(" | "));
await p.locator('[aria-live="polite"]').getByRole("button", { name: "되돌리기" }).click();
await p.waitForTimeout(300);
s = await st();
log("되돌리기 — 마지막 연락일이 원래대로", s.customers.find((c) => c.id === A.id)?.lastContactDate === A.lastContactDate);

// ── 2. 같은 고객 합치기 ──
await put(
  `function (r) {
    r.customers.push({ id: "qa-dup", branchId: r.branches[0].id, name: ${JSON.stringify(A.name)}, phone: "", registeredAt: "${TODAY}", focusBodyParts: [], memo: "합치기 확인용 메모" });
    r.visits.push({ id: "qa-v-dup", branchId: r.branches[0].id, customerId: "qa-dup", visitedAt: "${day(-1)}T15:00:00", type: "visit", programName: "대왕쑥뜸", bodyParts: [] });
  }`,
);
s = await st();
const total = s.customers.length;
const aVisits = s.visits.filter((v) => v.customerId === A.id).length;
await go(p, "/customers/qa-dup", 1300);
const notice = p.locator("[data-merge-notice]");
log("두 번 등록된 분 화면에 한 줄 안내가 뜬다", (await notice.count()) === 1 && /같은 이름/.test(await notice.innerText()));
await notice.getByRole("button", { name: "확인하고 합치기" }).click();
await p.waitForTimeout(500);
const keepText = await dlg().locator('[data-keep-choice="on"]').innerText();
log("기본은 기록이 많은 쪽을 남긴다", new RegExp(`방문 ${aVisits}회`).test(keepText), keepText.replace(/\s+/g, " "));
log("무엇이 옮겨 가는지 숫자로 보여 준다", /방문 1건/.test(await dlg().innerText()));
await dlg().getByRole("button", { name: "합치기", exact: true }).click();
await p.waitForTimeout(900);
s = await st();
log(
  "합치면 명부가 한 줄 줄고 방문이 남는 분에게 모인다",
  s.customers.length === total - 1 &&
    !s.customers.some((c) => c.id === "qa-dup") &&
    s.visits.filter((v) => v.customerId === A.id).length === aVisits + 1,
);
log("빠지는 분의 메모도 남는 분에게 이어 붙는다", /합치기 확인용 메모/.test(s.customers.find((c) => c.id === A.id)?.memo ?? ""));
log("지금 보던 분이 빠졌으면 남는 분 화면으로 옮겨 간다", p.url().endsWith(`/customers/${A.id}`), p.url());
log("합친 뒤에는 안내가 사라진다", (await p.locator("[data-merge-notice]").count()) === 0);
await p.locator('[aria-live="polite"]').getByRole("button", { name: "되돌리기" }).click();
await p.waitForTimeout(500);
s = await st();
log(
  "되돌리기 — 빠진 분과 그분 방문이 그대로 돌아온다",
  s.customers.length === total &&
    s.visits.find((v) => v.id === "qa-v-dup")?.customerId === "qa-dup" &&
    !/합치기 확인용 메모/.test(s.customers.find((c) => c.id === A.id)?.memo ?? ""),
);

// ── 3. 마감 정산 ──
await put(
  `function (r) {
    const b = r.branches[0].id;
    r.visits.push(
      { id: "qa-s1", branchId: b, customerId: "${A.id}", staffId: "${STAFF[0].id}", visitedAt: "${TODAY}T10:00:00", type: "visit", programName: "대왕쑥뜸", membershipId: "qa-m-exp", bodyParts: [] },
      { id: "qa-s2", branchId: b, customerId: "${B.id}", staffId: "${(STAFF[1] ?? STAFF[0]).id}", visitedAt: "${TODAY}T14:30:00", type: "visit", programName: "대왕쑥뜸", amount: 45000, bodyParts: [] },
      { id: "qa-s3", branchId: b, customerId: "${C.id}", staffId: "${(STAFF[1] ?? STAFF[0]).id}", visitedAt: "${TODAY}T16:00:00", type: "consult", bodyParts: [] },
    );
    r.memberships.push({ id: "qa-m-sold", branchId: b, customerId: "${C.id}", programName: "대왕쑥뜸 10회권", totalCount: 10, remainingCount: 10, price: 450000, purchasedAt: "${TODAY}", status: "active" });
  }`,
);
s = await st();
const onSite = s.visits
  .filter((v) => v.visitedAt.slice(0, 10) === TODAY)
  .reduce((n, v) => n + (v.amount ?? 0), 0);
const sales = s.memberships
  .filter((m) => m.purchasedAt === TODAY)
  .reduce((n, m) => n + (m.price ?? 0), 0);
const won = (n) => `${n.toLocaleString("ko-KR")}원`;

await go(p, "/visits", 1300);
await p.getByRole("button", { name: "마감 정산" }).click();
await p.waitForTimeout(600);
const sheet = dlg().locator("[data-settlement]");
const sheetText = (await sheet.innerText()).replace(/\s+/g, " ");
log(
  "받은 돈 합계 = 현장 결제 + 그날 판 이용권 (원 단위 그대로)",
  sheetText.includes(`받은 돈 합계 ${won(onSite + sales)}`) &&
    sheetText.includes(`현장 결제 ${won(onSite)}`) &&
    sheetText.includes(`이용권 판매 ${won(sales)}`),
  sheetText.slice(0, 90),
);
const counts = await dlg().locator("[data-settlement-counts]").innerText();
log("방문 · 상담 · 이용권 차감 · 판매 건수", /방문 \d+ · 상담 \d+ · 이용권 차감 \d+회 · 이용권 판매 \d+건/.test(counts), counts);
log("담당별 · 프로그램별 표가 있다", /담당별/.test(sheetText) && /프로그램별/.test(sheetText));
log("오늘에서 「다음 날」 은 못 누른다", await dlg().getByRole("button", { name: "다음 날" }).isDisabled());
const wide = await dlg().evaluate((el) => el.scrollWidth - el.clientWidth);
log("폰에서 정산 창이 옆으로 새지 않는다", wide <= 1, `${wide}px`);

const [dl] = await Promise.all([
  p.waitForEvent("download"),
  dlg().getByRole("button", { name: "CSV 받기" }).click(),
]);
const csv = await (await dl.createReadStream()).toArray().then((b) => Buffer.concat(b).toString("utf8"));
log(
  "CSV — 합계 줄 금액이 화면과 같다",
  // 검사용 헤드리스 크로미움은 한글 파일 이름을 「download」 로 바꿔 버린다
  // (영문 이름은 그대로 — 앱의 다른 내보내기도 같다). 그 경우만 이름 검사를 건너뛴다.
  [`마감정산_${TODAY}.csv`, "download"].includes(dl.suggestedFilename()) &&
    csv.split(/\r?\n/).some((l) => l.startsWith("합계,") && l.endsWith(`,${onSite + sales}`)),
  `${dl.suggestedFilename()} :: ${csv.split(/\r?\n/).find((l) => l.startsWith("합계")) ?? ""}`,
);

await dlg().getByRole("button", { name: "전날" }).click();
await p.waitForTimeout(300);
log("◀ 로 전날 정산을 본다", (await dlg().locator("[data-settlement]").getAttribute("data-settlement")) === day(-1));
await p.keyboard.press("Escape");
await p.waitForTimeout(300);
await p.locator(`[data-day-header="${day(-1)}"]`).getByRole("button", { name: "정산 보기" }).click();
await p.waitForTimeout(400);
log("날짜 머리글의 「정산 보기」 는 그날 정산을 연다", (await dlg().locator("[data-settlement]").getAttribute("data-settlement")) === day(-1));
await p.keyboard.press("Escape");

// ── 4. 화면 공유 모드 ──
await put(`function (r) { r.settings = { ...r.settings, privacyMode: true }; }`);
s = await st();
const longNames = s.customers.map((c) => c.name).filter((n) => n.length >= 3);
const leaks = (t) => longNames.filter((n) => t.includes(n));
await go(p, "/", 1300);
const cardText = await p.locator("[data-pass-followup]").innerText();
log("공유 모드 — 이용권 챙길 분 카드에 실명 없음", leaks(cardText).length === 0, leaks(cardText).join(","));
await go(p, "/visits", 1200);
await p.getByRole("button", { name: "마감 정산" }).click();
await p.waitForTimeout(500);
const pt = await dlg().innerText();
log("공유 모드 — 정산 창에 실명 없음", leaks(pt).length === 0, leaks(pt).join(","));
const [dl2] = await Promise.all([
  p.waitForEvent("download"),
  dlg().getByRole("button", { name: "CSV 받기" }).click(),
]);
const csv2 = await (await dl2.createReadStream()).toArray().then((b) => Buffer.concat(b).toString("utf8"));
log("공유 모드 — 정산 CSV 에도 실명 없음", leaks(csv2).length === 0, leaks(csv2).join(","));

// ── 5. 가장 좁은 폰(360) + 큰 글씨 — 잘리는 글자 · 밀려난 단추가 없는가 ──
await put(`function (r) { r.settings = { ...r.settings, privacyMode: false, fontScale: "large" }; }`);
await p.setViewportSize({ width: 360, height: 780 });
/** 상자 오른쪽 밖으로 나간 글자 · 단추 (옆으로 넘기는 칸 안은 제외) */
const clipped = (sel) =>
  p.evaluate((sel) => {
    const box = document.querySelector(sel);
    if (!box) return ["(없음)"];
    const edge = box.getBoundingClientRect().right + 1;
    return [...box.querySelectorAll("*")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || r.right <= edge) return false;
        for (let a = el.parentElement; a && a !== box; a = a.parentElement)
          if (getComputedStyle(a).overflowX !== "visible") return false;
        return true;
      })
      .map((el) => (el.textContent || el.tagName).trim().slice(0, 20));
  }, sel);
await go(p, "/", 1300);
let cut = await clipped("[data-pass-followup]");
log("360 · 큰 글씨 — 이용권 챙길 분 카드에 잘린 것 없음", cut.length === 0, cut.join(" | "));
await go(p, "/visits", 1200);
await p.getByRole("button", { name: "마감 정산" }).click();
await p.waitForTimeout(500);
cut = await clipped('[role="dialog"]');
log("360 · 큰 글씨 — 정산 창에 잘린 것 · 밀려난 화살표 없음", cut.length === 0, cut.join(" | "));
await p.keyboard.press("Escape");
await put(
  `function (r) { r.customers.push({ id: "qa-dup2", branchId: r.branches[0].id, name: ${JSON.stringify(A.name)}, phone: "", registeredAt: "${TODAY}", focusBodyParts: [] }); }`,
);
await go(p, "/customers/qa-dup2", 1300);
cut = await clipped("[data-merge-notice]");
log("360 · 큰 글씨 — 합치기 안내 줄에 잘린 것 없음", cut.length === 0, cut.join(" | "));
await p.getByRole("button", { name: "확인하고 합치기" }).click();
await p.waitForTimeout(500);
cut = await clipped('[role="dialog"]');
log("360 · 큰 글씨 — 합치기 창에 잘린 것 없음", cut.length === 0, cut.join(" | "));

log("자바스크립트 · 콘솔 오류 없음", errs.length === 0, errs.slice(0, 2).join(" | "));
await browser.close();
finish();
