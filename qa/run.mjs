#!/usr/bin/env node
/**
 * 회귀 점검 한 바퀴
 * ==================
 *
 *   npm run build && npm start &          (또는 이미 떠 있는 주소를 QA_BASE 로)
 *   npm run qa
 *
 * 각 묶음은 따로 실행되는 프로세스다. 하나가 브라우저를 남기고 죽어도 다음
 * 묶음이 그 찌꺼기를 물려받지 않는다.
 *
 * 로그인 게이트가 켜져 있으면 (staff) 화면에 못 들어가므로 전부 실패한다.
 * 점검용 서버는 NEXT_PUBLIC_DEMO_MODE=1 로 빌드해서 띄운다.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.QA_BASE || "http://localhost:4402";

const SUITES = [
  ["기능 회귀", "functional.mjs", []],
  ["키보드 · 초점", "keyboard.mjs", []],
  ["사람이 하는 실수", "mistakes.mjs", []],
  ["화면 무너짐 (기본 글씨)", "layout.mjs", []],
  ["화면 무너짐 (큰 글씨 · 어두움)", "layout.mjs", ["--big", "--dark"]],
  ["손가락 · 눈 (밝음)", "reach.mjs", []],
  ["손가락 · 눈 (큰 글씨 · 어두움)", "reach.mjs", ["--big", "--dark"]],
  ["좁은 폭 · 태블릿 폭 (360 · 768 · 1024)", "tablet.mjs", []],
  ["제품 껍데기", "shell.mjs", []],
  ["고객 화면 (새어 나가는 것)", "customer.mjs", []],
  ["v1.4 사진 · 향후 확장", "visual-v14.mjs", []],
  ["사용 방법 (투어 실주행)", "tour.mjs", []],
  ["v3.0 게이트 (단계 · KPI 계약 · 증적 · 9테마)", "v3.mjs", []],
  ["촉감", "polish.mjs", []],
  // 아래 둘은 저장소 자료를 갈아엎으므로 마지막에 둔다
  ["0의 벽", "empty.mjs", []],
  ["대용량", "bulk.mjs", []],
];

// 서버가 떠 있는지부터 본다 — 안 떠 있으면 전부 실패로 보여 헷갈린다
try {
  const res = await fetch(BASE, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
} catch (e) {
  console.error(`\n점검할 서버(${BASE})에 닿지 못했습니다 — ${e.message}`);
  console.error("  NEXT_PUBLIC_DEMO_MODE=1 npm run build && npm start -- -p 4402");
  process.exit(2);
}

const run = (file, args) =>
  new Promise((resolve) => {
    const ps = spawn(process.execPath, [join(here, file), ...args], {
      stdio: "inherit",
      env: { ...process.env, QA_BASE: BASE },
    });
    ps.on("close", (code) => resolve(code ?? 1));
    ps.on("error", (err) => {
      console.error(`실행하지 못했습니다: ${err.message}`);
      resolve(2);
    });
  });

const results = [];
for (const [label, file, args] of SUITES) results.push([label, await run(file, args)]);

console.log("\n══════════ 회귀 점검 요약 ══════════");
for (const [label, code] of results)
  console.log(`${code === 0 ? "통과" : "실패"}  ${label}`);
const failed = results.filter(([, c]) => c !== 0).length;
console.log(failed === 0 ? "\n전부 통과했습니다." : `\n${failed}개 묶음에서 실패가 있습니다.`);
process.exit(failed ? 1 : 0);
