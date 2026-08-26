/**
 * 키보드만으로 끝까지 — 창이 열리면 손이 갇히고, ESC 로 나오고, 제자리로 돌아온다
 * ==============================================================================
 *
 * 마우스를 못 쓰는 상황은 생각보다 흔하다. 화면 낭독기를 쓰는 경우도 있고,
 * 그냥 한 손에 서류를 든 채 키보드만 두드리는 경우도 있다.
 *
 * 창(모달)에서 특히 잘 깨진다. 초점이 창 밖 배경에 남아 있으면 Tab 을 눌러도
 * 창이 아니라 뒤쪽 화면을 돌아다니게 되고, 낭독기는 창이 열린 줄도 모른다.
 */
import { launch, recorder, go } from "./lib.mjs";

const { log, finish } = recorder("키보드 · 초점");
const browser = await launch();
const p = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(String(e).slice(0, 130)));

const focus = () =>
  p.evaluate(() => {
    const a = document.activeElement;
    if (!a) return { tag: "none", inDialog: false, label: "" };
    return {
      tag: a.tagName,
      label: (a.getAttribute("aria-label") || a.textContent || "").trim().slice(0, 26),
      inDialog: !!a.closest('[role="dialog"]'),
    };
  });

const MODALS = [
  ["/customers/c-01", "방문 · 상담 기록", "방문 기록 창"],
  ["/customers/c-01", "이용권 등록", "이용권 등록 창"],
  ["/customers", "고객 등록", "고객 등록 창"],
];

for (const [path, btnName, label] of MODALS) {
  await go(p, path);
  const btn = p.getByRole("button", { name: new RegExp(btnName) }).first();
  if ((await btn.count()) === 0) {
    log(`${label} — 여는 단추가 있다`, false);
    continue;
  }
  await btn.click();
  await p.waitForTimeout(1000);

  const opened = await p.locator('[role="dialog"]').count();
  log(`${label} — 열린다`, opened > 0);
  if (!opened) continue;

  const w0 = await focus();
  log(`${label} — 열자마자 초점이 창 안에`, w0.inDialog, JSON.stringify(w0));

  let leaked = false;
  for (let i = 0; i < 40 && !leaked; i++) {
    await p.keyboard.press("Tab");
    leaked = !(await focus()).inDialog;
  }
  log(`${label} — Tab 이 창 밖으로 새지 않는다`, !leaked, leaked ? "밖으로 나감" : "40번 눌러도 창 안");

  let back = false;
  for (let i = 0; i < 20 && !back; i++) {
    await p.keyboard.press("Shift+Tab");
    back = !(await focus()).inDialog;
  }
  log(`${label} — Shift+Tab 도 창 안`, !back);

  await p.keyboard.press("Escape");
  await p.waitForTimeout(800);
  log(`${label} — ESC 로 닫힌다`, (await p.locator('[role="dialog"]').count()) === 0);

  const w1 = await focus();
  log(`${label} — 닫으면 초점이 눌렀던 단추로 돌아온다`,
      /방문|이용권|고객|등록|기록/.test(w1.label), JSON.stringify(w1));
}

// ── 명령 팔레트
await go(p, "/");
await p.keyboard.press("Control+k");
await p.waitForTimeout(700);
const pal = await p.evaluate(() => ({
  tag: document.activeElement?.tagName,
  placeholder: document.activeElement?.getAttribute("placeholder"),
}));
log("명령 팔레트 — 열자마자 검색칸에 초점", pal.tag === "INPUT", JSON.stringify(pal));
await p.keyboard.press("ArrowDown");
await p.waitForTimeout(300);
log("명령 팔레트 — 화살표로 항목이 움직인다",
    await p.evaluate(() => !!document.querySelector('[aria-selected="true"], [data-active="true"], .bg-aqua-50')));
await p.keyboard.press("Escape");
await p.waitForTimeout(500);

// ── 건너뛰기 링크 — 첫 Tab 에 보여야 의미가 있다
await go(p, "/");
await p.keyboard.press("Tab");
const skip = await p.evaluate(() => {
  const a = document.activeElement;
  const r = a?.getBoundingClientRect();
  return { txt: (a?.textContent || "").trim(), visible: !!r && r.top >= 0 && r.height > 0 };
});
log("첫 Tab 에 '본문으로 건너뛰기' 가 보인다",
    /건너뛰기/.test(skip.txt) && skip.visible, JSON.stringify(skip));

// ── 입력칸에 이름이 붙어 있는가 (낭독기가 읽을 이름)
for (const path of ["/customers", "/settings", "/visits"]) {
  await go(p, path, 2000);
  const unnamed = await p.evaluate(() =>
    [...document.querySelectorAll("input, select, textarea")].filter((el) => {
      if (el.type === "hidden") return false;
      if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return false;
      if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return false;
      return !el.closest("label");
    }).length,
  );
  log(`${path} — 이름 없는 입력칸이 없다`, unnamed === 0, `${unnamed}개`);
}

log("자바스크립트 오류 없음", errs.length === 0, errs.slice(0, 2).join(" | "));

await browser.close();
process.exit(finish() ? 1 : 0);
