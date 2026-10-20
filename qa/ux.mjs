/**
 * UI/UX 2차 — 화면을 24장 찍어 보고 찾은 것들이 다시 생기지 않게
 * ==============================================================
 *
 *   · 정렬 칩이 flex 안에서 줄어들어 "관리 우선" 이 "관리 우" 로 잘렸다
 *   · 방문 없는 고객이 "최근 -" 로 나왔다 — 60대 눈에 '-' 는 뜻이 없다
 *   · KPI 계약 카드가 폰에서 두 화면 분량의 글이었다
 *   · 설정은 9.8화면인데 위로 돌아갈 길이 엄지뿐이었다
 *   · 직원 화면 어디에도 tel: 이 없어 번호를 외워 옮겨 적어야 했다
 *
 * 전화 링크는 **번호가 있을 때만**, **화면 공유 모드에서는 절대** 나오지
 * 않아야 한다 — 그 둘을 함께 본다.
 */
import { launch, recorder, go, BASE } from "./lib.mjs";

const { log, finish } = recorder("UI/UX 2~9차 (칩 · 문구 · 겹친 말 · 빈 칸 · 누르는 입력 · 말풍선 · 접는 칸 · 오늘 간소화 · 같은 앱으로 · 머리 띠 · 문 화면 · 앱 설치 · 앱처럼 움직임)");
const browser = await launch();
const errs = [];
const KEY = "jeongtong-ax-v1";

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => errs.push(String(e).slice(0, 130)));
const text = () => p.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " "));

/* ── 1. 정렬 칩 — 잘리지 않는다 · 옆으로 더 있다는 힌트 ── */
await go(p, "/customers", 1200);
const chips = await p.evaluate(() =>
  ["관리 우선", "최근 방문순", "방문 많은순", "이름순"].map((label) => {
    const el = [...document.querySelectorAll("button")].find(
      (b) => (b.textContent || "").trim() === label,
    );
    return el
      ? { label, ok: el.scrollWidth <= el.clientWidth + 1, w: el.clientWidth }
      : { label, ok: false, w: 0 };
  }),
);
log(
  "정렬 칩 — 넷 다 글이 칩 안에 다 들어간다",
  chips.every((c) => c.ok),
  chips.map((c) => `${c.label}:${c.ok ? "ok" : "잘림"}`).join(" · "),
);
log("고객 줄 — 방문 없는 분은 '아직 방문 없음' 이라고 적는다", /아직 방문 없음/.test(await text()));
log("고객 줄 — '최근 -' 가 남아 있지 않다", !/최근 -/.test(await text()));

/* ── 2. KPI 계약 — 폰에서는 접혀 있고, 누르면 펼쳐진다 ── */
await go(p, "/analytics", 1200);
const kpi = p.locator('[data-tour="kpi-contract"]');
const fold = kpi.getByRole("button", { name: "어떻게 재나요 · 개선율" });
log("KPI 카드 — 폰에서 줄마다 펼침 단추가 있다 (3)", (await fold.count()) === 3, `${await fold.count()}개`);
const before = ((await kpi.innerText()) || "").replace(/\s+/g, " ");
log("KPI 카드 — 접힌 상태에서는 측정 지점 설명이 안 보인다", !/측정 지점/.test(before));
log("KPI 카드 — 접혀도 현재값 · 기준선은 보인다", /현재값/.test(before) && /도입 전 값 없음/.test(before));
const cardH = () => kpi.evaluate((el) => el.getBoundingClientRect().height);
const folded = await cardH();
await fold.first().click();
await p.waitForTimeout(300);
const after = ((await kpi.innerText()) || "").replace(/\s+/g, " ");
log(
  "KPI 카드 — 펼치면 그 줄의 측정 지점 · 개선율이 나온다",
  (after.match(/측정 지점/g) || []).length === 1 && (after.match(/개선율/g) || []).length >= 1,
);
// 셋 다 펼친 높이 = 접기 전 원래 카드. 접은 것이 실제로 짧아야 뜻이 있다.
// 누른 줄은 이름이 "접기" 로 바뀌므로, 남은 첫 단추를 두 번 더 누른다
for (let i = 1; i < 3; i++) await fold.first().click();
await p.waitForTimeout(300);
const opened = await cardH();
log(
  "KPI 카드 — 접으면 다 펼친 것보다 25% 이상 짧고, 폰 한 화면 반 근처다",
  folded <= opened * 0.75 && folded <= 844 * 1.55,
  `접힘 ${Math.round(folded)}px · 다 펼침 ${Math.round(opened)}px`,
);

/* ── 3. 맨 위로 — 내려가야 나오고, 누르면 올라가고, 올라가면 사라진다 ── */
/*
  예전에는 설정 화면에서 쟀다. 설정이 폰에서 열 화면이던 시절 이야기다.
  이제 설정은 접힌 목록(2.3화면)이라 2,500px 까지 내려갈 수가 없다.
  늘 긴 화면인 「사용 방법」 으로 옮긴다 — 기능이 아니라 잴 자리가 바뀐 것이다.
*/
await go(p, "/guide", 1400);
log("맨 위로 — 첫 화면에는 없다", (await p.locator("[data-back-to-top]").count()) === 0);
await p.evaluate(() => window.scrollTo(0, 2500));
await p.waitForTimeout(400);
const btn = p.getByRole("button", { name: "맨 위로" });
log("맨 위로 — 한 화면 반 넘게 내리면 나타난다", (await btn.count()) === 1);
const box = await btn.boundingBox().catch(() => null);
log(
  "맨 위로 — 손가락 크기(44px 이상) · 하단 네비와 안 겹친다",
  !!box && box.width >= 44 && box.height >= 44 && box.y + box.height < 844 - 64,
  box ? `${Math.round(box.width)}×${Math.round(box.height)} y=${Math.round(box.y)}` : "없음",
);
await btn.click();
await p.waitForTimeout(900);
log("맨 위로 — 누르면 맨 위로 간다", (await p.evaluate(() => window.scrollY)) < 10);
await p.waitForTimeout(300);
log("맨 위로 — 위에 오면 사라진다", (await p.locator("[data-back-to-top]").count()) === 0);

