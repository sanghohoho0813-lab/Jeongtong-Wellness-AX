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


/* ── 예시 화면 — 막다른 길이 없는가 ───────────────────────── */
/*
  매장 시스템이 연결되기 전에는 고객 화면이 이 한 장이었다.

      아직 연결 준비 중입니다
      고객 화면은 매장 시스템과 연결된 뒤에 열립니다.

  사실이긴 했지만, 보러 온 분은 이 서비스가 무엇인지 알 방법 없이
  되돌아갔다. 이제는 예시 자료로 전부 열린다.

  여기서 보는 것은 두 가지다.

    ① 어느 화면도 막다른 길이 아니다   — 열리고, 내용이 있다
    ② 예시라는 사실이 화면에 적혀 있다 — 보는 분이 자기 기록으로
                                         착각하는 것이 가장 나쁜 실패다

  ②가 없으면 ①은 오히려 해롭다. 그래서 둘을 늘 같이 본다.
*/
const PORTAL_PAGES = [
  ["/my", "홈"],
  ["/my/booking", "예약"],
  ["/my/passes", "이용권"],
  ["/my/care", "케어기록"],
  ["/my/account", "마이페이지"],
  ["/my/request", "상담 문의"],
  ["/my/visits", "이용 기록"],
  ["/my/wellness", "웰니스"],
  ["/my/content", "콘텐츠"],
  ["/my/more", "더보기"],
];

for (const [path, name] of PORTAL_PAGES) {
  await go(p, path, 900);
  const r = await p.evaluate(() => {
    const t = (document.body.innerText || "").replace(/\s+/g, " ");
    return {
      chars: t.length,
      blocked: /아직 연결 준비 중/.test(t),
      banner: /예시 화면입니다/.test(t),
    };
  });
  log(
    `${name} — 막다른 길이 아니다`,
    !r.blocked && r.chars > 200,
    `${r.chars}자${r.blocked ? " · 연결 안내 한 장뿐" : ""}`,
  );
  log(`${name} — 예시라고 적혀 있다`, r.banner);
}

/*
  "예시입니다" 만 적어 두면 보는 분의 다음 질문이 갈 곳이 없다 —
  그럼 실제로는 어떻게 되는 건데? 그 답이 한 번 눌러서 닿아야 한다.
*/
await go(p, "/my", 900);
await p.getByRole("button", { name: "어떻게 이용하게 되나요" }).first().click();
await p.waitForTimeout(700);
const guide = await p.evaluate(() => {
  const d = document.querySelector('[role="dialog"]');
  if (!d) return null;
  const t = (d.innerText || "").replace(/\s+/g, " ");
  return {
    chars: t.length,
    start: /어떻게 시작하나/.test(t),
    loop: /다니시는 동안/.test(t),
    build: /어떻게 만들어지고 있나/.test(t),
    // 근거 없는 숫자를 적지 않았는가 (몇 명 · 몇 % · 언제 열림)
    numbers: (t.match(/\d+\s*(%|퍼센트|명|배)/g) || []).join(", "),
  };
});
log("예시 띠에서 이용 안내가 열린다", !!guide);
log("이용 안내 — 시작하는 순서가 있다", !!guide?.start);
log("이용 안내 — 다니시는 동안이 있다", !!guide?.loop);
log("이용 안내 — 만드는 방식이 있다", !!guide?.build);
log(
  "이용 안내 — 근거 없는 숫자를 적지 않았다",
  guide?.numbers === "",
  guide?.numbers || "없음",
);

/*
  예시에서 남긴 것이 "매장에 전달되었다" 고 말하면 그건 거짓말이다.
  화면 맨 위 띠가 예시라고 말하고 있어도, 방금 누른 단추 바로 밑
  문장이 반대로 말하면 사람은 가까운 쪽을 믿는다.
*/
await go(p, "/my/request", 900);
await p.getByRole("button", { name: "문의" }).click();
await p.locator("textarea").first().fill("예시 점검");
await p.getByRole("button", { name: "요청 남기기" }).click();
await p.waitForTimeout(900);
const said = await p.evaluate(() =>
  (document.body.innerText || "").replace(/\s+/g, " "),
);
log(
  "예시에서 남긴 뒤 — 전달되지 않았다고 말한다",
  /전달되지는 않았습니다/.test(said),
  said.slice(0, 0) || "",
);
log("예시에서 남긴 뒤 — 남긴 것이 목록에 보인다", /예시 점검/.test(said));

await browser.close();
finish();
