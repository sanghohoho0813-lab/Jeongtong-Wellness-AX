/**
 * 고객 화면(MY WELLNESS) — 실제 로그인 상태로 들여다본다
 * =======================================================
 *
 * 이 묶음만 계정이 필요하다. 그래서 `npm run qa` 에는 들어 있지 않다.
 * 실제 Supabase 에 붙어 실제 RLS 를 지나므로, 여기서 통과한다는 것은
 * "그 고객에게 그 자료가 실제로 보인다" 는 뜻이다.
 *
 *   QA_PORTAL_EMAIL=... QA_PORTAL_PASSWORD=... QA_SUPABASE_URL=... \
 *   QA_SUPABASE_KEY=... QA_BASE=http://localhost:4403 node qa/portal.mjs
 *
 * 계정과 열쇠는 저장소에 넣지 않는다. 점검용 계정을 따로 만들고
 * (실제 고객 계정을 쓰지 않는다), 끝나면 지우는 것을 권한다.
 *
 * 로그인은 node 가 대신 받아 브라우저 저장소에 심는다. 고객 로그인은
 * 이메일로 오는 숫자 여섯 자리인데 점검 중에 메일함을 열 수는 없기 때문이다.
 * 심는 것은 세션뿐이고, 그 뒤의 모든 조회는 앱이 스스로 한다.
 */
import { launch, recorder, go, BASE } from "./lib.mjs";

const URL = process.env.QA_SUPABASE_URL;
const KEY = process.env.QA_SUPABASE_KEY;
const EMAIL = process.env.QA_PORTAL_EMAIL;
const PASSWORD = process.env.QA_PORTAL_PASSWORD;

if (!URL || !KEY || !EMAIL || !PASSWORD) {
  console.log(
    "\n고객 화면 점검을 건너뜁니다 — 계정이 주어지지 않았습니다.\n" +
      "  QA_SUPABASE_URL · QA_SUPABASE_KEY · QA_PORTAL_EMAIL · QA_PORTAL_PASSWORD\n",
  );
  process.exit(0);
}

const res = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: KEY, "content-type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const sess = await res.json();
if (!sess.access_token) {
  console.error("로그인하지 못했습니다:", JSON.stringify(sess).slice(0, 200));
  process.exit(2);
}

const big = process.argv.includes("--big");
const dark = process.argv.includes("--dark");
const { log, finish } = recorder(
  `고객 화면 (390px · ${big ? "큰글씨" : "기본글씨"}${dark ? "·어두움" : ""})`,
);

const browser = await launch();
const p = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(String(e).slice(0, 130)));

await go(p, "/my", 1500);
await p.evaluate(
  ({ sess, big, dark }) => {
    localStorage.setItem(
      "jeongtong-my-auth",
      JSON.stringify({
        access_token: sess.access_token,
        refresh_token: sess.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + sess.expires_in,
        expires_in: sess.expires_in,
        token_type: "bearer",
        user: sess.user,
      }),
    );
    if (big || dark) {
      try {
        const s = JSON.parse(localStorage.getItem("jeongtong-my-view") || "{}");
        if (big) s.fontScale = "large";
        if (dark) s.theme = "dark";
        localStorage.setItem("jeongtong-my-view", JSON.stringify(s));
      } catch {
        /* 화면 설정이 없어도 점검은 이어 간다 */
      }
    }
  },
  { sess, big, dark },
);

/** 자료에 절대 나오면 안 되는 말 — 여기는 의료가 아니라 웰니스다 */
const BANNED = /치료|치유|환자|질환|진단|처방|효능/;

for (const [path, label] of [
  ["/my", "홈"],
  ["/my/wellness", "웰니스"],
  ["/my/visits", "이용기록"],
  ["/my/content", "콘텐츠"],
  ["/my/request", "문의"],
  ["/my/more", "더보기"],
]) {
  await go(p, path, 2200);
  const r = await p.evaluate(() => {
    const W = document.documentElement.clientWidth;
    const bleed = [];
    for (const el of document.querySelectorAll("body *")) {
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height || box.right <= W + 1) continue;
      let scrollable = false;
      for (let a = el.parentElement; a; a = a.parentElement) {
        const s = getComputedStyle(a);
        if (s.overflowX === "auto" || s.overflowX === "scroll") { scrollable = true; break; }
      }
      if (scrollable || /건너뛰기/.test(el.textContent || "")) continue;
      bleed.push(`${el.tagName} "${(el.textContent || "").trim().slice(0, 14)}"`);
    }
    const small = [];
    for (const el of document.querySelectorAll("button, a, input, select, [role='button']")) {
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none") continue;
      if (box.width <= 2 || box.height <= 2) continue;
      if (s.display.includes("inline") && el.closest("p, li")) continue;
      if (Math.min(box.width, box.height) >= 24 && box.width * box.height >= 44 * 44) continue;
      small.push(`${el.tagName} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 14)}" ${Math.round(box.width)}×${Math.round(box.height)}`);
    }
    const t = (document.querySelector("main") || document.body).innerText;
    return {
      over: document.documentElement.scrollWidth - W,
      bleed: [...new Set(bleed)],
      small: [...new Set(small)],
      len: t.trim().length,
      broken: (t.match(/NaN|Infinity|undefined/) || [])[0] || "",
      text: t,
    };
  });

  log(`${label} — 내용이 실제로 그려진다`, r.len > 60, `${r.len}자`);
  log(`${label} — 가로로 밀리지 않는다`, r.over === 0, `${r.over}px`);
  log(`${label} — 화면 밖으로 나간 조각이 없다`, r.bleed.length === 0, r.bleed.slice(0, 3).join(" | "));
  log(`${label} — 손가락이 닿는 크기다`, r.small.length === 0, r.small.slice(0, 3).join(" | "));
  log(`${label} — 깨진 값이 없다`, !r.broken, r.broken);
  log(`${label} — 의료 표현을 쓰지 않는다`, !BANNED.test(r.text), (r.text.match(BANNED) || [])[0]);
}

log("자바스크립트 오류 없음", errs.length === 0, errs.slice(0, 2).join(" | "));
console.log(`   (기준 ${BASE})`);

await browser.close();
process.exit(finish() ? 1 : 0);
