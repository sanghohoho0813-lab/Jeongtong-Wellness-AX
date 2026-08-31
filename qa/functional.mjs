/**
 * 기능 회귀 — 매일 쓰는 것들을 실제로 눌러 본다
 * ==============================================
 *
 * 여기 있는 항목은 전부 "원장님이 하루에 한 번은 하는 일" 이다.
 * 고객을 찾고, 방문을 적고, 잘못 적은 것을 지웠다 되돌리고, 이용권을 넣고,
 * 관리 기준을 만져 보고, 백업을 받는다.
 *
 * 판정 기준은 화면에 그 단추가 있느냐가 아니라 **누른 뒤 무슨 일이
 * 벌어지느냐** 다. 예를 들어 글자 크기 '크게' 는 단추가 있는지가 아니라
 * 누른 뒤 body 의 실제 글자 크기가 커졌는지로 본다.
 */
import { launch, recorder, bodyText, go, BASE } from "./lib.mjs";

const { log, finish } = recorder("기능 회귀");
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();

const errs = [];
p.on("pageerror", (e) => errs.push(String(e).slice(0, 130)));
p.on("console", (m) => {
  if (m.type() === "error") errs.push("console: " + m.text().slice(0, 120));
});

let t;

// ── 1. 명령 팔레트 — 이름 몇 글자로 고객까지 간다
/*
  찾을 이름을 여기 적어 두지 않는다.

  전에는 "김영희" 를 박아 두었다. 그런데 고객 명부가 매장 실제 자료로
  바뀌면서 그 이름이 사라졌고, 검사는 있지도 않은 사람을 찾다가 실패할
  판이었다. 게다가 실제 고객 이름을 검사 파일에까지 베껴 두면 같은
  개인정보가 저장소 여기저기로 번진다.

  그래서 **화면에 실제로 있는 첫 번째 고객**을 읽어 와 그 이름으로
  찾는다. 명부가 무엇으로 바뀌든 검사는 그대로 돈다.
*/
await go(p, "/customers", 2200);
const someone = await p.evaluate(() => {
  const a = [...document.querySelectorAll('a[href^="/customers/c-"]')][0];
  return (a?.textContent || "").trim().split(/\s|\n/)[0] || "";
});
log("고객 명부에 사람이 있다", someone.length >= 2, someone);

