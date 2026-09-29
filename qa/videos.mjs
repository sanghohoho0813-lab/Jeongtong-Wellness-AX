/**
 * 안내 영상 — 누르면 정말 틀어지는가
 * ==================================
 *
 * 영상은 "화면에 네모가 있다" 로는 아무것도 확인한 게 아니다.
 * 파일이 404 여도 <video> 는 검은 네모로 멀쩡히 그려진다. 그래서 여기서는
 *
 *   - 목차 단추가 있고, 누르면 그 영상 앞에 도착하는가
 *   - 파일이 실제로 내려오고(video/mp4), 길이가 적힌 길이와 맞는가
 *   - 세로(9:16)로 그려지는가, 폰 폭을 넘치지 않는가
 *   - 한 편을 틀면 다른 편이 멈추는가
 *   - 폰에서는 더보기 시트 · 더보기 화면에서 찾을 수 있는가
 *   - 직원 계정도 볼 수 있는가
 *
 * 를 본다.
 */
import { launch, recorder, go, BASE } from "./lib.mjs";

const { log, finish } = recorder("안내 영상 (틀어지는가)");
const browser = await launch();
const errs = [];

// ── 1. 파일 자체 ──
for (const [name, path] of [
  ["사용법 영상", "/videos/guide.mp4"],
  ["기술 소개 영상", "/videos/tech.mp4"],
]) {
  const res = await fetch(BASE + path, { headers: { Range: "bytes=0-1023" } });
  log(
    `${name} 파일이 내려온다 (video/mp4 · 이어받기 가능)`,
    (res.status === 206 || res.status === 200) &&
      (res.headers.get("content-type") || "").includes("video/mp4"),
    `${res.status} ${res.headers.get("content-type")}`,
  );
}
for (const path of ["/videos/guide-poster.jpg", "/videos/tech-poster.jpg"]) {
  const res = await fetch(BASE + path);
  log(`첫 장면 그림 ${path} 이 있다`, res.ok, String(res.status));
}

// ── 2. PC — 왼쪽 목차 ──
const pc = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
pc.on("pageerror", (e) => errs.push(String(e).slice(0, 120)));
await go(pc, "/", 1200);

const side = pc.locator("aside [data-sidebar-videos] a");
log("왼쪽 목차에 영상 단추가 둘 있다", (await side.count()) === 2);
const sideText = (await side.allInnerTexts()).join(" ");
const sideNames = (await side.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).join(" ");
log("단추 이름 — 사용법 · 기술 소개 (읽어 주는 이름은 '영상' 과 길이까지)", /사용법/.test(sideText) && /기술 소개/.test(sideText) && /사용법 영상 3분 29초/.test(sideNames) && /기술 소개 영상 2분 42초/.test(sideNames), sideText + " / " + sideNames);
const navBottom = await pc.evaluate(() => {
  const a = [...document.querySelectorAll("aside nav a")].pop();
  const n = document.querySelector("aside nav");
  return { a: a.getBoundingClientRect().bottom, n: n.getBoundingClientRect().bottom };
});
log("900px 높이 PC 에서 목차 넷이 스크롤 없이 다 보인다", navBottom.a <= navBottom.n + 1, JSON.stringify(navBottom));
log(
  "목차 넷은 그대로다 (영상 단추는 목차 줄이 아니다)",
  (await pc.locator("aside nav a").count()) === 4,
);