/* ── 4. 전화 걸기 — 번호가 있을 때만 · 공유 모드에서는 절대 ── */
const original = await p.evaluate((k) => localStorage.getItem(k), KEY);
const withPhone = await p.evaluate((k) => {
  const raw = JSON.parse(localStorage.getItem(k) || "{}");
  if (!raw.customers?.length) return null;
  raw.customers[0].phone = "010-1234-5678";
  raw.settings = { ...(raw.settings || {}), privacyMode: false };
  localStorage.setItem(k, JSON.stringify(raw));
  return raw.customers[0].id;
}, KEY);
log("전화 — 검사용 번호를 넣을 고객이 있다", !!withPhone);
if (withPhone) {
  await go(p, "/briefing", 1200);
  const tel = p.locator('main a[href^="tel:"]');
  log("전화 — 브리핑에서 번호 있는 고객은 '전화 걸기' 가 나온다", (await tel.count()) >= 1, `${await tel.count()}개`);
  log("전화 — 링크가 tel:01012345678 이다", (await tel.first().getAttribute("href")) === "tel:01012345678");
  log("전화 — 단추 글에 '전화 걸기' 가 있다", /전화 걸기/.test((await tel.first().innerText().catch(() => "")) || ""));
  await go(p, `/customers/${withPhone}`, 1200);
  log("전화 — 고객 상세 머리에도 있다", (await p.locator('main a[href^="tel:"]').count()) >= 1);

  await p.evaluate((k) => {
    const raw = JSON.parse(localStorage.getItem(k) || "{}");
    raw.settings = { ...(raw.settings || {}), privacyMode: true };
    localStorage.setItem(k, JSON.stringify(raw));
  }, KEY);
  await go(p, "/briefing", 1200);
  log("전화 — 화면 공유 모드에서는 하나도 없다", (await p.locator('a[href^="tel:"]').count()) === 0);
  await go(p, `/customers/${withPhone}`, 1200);
  log("전화 — 공유 모드 고객 상세에도 없다", (await p.locator('a[href^="tel:"]').count()) === 0);
}
// 원상복구 — 다음 묶음이 번호 · 공유 모드를 물려받지 않게
await p.evaluate(([k, v]) => { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }, [KEY, original]);
await go(p, "/", 800);
log("정리 — 저장소를 원래대로 돌렸다", (await p.locator('a[href^="tel:"]').count()) === 0);

/* ── 5. PC — 접기 단추 없이 늘 펼쳐져 있다 ── */
const pc = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await go(pc, "/analytics", 1200);
const pcKpi = ((await pc.locator('[data-tour="kpi-contract"]').innerText()) || "").replace(/\s+/g, " ");
log("PC — KPI 카드는 측정 지점 셋이 늘 보인다", (pcKpi.match(/측정 지점/g) || []).length === 3);
log(
  "PC — 폰용 펼침 단추는 보이지 않는다",
  (await pc.locator('[data-tour="kpi-contract"]').getByRole("button", { name: "어떻게 재나요 · 개선율" }).count()) === 0,
);

/* ── 6. 3차 — 같은 말 두 번 · 빈 칸의 「미지정」 · 빈 구간 넷 ── */
await go(p, "/customers", 1000);
log("고객 줄 — 「방문 0회 · 아직 방문 없음」 처럼 같은 말을 두 번 하지 않는다", !/방문 0회 · 아직 방문 없음/.test(await text()));
log("고객 줄 — 이용권도 예정일도 없는 분에게 「이용권 없음 · 예정일 미정」 줄을 그리지 않는다", !/이용권 없음 예정일 미정/.test(await text()));
await go(p, "/visits", 1000);
log("방문 기록 — 담당이 없으면 「담당 미지정」 을 적지 않는다", !/담당 미지정/.test(await text()));
await go(p, "/retention", 1200);
const emptyCards = await p.locator("[data-retention-empty]").count();
const sameLine = ((await text()).match(/잘못된 것이 아니라/g) || []).length;
log("재방문 — 빈 구간은 한 장으로 모은다 (같은 안내는 한 번만)", emptyCards <= 1 && sameLine <= 1, `빈 구간 카드 ${emptyCards} · 안내 ${sameLine}번`);
// 오늘 과제가 있는 고객 — 결론(다음에 할 일)이 한 번만 나온다
await go(p, "/briefing", 1000);
const taskHref = await p.evaluate(() => [...document.querySelectorAll('main a[href^="/customers/"]')].map((a) => a.getAttribute("href")).find((h) => h.split("/").length === 3));
if (taskHref) {
  await go(p, taskHref, 1300);
  const body = await text();
  log("고객 상세 — 오늘 과제가 있으면 「다음에 할 일」 과 「지금 할 일」 이 겹쳐 나오지 않는다", /지금 할 일/.test(body) && !/다음에 할 일/.test(body));
  log("고객 상세 — 그 고객 화면 안에서는 「고객 상세」 로 가는 링크가 없다", (await p.locator(`main a[href="${taskHref}"]`).count()) === 0);
  log("고객 상세 — 머리줄이 「·」 로 시작하거나 「담당 미지정」 을 적지 않는다", !/^\s*·/.test((await p.locator("main h1").first().evaluate((h) => h.parentElement?.parentElement?.querySelector("p.mt-1")?.textContent || ""))) && !/담당 미지정/.test(body));
} else {
  log("오늘 과제가 있는 고객을 찾았다", false, "브리핑에 고객 링크 없음");
}

