/**
 * 안내 영상 — 누르면 그 영상만 나오고, 정말 틀어지는가
 * ===================================================
 *
 * 영상은 "화면에 네모가 있다" 로는 아무것도 확인한 게 아니다.
 * 파일이 404 여도 <video> 는 검은 네모로 멀쩡히 그려진다. 그래서 여기서는
 *
 *   - 목차의 '사용법' 을 누르면 사용법 영상 **하나만**, '기술 소개' 를
 *     누르면 기술 소개 영상 **하나만** 나오는가 (한 화면에 둘을 두지 않는다)
 *   - 한 편마다 세로(9:16) · 가로(16:9) 파일이 둘 다 내려오는가,
 *     크기가 1080×1920 · 1920×1080 인가, 길이가 화면 표기와 맞는가
 *   - 세로 · 가로 단추가 파일과 화면 비율을 바꾸는가, 고른 비율을 기억하는가
 *   - 재생 속도 1 · 1.25 · 1.5배가 실제 재생 속도에 걸리는가 (비율을
 *     바꿔도 그대로인가)
 *   - 영상 흐름을 누르면 그 장면으로 가는가
 *   - 내려받기 단추가 두 비율 다 있고, 적힌 용량이 실제 파일과 맞는가
 *   - 예전 주소(/videos#tech)는 기술 소개 화면으로 넘어가는가
 *   - 폰에서 넘치지 않는가, 더보기에서 찾을 수 있는가, 직원도 볼 수 있는가
 *
 * 를 본다.
 */
import { launch, recorder, go, BASE } from "./lib.mjs";

const { log, finish } = recorder("안내 영상 (틀어지는가)");
const browser = await launch();
const errs = [];

const FILES = {
  guide: { "9x16": "/videos/guide.mp4", "16x9": "/videos/guide-wide.mp4" },
  tech: { "9x16": "/videos/tech.mp4", "16x9": "/videos/tech-wide.mp4" },
};
const SIZE = { "9x16": [1080, 1920], "16x9": [1920, 1080] };

// ── 1. 파일 자체 ──
for (const [id, byRatio] of Object.entries(FILES)) {
  for (const [ratio, path] of Object.entries(byRatio)) {
    const res = await fetch(BASE + path, { headers: { Range: "bytes=0-1023" } });
    log(
      `${id} ${ratio} 파일이 내려온다 (video/mp4 · 이어받기 가능)`,
      (res.status === 206 || res.status === 200) &&
        (res.headers.get("content-type") || "").includes("video/mp4"),
      `${path} ${res.status} ${res.headers.get("content-type")}`,
    );
  }
}
for (const path of ["/videos/guide-poster.jpg", "/videos/tech-poster.jpg", "/videos/guide-wide-poster.jpg", "/videos/tech-wide-poster.jpg"]) {
  const res = await fetch(BASE + path);
  log(`첫 장면 그림 ${path} 이 있다`, res.ok, String(res.status));
}

/*
  길이 · 크기는 파일 안의 mvhd · tkhd 상자를 직접 읽는다.

  이 검사용 크로미움은 오픈소스 빌드라 H.264 를 **틀지 못한다**
  (canPlayType 이 빈 문자열). 실제 크롬 · 사파리 · 삼성 인터넷은 튼다.
  그래서 브라우저에게 묻지 않고 파일을 읽는다 — 어느 브라우저로 돌려도
  같은 답이 나온다.
*/
async function mp4Info(path) {
  const buf = Buffer.from(await (await fetch(BASE + path)).arrayBuffer());
  const at = (tag, from = 0) => buf.indexOf(Buffer.from(tag), from);
  const mv = at("mvhd");
  const v1 = buf[mv + 4] === 1;
  const scale = buf.readUInt32BE(mv + (v1 ? 24 : 16));
  const dur = v1 ? Number(buf.readBigUInt64BE(mv + 28)) : buf.readUInt32BE(mv + 20);
  let w = 0, h = 0;
  for (let i = at("tkhd"); i > 0; i = at("tkhd", i + 4)) {
    const end = i - 4 + buf.readUInt32BE(i - 4);
    const tw = buf.readUInt32BE(end - 8) / 65536, th = buf.readUInt32BE(end - 4) / 65536;
    if (tw && th) { w = tw; h = th; }
  }
  return { d: dur / scale, w, h, bytes: buf.length };
}
const info = {};
for (const [id, byRatio] of Object.entries(FILES)) {
  info[id] = {};
  for (const [ratio, path] of Object.entries(byRatio)) info[id][ratio] = await mp4Info(path);
}

