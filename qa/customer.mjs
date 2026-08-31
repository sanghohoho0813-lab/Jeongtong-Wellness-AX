/**
 * 고객이 보는 화면 — 새어 나가면 안 되는 것들
 * ============================================
 *
 * 고객 화면에서 지켜야 할 약속이 셋 있는데, 셋 다 눈으로만 보면 놓친다.
 * 화면이 멀쩡해 보여도 아래쪽 어딘가에 딱 한 줄이 섞여 있으면 그걸로
 * 약속이 깨지기 때문이다. 그래서 사람 눈 대신 글자를 뒤진다.
 *
 *   1) 남의 자료      — 고객 화면에 다른 고객의 이름이 있으면 안 된다
 *   2) 내부 업무 낱말 — 'Priority', '매출기회', '관리 대상' 같은 말은
 *                       직원이 쓰는 말이다. 고객이 볼 자리가 아니다
 *   3) 의료 표현      — 치료 · 치유 · 환자 · 질환 · 진단 · 처방 · 효능.
 *                       우리는 온열 웰니스 케어를 제공하는 매장이지
 *                       의료기관이 아니다
 *
 * 왜 이걸로는 '권한 점검' 이 되지 않는가
 * --------------------------------------
 * 이 점검은 시연 빌드(NEXT_PUBLIC_DEMO_MODE=1) 위에서 돈다. 그 빌드에는
 * 로그인 게이트가 열려 있고, 화면에 있는 것은 이 기기 안에서 만든
 * 견본 자료뿐이다. 그러니 여기서 확인되는 것은 **화면이 무엇을 그리는가**
 * 까지고, "다른 고객 행을 서버가 내주지 않는가" 는 확인되지 않는다.
 * 그쪽은 Supabase RLS 의 몫이고, 실제 계정 두 개(A·B)로 따로 확인해야 한다.
 * 그 점검은 qa/portal.mjs 가 계정을 받았을 때 수행한다.
 */
import { launch, recorder, go } from "./lib.mjs";

const { log, finish } = recorder("고객 화면 (새어 나가는 것)");
const browser = await launch();
const p = await (
  await browser.newContext({ viewport: { width: 390, height: 844 } })
).newPage();

/**
 * '다른 사람들' — 직원 화면에 있는 고객 이름 전부.
 *
 * 전에는 다섯 명을 손으로 적어 두었다. 그런데 명부가 매장 실제 자료로
 * 바뀌면서 그 다섯이 사라졌고, 검사는 **없는 이름을 못 찾았다고
 * 통과**하게 되었다. 아무것도 지키지 않으면서 초록불만 켜는 검사다.
 *
 * 게다가 이제는 진짜 사람들의 이름이다. 그래서 더더욱 손으로 베껴
 * 적으면 안 된다 — 같은 개인정보가 검사 파일로 또 번진다.
 *
 * 직원 화면의 고객 목록에서 **그때그때 읽어 온다.** 명부가 무엇으로
 * 바뀌든 "고객 화면에 남의 이름이 있는가" 를 실제로 지킨다.
 */
async function loadOtherNames(page) {
  await go(page, "/customers");
  const names = await page.evaluate(() =>
    [...document.querySelectorAll('a[href^="/customers/c-"]')]
      .map((a) => (a.textContent || "").trim().split(/\s|\n/)[0])
      .filter((n) => n.length >= 2),
  );
  return [...new Set(names)];
}

/** 직원이 쓰는 말 */
const INTERNAL = [
  "Priority",
  "우선순위 점수",
  "매출기회",
  "재등록 기회",
  "관리 대상",
  "실행 브리핑",
  "AX 도입성과",
];

/**
 * 쓰지 않기로 한 의료 표현.
 *
 * '치료' 는 '관리' 로, '환자' 는 '고객' 으로, '효능' 은 말하지 않는 것으로
 * 이미 정해 두었다. 여기서 걸리면 그 규칙이 어딘가에서 새어 나온 것이다.
 */
const MEDICAL = [
  "치료",
  "치유",
  "환자",
  "질환",
  "진단",
  "처방",
  "효능",
  "의료 시술",
];

const PAGES = [
  "/welcome",
  "/my",
  "/my/passes",
  "/my/care",
  "/my/booking",
  "/my/account",
  "/my/wellness",
  "/my/content",
];

const OTHERS = await loadOtherNames(p);
log("직원 화면에서 고객 이름을 읽어 왔다", OTHERS.length > 0, `${OTHERS.length}명`);

for (const path of PAGES) {
  await go(p, path);
  const text = await p.evaluate(() => document.body.innerText);

  const others = OTHERS.filter((n) => text.includes(n));
  log(`${path} — 다른 고객의 이름이 없다`, others.length === 0, others.join(", "));

  const internal = INTERNAL.filter((w) => text.includes(w));
  log(
    `${path} — 직원이 쓰는 낱말이 없다`,
    internal.length === 0,
    internal.join(", "),
  );

  const medical = MEDICAL.filter((w) => text.includes(w));
  log(
    `${path} — 쓰지 않기로 한 의료 표현이 없다`,
    medical.length === 0,
    medical.join(", "),
  );
}

/*
  화면 전환 스위치는 권한이 아니다.

  스위치를 그릴지 정하는 값(jt.staff-device)은 브라우저 저장소에만 있고,
  손으로 써 넣어도 얻는 것은 '버튼이 하나 더 보인다' 뿐이어야 한다.
  여기서는 그 값이 저장소 바깥(쿠키·주소·헤더)으로 나가지 않는지를 본다 —
  나가는 순간 서버가 그 값을 믿을 여지가 생기기 때문이다.
*/
await go(p, "/my");
const forged = await p.evaluate(() => {
  window.localStorage.setItem("jt.staff-device", "1");
  return { cookie: document.cookie, url: location.href };
});
log(
  "전환 스위치 표시 값이 쿠키로 나가지 않는다",
  !forged.cookie.includes("staff-device"),
  forged.cookie || "쿠키 없음",
);
log(
  "전환 스위치 표시 값이 주소로 나가지 않는다",
  !forged.url.includes("staff-device"),
  forged.url,
);

await browser.close();
finish();