/* ── 7. 4차 — 고객 등록: 성별 · 연령대는 누르기 (타자 없이) ── */
await go(p, "/customers", 1000);
await p.getByRole("button", { name: /고객 등록/ }).first().click();
await p.waitForTimeout(700);
const form = p.locator('[role="dialog"]').last();
log("고객 등록 — 성별이 펼쳐진 단추 셋이다 (목록 창 없음)", (await form.locator("[data-gender]").count()) === 3);
log("고객 등록 — 연령대가 누르는 단추다 (30대 ~ 80대 이상)", (await form.locator("[data-age]").count()) >= 6 && (await form.getByPlaceholder("예: 60대").count()) === 0);
await form.locator('[data-age="60대"]').click();
log("연령대 — 누르면 골라진다", (await form.locator('[data-age="60대"]').getAttribute("aria-pressed")) === "true");
await form.locator('[data-age="60대"]').click();
log("연령대 — 한 번 더 누르면 비운다", (await form.locator('[data-age="60대"][aria-pressed="true"]').count()) === 0);
const ageBtn = await form.locator('[data-age="60대"]').boundingBox();
log("연령대 단추가 손끝 크기다 (높이 44px 이상)", !!ageBtn && ageBtn.height >= 44, ageBtn ? `${Math.round(ageBtn.width)}×${Math.round(ageBtn.height)}` : "없음");
await p.keyboard.press("Escape");

/* ── 8. 대폭 개선 — 글씨는 줄이고, 마우스를 올리면 설명 · 접었다 펴기 ── */
const pc2 = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
pc2.on("pageerror", (e) => errs.push(String(e).slice(0, 130)));
await go(pc2, "/customers", 1200);
const navLines = await pc2.evaluate(() => [...document.querySelectorAll("aside nav a")].map((a) => a.innerText.trim().split("\n").filter(Boolean).length));
log("왼쪽 목차 — 이름 한 줄만 (밑의 작은 설명 글이 없다)", navLines.length === 4 && navLines.every((n) => n === 1), JSON.stringify(navLines));
await pc2.locator('aside nav a[href="/"]').hover();
await pc2.waitForTimeout(500);
const navTip = await pc2.locator("[data-hint]").innerText().catch(() => "");
log("목차에 마우스를 올리면 무슨 화면인지 말풍선이 뜬다", /오늘/.test(navTip) && /챙길 고객/.test(navTip), navTip.replace(/\n/g, " / "));
await pc2.mouse.move(900, 600);
await pc2.waitForTimeout(300);
log("마우스를 떼면 말풍선이 사라진다", (await pc2.locator("[data-hint]").count()) === 0);
await pc2.locator('[data-section-tabs] a[href="/retention"]').hover();
await pc2.waitForTimeout(500);
log("위쪽 탭에도 말풍선이 뜬다", /늦어지는/.test(await pc2.locator("[data-hint]").innerText().catch(() => "")));
await pc2.locator('aside a[href="/why"]').hover();
await pc2.waitForTimeout(500);
log("문서 단추(Why AX)도 말풍선으로 설명한다 — 옆에 작은 글씨가 없다", /달라지는가/.test(await pc2.locator("[data-hint]").innerText().catch(() => "")) && !/우리 매장 이야기/.test(await pc2.locator('aside a[href="/why"]').innerText()));
await pc2.mouse.move(900, 600);
// 화면 설명 — 제목 아래에 늘 깔지 않고 ⓘ 로
const info = pc2.locator("main h1 [data-info]").first();
log("화면 제목 옆에 ⓘ 가 있고, 설명 글은 접혀 있다", (await info.count()) === 1 && (await info.getAttribute("aria-expanded")) === "false");
await info.click();
await pc2.waitForTimeout(300);
log("ⓘ 를 누르면 제목 아래에 설명이 한 줄로 펴진다", (await info.getAttribute("aria-expanded")) === "true" && /우선 관리/.test(await pc2.locator("main").innerText()));
// 고객 상세 — 접는 칸
await pc2.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("jeongtong-fold:")).forEach((k) => localStorage.removeItem(k)));
const anyCustomer = await pc2.evaluate(() => [...document.querySelectorAll('main a[href^="/customers/"]')].map((a) => a.getAttribute("href")).find((h) => h.split("/").length === 3));
await go(pc2, anyCustomer, 1400);
const folds = await pc2.evaluate(() => [...document.querySelectorAll("[data-fold]")].map((f) => ({ id: f.dataset.fold, open: f.dataset.open })));
log("고객 상세 — 칸이 제목 한 줄로 접혀 있다 (부위 · 선호 · 이력 등)", folds.length >= 4 && folds.filter((f) => f.open === "false").length >= 3, JSON.stringify(folds));
const hist = pc2.locator('[data-fold="detail-history"] button[aria-controls]');
log("접힌 칸 제목 옆에 몇 건인지 보인다", /\d+건/.test(await hist.innerText()));
await hist.hover();
await pc2.waitForTimeout(500);
log("접힌 칸에 마우스를 올리면 무엇이 들어 있는지 보인다", /방문/.test(await pc2.locator("[data-hint]").innerText().catch(() => "")));
await hist.click();
await pc2.waitForTimeout(300);
log("누르면 펴진다", (await pc2.locator('[data-fold="detail-history"]').getAttribute("data-open")) === "true");
await go(pc2, anyCustomer, 1200);
log("편 칸은 다음에 열어도 펴져 있다 (그 기기에 기억)", (await pc2.locator('[data-fold="detail-history"]').getAttribute("data-open")) === "true");
await pc2.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("jeongtong-fold:")).forEach((k) => localStorage.removeItem(k)));
await pc2.context().close();

