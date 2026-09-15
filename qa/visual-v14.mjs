/**
 * v1.4 — 사진과 '아직 없는 것' 점검
 * =================================
 *
 * 이번에 사진 12장이 들어오고 '향후 확장' 다섯 가지가 생겼다. 둘 다
 * 눈으로만 봐서는 틀린 줄 모르는 종류의 것이라 재는 검사를 붙인다.
 *
 * 1) 사진이 얼마나 잘리는가
 * -------------------------
 * "이미지가 크게 잘 보인다" 로는 통과시키지 않는다. 실제로 그려진 상자와
 * 원본 파일의 가로세로비를 견줘 **잘려 나간 비율**을 계산한다.
 *
 *     object-fit: cover 는 짧은 쪽을 채우고 긴 쪽을 자른다.
 *     그러므로 남는 비율 = min(상자비, 원본비) / max(상자비, 원본비)
 *     잘린 비율 = 1 - 그 값
 *
 * 실제로 이 계산이 잡아 낸 것들:
 *
 *     히어로 moxa.jpg   PC 1280×288 띠 → 76% 잘림
 *     mugwort.jpg       21:9 띠      → 68% 잘림
 *     service_scene     글 높이에 맞춘 칸 → 37% 잘림
 *
 * 셋 다 화면만 봐서는 "사진이 좀 크네" 정도로 지나쳤던 것이다.
 *
 * 한계도 적어 둔다: 이 검사는 **얼마나** 잘리는지는 알지만 **무엇이**
 * 잘리는지는 모른다. 얼굴이 잘렸는지는 사람이 봐야 한다.
 *
 * 2) 아직 없는 것이 있는 것처럼 보이지 않는가
 * -------------------------------------------
 * 다섯 가지 향후 확장이 전부 배지를 달고 있는지, 눌렀을 때 404 로 가지
 * 않고 설명 창이 열리는지, 닫으면 깨끗이 사라지는지(가림막이 남거나
 * 스크롤이 잠기지 않는지)를 본다.
 *
 * 3) 내부 AX 에 사진이 늘지 않았는가
 * ----------------------------------
 * v1.4 는 "고객 화면은 사진을 늘리고 내부 AX 는 늘리지 않는다" 고 한다.
 * 업무 화면에서 지표보다 사진이 먼저 보이기 시작하면 그건 후퇴다.
 */
import { launch, recorder, BASE } from "./lib.mjs";

const { log, finish } = recorder("v1.4 사진 · 향후 확장");
const browser = await launch();

/* ── 1. 사진이 얼마나 잘리는가 ─────────────────────── */

/**
 * 원본 파일의 가로세로비를 브라우저에서 직접 잰다.
 * (Next 가 내려 주는 것은 크기를 줄인 판본이라 그걸로는 원본비를 모른다)
 */
const MEASURE = `async () => {
  const out = [];
  for (const img of [...document.images]) {
    const box = img.getBoundingClientRect();
    if (box.width < 40 || box.height < 40) continue;
    // 원본 경로 — Next 가 감싼 주소에서 url= 뒤를 꺼낸다
    const raw = decodeURIComponent(img.currentSrc || img.src)
      .replace(/^.*[?&]url=/, "").split("&")[0];
    if (!/^\\//.test(raw)) continue;
    const probe = new Image();
    probe.src = raw;
    await probe.decode().catch(() => {});
    if (!probe.naturalWidth) continue;
    const srcRatio = probe.naturalWidth / probe.naturalHeight;
    const boxRatio = box.width / box.height;
    const cut = 1 - Math.min(srcRatio, boxRatio) / Math.max(srcRatio, boxRatio);
    out.push({
      src: raw,
      cut: Math.round(cut * 100),
      box: [Math.round(box.width), Math.round(box.height)],
      // 2배 화면에서도 또렷하려면 원본이 상자 폭의 두 배는 되어야 한다
      scale: +(probe.naturalWidth / box.width).toFixed(2),
    });
  }
  return out;
}`;

/** 이 비율을 넘게 잘리면 무엇을 찍은 사진인지 알아보기 어려워진다 */
const CUT_LIMIT = 34;

const PHOTO_PAGES = [
  ["/welcome", "고객용 화면"],
  ["/why", "Why AX"],
];