// ── 2. PC — 왼쪽 목차 ──
const pc = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
pc.on("pageerror", (e) => errs.push(String(e).slice(0, 120)));
await go(pc, "/", 1200);

const side = pc.locator("aside [data-sidebar-videos] a");
log("왼쪽 목차에 영상 단추가 둘 있다", (await side.count()) === 2);
const sideText = (await side.allInnerTexts()).join(" ");
const sideNames = (await side.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).join(" ");
log("단추 이름 — 사용법 · 기술 소개 (읽어 주는 이름은 '영상' 과 길이까지)", /사용법/.test(sideText) && /기술 소개/.test(sideText) && /사용법 영상 \d+분 \d+초/.test(sideNames) && /기술 소개 영상 \d+분 \d+초/.test(sideNames), sideText + " / " + sideNames);
log(
  "단추는 각자 자기 화면으로 간다 (/videos/guide · /videos/tech)",
  JSON.stringify(await side.evaluateAll((els) => els.map((e) => e.getAttribute("href")))) === JSON.stringify(["/videos/guide", "/videos/tech"]),
);
const navBottom = await pc.evaluate(() => {
  const a = [...document.querySelectorAll("aside nav a")].pop();
  const n = document.querySelector("aside nav");
  return { a: a.getBoundingClientRect().bottom, n: n.getBoundingClientRect().bottom };
});
log("900px 높이 PC 에서 목차 넷이 스크롤 없이 다 보인다", navBottom.a <= navBottom.n + 1, JSON.stringify(navBottom));
log("목차 넷은 그대로다 (영상 단추는 목차 줄이 아니다)", (await pc.locator("aside nav a").count()) === 4);