/* ── 9. 오늘 간소화 — 「너무 많이 펼쳐져 있어 집중이 안 된다. 그렇다고 숨기지는 말고」 ── */
{
  const pc3 = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  pc3.on("pageerror", (e) => errs.push(String(e).slice(0, 130)));
  await go(pc3, "/", 1500);
  const pcH = await pc3.evaluate(() => document.documentElement.scrollHeight);
  log("오늘(PC) — 한 화면 반 안에 끝난다 (전에는 1,890px)", pcH <= 1400, `${pcH}px`);
  log("오늘 — 「오늘의 판단」 · 「실행」 이름표 줄이 없다", !/오늘의 판단/.test(await pc3.locator("main").innerText()));
  // 판단 칸 — 칸 전체가 갈 곳, 이유는 말풍선
  const tile = pc3.locator("[data-decision-band] a").first();
  log("판단 칸 셋 — 칸마다 누르면 갈 곳이 있다", (await pc3.locator("[data-decision-band] a[href]").count()) === 3);
  await tile.hover();
  await pc3.waitForTimeout(500);
  log("판단 칸에 마우스를 올리면 왜 그렇게 봤는지 뜬다", /명|없습니다|있습니다/.test(await pc3.locator("[data-hint]").innerText().catch(() => "")));
  await pc3.mouse.move(900, 880);
  // 시작하기 — 지금 할 단계로 가는 단추는 늘 보이고, 네 단계 목록만 접힌다
  const fr = pc3.locator("[data-first-run]");
  if (await fr.count()) {
    log("시작하기 — 평소에는 접혀 있다 (지금 할 단계 한 줄)", (await fr.getAttribute("data-open")) === "false");
    log("시작하기 — 접혀 있어도 지금 할 일로 가는 단추는 보인다", await fr.locator('a[aria-current="step"]').isVisible());
    await fr.getByRole("button", { name: /단계 보기/ }).click();
    await pc3.waitForTimeout(300);
    log("시작하기 — 「단계 보기」 를 누르면 네 단계가 다 보인다", (await fr.locator("li:visible").count()) === 4);
    await fr.getByRole("button", { name: /접기/ }).click();
  }
  // AX 코치 — 한 줄짜리 자리
  const ce = pc3.locator('[data-tour="coach-entry"]');
  const ceH = await ce.evaluate((el) => Math.round(el.getBoundingClientRect().height));
  log("AX 코치 자리 — 한 줄 (90px 이하)", ceH <= 90, `${ceH}px`);
  // 브리핑 — 판단 이유는 PC 에서도 접혀 있고, 누르면 편다
  await go(pc3, "/briefing", 1400);
  const card = pc3.locator('[data-tour="task-card"]').first();
  const why = card.getByRole("button", { name: /왜 이 고객/ });
  log("챙길 고객(PC) — 판단 이유는 접혀 있다", (await why.getAttribute("aria-expanded")) === "false" && !(await card.innerText()).includes("판단 이유"));
  await why.click();
  await pc3.waitForTimeout(300);
  log("챙길 고객 — 「왜 이 고객?」 을 누르면 판단 이유가 펴진다", (await card.innerText()).includes("판단 이유"));
  const cardH = await pc3.locator('[data-tour="task-card"]').nth(1).evaluate((el) => Math.round(el.getBoundingClientRect().height));
  log("챙길 고객(PC) — 과제 카드 한 장이 160px 이하", cardH <= 160, `${cardH}px`);
  log("챙길 고객 — 「대기」 는 적지 않는다 (목록이 이미 미처리)", !/대기/.test(await pc3.locator('[data-tour="task-card"]').nth(1).innerText()));
  // AX 코치 화면 — 리포트 단추는 제목 옆
  await go(pc3, "/coach", 1400);
  log("AX 코치 — 실증 리포트 단추가 화면 제목 옆에 있다", (await pc3.locator('main [data-tour="coach-sheet"] button').count()) === 1 && (await pc3.locator('[data-tour="coach-sheet"]').evaluate((el) => el.getBoundingClientRect().top)) < 260);
  await pc3.context().close();

  // 폰 — 판단 칸 셋이 한 줄, 과제 카드는 단추 한 줄
  await go(p, "/", 1500);
  const tops = await p.evaluate(() => [...document.querySelectorAll("[data-decision-band] a")].map((a) => Math.round(a.getBoundingClientRect().top)));
  log("오늘(폰) — 판단 칸 셋이 한 줄에 선다", tops.length === 3 && new Set(tops).size === 1, JSON.stringify(tops));
  const phH = await p.evaluate(() => document.documentElement.scrollHeight);
  log("오늘(폰) — 전에는 2,503px, 이제 1,700px 이하", phH <= 1700, `${phH}px`);
  await go(p, "/briefing", 1400);
  const rows = await p.locator('[data-tour="task-card"]').first().evaluate((el) => {
    const bar = el.querySelector(".no-print.flex");
    const tops = [...(bar?.children ?? [])].filter((c) => c.getBoundingClientRect().width > 0).map((c) => Math.round(c.getBoundingClientRect().top));
    return new Set(tops).size;
  });
  log("챙길 고객(폰) — 처리완료 · 보류 · 이유 단추가 한 줄", rows === 1, `${rows}줄`);
  const nameLink = p.locator('[data-tour="task-card"]').first().locator('a[href^="/customers/"]').first();
  log("챙길 고객(폰) — 「고객 상세」 는 이름을 누르면 간다 (이름 옆 ›)", await nameLink.isVisible());
}