await side.filter({ hasText: "기술 소개" }).click();
await pc.waitForURL(/\/videos#tech$/, { timeout: 8000 }).catch(() => {});
await pc.waitForTimeout(1200);
log("기술 소개 단추 → /videos#tech 로 간다", pc.url().endsWith("/videos#tech"), pc.url());
const techTop = await pc.evaluate(() => {
  // 위쪽에 떠 있는 띠(백업 안내 등)에 제목이 가려지지 않았는가
  const h = document.getElementById("tech-title").getBoundingClientRect();
  const cover = document.elementFromPoint(h.left + 8, h.top + h.height / 2);
  return { top: h.top, seen: !!cover?.closest("#tech") };
});
log("PC — 기술 소개 제목이 화면 안에, 가려지지 않고 보인다", techTop.top > 0 && techTop.top < 700 && techTop.seen, JSON.stringify(techTop));
log(
  "영상 화면에 있는 동안 목차의 영상 단추가 칠해진다",
  await pc.evaluate(() => [...document.querySelectorAll("aside [data-sidebar-videos] a")].every((a) => /from-deep-700/.test(a.className))),
);
log(
  "화면이 '더보기' 묶음으로 칠해진다",
  (await pc.locator('aside nav a[href="/more"][aria-current="page"]').count()) === 1,
);

/*
  길이 · 크기 · 재생.

  이 검사용 크로미움은 오픈소스 빌드라 H.264 를 **틀지 못한다**
  (canPlayType 이 빈 문자열, <video> 오류 코드 4). 실제 크롬 · 사파리 ·
  삼성 인터넷은 튼다. 그래서 브라우저가 못 틀면 거기서 멈추지 않고
    - 길이와 크기는 파일 안의 mvhd · tkhd 상자를 직접 읽어 확인하고
    - "한 편을 틀면 다른 편이 멈춘다" 는 재생 신호를 흉내 내어 확인한다.
  브라우저가 틀 수 있으면(QA_CHROMIUM 을 크롬으로 준 경우) 진짜로 튼다.
*/
const h264 = await pc.evaluate(() =>
  document.createElement("video").canPlayType('video/mp4; codecs="avc1.640028, mp4a.40.2"'),
);
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
  return { d: dur / scale, w, h };
}
let meta;
if (h264) {
  meta = await pc.evaluate(async () => {
    const out = {};
    for (const v of document.querySelectorAll("video[data-video]")) {
      if (v.readyState < 1)
        await new Promise((r) => { v.addEventListener("loadedmetadata", r, { once: true }); setTimeout(r, 8000); });
      out[v.dataset.video] = { d: v.duration, w: v.videoWidth, h: v.videoHeight };
    }
    return out;
  });
} else {
  meta = { guide: await mp4Info("/videos/guide.mp4"), tech: await mp4Info("/videos/tech.mp4") };
}
const how = h264 ? "브라우저가 읽은 값" : "파일 안의 값 (이 크로미움은 H.264 를 못 틂)";
log(`사용법 영상 길이 3분 29초 — ${how}`, Math.abs((meta.guide?.d ?? 0) - 209) < 2, JSON.stringify(meta.guide));
log(`기술 소개 영상 길이 2분 42초 — ${how}`, Math.abs((meta.tech?.d ?? 0) - 162) < 2, JSON.stringify(meta.tech));
log(
  "둘 다 세로 영상이다 (1080 × 1920)",
  meta.guide?.w === 1080 && meta.guide?.h === 1920 && meta.tech?.w === 1080 && meta.tech?.h === 1920,
);
const box = await pc.evaluate(() => {
  const r = document.querySelector('video[data-video="guide"]').getBoundingClientRect();
  return { w: r.width, h: r.height, vh: innerHeight };
});
log(
  "PC 에서 영상 하나가 화면 높이 안에 들어온다",
  box.h <= box.vh && Math.abs(box.w / box.h - 9 / 16) < 0.02,
  `${Math.round(box.w)}×${Math.round(box.h)} / 화면 ${box.vh}`,
);