for (const [id, name, other] of [["tech", "기술 소개", "guide"], ["guide", "사용법", "tech"]]) {
  await side.filter({ hasText: name }).click();
  await pc.waitForURL(new RegExp(`/videos/${id}$`), { timeout: 8000 }).catch(() => {});
  await pc.waitForTimeout(1200);
  log(`'${name}' 단추 → /videos/${id}`, pc.url().endsWith(`/videos/${id}`), pc.url());
  const vids = await pc.evaluate(() => [...document.querySelectorAll("video[data-video]")].map((v) => v.dataset.video));
  log(`'${name}' 화면에는 ${name} 영상 하나만 있다`, vids.length === 1 && vids[0] === id, JSON.stringify(vids));
  log(
    `'${name}' 화면에 다른 영상의 흔적이 없다 (${other})`,
    (await pc.locator(`[data-video-page="${other}"], video[data-video="${other}"]`).count()) === 0,
  );
  const cur = await side.evaluateAll((els) => els.map((e) => e.getAttribute("aria-current")));
  log(`목차에서 '${name}' 단추만 칠해진다`, cur[id === "guide" ? 0 : 1] === "page" && cur[id === "guide" ? 1 : 0] === null, JSON.stringify(cur));
  const titleSeen = await pc.evaluate(() => {
    const h = document.getElementById("video-title").getBoundingClientRect();
    const cover = document.elementFromPoint(h.left + 30, h.top + h.height / 2);
    return { top: Math.round(h.top), seen: !!cover?.closest("#video-title") };
  });
  log(`'${name}' 제목이 화면 안에, 가려지지 않고 보인다`, titleSeen.top > 0 && titleSeen.top < 400 && titleSeen.seen, JSON.stringify(titleSeen));

  /*
    화면에 적힌 길이(「3분 40초」)와 두 파일의 실제 길이가 맞는가 — 영상을
    다시 만들고 화면의 길이 표기를 안 고치면 여기서 걸린다.
  */
  const label = await pc.evaluate(() => {
    const m = (document.querySelector("[data-video-page] header")?.innerText || "").match(/(\d+)분\s*(\d+)초/);
    return m ? +m[1] * 60 + +m[2] : null;
  });
  for (const r of ["9x16", "16x9"]) {
    const f = info[id][r];
    log(`${name} ${r} — 화면 표기 ${label}초 = 파일 길이`, label && Math.abs(f.d - label) < 1.5, `${f.d.toFixed(2)}s`);
    log(`${name} ${r} — 크기 ${SIZE[r].join("×")}`, f.w === SIZE[r][0] && f.h === SIZE[r][1], `${f.w}×${f.h}`);
  }
  log(`${name} — 세로판과 가로판 길이가 같다 (비율을 바꿔도 그 자리에서 잇는다)`, Math.abs(info[id]["9x16"].d - info[id]["16x9"].d) < 0.1);
  const sideLen = await side.nth(id === "guide" ? 0 : 1).evaluate((a) => {
    const m = (a.getAttribute("aria-label") || "").match(/(\d+)분 (\d+)초/);
    return m ? +m[1] * 60 + +m[2] : null;
  });
  log(`${name} — 왼쪽 목차의 길이 표기도 같다`, sideLen === label, `${sideLen} / ${label}`);

  // 내려받기 — 두 비율 다, 적힌 용량 = 실제 용량
  const dl = await pc.evaluate(() => [...document.querySelectorAll("a[data-download]")].map((a) => ({
    r: a.dataset.download, href: a.getAttribute("href"), download: a.hasAttribute("download"), mb: +(a.innerText.match(/\((\d+)MB\)/) || [])[1],
  })));
  log(`${name} — 내려받기 단추가 세로 · 가로 둘이다`, dl.length === 2 && dl.every((d) => d.download && d.href === FILES[id][d.r]), JSON.stringify(dl));
  for (const d of dl) {
    const real = Math.round(info[id][d.r].bytes / 1e6);
    log(`${name} ${d.r} — 단추에 적힌 용량 ${d.mb}MB = 실제 ${real}MB`, d.mb === real);
  }

  // 영상 흐름
  const ch = await pc.evaluate(() => [...document.querySelectorAll("[data-chapters] button")].map((b) => ({ at: +b.dataset.at, cur: b.getAttribute("aria-current") })));
  log(`${name} — 영상 흐름이 시각 순서대로 있고 첫 줄이 0:00 이다`, ch.length >= 6 && ch[0].at === 0 && ch.every((c, i) => !i || c.at > ch[i - 1].at), JSON.stringify(ch.map((c) => c.at)));
  log(`${name} — 영상 흐름의 마지막 시각이 영상 길이 안이다`, ch.length && ch[ch.length - 1].at < label);
  log(`${name} — 처음에는 첫 장면이 칠해져 있다`, ch[0]?.cur === "true");
}