/* ── 10. 같은 앱으로 — 고객용 첫 화면 · 대시보드 · 더보기 · 목록 묶음 (D-56) ──
   대표님: 「더보기 → 고객용 화면을 누르면 옛날 모습」, 「내부 화면이 거의 안 바뀌었다」.
   고객 앱(/my)과 같은 뼈대 — 머리 띠 · 걸쳐 올린 판 · 목록 묶음 — 가 실제로 있는지 본다. */
{
  // 고객용 첫 화면 — 머리 띠 + 걸친 바로가기 네 칸, 폰 길이가 줄었다
  await go(p, "/welcome", 1500);
  log("고객용 화면 — 머리 띠가 있다 (/my 홈과 같은 모양)", (await p.locator("[data-welcome-hero]").count()) === 1);
  const quick = await p.locator('#actions nav[aria-label="바로가기"] a').evaluateAll((els) => els.map((a) => a.getAttribute("href")));
  log("고객용 화면 — 바로가기 네 칸 (예약 · 이용권 · 상담 · 내 기록)", JSON.stringify(quick) === JSON.stringify(["/my/booking", "#가격", "/my/request", "/my"]), JSON.stringify(quick));
  const qTops = await p.evaluate(() => [...document.querySelectorAll('#actions nav a')].map((a) => Math.round(a.getBoundingClientRect().top)));
  log("고객용 화면 — 바로가기 네 칸이 폰에서도 한 줄", new Set(qTops).size === 1, JSON.stringify(qTops));
  const heroBottom = await p.evaluate(() => Math.round(document.querySelector("[data-welcome-hero]").getBoundingClientRect().bottom));
  const quickTop = await p.evaluate(() => Math.round(document.querySelector("#actions").getBoundingClientRect().top));
  log("고객용 화면 — 바로가기 판이 머리 띠에 걸쳐 올라온다", quickTop < heroBottom, `띠 끝 ${heroBottom} · 판 ${quickTop}`);
  log("고객용 화면 — 바로가기가 폰 첫 화면 안에 있다", quickTop < 844 - 80, `${quickTop}px`);
  const wH = await p.evaluate(() => document.documentElement.scrollHeight);
  log("고객용 화면(폰) — 전에는 8,186px, 이제 6,000px 이하", wH <= 6000, `${wH}px`);
  log("고객용 화면 — 향후 확장은 점선 상자 하나 안의 목록 줄", (await p.locator("section#future ul.border-dashed > li").count()) === 5);

  // 대시보드 — 머리 띠 + 걸친 판(판단 셋 + 바로가기 넷)
  await go(p, "/", 1500);
  log("대시보드 — 머리 띠에 오늘의 한 문장이 있다", /오늘 먼저 챙길 분이|모두 챙기셨습니다|걸린 분이 없습니다/.test(await p.locator("[data-today-hero]").innerText()));
  const panel = await p.evaluate(() => {
    const band = document.querySelector("[data-decision-band]");
    const qa = document.querySelector("[data-quick-actions]");
    const hero = document.querySelector("[data-today-hero]");
    return {
      same: !!band && !!qa && band.parentElement === qa.parentElement.parentElement,
      overlap: band ? Math.round(band.getBoundingClientRect().top) < Math.round(hero.getBoundingClientRect().bottom) : false,
      n: qa ? qa.querySelectorAll("li").length : 0,
    };
  });
  log("대시보드 — 판단 세 칸과 바로가기 네 칸이 한 판 안에", panel.same && panel.n === 4, `바로가기 ${panel.n}칸`);
  log("대시보드 — 그 판이 머리 띠에 걸쳐 올라온다", panel.overlap);
  await p.locator("[data-quick-actions]").getByRole("button", { name: "방문 기록" }).click();
  await p.waitForTimeout(500);
  log("대시보드 바로가기 — 「방문 기록」 이 고객 고르기 창을 연다 (화면은 그대로)", (await p.locator('[role="dialog"]').count()) >= 1 && new URL(p.url()).pathname === "/");
  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);
  await p.locator("[data-quick-actions]").getByRole("button", { name: "고객 찾기" }).click();
  await p.waitForTimeout(500);
  log("대시보드 바로가기 — 「고객 찾기」 가 찾기 창을 연다", (await p.locator('[role="dialog"]').count()) >= 1);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);
  log("대시보드 — 브리핑 미리보기는 흰 목록 줄 (어두운 카드 두 장이 겹치지 않는다)", (await p.locator('[data-tour="dash-briefing"] ul > li').count()) >= 1 && (await p.locator('[data-tour="dash-briefing"].card-hero').count()) === 0);
  const active = await p.evaluate(() => {
    const a = [...document.querySelectorAll("nav.fixed a")].find((x) => x.getAttribute("href") === "/");
    return a ? getComputedStyle(a.querySelector("span")).backgroundColor : "";
  });
  log("하단 탭 — 지금 탭은 아이콘 뒤에 알약 (고객 앱과 같은 모양)", !!active && active !== "rgba(0, 0, 0, 0)", active);

  // 더보기 — 문서 · 영상 다섯은 아이콘 칸 한 줄
  await go(p, "/more", 1300);
  const docTops = await p.evaluate(() =>
    [...document.querySelectorAll('main a[href="/why"], main a[href="/intro"], main a[href="/guide"], main a[href^="/videos/"]')].map((a) => Math.round(a.getBoundingClientRect().top)),
  );
  log("더보기 — 문서 · 영상 다섯이 한 줄의 아이콘 칸", docTops.length === 5 && new Set(docTops).size === 1, JSON.stringify(docTops));

  // 고객 목록 · 방문 기록 — 카드 여러 장이 아니라 한 판 안의 줄
  await go(p, "/customers", 1200);
  const lists = await p.evaluate(() => new Set([...document.querySelectorAll('[data-tour="customer-row"]')].map((a) => a.closest("ul"))).size);
  log("고객 목록 — 줄이 모두 한 판(목록 하나) 안에 있다", lists === 1, `목록 ${lists}개`);
  await go(p, "/visits", 1200);
  const vis = await p.evaluate(() => {
    const days = [...document.querySelectorAll("[data-day-header]")];
    return days.every((h) => h.nextElementSibling?.tagName === "UL") && document.querySelectorAll("[data-visit-row]").length > 0;
  });
  log("방문 기록 — 하루가 한 판, 그 안에 줄", vis);
}

