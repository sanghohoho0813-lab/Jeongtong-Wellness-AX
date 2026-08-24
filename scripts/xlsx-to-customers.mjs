#!/usr/bin/env node
/**
 * 고객차트 엑셀 → 고객 명부 CSV (1회성 이관 도구)
 * ================================================
 *
 * 왜 스크립트인가
 * ---------------
 * 매장이 쓰던 고객차트는 **시트 한 장이 고객 한 명**이다. 그래서 엑셀에서
 * "다른 이름으로 저장 → CSV" 를 하면 첫 시트 한 명만 나온다. 열두 명을
 * 옮기려면 열두 번을 반복해야 한다.
 *
 * 이 스크립트는 모든 시트를 한 번에 읽어 앱의 고객 명부 CSV 한 장으로 만든다.
 * 만들어진 CSV 는 설정 → 데이터 → [고객 명부 가져오기] 에서
 * **미리보기로 확인한 뒤** 반영한다. 이 스크립트가 직접 저장하는 것은 없다.
 *
 * 개인정보
 * --------
 * 실제 고객자료는 이 저장소에 넣지 않는다. 엑셀 파일과 만들어진 CSV 는
 * 원장님 컴퓨터에만 두고, 옮긴 뒤에는 CSV 를 지우는 것을 권한다.
 *
 * 쓰는 법
 * -------
 *   node scripts/xlsx-to-customers.mjs "고객차트.xlsx" > 고객명부.csv
 *   node scripts/xlsx-to-customers.mjs "고객차트.xlsx" --out 고객명부.csv
 *
 * 읽는 칸 (첫 줄을 머리글로 보고 이름으로 찾는다)
 *   성명 · 연락처 · 연령 · 등록일시 · 상담내역 · 관리부위 · 특이사항
 *
 * 지어내지 않는 것
 *   비어 있는 칸은 비운 채로 내보낸다. 연락처가 없으면 없는 대로,
 *   관리부위가 비어 있으면 비운 채로 둔다. 추측해서 채우지 않는다.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

/** 바이트 → UTF-8 문자열 */
const strFromU8 = (u8) => Buffer.from(u8).toString("utf-8");

// ---------------------------------------------------------------
// xlsx 읽기 — xlsx 는 XML 을 담은 zip 이다.
// 이 도구가 쓰는 범위(문자열·숫자·날짜 칸)만 직접 읽는다.
// 라이브러리를 하나 더 들이지 않기 위해서다.
// ---------------------------------------------------------------

/** zip 안의 파일 하나를 문자열로 */
function readZipEntries(buf) {
  // node:zlib 의 unzipSync 는 gzip/deflate 전용이라 zip 컨테이너를 못 읽는다.
  // zip 은 구조가 단순해 필요한 만큼만 직접 훑는다.
  const files = new Map();
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // End of central directory 를 뒤에서부터 찾는다
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("xlsx 파일 형식을 알 수 없습니다 (zip 아님)");

  const count = view.getUint16(eocd + 10, true);
  let ptr = view.getUint32(eocd + 16, true);

  for (let n = 0; n < count; n++) {
    if (view.getUint32(ptr, true) !== 0x02014b50) break;
    const method = view.getUint16(ptr + 10, true);
    const compSize = view.getUint32(ptr + 20, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localOff = view.getUint32(ptr + 42, true);
    const name = strFromU8(buf.subarray(ptr + 46, ptr + 46 + nameLen));

    // local header 에서 실제 데이터 시작 위치를 다시 계산한다
    const lNameLen = view.getUint16(localOff + 26, true);
    const lExtraLen = view.getUint16(localOff + 28, true);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compSize);

    // 0 = 저장(압축 안 함), 8 = deflate. xlsx 는 이 둘만 쓴다.
    files.set(name, method === 0 ? raw : inflateRawSync(raw));
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const unescapeXml = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");

/** sharedStrings.xml → 문자열 배열 */
function parseSharedStrings(xml) {
  if (!xml) return [];
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
      .map((t) => unescapeXml(t[1]))
      .join(""),
  );
}

/** "B2" → { col: 2, row: 2 } */
function refToPos(ref) {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) return null;
  let col = 0;
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { col, row: Number(m[2]) };
}

/** 엑셀 날짜 일련번호 → YYYY-MM-DD (1900 윤년 버그 포함 보정) */
function excelSerialToDate(n) {
  const ms = Math.round((n - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** 시트 XML → 2차원 배열 */
function parseSheet(xml, shared) {
  const rows = [];
  for (const rowM of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowIdx = Number(rowM[1]);
    const cells = [];
    for (const cM of rowM[2].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cM[1];
      const body = cM[2];
      const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1];
      const type = /t="([^"]+)"/.exec(attrs)?.[1];
      const pos = ref ? refToPos(ref) : null;
      if (!pos) continue;

      let value = "";
      if (type === "inlineStr") {
        value = [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
          .map((t) => unescapeXml(t[1]))
          .join("");
      } else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
        if (v != null) {
          if (type === "s") value = shared[Number(v)] ?? "";
          else value = unescapeXml(v);
        }
      }
      cells[pos.col - 1] = value;
    }
    rows[rowIdx - 1] = cells;
  }
  return rows.map((r) => r ?? []);
}

// ---------------------------------------------------------------
// 값 정리
// ---------------------------------------------------------------