await go(p, "/", 2200);
await p.keyboard.press("Control+k");
await p.waitForTimeout(700);
t = await bodyText(p);
log("팔레트가 열린다", /고객 이름|빠른|검색|찾기|이동/.test(t));
await p.keyboard.type(someone.slice(0, 2));
await p.waitForTimeout(700);
log("고객 이름으로 찾아진다", (await bodyText(p)).includes(someone), someone);
await p.keyboard.press("Enter");
await p.waitForTimeout(2000);
log("눌러서 그 고객으로 간다", /\/customers\//.test(p.url()), p.url().replace(BASE, ""));
await p.keyboard.press("Escape");

// ── 2. 케어 리포트 — 상담 자리에서 함께 보는 화면
await go(p, "/customers/c-01");
const rep = p.getByRole("button", { name: "케어 리포트" });
if ((await rep.count()) > 0) {
  await rep.first().click();
  await p.waitForTimeout(1500);
  t = await bodyText(p);
  log("리포트가 열린다", /케어 기록|함께한 기간/.test(t));
  // 지어낸 확률·전환율을 화면에 쓰지 않는다는 약속을 계속 지키는지
  log("지어낸 확률·전환율이 없다", !/\d+%\s*(확률|전환)/.test(t));
  await p.keyboard.press("Escape");
  await p.waitForTimeout(600);
} else log("리포트 단추가 있다", false);

// ── 3. 방문 기록 수정 · 삭제 · 되돌리기
await go(p, "/customers/c-01");
const beforeVisits = (await bodyText(p)).match(/누적 (\d+)회/)?.[1];
const editBtn = p.getByRole("button", { name: /수정/ }).last();
if ((await editBtn.count()) > 0) {
  await editBtn.click();
  await p.waitForTimeout(1200);
  const dt = await p.locator('[role="dialog"]').last().innerText();
  log("방문 수정 창이 열린다", /방문 일시|기록 유형/.test(dt), dt.slice(0, 46).replace(/\n/g, " "));
  await p.keyboard.press("Escape");
  await p.waitForTimeout(600);
} else log("방문 수정 단추가 있다", false);

const delBtn = p.getByRole("button", { name: /삭제/ }).first();
if ((await delBtn.count()) > 0) {
  await delBtn.click();
  await p.waitForTimeout(1000);
  log("삭제 전에 확인을 묻는다", /삭제/.test(await bodyText(p)));
  const confirm = p.locator('[role="dialog"]').last().getByRole("button", { name: "삭제" });
  if ((await confirm.count()) > 0) {
    await confirm.click();
    await p.waitForTimeout(1500);
    t = await bodyText(p);
    log("삭제 후 되돌리기가 뜬다", /되돌리기/.test(t));
    const undo = p.getByRole("button", { name: "되돌리기" });
    if ((await undo.count()) > 0) {
      await undo.first().click();
      await p.waitForTimeout(2000);
      const after = (await bodyText(p)).match(/누적 (\d+)회/)?.[1];
      log("되돌리면 원래대로", beforeVisits === after, `${beforeVisits} → ${after}`);
    } else log("되돌리기를 누를 수 있다", false);
  }
} else log("방문 삭제 단추가 있다", false);

// ── 3-2. 날짜 선택기가 옳은 쪽을 가리키는가
//   방문은 이미 있었던 일, 다음 관리는 앞으로 잡을 일 — 빠른 선택이 서로 반대여야 한다
await go(p, "/customers/c-01");
await p.getByRole("button", { name: /방문 · 상담 기록/ }).first().click();
await p.waitForTimeout(1200);
{
  const d = p.locator('[role="dialog"]').last();
  await d.getByRole("button", { name: "방문 일시" }).click();
  await p.waitForTimeout(800);
  const chips = await p.evaluate(() =>
    [...document.querySelectorAll('[role="dialog"] button')]
      .map((b) => b.textContent.trim())
      .filter((s) => /^(오늘|어제|\d+일 전|\d+주 전|내일|\d+일 뒤|\d+주 뒤)$/.test(s)),
  );
  log("방문 일시 — 빠른 선택이 지난 쪽을 가리킨다",
      chips.includes("어제") && !chips.some((c) => /뒤$/.test(c)), chips.join(" · "));

  /*
    달력에 '앞날' 칸이 하나도 없는 날이 있다.

    오늘이 그 달의 마지막 날이면 이번 달 격자에 오늘보다 뒤인 날이
    없다. 실제로 8월 31일에 이 검사가 "앞날 0칸" 으로 떨어졌다 —
    막는 기능이 고장 난 것이 아니라 **막을 것이 없었던** 것이다.
    (그 전날 같은 검사는 "앞날 1칸 중 잠김 1칸" 으로 통과했다)

    그래서 앞날 칸이 없으면 다음 달로 넘겨서 본다. 매달 말일마다
    빨갛게 되는 검사는 아무도 안 믿게 되고, 안 믿는 검사는 없는 것만
    못하다.
  */
  const readFuture = () =>
    p.evaluate(() => {
      const today = new Date().toISOString().slice(0, 10);
      return [...document.querySelectorAll('[role="dialog"] button[aria-label]')]
        .map((b) => ({ d: b.getAttribute("aria-label"), off: b.disabled }))
        .filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.d) && x.d > today);
    });

  let future = await readFuture();
  if (future.length === 0) {
    await p.getByRole("button", { name: "다음 달" }).click();
    await p.waitForTimeout(400);
    future = await readFuture();
  }
  log("방문 일시 — 아직 오지 않은 날은 고를 수 없다",
      future.length > 0 && future.every((x) => x.off), `앞날 ${future.length}칸 중 잠김 ${future.filter((x) => x.off).length}칸`);

  await p.getByRole("button", { name: "어제", exact: true }).click();
  await p.waitForTimeout(700);
  const shown = await d.getByRole("button", { name: "방문 일시" }).innerText();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10).replace(/-/g, ".");
  log("'어제' 를 누르면 어제 날짜가 들어간다", shown.includes(yesterday), shown.replace(/\n/g, " "));
}
await p.keyboard.press("Escape");
await p.waitForTimeout(500);
await p.keyboard.press("Escape");
await p.waitForTimeout(700);
await p.getByRole("button", { name: "그냥 닫기" }).click().catch(() => {});
await p.waitForTimeout(700);