// ── 3. PC — 비율 · 속도 · 영상 흐름 (사용법 화면에서) ──
const box = () => pc.evaluate(() => {
  const v = document.querySelector("video[data-video]");
  const r = v.getBoundingClientRect();
  return { ratio: v.dataset.ratio, src: v.getAttribute("src"), w: r.width, h: r.height, bottom: r.bottom, vh: innerHeight, rate: v.playbackRate };
});
await pc.evaluate(() => localStorage.removeItem("jeongtong-video-ratio"));
await go(pc, "/videos/guide", 1400);
let b = await box();
log("PC 는 처음에 가로 16:9 로 연다", b.ratio === "16x9" && b.src === FILES.guide["16x9"] && Math.abs(b.w / b.h - 16 / 9) < 0.02, JSON.stringify(b));
log(
  "고른 비율 단추가 눌린 모양이다",
  (await pc.locator('button[data-ratio="16x9"][aria-pressed="true"]').count()) === 1 && (await pc.locator('button[data-ratio="9x16"][aria-pressed="false"]').count()) === 1,
);
await pc.locator('button[data-rate="1.5"]').click();
await pc.waitForTimeout(200);
b = await box();
log("1.5배를 누르면 재생 속도가 1.5배가 된다", b.rate === 1.5 && (await pc.locator('button[data-rate="1.5"][aria-pressed="true"]').count()) === 1, String(b.rate));
await pc.locator('button[data-ratio="9x16"]').click();
await pc.waitForTimeout(600);
b = await box();
log("세로 9:16 을 누르면 세로 파일 · 세로 화면으로 바뀐다", b.ratio === "9x16" && b.src === FILES.guide["9x16"] && Math.abs(b.w / b.h - 9 / 16) < 0.02, JSON.stringify(b));
log("세로 영상이 PC 화면 높이 안에 다 들어온다 (아래 재생 막대까지)", b.bottom <= b.vh, `${Math.round(b.bottom)} / ${b.vh}`);
log("비율을 바꿔도 재생 속도는 그대로 1.5배", b.rate === 1.5, String(b.rate));
await go(pc, "/videos/tech", 1400);
b = await box();
log("고른 비율(세로)을 기억한다 — 다른 영상 화면에서도 세로로 연다", b.ratio === "9x16", JSON.stringify(b));
await go(pc, "/videos/tech?r=16x9", 1400);
b = await box();
log("주소에 ?r=16x9 를 붙이면 가로로 연다 (발표 자리에 보낼 주소)", b.ratio === "16x9" && b.src === FILES.tech["16x9"], JSON.stringify(b));
await pc.evaluate(() => localStorage.removeItem("jeongtong-video-ratio"));

const chBtn = pc.locator("[data-chapters] button").nth(3);
const at3 = +(await chBtn.getAttribute("data-at"));
await chBtn.click();
await pc.waitForTimeout(400);
const after = await pc.evaluate(() => ({
  cur: [...document.querySelectorAll("[data-chapters] button")].findIndex((x) => x.getAttribute("aria-current") === "true"),
  t: document.querySelector("video[data-video]").currentTime,
  canPlay: document.querySelector("video[data-video]").readyState > 0,
}));
log("영상 흐름 넷째 줄을 누르면 그 줄이 칠해진다", after.cur === 3, JSON.stringify(after));
if (after.canPlay) log(`영상 흐름 — 누르면 ${at3}초로 간다`, Math.abs(after.t - at3) < 1, String(after.t));
log("전체 화면 단추가 있다", (await pc.locator("button[data-fullscreen]").count()) === 1);

// 예전 주소 · 고르는 화면
await go(pc, "/videos#tech", 1600);
log("예전 주소 /videos#tech → 기술 소개 화면으로 넘어간다", pc.url().endsWith("/videos/tech"), pc.url());
await go(pc, "/videos", 1200);
log(
  "/videos 는 두 편 중 고르는 자리다 (영상을 나란히 틀지 않는다)",
  (await pc.locator("a[data-video-link]").count()) === 2 && (await pc.locator("video").count()) === 0,
);

