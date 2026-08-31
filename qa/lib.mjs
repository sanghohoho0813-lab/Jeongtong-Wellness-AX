/**
 * 회귀 점검 공통 조각
 * ====================
 *
 * vitest 로 하는 단위 테스트는 계산이 맞는지를 본다. 여기서 보는 것은 다르다 —
 * **실제로 브라우저에서 눌리는가.** 두 가지는 자주 어긋난다. 점수 계산은 맞는데
 * 단추가 안 눌리고, 값은 저장되는데 화면 숫자가 되돌아온다.
 *
 * 판정은 "있다" 가 아니라 "된다" 로 한다. 화면에 단추가 보인다는 사실은
 * 아무것도 증명하지 않는다.
 */
/**
 * Playwright 는 앱이 쓰지 않으므로 package.json 에 넣지 않았다 —
 * 배포 빌드까지 브라우저를 받아 갈 이유가 없다. 대신 없을 때
 * 무슨 스택 트레이스가 아니라 무엇을 하면 되는지를 말해 준다.
 * 다른 곳에 설치돼 있다면 QA_PLAYWRIGHT 로 그 경로를 준다.
 */
let chromium;
try {
  ({ chromium } = await import(process.env.QA_PLAYWRIGHT || "playwright"));
} catch {
  console.error(
    "\nPlaywright 가 없어 회귀 점검을 돌릴 수 없습니다.\n" +
      "  npm i -D playwright && npx playwright install chromium\n" +
      "  (이미 다른 곳에 있다면  QA_PLAYWRIGHT=/경로/playwright/index.mjs  로 알려 주세요)\n",
  );
  process.exit(2);
}

export const BASE = process.env.QA_BASE || "http://localhost:4402";

/** 샌드박스에 미리 받아 둔 크로미움. 없으면 playwright 가 가진 것을 쓴다. */
const EXECUTABLE = process.env.QA_CHROMIUM || "/opt/pw-browsers/chromium";

export async function launch() {
  const { existsSync } = await import("node:fs");
  return chromium.launch(
    existsSync(EXECUTABLE) ? { executablePath: EXECUTABLE } : {},
  );
}

/** 결과를 모으는 기록기 — 마지막에 실패 수를 종료코드로 돌려준다 */
export function recorder(title) {
  const rows = [];
  console.log(`\n═══ ${title} ═══`);
  const log = (name, ok, detail = "") => {
    const r = ok ? "PASS" : "FAIL";
    rows.push({ name, r });
    console.log(`${r} - ${name}${detail ? " :: " + String(detail).slice(0, 110) : ""}`);
  };
  /*
    실패가 있으면 **여기서 종료 코드를 세운다.**

    전에는 실패 수를 돌려주기만 했다. 부르는 쪽이
    `process.exit(finish() ? 1 : 0)` 을 써야 러너에 전달됐는데,
    이번에 새로 만든 세 묶음이 그냥 `finish()` 로 끝나 있었다.
    그래서 그 셋은 몇 건이 실패하든 러너에게 **언제나 '통과'** 였다.

    실제로 v1.4 사진 묶음이 4건 실패한 실행에서 요약은 "전부
    통과했습니다" 라고 찍혔다. 아무도 지키지 않는 안전망이 초록불만
    켜고 있던 셈이다.

    부르는 쪽의 성실함에 기대지 않는다. finish() 가 불리는 순간
    process.exitCode 가 정해지고, 기존처럼 process.exit(...) 을 쓰는
    묶음도 그대로 동작한다.
  */
  const finish = () => {
    const fails = rows.filter((x) => x.r === "FAIL");
    console.log(`\n${title} — 총 ${rows.length}건 · 실패 ${fails.length}건`);
    for (const f of fails) console.log(`   ✗ ${f.name}`);
    if (fails.length > 0) process.exitCode = 1;
    return fails.length;
  };
  return { log, finish, rows };
}

export const bodyText = (p) => p.evaluate(() => document.body.innerText);

export async function go(p, path, wait = 1800) {
  await p.goto(BASE + path, { waitUntil: "networkidle" });
  await p.waitForTimeout(wait);
}

/**
 * 저장소에 극단값을 심는다.
 * 실제 매장 자료는 쓰지 않는다 — 여기 들어가는 이름·메모는 전부 지어낸 값이다.
 */
export const LONG_NAME = "박하늘별님구름햇님보다사랑스러우리";

export async function seedExtremes(p, { big = false, dark = false } = {}) {
  await p.evaluate(
    ({ LONG_NAME, big, dark }) => {
      const raw = localStorage.getItem("jeongtong-ax-v1");
      if (!raw) return;
      const r = JSON.parse(raw);
      if (r.customers?.[0]) {
        r.customers[0].name = LONG_NAME;
        r.customers[0].memo = "가".repeat(400);
      }
      if (r.customers?.[1]) r.customers[1].name = LONG_NAME;
      if (r.memberships?.[0])
        r.memberships[0].programName =
          "정통대왕쑥뜸 프리미엄 스페셜 롱네임 30회권 특별관리 프로그램";
      if (r.visits?.[0]) r.visits[0].note = "나".repeat(300);
      r.settings = r.settings || {};
      if (big) r.settings.fontScale = "large";
      if (dark) r.settings.theme = "dark";
      localStorage.setItem("jeongtong-ax-v1", JSON.stringify(r));
    },
    { LONG_NAME, big, dark },
  );
}