await go(p, "/customers");
await p.getByRole("button", { name: /고객 등록/ }).first().click();
await p.waitForTimeout(1100);
{
  await p.locator('[role="dialog"]').last().getByRole("button", { name: "다음 관리 예정일" }).click();
  await p.waitForTimeout(800);
  const chips = await p.evaluate(() =>
    [...document.querySelectorAll('[role="dialog"] button')]
      .map((b) => b.textContent.trim())
      .filter((s) => /^(오늘|어제|\d+일 전|\d+주 전|내일|\d+일 뒤|\d+주 뒤)$/.test(s)),
  );
  log("다음 관리 예정일 — 빠른 선택이 앞쪽을 가리킨다",
      chips.includes("내일") && !chips.some((c) => /전$/.test(c)), chips.join(" · "));
}
await p.keyboard.press("Escape");
await p.waitForTimeout(500);
await p.keyboard.press("Escape");
await p.waitForTimeout(700);
await p.getByRole("button", { name: "그냥 닫기" }).click().catch(() => {});
await p.waitForTimeout(600);

// ── 4. 이용권 — 실제 가격표가 붙어 있는가
await go(p, "/customers/c-01");
const memBtn = p.getByRole("button", { name: /이용권 등록|이용권 추가/ });
if ((await memBtn.count()) > 0) {
  await memBtn.first().click();
  await p.waitForTimeout(1200);
  const dt = await p.locator('[role="dialog"]').last().innerText();
  log("이용권 등록 창이 열린다", /프로그램|횟수|금액/.test(dt));
  log("가격표가 붙어 있다", /45,000|400,000|1,100,000|대왕쑥뜸/.test(dt),
      (dt.match(/[^\n]*원[^\n]*/) || [])[0]);
  await p.keyboard.press("Escape");
} else log("이용권 등록 단추가 있다", false);

// ── 5. 관리 기준 — 저장하기 전에 영향이 실제로 다시 계산되는가
await go(p, "/settings", 2200);
log("관리 기준 칸이 있다", /고객관리 기준|장기 미방문/.test(await bodyText(p)));
const rule = p.getByLabel("장기 미방문 판단 기준");
if ((await rule.count()) > 0) {
  const before = await rule.inputValue();
  const countOf = (s) =>
    (s.match(/오늘 관리 대상은\s*(\d+)명/) ||
      s.match(/오늘 관리 대상이\s*\d+명\s*→\s*(\d+)명/) || [])[1];
  const c0 = countOf(await bodyText(p));
  await rule.fill("3");
  await p.waitForTimeout(1600);
  t = await bodyText(p);
  const c1 = countOf(t);
  log("기준을 바꾸면 대상 수가 실제로 다시 계산된다",
      c0 !== undefined && c1 !== undefined && c0 !== c1, `${c0}명 → ${c1}명`);
  log("아직 저장되지 않았음을 분명히 말한다", /아직\s*저장되지 않았습니다/.test(t));
  log("어느 항목이 몇 명 달라지는지 항목별로 보여 준다",
      /장기 미방문|이용권|재방문|신규/.test(t) && /\d+\s*→\s*\d+/.test(t),
      (t.match(/[^\n]*\d+\s*→\s*\d+[^\n]*/) || [])[0]);
  await rule.fill(before);
  await p.waitForTimeout(800);

  // 숫자칸을 지웠다가 다시 치는 흔한 동작 — 예전에는 옛 숫자로 되돌아왔다
  await rule.click();
  await p.keyboard.press("Control+a");
  await p.keyboard.press("Backspace");
  await p.waitForTimeout(400);
  log("숫자칸을 전부 지울 수 있다", (await rule.inputValue()) === "");
  await p.keyboard.type("45");
  await p.waitForTimeout(500);
  log("지운 뒤 새로 칠 수 있다", (await rule.inputValue()) === "45");
  await rule.fill(before);
} else log("관리 기준 입력칸이 있다", false);

