/**
 * 명부가 커졌을 때 — 고객 1,200명 · 방문 5,400건
 * ==============================================
 *
 * 매장이 3년 치 엑셀을 옮겨 오면 이 정도가 된다. 열두 명으로 만든 화면이
 * 천 명에서도 같은 속도로 열리는지는 재 보기 전에는 알 수 없다.
 *
 * 자료는 전부 지어낸 값이다 — 성 열 개와 이름 열 개를 돌려 쓴다.
 */
import { launch, recorder, go, BASE } from "./lib.mjs";

const { log, finish } = recorder("대용량 (고객 1,200명)");
const browser = await launch();
const p = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(String(e).slice(0, 130)));

await go(p, "/dashboard", 2500);

const seeded = await p.evaluate(() => {
  const raw = localStorage.getItem("jeongtong-ax-v1");
  if (!raw) return null;
  const r = JSON.parse(raw);
  const base = r.customers[0];
  if (!base) return null;
  const staffIds = r.staff.map((s) => s.id);
  const surname = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"];
  const given = ["영희", "순자", "복순", "정철", "수민", "정호", "미경", "동수", "지연", "상호"];
  const customers = [];
  const visits = [];
  // 오늘을 기준 삼지 않는다 — 언제 돌려도 같은 자료가 나오게 고정 날짜를 쓴다
  const anchor = new Date("2026-08-25").getTime();
  for (let i = 0; i < 1200; i++) {
    const id = `c-b${i}`;
    customers.push({
      ...base,
      id,
      name: `${surname[i % 10]}${given[(i * 7) % 10]}`,
      phone: `010-${1000 + (i % 9000)}-${1000 + ((i * 13) % 9000)}`,
      registeredAt: new Date(anchor - (300 + (i % 700)) * 86400000).toISOString().slice(0, 10),
      assignedStaffId: staffIds[i % staffIds.length],
      memo: "",
      tags: [],
      nextManageDate: undefined,
    });
    for (let v = 0, n = 3 + (i % 4); v < n; v++) {
      visits.push({
        id: `v-b${i}-${v}`,
        customerId: id,
        visitedAt: new Date(anchor - ((i % 200) + v * 21) * 86400000).toISOString(),
        type: v % 5 === 0 ? "consult" : "visit",
        staffId: staffIds[(i + v) % staffIds.length],
        note: "",
        bodyParts: [],
      });
    }
  }
  r.customers = customers;
  r.visits = visits;
  r.memberships = [];
  r.taskOverrides = [];
  localStorage.setItem("jeongtong-ax-v1", JSON.stringify(r));
  return { c: customers.length, v: visits.length, bytes: localStorage.getItem("jeongtong-ax-v1").length };
});

if (!seeded) {
  log("자료를 심을 수 있다", false, "저장소가 비어 있음");
  await browser.close();
  process.exit(finish() ? 1 : 0);
}
console.log(`   심은 자료 — 고객 ${seeded.c}명 · 방문 ${seeded.v}건 · ${(seeded.bytes / 1048576).toFixed(1)}MB`);

/** 이 정도까지는 기다릴 만하다고 본 선. 넘으면 손이 멈춘 것처럼 느낀다. */
const BUDGET_MS = 4000;

for (const [path, label] of [
  ["/dashboard", "대시보드"],
  ["/customers", "고객목록"],
  ["/briefing", "브리핑"],
  ["/retention", "재방문"],
  ["/visits", "방문기록"],
  ["/analytics", "성과"],
]) {
  const t0 = Date.now();
  await p.goto(BASE + path, { waitUntil: "networkidle" });
  await p
    .waitForFunction(() => (document.querySelector("main")?.innerText || "").length > 80, { timeout: 30000 })
    .catch(() => {});
  const ms = Date.now() - t0;
  log(`${label} — ${BUDGET_MS / 1000}초 안에 그려진다`, ms < BUDGET_MS, `${ms}ms`);
}

await go(p, "/customers", 1500);
const box = p.getByLabel("고객 검색");
if ((await box.count()) > 0) {
  const t0 = Date.now();
  await box.fill("김영희");
  await p.waitForFunction(() => document.body.innerText.includes("김영희"), { timeout: 15000 }).catch(() => {});
  const ms = Date.now() - t0;
  log("검색이 손을 따라온다 (1초 이내)", ms < 1000, `${ms}ms`);
} else log("고객 검색칸을 찾을 수 있다", false);

log("자바스크립트 오류 없음", errs.length === 0, errs.slice(0, 2).join(" | "));

await browser.close();
process.exit(finish() ? 1 : 0);
