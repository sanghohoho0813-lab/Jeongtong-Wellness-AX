/**
 * 사용 방법(투어) — 세 코스를 실제로 끝까지 걸어 본다
 * ====================================================
 *
 * 왜 이 검사가 생겼나
 * -------------------
 * 투어는 화면 위의 실제 요소(data-tour 표식)를 비춘다. 그런데 화면은
 * 계속 고쳐진다. 표식이 붙은 요소가 지워지거나 이름이 바뀌면 투어는
 * 죽지 않는다 — **4.8초를 기다리다 조용히 화면 전체 안내로 물러난다.**
 * 만든 사람은 눈치채지 못하고, 처음 켠 분만 빈 안내를 만난다.
 *
 * 정적으로는 못 잡는다. 표식이 dataTour prop 으로 건네져 컴포넌트
 * 안에서 붙기 때문에, 소스를 뒤지는 것으로는 "실제로 붙는가" 를 알 수
 * 없다. 그래서 실제로 걷는다 — 코스를 시작하고, 매 걸음에서
 * 스포트라이트가 정말 잡혔는지 보고, [다음] 을 끝까지 누른다.
 */
import { launch, recorder, go, BASE } from "./lib.mjs";

const { log, finish } = recorder("사용 방법 (투어 3코스 실주행)");
const browser = await launch();
const errs = [];

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => errs.push(String(e).slice(0, 130)));

/**
 * 과녁 없이 화면 전체를 안내하는 것이 **의도인** 걸음.
 * 여기 적히지 않은 걸음에서 스포트라이트가 안 잡히면 그건 삭은 것이다.
 */
const FULLSCREEN_OK = new Set([
  "먼저, 무엇을 풀려는 일인지", // /why 화면 전체
  "고객이 보는 화면은 이렇습니다", // 미리보기 화면 전체
]);

const card = () => p.locator("[data-tour-card]");

/** 카드가 '화면을 여는 중' 을 떼고 자리를 잡을 때까지 */
async function settleStep() {
  for (let i = 0; i < 70; i++) {
    const t = (await card().innerText().catch(() => "")) || "";
    if (t && !t.includes("화면을 여는 중")) return t.replace(/\s+/g, " ");
    await p.waitForTimeout(150);
  }
  return "";
}

const hasSpotlight = () =>
  p.evaluate(() =>
    [...document.querySelectorAll("div")].some(
      (d) =>
        typeof d.className === "string" &&
        d.className.includes("ring-aqua-400") &&
        d.className.includes("fixed"),
    ),
  );

/** 한 코스를 시작 단추 이름으로 열어 끝까지 걷는다 */
async function walk(course, buttonName, expected) {
  await go(p, "/guide", 1500);
  const btn = p.getByRole("button", { name: buttonName });
  if ((await btn.count()) === 0) {
    log(`${course} — 사용 방법 화면에 시작 단추가 있다`, false, buttonName);
    return;
  }
  log(`${course} — 사용 방법 화면에 시작 단추가 있다`, true);
  await btn.first().click();

  const seen = [];
  const rotten = [];
  for (let stepNo = 1; stepNo <= 40; stepNo++) {
    const text = await settleStep();
    if (!text) break; // 카드가 사라졌다 = 끝났거나 죽었다

    // "n / total" 로 지금 몇 걸음인지 읽는다
    const m = text.match(/(\d+)\s*\/\s*(\d+)/);
    const title = text.split("이전")[0] || text;
    seen.push(m ? m[1] : String(stepNo));

    const spot = await hasSpotlight();
    if (!spot) {
      const isOk = [...FULLSCREEN_OK].some((t) => text.includes(t));
      if (!isOk) rotten.push(`${m ? m[0] : stepNo}번째`);
    }

    const last = m && m[1] === m[2];
    await card()
      .getByRole("button", { name: last ? "안내 마치기" : "다음" })
      .click()
      .catch(() => {});
    await p.waitForTimeout(350);
    if (last) break;
  }

  const total = expected;
  log(
    `${course} — ${total}걸음을 끝까지 걷는다`,
    seen.length === total,
    `걸은 걸음 ${seen.length} / 기대 ${total}`,
  );
  log(
    `${course} — 모든 걸음에서 과녁이 실제로 잡힌다`,
    rotten.length === 0,
    rotten.length ? `삭은 걸음: ${rotten.join(", ")}` : "전부 잡힘",
  );
  await p.waitForTimeout(400);
  log(
    `${course} — 마치면 안내가 내려간다`,
    (await card().count()) === 0,
  );
}