// ── 6. 백업 · 복원
await go(p, "/settings");
t = await bodyText(p);
log("백업 내려받기가 있다", /백업/.test(t));
log("가져오기가 있다", /가져오기|불러오기|복원/.test(t));
const fileInputs = await p.locator('input[type="file"]').count();
log("파일 선택칸이 실제로 있다", fileInputs > 0, `${fileInputs}개`);

// ── 7. 화면 설정 — 눌러서 실제로 바뀌는가
await go(p, "/settings");
t = await bodyText(p);
log("글자 크기 설정을 찾을 수 있다", /작게[\s\S]{0,20}기본[\s\S]{0,20}크게/.test(t));
log("화면 밝기 설정을 찾을 수 있다", /밝게|어둡게|테마|밝기/.test(t));
const beforeSize = await p.evaluate(() => getComputedStyle(document.body).fontSize);
await p.getByRole("button", { name: "크게", exact: true }).first().click();
await p.waitForTimeout(900);
const scale = await p.evaluate(() => document.documentElement.dataset.fontScale || "");
const afterSize = await p.evaluate(() => getComputedStyle(document.body).fontSize);
log("'크게' 를 누르면 글자가 실제로 커진다",
    scale === "large" && parseFloat(afterSize) > parseFloat(beforeSize),
    `${beforeSize} → ${afterSize} (${scale})`);
await p.getByRole("button", { name: "기본", exact: true }).first().click();
await p.waitForTimeout(700);

// ── 8. 나머지 화면이 실제로 그려지는가
for (const [path, needle] of [
  ["/retention", "재방문"],
  ["/visits", "방문"],
  ["/service", "서비스 표준"],
  ["/analytics", "AX 도입성과"],
  ["/branches", "지점"],
  ["/guide", "사용 가이드"],
  ["/intro", "기획"],
  ["/more", "더보기"],
]) {
  await go(p, path);
  log(`${path} 가 그려진다`, new RegExp(needle).test(await bodyText(p)));
}

// ── 9. 새 고객 한 바퀴
await go(p, "/customers");
await p.getByRole("button", { name: /고객 등록/ }).first().click();
await p.waitForTimeout(1200);
const form = p.locator('[role="dialog"]').last();
await form.locator("input").first().fill("감사테스트");
const phone = form
  .locator('input[inputmode="tel"], input[inputmode="numeric"], input[type="tel"]')
  .first();
if ((await phone.count()) > 0) await phone.fill("01099998888");
await form.getByRole("button", { name: "고객 등록", exact: true }).last().click();
await p.waitForTimeout(2500);
log("새 고객이 등록된다", /\/customers\/c-/.test(p.url()), p.url().replace(BASE, ""));
log("등록 직후 화면이 비어 보이지 않는다", /첫 기록|방문 · 상담 기록/.test(await bodyText(p)));

log("자바스크립트 오류 없음", errs.length === 0, errs.slice(0, 2).join(" | "));

await browser.close();
process.exit(finish() ? 1 : 0);