for (const [w, h] of [
  [1920, 1080],
  [1440, 900],
  [1280, 800], // 작은 노트북 — 히어로 사진이 가장 먼저 잘리는 폭 (R-06)
  [1024, 768],
  [768, 1024],
  [430, 932], // 큰 폰 (iPhone Pro Max 급) — 세로 crop 확인 (R-06)
  [390, 844],
  [360, 800],
]) {
  const p = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
  for (const [path, name] of PHOTO_PAGES) {
    await p.goto(BASE + path, { waitUntil: "networkidle" });
    // 지연 로딩 사진을 하나씩 실제로 불러온다 — 훑기만 하면 마지막 몇 장이 빈다
    await p.evaluate(async () => {
      for (const i of [...document.images]) {
        i.scrollIntoView({ block: "center" });
        await new Promise((r) => setTimeout(r, 220));
      }
      window.scrollTo(0, 0);
    });
    await p
      .waitForFunction(() => [...document.images].every((i) => i.complete), null, {
        timeout: 20000,
      })
      .catch(() => {});
    await p.waitForTimeout(400);

    // 문자열은 '식'으로 읽히므로 괄호로 싸서 그 자리에서 부른다
    const rows = await p.evaluate(`(${MEASURE})()`);
    const over = rows.filter((r) => r.cut > CUT_LIMIT);
    log(
      `${w}px ${name} — 사진이 ${CUT_LIMIT}% 넘게 잘리지 않는다`,
      over.length === 0,
      over.map((r) => `${r.src.split("/").pop()} ${r.cut}%`).join(", ") ||
        `${rows.length}장 · 최대 ${Math.max(0, ...rows.map((r) => r.cut))}%`,
    );

    /*
      선명도. 원본이 상자보다 작으면 늘려 그리게 되어 흐려진다.
      1.0 을 밑돌면 확대, 2.0 이상이면 2배 화면에서도 또렷하다.
    */
    const blurry = rows.filter((r) => r.scale < 1);
    log(
      `${w}px ${name} — 원본을 늘려 그리는 사진이 없다`,
      blurry.length === 0,
      blurry.map((r) => `${r.src.split("/").pop()} ${r.scale}배`).join(", ") ||
        `최소 ${Math.min(9, ...rows.map((r) => r.scale))}배`,
    );
  }
  await p.close();
}

/* ── 2. 같은 사진을 반복해 쓰지 않는가 ─────────────── */
{
  const p = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto(BASE + "/welcome", { waitUntil: "networkidle" });
  await p.evaluate(async () => {
    for (const i of [...document.images]) {
      i.scrollIntoView({ block: "center" });
      await new Promise((r) => setTimeout(r, 220));
    }
  });
  await p.waitForTimeout(500);
  const srcs = await p.evaluate(() =>
    [...document.images].map((i) =>
      decodeURIComponent(i.currentSrc || i.src).replace(/^.*[?&]url=/, "").split("&")[0],
    ),
  );
  const counts = {};
  for (const s of srcs) counts[s] = (counts[s] ?? 0) + 1;
  const repeated = Object.entries(counts).filter(([, n]) => n > 1);
  log(
    "고객용 화면 — 같은 사진을 두 번 쓰지 않는다",
    repeated.length === 0,
    repeated.map(([s, n]) => `${s.split("/").pop()} ×${n}`).join(", ") ||
      `서로 다른 사진 ${Object.keys(counts).length}장`,
  );
  log(
    "고객용 화면 — 사진이 충분히 쓰였다 (5장 이상)",
    Object.keys(counts).length >= 5,
    `${Object.keys(counts).length}장`,
  );
  await p.close();
}

/* ── 3. 내부 AX 는 사진을 늘리지 않았는가 ──────────── */
{
  const p = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  for (const path of ["/", "/customers", "/briefing", "/analytics", "/retention"]) {
    await p.goto(BASE + path, { waitUntil: "networkidle" });
    await p.waitForTimeout(800);
    // 인체 도해(body/*.png)는 사진이 아니라 그림이라 세지 않는다
    const photos = await p.evaluate(() =>
      [...document.images].filter((i) => {
        const s = decodeURIComponent(i.currentSrc || i.src);
        const b = i.getBoundingClientRect();
        return /\.(jpg|jpeg)/.test(s) && b.width > 80 && b.height > 80;
      }).length,
    );
    log(`내부 AX ${path} — 업무 화면에 사진이 없다`, photos === 0, `${photos}장`);
  }
  await p.close();
}