/* ── 11. 형제 화면도 같은 머리 띠 — 챙길 고객 · AX 코치 · 재방문 · 성과 · 고객 상세 (D-57) ──
   대표님: 「조금 더 많이 개선해 줘」. 대시보드에서 옆 탭으로 넘어가면 옛 모양(제목 줄 +
   어두운 카드)이 나오던 것을 같은 띠 하나로 맞췄다. 띠 안에 화면 이름(h1)이 있고,
   띠 바깥에 제목 줄이 또 있지 않은지 본다. */
{
  for (const path of ["/briefing", "/coach", "/retention", "/analytics", "/customers/c-04"]) {
    await go(p, path, 1300);
    const r = await p.evaluate(() => {
      const band = document.querySelector("main [data-staff-band]");
      const h1s = [...document.querySelectorAll("main h1")];
      return {
        band: !!band,
        inBand: h1s.length === 1 && !!band && band.contains(h1s[0]),
        top: band ? Math.round(band.getBoundingClientRect().top) : 9999,
      };
    });
    log(`${path} — 머리 띠가 있고 화면 이름은 띠 안에 하나`, r.band && r.inBand);
    log(`${path} — 띠가 폰 첫 화면 위쪽에 있다`, r.top < 420, `${r.top}px`);
  }
  await go(p, "/briefing", 1300);
  log("챙길 고객 — 거르개는 띠에 걸친 판 안에 (따로 떠 있는 카드가 아니다)", (await p.locator('[data-staff-band] [aria-label="관리 유형으로 거르기"]').count()) === 1);
  log("챙길 고객 — 투어가 짚는 자리(briefing-hero)는 띠", (await p.locator('[data-staff-band] [data-tour="briefing-hero"]').count()) === 1);
  await go(p, "/customers/c-04", 1300);
  const prof = await p.evaluate(() => {
    const band = document.querySelector("[data-staff-band]");
    return {
      name: (document.querySelector("main h1")?.textContent || "").trim(),
      record: !!band?.querySelector('[data-tour="visit-record"]'),
      tiles: band ? [...band.querySelectorAll("ul > li")].length : 0,
    };
  });
  log("고객 상세 — 이름(h1)에는 이름만", prof.name.length >= 2 && !/신규|관리|등록일/.test(prof.name), prof.name);
  log("고객 상세 — 방문 · 상담 기록은 띠 위의 흰 알약", prof.record);
  log("고객 상세 — 나머지 넷은 걸친 판의 아이콘 칸", prof.tiles === 4, `${prof.tiles}칸`);
}