// 한 편을 틀면 다른 편은 멈춘다
if (h264) {
  const played = await pc.evaluate(async () => {
    const g = document.querySelector('video[data-video="guide"]');
    const t = document.querySelector('video[data-video="tech"]');
    g.muted = t.muted = true;
    await g.play().catch(() => {});
    await new Promise((r) => setTimeout(r, 600));
    const gFirst = !g.paused;
    await t.play().catch(() => {});
    await new Promise((r) => setTimeout(r, 600));
    const res = { gFirst, gAfter: !g.paused, tAfter: !t.paused, time: g.currentTime };
    t.pause();
    return res;
  });
  log("사용법 영상이 실제로 재생된다", played.gFirst && played.time > 0.2, JSON.stringify(played));
  log("기술 소개를 틀면 사용법 영상이 멈춘다", played.tAfter && !played.gAfter, JSON.stringify(played));
} else {
  const r = await pc.evaluate(() => {
    const g = document.querySelector('video[data-video="guide"]');
    const t = document.querySelector('video[data-video="tech"]');
    // 사용법 영상이 '재생 중' 이라고 치고, 멈추라는 요청이 오는지 본다
    let gPaused = 0, tPaused = 0;
    Object.defineProperty(g, "paused", { configurable: true, get: () => false });
    g.pause = () => { gPaused++; };
    t.pause = () => { tPaused++; };
    t.dispatchEvent(new Event("play"));
    return { gPaused, tPaused };
  });
  log("기술 소개를 틀면 사용법 영상에 '멈춤' 이 간다 (재생 신호 흉내)", r.gPaused === 1 && r.tPaused === 0, JSON.stringify(r));
}
log(
  "파일로 받기 단추가 두 편 모두에 있다",
  (await pc.locator('a[download][href^="/videos/"]').count()) === 2,
);

// ── 3. 폰 ──
for (const width of [390, 360]) {
  const ph = await (await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  ph.on("pageerror", (e) => errs.push(String(e).slice(0, 120)));
  await go(ph, "/videos", 1400);
  const m = await ph.evaluate(() => {
    const v = document.querySelector('video[data-video="guide"]').getBoundingClientRect();
    return { sw: document.documentElement.scrollWidth, cw: innerWidth, vw: v.width, vh: v.height };
  });
  log(`${width}px — 옆으로 넘치지 않는다`, m.sw <= m.cw, `${m.sw} / ${m.cw}`);
  log(`${width}px — 영상이 폭을 거의 다 쓴다 (80% 이상)`, m.vw >= width * 0.8, `${Math.round(m.vw)}px`);
  log(`${width}px — 세로 비율 그대로`, Math.abs(m.vw / m.vh - 9 / 16) < 0.02);
  if (width === 390) {
    await go(ph, "/videos#tech", 1400);
    const t = await ph.evaluate(() => {
      const h = document.getElementById("tech-title").getBoundingClientRect();
      const cover = document.elementFromPoint(h.left + 8, h.top + h.height / 2);
      return { top: Math.round(h.top), seen: !!cover?.closest("#tech") };
    });
    log("폰 — #tech 로 들어오면 기술 소개 제목이 가려지지 않고 보인다", t.top > 0 && t.top < 844 && t.seen, JSON.stringify(t));
    // 더보기 시트
    await go(ph, "/", 1200);
    await ph.locator("nav.fixed").getByRole("button", { name: /더보기/ }).first().click().catch(() => {});
    await ph.waitForTimeout(700);
    const link = ph.locator('[role="dialog"] a[href="/videos"]');
    log("폰 — 더보기 시트에 '안내 영상' 이 있다", (await link.count()) === 1);
    if (await link.count()) {
      await link.click();
      await ph.waitForURL(/\/videos$/, { timeout: 8000 }).catch(() => {});
      log("폰 — 누르면 영상 화면으로 간다", /\/videos$/.test(ph.url()), ph.url());
    }
    await go(ph, "/more", 1000);
    log("폰 — 더보기 화면에도 '안내 영상' 이 있다", (await ph.locator('main a[href="/videos"], a[href="/videos"]').count()) >= 1);
  }
  await ph.context().close();
}

// ── 4. 직원 계정 ──
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
  await go(st, "/videos", 1400);
  log("직원 계정도 영상 화면에 들어온다 (고객 화면으로 되돌리지 않는다)", /\/videos/.test(st.url()) && (await st.locator("video[data-video]").count()) === 2, st.url());
  log("직원 계정 — 왼쪽 목차에도 영상 단추가 있다", (await st.locator("aside [data-sidebar-videos] a").count()) === 2);
} else {
  log("직원 계정을 찾았다", false, "시연 자료에 직원 역할이 없음");
}

log("자바스크립트 오류 없음", errs.length === 0, errs.slice(0, 2).join(" | "));
await browser.close();
finish();