// ── 4. 폰 ──
for (const width of [390, 360]) {
  const ph = await (await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  ph.on("pageerror", (e) => errs.push(String(e).slice(0, 120)));
  await go(ph, "/videos/guide", 1400);
  const m = await ph.evaluate(() => {
    const v = document.querySelector("video[data-video]");
    const r = v.getBoundingClientRect();
    const rates = [...document.querySelectorAll("button[data-rate]")].map((x) => Math.round(x.getBoundingClientRect().top));
    return { sw: document.documentElement.scrollWidth, cw: innerWidth, vw: r.width, vh: r.height, ratio: v.dataset.ratio, rates };
  });
  log(`${width}px — 옆으로 넘치지 않는다`, m.sw <= m.cw, `${m.sw} / ${m.cw}`);
  log(`${width}px — 폰은 처음에 세로로 연다`, m.ratio === "9x16");
  log(`${width}px — 영상이 폭을 거의 다 쓴다 (80% 이상)`, m.vw >= width * 0.8, `${Math.round(m.vw)}px`);
  log(`${width}px — 세로 비율 그대로`, Math.abs(m.vw / m.vh - 9 / 16) < 0.02);
  log(`${width}px — 속도 단추 셋이 한 줄에 붙어 있다`, new Set(m.rates).size === 1, JSON.stringify(m.rates));
  if (width === 390) {
    await ph.locator('button[data-ratio="16x9"]').click();
    await ph.waitForTimeout(500);
    const w = await ph.evaluate(() => { const r = document.querySelector("video[data-video]").getBoundingClientRect(); return { w: r.width, h: r.height, sw: document.documentElement.scrollWidth }; });
    log("폰 — 가로 16:9 로 바꾸면 가로 비율로, 넘치지 않고", Math.abs(w.w / w.h - 16 / 9) < 0.02 && w.sw <= 390, JSON.stringify(w));
    await ph.evaluate(() => localStorage.removeItem("jeongtong-video-ratio"));
    // 더보기 시트
    await go(ph, "/", 1200);
    await ph.locator("nav.fixed").getByRole("button", { name: /더보기/ }).first().click().catch(() => {});
    await ph.waitForTimeout(700);
    const links = ph.locator('[role="dialog"] a[href^="/videos/"]');
    log("폰 — 더보기 시트에 사용법 영상 · 기술 소개 영상이 따로 있다", JSON.stringify(await links.evaluateAll((els) => els.map((e) => e.getAttribute("href")))) === JSON.stringify(["/videos/guide", "/videos/tech"]));
    if (await links.count()) {
      await links.nth(1).click();
      await ph.waitForURL(/\/videos\/tech$/, { timeout: 8000 }).catch(() => {});
      await ph.waitForTimeout(800);
      log("폰 — 기술 소개 영상을 누르면 그 영상 하나만 나온다", /\/videos\/tech$/.test(ph.url()) && (await ph.locator('video[data-video="tech"]').count()) === 1 && (await ph.locator("video").count()) === 1, ph.url());
    }
    await go(ph, "/more", 1000);
    log("폰 — 더보기 화면에도 두 영상이 따로 있다", (await ph.locator('main a[href="/videos/guide"]').count()) === 1 && (await ph.locator('main a[href="/videos/tech"]').count()) === 1);
  }
  await ph.context().close();
}

// ── 5. 직원 계정 ──
const st = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await go(st, "/customers", 1000);
const switched = await st.evaluate(() => {
  const k = "jeongtong-ax-v1";
  const raw = JSON.parse(localStorage.getItem(k) || "{}");
  const s = (raw.staff || []).find((x) => x.role === "staff" && x.active !== false);
  if (!s) return false;
  raw.currentStaffId = s.id;
  localStorage.setItem(k, JSON.stringify(raw));
  return true;
});
if (switched) {
  await go(st, "/videos/guide", 1400);
  log("직원 계정도 사용법 영상 화면에 들어온다 (고객 화면으로 되돌리지 않는다)", /\/videos\/guide/.test(st.url()) && (await st.locator('video[data-video="guide"]').count()) === 1, st.url());
  log("직원 계정 — 왼쪽 목차에도 영상 단추가 있다", (await st.locator("aside [data-sidebar-videos] a").count()) === 2);
} else {
  log("직원 계정을 찾았다", false, "시연 자료에 직원 역할이 없음");
}

log("자바스크립트 오류 없음", errs.length === 0, errs.slice(0, 2).join(" | "));
await browser.close();
finish();