/* ── 12. 안정화 · 문 화면 · 앱 설치 (D-58) ──
   어두운 모드에서는 aqua-50 ~ 200 이 어두운 색으로 바뀐다. 늘 어두운 판(머리 띠 · 알림) 위에
   그 색을 쓰면 글자가 사라진다 — 알림의 「되돌리기」 가 그랬다. 글자가 실제로 밝은지 잰다. */
{
  const lum = (rgb) => {
    const m = (rgb.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return m.length === 3 ? 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]) : 0;
  };
  const dk = await (await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" })).newPage();
  dk.on("pageerror", (e) => errs.push(String(e).slice(0, 130)));
  await go(dk, "/", 1200);
  await dk.evaluate((k) => { const r = JSON.parse(localStorage.getItem(k) || "{}"); r.settings = { ...(r.settings || {}), theme: "dark" }; localStorage.setItem(k, JSON.stringify(r)); }, KEY);
  await go(dk, "/", 1500);
  const pill = await dk.evaluate(() => {
    const el = [...document.querySelectorAll("[data-today-hero] span")].find((s) => /영업/.test(s.textContent || "") && s.children.length === 0);
    return el ? getComputedStyle(el).color : "";
  });
  log("어두운 모드 — 대시보드 띠의 영업 상태 글자가 밝다 (사라지지 않는다)", !pill || lum(pill) > 0.5, pill || "(영업시간 미설정)");
  await go(dk, "/visits", 1300);
  await dk.locator("main [data-visit-row]").first().getByRole("button", { name: "삭제" }).click();
  await dk.waitForTimeout(400);
  await dk.locator('[role="dialog"]').last().getByRole("button", { name: "삭제" }).click();
  await dk.waitForTimeout(500);
  const undo = dk.getByRole("button", { name: "되돌리기" });
  const undoColor = (await undo.count()) ? await undo.first().evaluate((b) => getComputedStyle(b).color) : "";
  log("어두운 모드 — 알림의 「되돌리기」 글자가 밝다", !!undoColor && lum(undoColor) > 0.5, undoColor);
  if (await undo.count()) await undo.first().click();
  await dk.context().close();

  // 없는 주소 — 영어 한 줄이 아니라 한국어 문 화면 + 갈 곳 셋
  const nf = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await nf.goto(BASE + "/no-such-page-qa", { waitUntil: "networkidle" });
  const nfText = await nf.evaluate(() => document.body.innerText);
  log("없는 주소 — 한국어로 안내한다 (영어 기본 화면이 아니다)", /찾으시는 화면이 없습니다/.test(nfText) && !/could not be found/.test(nfText));
  log("없는 주소 — 갈 곳 셋 (매장 안내 · 내 기록 · 직원 화면)", (await nf.locator('main a[href="/welcome"], main a[href="/my"], main a[href="/"]').count()) === 3);
  // 직원 로그인 문 — 앱과 같은 띠 + 걸친 판
  await nf.goto(BASE + "/login", { waitUntil: "networkidle" });
  await nf.waitForTimeout(500);
  log("로그인 문 — 딥그린 띠와 걸친 판 (옛 흰 카드 한 장이 아니다)", (await nf.locator("[data-door]").count()) === 1 && (await nf.locator("main h1, [data-door] h1").count()) >= 1);
  await nf.context().close();

  // 홈 화면에 앱으로 — 직원 앱 · 고객 앱이 서로 다른 앱 정보를 갖는다
  const mf = async (path) => {
    const r = await fetch(BASE + path);
    const html = await r.text();
    return (html.match(/<link rel="manifest" href="([^"]+)"/) || [])[1] || "";
  };
  const staffMf = await mf("/");
  const myMf = await mf("/my");
  log("앱 설치 — 직원 화면은 직원 앱, 고객 화면은 고객 앱 정보를 단다", staffMf === "/manifest.webmanifest" && myMf === "/my.webmanifest", `${staffMf} · ${myMf}`);
  const okMf = async (path) => {
    const j = await (await fetch(BASE + path)).json();
    return j.display === "standalone" && j.icons?.some((i) => i.sizes === "512x512") && j.icons?.some((i) => i.sizes === "192x192");
  };
  log("앱 설치 — 두 앱 정보 모두 아이콘(192 · 512) · 앱처럼 열기", (await okMf("/manifest.webmanifest")) && (await okMf("/my.webmanifest")));
  const icon = await fetch(BASE + "/icons/icon-512.png");
  log("앱 설치 — 아이콘 그림이 실제로 있다", icon.status === 200 && /image\/png/.test(icon.headers.get("content-type") || ""));
  await go(p, "/more", 1200);
  log("더보기 — 「홈 화면에 앱으로 두기」 줄이 있다", (await p.locator("[data-install-app]").count()) === 1);
  await go(p, "/my/account", 1300);
  log("마이페이지 — 「홈 화면에 앱으로 두기」 줄이 있다", (await p.locator("[data-install-app]").count()) === 1);
  const guide = p.locator('[data-install-app] button[aria-expanded]');
  if (await guide.count()) {
    await guide.click();
    await p.waitForTimeout(300);
    log("설치 신호가 없는 기기 — 단추 대신 방법을 펴서 보여 준다", /홈 화면에 추가|앱 설치/.test(await p.locator("[data-install-app]").innerText()));
  }
}