/** "26.08.12" / "2026-08-12" / 엑셀 일련번호 → YYYY-MM-DD */
function normalizeDate(raw) {
  const v = String(raw ?? "").trim();
  if (!v) return "";

  // 엑셀이 날짜를 숫자로 저장한 경우
  if (/^\d{5}(\.\d+)?$/.test(v)) return excelSerialToDate(Number(v));

  const parts = v.split(/[.\-/]/).map((x) => x.trim()).filter(Boolean);
  if (parts.length === 3) {
    let [y, m, d] = parts;
    // "26.08.12" 처럼 두 자리 연도 — 2000년대로 읽는다
    if (y.length <= 2) y = String(2000 + Number(y));
    const yy = Number(y);
    const mm = Number(m);
    const dd = Number(d);
    if (yy >= 1900 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    }
  }
  return ""; // 알 수 없는 날짜는 비워 둔다 (지어내지 않는다)
}

const csvCell = (v) => {
  const s = String(v ?? "").trim();
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** 머리글 이름으로 칸 위치를 찾는다 (공백·기호 무시) */
const HEADERS = {
  name: ["성명", "고객명", "이름"],
  phone: ["연락처", "전화번호", "휴대폰"],
  ageGroup: ["연령", "연령대", "나이"],
  registeredAt: ["등록일시", "등록일", "가입일"],
  consultationNote: ["상담내역", "상담내용", "상담"],
  careAreas: ["관리부위", "케어부위", "부위"],
  memo: ["특이사항", "비고", "메모"],
};

function findColumns(headerRow) {
  const norm = (s) => String(s ?? "").replace(/\s/g, "");
  const map = {};
  headerRow.forEach((cell, i) => {
    const c = norm(cell);
    if (!c) return;
    for (const [field, keys] of Object.entries(HEADERS)) {
      if (map[field] == null && keys.includes(c)) map[field] = i;
    }
  });
  return map;
}

// ---------------------------------------------------------------
// 실행
// ---------------------------------------------------------------

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outPath = outIdx >= 0 ? args[outIdx + 1] : undefined;
const src = args.find(
  (a, i) => a !== "--out" && !(outIdx >= 0 && i === outIdx + 1),
);

if (!src) {
  console.error(
    "쓰는 법: node scripts/xlsx-to-customers.mjs <고객차트.xlsx> [--out 고객명부.csv]",
  );
  process.exit(1);
}

const zip = readZipEntries(readFileSync(src));
const shared = parseSharedStrings(
  zip.has("xl/sharedStrings.xml") ? strFromU8(zip.get("xl/sharedStrings.xml")) : "",
);

// 워크북에서 시트 이름과 파일 순서를 얻는다
const wb = strFromU8(zip.get("xl/workbook.xml"));
const rels = strFromU8(zip.get("xl/_rels/workbook.xml.rels"));
const relTarget = new Map(
  [...rels.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], m[2]]),
);
const sheets = [...wb.matchAll(/<sheet[^>]*name="([^"]*)"[^>]*r:id="([^"]+)"[^>]*\/>/g)].map(
  (m) => ({
    name: unescapeXml(m[1]),
    path: `xl/${(relTarget.get(m[2]) ?? "").replace(/^\//, "")}`,
  }),
);

const OUT_HEADER = [
  "고객명",
  "연락처",
  "연령",
  "등록일",
  "상담내역",
  "관리부위",
  "특이사항",
];

const lines = [OUT_HEADER.join(",")];
const skipped = [];

for (const sheet of sheets) {
  const file = zip.get(sheet.path);
  if (!file) {
    skipped.push(`${sheet.name}: 시트를 읽지 못했습니다`);
    continue;
  }
  const rows = parseSheet(strFromU8(file), shared);
  if (rows.length < 2) {
    skipped.push(`${sheet.name}: 내용이 없습니다`);
    continue;
  }

  const cols = findColumns(rows[0]);
  if (cols.name == null) {
    skipped.push(`${sheet.name}: '성명' 머리글을 찾지 못했습니다`);
    continue;
  }

  // 머리글 아래 모든 줄을 읽는다 (지금은 한 줄이지만 늘어날 수 있다)
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const get = (f) => (cols[f] == null ? "" : String(row[cols[f]] ?? "").trim());
    const name = get("name");
    if (!name) continue;

    lines.push(
      [
        name,
        get("phone"),
        get("ageGroup"),
        normalizeDate(get("registeredAt")),
        get("consultationNote"),
        get("careAreas"),
        get("memo"),
      ]
        .map(csvCell)
        .join(","),
    );
  }
}

// 엑셀에서 다시 열어도 한글이 깨지지 않도록 BOM 을 붙인다
const csv = "﻿" + lines.join("\r\n") + "\r\n";

if (outPath) {
  writeFileSync(outPath, csv, "utf-8");
  console.error(`고객 ${lines.length - 1}명을 ${outPath} 에 저장했습니다.`);
} else {
  process.stdout.write(csv);
  console.error(`고객 ${lines.length - 1}명을 내보냈습니다.`);
}

if (skipped.length > 0) {
  console.error("\n건너뛴 시트:");
  for (const s of skipped) console.error(`  - ${s}`);
}
console.error(
  "\n다음 단계: 설정 → 데이터 → [고객 명부 가져오기] 에서 이 파일을 고르고,\n" +
    "미리보기로 확인한 뒤 반영하세요. 옮긴 뒤에는 이 CSV 를 지우시길 권합니다.",
);