/* ── 4. 아직 없는 것이 있는 것처럼 보이지 않는가 ───── */
{
  const p = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await p.goto(BASE + "/welcome", { waitUntil: "networkidle" });
  await p.waitForTimeout(600);

  const rows = p.locator("section#future li");
  const n = await rows.count();
  log("향후 확장 — 다섯 가지가 있다", n === 5, `${n}개`);

  const badges = await p
    .locator("section#future")
    .getByText("향후 확장")
    .count();
  log("향후 확장 — 모두 배지를 달고 있다", badges >= 5, `배지 ${badges}개`);

  const warn = await p
    .locator("section#future")
    .getByText(/아직 이용하실 수 없습니다/)
    .count();
  log("향후 확장 — 아직 못 쓴다고 글로도 적혀 있다", warn > 0);

  /*
    다섯 개를 하나씩 열고 닫는다.

    404 로 새지 않는지, 창 안에 있어야 할 넷(왜 필요한가 · 준비하려는
    기능 · 고객 변화 · 매장 의미)이 다 있는지, 닫은 뒤에 가림막이
    남거나 본문 스크롤이 잠기지 않는지까지 본다.
  */
  const before = p.url();
  for (let i = 0; i < n; i++) {
    const label = (await rows.nth(i).innerText()).split("\n")[0];
    await rows.nth(i).locator("button").first().click();
    await p.waitForTimeout(350);

    const dialog = p.locator('[role="dialog"]');
    const opened = (await dialog.count()) > 0;
    const body = opened ? await dialog.innerText() : "";
    const parts = ["왜 필요한가", "준비하려", "고객에게 생기는 변화", "매장에는 어떤 의미"];
    const missing = parts.filter((t) => !body.includes(t));

    log(`향후 확장 「${label}」 — 설명 창이 열린다`, opened);
    log(`향후 확장 「${label}」 — 네 가지가 다 들어 있다`, missing.length === 0, missing.join(", "));
    /*
      살 수 있는 단추가 있는지는 **누를 수 있는 것들의 이름**만 본다.

      처음에는 창 전체 글에서 '구매하기 · 지금 신청' 같은 말을 찾았다.
      그랬더니 다섯 개가 전부 FAIL 로 떨어졌는데, 걸린 것은 우리가 써
      둔 안내문이었다 — "지금 신청하거나 이용하실 수는 없습니다."
      '사지 못한다'고 적어 둔 문장이 '살 수 있다'는 증거로 잡힌 셈이다.
      본문이 아니라 단추만 봐야 한다.
    */
    const buyable = opened
      ? await dialog.evaluate((d) =>
          [...d.querySelectorAll("button, a")]
            .map((el) => (el.textContent || "").trim())
            .filter((t) => /구매|결제|가입|신청|주문|장바구니/.test(t)),
        )
      : [];
    log(
      `향후 확장 「${label}」 — 살 수 있는 단추가 없다`,
      buyable.length === 0,
      buyable.join(", "),
    );
    log(`향후 확장 「${label}」 — 주소가 바뀌지 않는다 (404 없음)`, p.url() === before);

    await p.keyboard.press("Escape");
    await p.waitForTimeout(350);
    const ghost = await p.locator('[role="dialog"]').count();
    const locked = await p.evaluate(() => getComputedStyle(document.body).overflow === "hidden");
    log(`향후 확장 「${label}」 — 닫으면 깨끗이 사라진다`, ghost === 0 && !locked,
      ghost ? "창이 남음" : locked ? "스크롤이 잠김" : "");
  }
  await p.close();
}

/* ── 5. Why AX — 지금까지 / 지금 / 향후 확장 ───────── */
{
  const p = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto(BASE + "/why", { waitUntil: "networkidle" });
  await p.waitForTimeout(700);

  const stages = p.locator("[data-stages] > li");
  log("Why AX — 세 단계가 있다", (await stages.count()) === 3, `${await stages.count()}칸`);

  const text = await p.locator("[data-stages]").innerText();
  for (const w of ["지금까지", "지금", "향후 확장"]) {
    log(`Why AX — '${w}' 단계가 보인다`, text.includes(w));
  }
  log(
    "Why AX — 마지막 단계가 아직 없다고 적혀 있다",
    /아직 없습니다/.test(text),
  );

  // 세 번째 칸만 점선이어야 한다 (색 말고 형태로도 구분)
  const dashed = await p.evaluate(() =>
    [...document.querySelectorAll("[data-stages] > li > div")].map(
      (d) => getComputedStyle(d).borderStyle,
    ),
  );
  log(
    "Why AX — 향후 단계만 점선으로 구분된다",
    dashed[2] === "dashed" && dashed[0] !== "dashed" && dashed[1] !== "dashed",
    dashed.join(" / "),
  );
  await p.close();
}

await browser.close();
finish();