/* ── 13. 앱처럼 움직인다 (D-59) ──
   창은 아래에서 올라오고, 손잡이 · 제목 줄을 아래로 쓸면 닫힌다(손가락일 때만).
   적다 만 것이 있으면 끌어서 닫아도 먼저 묻는다. 지금 있는 탭을 다시 누르면 맨 위로.
   손짓은 CDP 의 진짜 터치로 낸다 — 합성 이벤트로는 브라우저가 실제로 하는 일을 못 본다. */
{
  const tctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const t = await tctx.newPage();
  t.on("pageerror", (e) => errs.push(String(e).slice(0, 130)));
  const cdp = await tctx.newCDPSession(t);
  const dlgs = () => t.locator('[role="dialog"]').count();
  /* 창의 끄는 자리(손잡이 · 제목 줄)에서 아래로 dy 만큼 쓸어내린다 */
  const swipe = async (dy, from = '[style*="touch-action"]') => {
    const at = await t.locator('[role="dialog"]').last().evaluate((d, sel) => {
      const r = d.querySelector(sel).getBoundingClientRect();
      return { x: r.left + 40, y: r.top + 12 };
    }, from);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: at.x, y: at.y }] });
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: at.x, y: at.y + (dy * i) / steps }] });
      await t.waitForTimeout(40);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await t.waitForTimeout(600);
  };

  // 기록할 고객 고르기 — 두 분을 오늘 예정으로 두고 연다
  await go(t, "/", 1200);
  await t.evaluate((k) => {
    const r = JSON.parse(localStorage.getItem(k) || "{}");
    const today = new Date().toLocaleDateString("sv-SE");
    (r.customers || []).slice(0, 2).forEach((c) => { c.nextManageDate = today; });
    localStorage.setItem(k, JSON.stringify(r));
  }, KEY);
  await go(t, "/", 1500);
  await t.getByRole("button", { name: "방문 기록하기" }).click();
  await t.waitForTimeout(60);
  const anim = await t.locator('[role="dialog"]').last().evaluate((d) => getComputedStyle(d).animationName);
  log("시트 — 폰에서 아래에서 올라온다 (툭 뜨지 않는다)", anim === "sheet-in", anim);
  await t.waitForTimeout(500);
  const rec = t.locator('[role="dialog"]').last();
  log("시트 — 맨 위에 손잡이가 보인다", await rec.locator("[data-sheet-grabber]").isVisible());
  const xb = await rec.getByRole("button", { name: "닫기" }).boundingBox();
  log("시트 — 닫기 단추 44px 이상", !!xb && xb.width >= 44 && xb.height >= 44, xb ? `${Math.round(xb.width)}px` : "");
  const groups = await rec.locator("[data-sheet-group]").allInnerTexts();
  log("기록 고르기 — 「오늘 예정 · N명」 묶음 머리 + 「그 밖의 분」", /^오늘 예정 · 2명$/.test(groups[0] || "") && groups[1] === "그 밖의 분", groups.join(" / "));
  await rec.locator("input").first().fill("가");
  await t.waitForTimeout(300);
  log("기록 고르기 — 찾는 중에는 묶지 않는다 (찾는 이름이 맨 위)", (await rec.locator("[data-sheet-group]").count()) === 0);
  await rec.locator("input").first().fill("");
  await rec.locator("input").first().blur();
  await swipe(30);
  log("시트 — 조금만 끌면 닫히지 않고 제자리로 돌아온다", (await dlgs()) === 1);
  await swipe(200, "ul");
  log("시트 — 목록을 끌면 스크롤이지 닫힘이 아니다", (await dlgs()) === 1);
  await swipe(200);
  log("시트 — 손잡이 · 제목 줄을 아래로 쓸면 닫힌다", (await dlgs()) === 0);

  // 공용 창(Modal) — 처음 오신 분 등록
  const openNewCustomer = async () => {
    await t.locator("[data-quick-actions]").getByRole("button", { name: "처음 오신 분" }).click();
    await t.waitForTimeout(700);
  };
  await openNewCustomer();
  log("공용 창 — 손잡이 · 44px 닫기", (await t.locator('[role="dialog"]').last().locator("[data-sheet-grabber]").isVisible()) && ((await t.locator('[role="dialog"]').last().getByRole("button", { name: "닫기" }).boundingBox())?.height ?? 0) >= 44);
  await swipe(200);
  log("공용 창 — 손대지 않았으면 끌어내리면 닫힌다", (await dlgs()) === 0);
  await openNewCustomer();
  await t.locator('[role="dialog"]').last().locator("input").first().fill("적다만이름");
  await t.waitForTimeout(300);
  await swipe(200);
  log("공용 창 — 적다 만 것이 있으면 끌어내려도 먼저 묻는다", /적으신 내용이 사라집니다/.test(await t.evaluate(() => document.body.innerText)) && (await dlgs()) > 0);
  await t.getByRole("button", { name: "그냥 닫기" }).click();
  await t.waitForTimeout(600);

  // 마우스로는 끌리지 않는다 (PC 는 ✕ · ESC)
  await openNewCustomer();
  const hb = await t.locator('[role="dialog"]').last().locator('[style*="touch-action"]').boundingBox();
  await t.mouse.move(hb.x + 40, hb.y + 12);
  await t.mouse.down();
  await t.mouse.move(hb.x + 40, hb.y + 260, { steps: 8 });
  await t.mouse.up();
  await t.waitForTimeout(500);
  log("시트 — 마우스로 끌어서는 닫히지 않는다 (손가락만)", (await dlgs()) === 1);
  await t.keyboard.press("Escape");
  await t.waitForTimeout(500);

  // 화면 전환 — 투명도만 (위치를 움직이면 아래 고정 단추가 튄다)
  await t.locator('nav a[href="/customers"]').last().click();
  await t.waitForTimeout(60);
  const pe = await t.evaluate(() => {
    const el = document.querySelector("main .page-enter");
    return el ? { a: getComputedStyle(el).animationName, tf: getComputedStyle(el).transform } : null;
  });
  log("화면 전환 — 새 화면이 살짝 떠오른다 (투명도만, 위치는 그대로)", !!pe && pe.a === "fade-in" && pe.tf === "none", JSON.stringify(pe));
  await t.waitForTimeout(900);

  // 지금 있는 탭을 다시 누르면 맨 위로 — 직원 · 고객 앱 둘 다
  await t.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await t.waitForTimeout(300);
  const y0 = await t.evaluate(() => scrollY);
  await t.locator('nav a[href="/customers"]').last().click();
  await t.waitForTimeout(1000);
  log("하단 탭 — 지금 화면의 탭을 다시 누르면 맨 위로", y0 > 100 && (await t.evaluate(() => scrollY)) === 0 && new URL(t.url()).pathname === "/customers", `${Math.round(y0)} → ${await t.evaluate(() => scrollY)}`);
  await go(t, "/my", 1500);
  await t.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await t.waitForTimeout(300);
  const m0 = await t.evaluate(() => scrollY);
  await t.locator('nav[aria-label="주요 메뉴"] a[href="/my"]').click();
  await t.waitForTimeout(1000);
  log("고객 앱 하단 탭 — 다시 누르면 맨 위로", m0 > 100 && (await t.evaluate(() => scrollY)) === 0, `${Math.round(m0)} → ${await t.evaluate(() => scrollY)}`);

  // 누르는 동안 살짝 들어간다
  const pill = t.locator("main .press").first();
  const pb = await pill.boundingBox();
  await t.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
  await t.mouse.down();
  await t.waitForTimeout(250);
  const pressed = await pill.evaluate((el) => getComputedStyle(el).transform);
  await t.mouse.move(2, 2);
  await t.mouse.up();
  log("누르는 단추 — 누르는 동안 살짝 들어간다", /^matrix\(0\.9[0-9]+/.test(pressed), pressed);
  await tctx.close();

  // 움직임 줄이기 설정 — 올라오는 움직임을 끈다
  const rm = await (await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" })).newPage();
  rm.on("pageerror", (e) => errs.push(String(e).slice(0, 130)));
  await go(rm, "/", 1200);
  await rm.getByRole("button", { name: "방문 기록하기" }).click();
  await rm.waitForTimeout(100);
  const dur = await rm.locator('[role="dialog"]').last().evaluate((d) => parseFloat(getComputedStyle(d).animationDuration));
  log("움직임 줄이기 설정 — 시트가 움직이지 않고 바로 뜬다", dur < 0.01, `${dur}s`);
  await rm.context().close();
}

log("자바스크립트 오류 없음", errs.length === 0, errs.slice(0, 2).join(" | "));
console.log(`   (기준 ${BASE})`);
await browser.close();
finish();