/*
  기대 걸음 수는 Tour.tsx 의 코스 정의와 같아야 한다. 다르면 이 검사가
  빨개진다 — 코스를 늘리고 여기 안 적으면 새 걸음은 아무도 안 걸어 본
  채로 나가기 때문에, 일부러 숫자를 박아 둔다.

  (시연 빌드 기본 계정은 원장이라 관리자 코스 기준이고, 실명부에는
   방문 기록이 아직 없어 성과 다섯 걸음이 '기록이 없으면 숫자를 만들지
   않는다' 한 걸음으로 접힌다 — 그래서 전체가 20 이 아니라 16 이다.
   방문 기록이 5건 넘게 쌓인 씨앗으로 바뀌면 20 으로 되돌린다)
*/
await walk("빠른 시작", /빠른 시작/, 4);
await walk("전체 둘러보기", /전체 둘러보기/, 16);
await walk("시연", /시연/, 10);


/* ── 첫 실행 환영 안내 ─────────────────────────────────────── */
/*
  사용 방법이 있어도 스스로 나타나지 않으면 처음 켠 분에게는 없는
  것과 같다. 시연 빌드에서는 자동으로 뜨지 않으므로(남 앞에서 켜는
  빌드라서), 강제 표식으로 열어 확인한다.
*/
await go(p, "/", 1200);
await p.evaluate(() => {
  localStorage.removeItem("jt-welcome-done");
  localStorage.setItem("jt-welcome-force", "1");
});
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(1200);

const welcome = p.locator('[role="dialog"]', { hasText: "처음 오셨나요?" });
log("첫 실행 — 환영 안내가 뜬다", (await welcome.count()) === 1);

// 글자 크게 — 누르는 즉시 실제로 커지는가
const rootPx = () =>
  p.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
const before = await rootPx();
await welcome.getByRole("button", { name: /글자가 작게 보이면/ }).click();
await p.waitForTimeout(400);
const after = await rootPx();
log("첫 실행 — [글자 크게]가 그 자리에서 커진다", after > before, `${before}px → ${after}px`);
await welcome.getByRole("button", { name: /글자를 크게 보는 중/ }).click();
await p.waitForTimeout(400);
log("첫 실행 — 한 번 더 누르면 되돌아온다", Math.abs((await rootPx()) - before) < 0.5);

// 따라 하기 → 빠른 시작 코스가 실제로 시작되는가
await welcome.getByRole("button", { name: "사용 방법 따라 하기" }).click();
await p.waitForTimeout(900);
log("첫 실행 — [따라 하기]가 빠른 시작을 연다", (await card().count()) === 1);
const first = await settleStep();
log(
  "첫 실행 — 첫 걸음이 그려진다",
  /1\s*\/\s*4/.test(first),
  first.slice(0, 40),
);
await p.keyboard.press("Escape");
await p.waitForTimeout(400);

// 한 번 본 뒤에는 다시 나오지 않는다
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(1200);
log(
  "첫 실행 — 한 번 지나가면 다시 붙잡지 않는다",
  (await p.locator('[role="dialog"]', { hasText: "처음 오셨나요?" }).count()) === 0,
);

log("자바스크립트 오류 없음", errs.length === 0, errs.slice(0, 2).join(" | "));
console.log(`   (기준 ${BASE})`);

await browser.close();
finish();
