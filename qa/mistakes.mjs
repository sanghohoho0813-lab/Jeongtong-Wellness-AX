/**
 * 사람이 실제로 저지르는 실수 — 그때 시스템이 어떻게 구는가
 * ==========================================================
 *
 * 기능이 되는지가 아니라, **잘못 눌렀을 때 무엇을 잃는지**를 본다.
 *
 * 실제로 이랬다. 방문 기록에 상담 내용을 한참 적다가 창 바깥을 스치듯
 * 눌렀더니 창이 닫히고 적은 것이 전부 사라졌다. 다시 열면 빈 칸이었고,
 * 아무 말도 없었다. 매장에서 이건 "그날 상담 내용을 통째로 잃는" 일이다.
 */
import { launch, recorder, go, BASE } from "./lib.mjs";

const { log, finish } = recorder("사람이 하는 실수");
const browser = await launch();
const p = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(String(e).slice(0, 130)));

const dialogs = () => p.locator('[role="dialog"]').count();
const asked = async () => /적으신 내용이 사라집니다/.test(await p.evaluate(() => document.body.innerText));
const openNew = async () => {
  await p.getByRole("button", { name: /고객 등록/ }).first().click();
  await p.waitForTimeout(1000);
};

// ── 손대지 않은 창은 지금까지처럼 조용히 닫힌다
await go(p, "/customers", 2200);
await openNew();
await p.mouse.click(20, 500);
await p.waitForTimeout(900);
log("손대지 않은 창은 바깥을 누르면 그냥 닫힌다", (await dialogs()) === 0);

// ── 적다 만 것이 있으면 물어본다
await openNew();
await p.locator('[role="dialog"]').last().locator("input").first().fill("적다만이름");
await p.waitForTimeout(300);
await p.mouse.click(20, 500);
await p.waitForTimeout(900);
log("적다 만 것이 있으면 바깥을 눌러도 바로 닫지 않고 물어본다", await asked());
log("물어보는 동안 창은 그대로 있다", (await dialogs()) > 0);

await p.getByRole("button", { name: "계속 작성" }).click();
await p.waitForTimeout(700);
const kept = await p.locator('[role="dialog"]').last().locator("input").first().inputValue();
log("'계속 작성' 을 누르면 적은 것이 그대로 남는다", kept === "적다만이름", JSON.stringify(kept));

await p.keyboard.press("Escape");
await p.waitForTimeout(700);
log("ESC 로 닫으려 해도 물어본다", await asked());
await p.keyboard.press("Escape");
await p.waitForTimeout(700);
log("물어보는 중 ESC 는 '계속 작성' 이다", !(await asked()) && (await dialogs()) > 0);

await p.keyboard.press("Escape");
await p.waitForTimeout(700);
await p.getByRole("button", { name: "그냥 닫기" }).click();
await p.waitForTimeout(900);
log("'그냥 닫기' 를 고르면 닫힌다", (await dialogs()) === 0);

// ── 저장하고 닫는 길은 묻지 않는다
await openNew();
{
  const d = p.locator('[role="dialog"]').last();
  await d.locator("input").first().fill("문지기테스트");
  const ph = d.locator('input[inputmode="tel"]').first();
  if (await ph.count()) await ph.fill("01033334444");
  await d.getByRole("button", { name: "고객 등록", exact: true }).last().click();
  await p.waitForTimeout(2300);
}
log("저장하고 닫을 때는 묻지 않는다", !(await asked()));
log("저장하면 그 고객 화면으로 간다", /\/customers\/c-/.test(p.url()), p.url().replace(BASE, ""));

// ── 입력칸이 없는 확인 창은 그대로 닫힌다
await go(p, "/customers/c-01", 2000);
const del = p.getByRole("button", { name: /기록 삭제/ }).first();
if ((await del.count()) > 0) {
  await del.click();
  await p.waitForTimeout(900);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(800);
  log("입력칸 없는 확인 창은 ESC 로 그냥 닫힌다", (await dialogs()) === 0);
} else log("삭제 확인 창을 열 수 있다", false);

// ── 같은 사람을 두 번 등록하려 하면 알려 준다
const register = async (name, tel) => {
  await go(p, "/customers", 1800);
  await openNew();
  const d = p.locator('[role="dialog"]').last();
  await d.locator("input").first().fill(name);
  const ph = d.locator('input[inputmode="tel"]').first();
  if (await ph.count()) await ph.fill(tel);
  await p.waitForTimeout(500);
  const warn = (await d.innerText()).match(/[^\n]*(이미|중복)[^\n]*/)?.[0] ?? "";
  await d.getByRole("button", { name: "고객 등록", exact: true }).last().click();
  await p.waitForTimeout(2200);
  return warn;
};
await register("중복테스트", "01077778888");
const warn = await register("중복테스트", "01077778888");
log("같은 연락처를 다시 넣으면 저장 전에 알려 준다", /이미|중복/.test(warn), warn);

log("자바스크립트 오류 없음", errs.length === 0, errs.slice(0, 2).join(" | "));

await browser.close();
process.exit(finish() ? 1 : 0);
