/**
 * 데이터 가져오기 — CSV 고객 명부 / JSON 전체 백업
 * ================================================
 * 내보내기(export.ts)의 반대 방향이다. 두 가지 실제 상황을 해결한다.
 *
 *  1) 도입 첫날 — 지금까지 엑셀·수기 장부로 관리하던 고객 명부를 한 번에 올린다.
 *  2) 사고 복구 — 브라우저 데이터가 사라졌을 때 받아 둔 백업 파일로 되돌린다.
 *
 * 두 경우 모두 "미리 보여주고, 사용자가 확인한 뒤에 반영"한다.
 * 파일을 읽는 순간 데이터가 덮어써지는 일은 없다.
 */

import {
  Branch,
  Customer,
  Membership,
  Staff,
  Visit,
} from "@/lib/types";
import { phoneDigits } from "./format";

// ==========================================================
// CSV 파싱
// ==========================================================

/**
 * CSV 텍스트를 행/열 배열로 만든다.
 * 따옴표로 감싼 칸 안의 쉼표·줄바꿈·이스케이프("")를 모두 처리하며,
 * 엑셀이 붙이는 UTF-8 BOM과 CRLF 줄바꿈도 함께 걷어낸다.
 */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\r") {
      // CRLF 의 CR — 무시하고 LF 에서 줄을 끊는다
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  // 마지막 줄이 개행으로 끝나지 않는 경우
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  // 완전히 빈 줄은 버린다
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// ==========================================================
// 고객 명부 가져오기
// ==========================================================

/** 가져오기가 인식하는 항목 */
export type ImportField =
  | "name"
  | "phone"
  | "gender"
  | "birthYear"
  | "registeredAt"
  | "nextManageDate"
  | "memo";

/**
 * 머리글 자동 인식 사전.
 * 내보내기가 만든 파일은 물론, 매장에서 쓰던 엑셀의 흔한 표기도 함께 받는다.
 */
const HEADER_DICT: Array<{ field: ImportField; keys: string[] }> = [
  { field: "name", keys: ["고객명", "이름", "성명", "고객", "name"] },
  {
    field: "phone",
    keys: ["연락처", "전화번호", "휴대폰", "핸드폰", "전화", "번호", "phone", "tel", "mobile"],
  },
  { field: "gender", keys: ["성별", "gender", "sex"] },
  { field: "birthYear", keys: ["출생연도", "생년", "출생년도", "birthyear", "birth"] },
  { field: "registeredAt", keys: ["등록일", "가입일", "최초등록일", "registeredat"] },
  {
    field: "nextManageDate",
    keys: ["다음관리예정일", "다음관리일", "다음방문예정", "예정일", "nextmanagedate"],
  },
  { field: "memo", keys: ["메모", "비고", "특이사항", "note", "memo"] },
];

/**
 * 머리글 한 칸을 항목으로 해석한다. 공백·괄호·기호는 무시하고 비교한다.
 *
 * 어중간한 포함 검사는 위험하다 — "담당자메모작성일"이 '메모'로 잡히면
 * 엉뚱한 값이 고객 메모에 들어간다. 그래서 순서를 지킨다.
 *   1) 완전히 같은 머리글       ("연락처")
 *   2) 앞이나 뒤가 맞는 머리글  ("고객명(필수)", "고객 연락처")
 *      — 이때는 가장 긴 열쇳말이 이긴다. "고객연락처"가 '고객'(이름)이 아니라
 *        '연락처'로 잡혀야 하기 때문이다.
 * 그 외에는 인식하지 않고 "사용 안 함"으로 넘긴다.
 */
export function matchHeader(header: string): ImportField | undefined {
  const norm = header.replace(/[\s()[\]{}._/·*-]/g, "").toLowerCase();
  if (!norm) return undefined;

  for (const { field, keys } of HEADER_DICT) {
    if (keys.some((k) => norm === k)) return field;
  }

  let best: { field: ImportField; len: number } | undefined;
  for (const { field, keys } of HEADER_DICT) {
    for (const k of keys) {
      if (!norm.startsWith(k) && !norm.endsWith(k)) continue;
      if (!best || k.length > best.len) best = { field, len: k.length };
    }
  }
  return best?.field;
}

export interface ImportRow {
  /** 파일에서의 줄 번호 (머리글 포함, 1부터) */
  line: number;
  name: string;
  phone: string;
  gender?: "female" | "male";
  birthYear?: number;
  registeredAt?: string;
  nextManageDate?: string;
  memo?: string;
  /** 이미 등록된 같은 연락처 고객 */
  existingId?: string;
  existingName?: string;
}

export interface ImportError {
  line: number;
  raw: string;
  reason: string;
}

export interface CustomerImportPreview {
  /** 인식된 머리글 → 항목 */
  mapped: Array<{ header: string; field: ImportField }>;
  /** 인식하지 못해 무시한 머리글 */
  ignored: string[];
  /** 새로 등록될 행 */
  fresh: ImportRow[];
  /** 이미 있는 연락처라 겹치는 행 */
  duplicated: ImportRow[];
  /** 읽을 수 없어 건너뛴 행 */
  errors: ImportError[];
}

const YEAR_NOW = new Date().getFullYear();

/** "2024-03-05", "2024.3.5", "2024/03/05", "20240305" 를 ISO 날짜로 */
export function normalizeDate(value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  const compact = v.replace(/[.\s/]/g, "-").replace(/-+/g, "-");
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(compact);
  if (!m) {
    const digits = v.replace(/\D/g, "");
    if (digits.length === 8) {
      m = [
        "",
        digits.slice(0, 4),
        digits.slice(4, 6),
        digits.slice(6, 8),
      ] as unknown as RegExpExecArray;
    }
  }
  if (!m) return undefined;
  const [, y, mo, d] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  if (year < 1900 || year > YEAR_NOW + 5) return undefined;
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeGender(value: string): "female" | "male" | undefined {
  const v = value.trim().toLowerCase();
  if (!v) return undefined;
  if (["여", "여성", "여자", "f", "female", "w"].includes(v)) return "female";
  if (["남", "남성", "남자", "m", "male"].includes(v)) return "male";
  return undefined;
}

function normalizeBirthYear(value: string): number | undefined {
  const digits = value.replace(/\D/g, "");
  if (!digits) return undefined;
  const n = Number(digits.length > 4 ? digits.slice(0, 4) : digits);
  if (n < 1900 || n > YEAR_NOW) return undefined;
  return n;
}

/**
 * 고객 명부 CSV 를 읽어 "무엇이 들어오고 무엇이 걸러졌는지" 미리 보여줄 형태로 만든다.
 * 이 단계에서는 아무것도 저장하지 않는다.
 */
export function parseCustomerCsv(
  text: string,
  existing: Customer[],
): CustomerImportPreview {
  const rows = parseCsv(text);
  const empty: CustomerImportPreview = {
    mapped: [],
    ignored: [],
    fresh: [],
    duplicated: [],
    errors: [],
  };
  if (rows.length === 0) return empty;

  const headers = rows[0].map((h) => h.trim());
  const fieldByCol = headers.map(matchHeader);

  const mapped: CustomerImportPreview["mapped"] = [];
  const ignored: string[] = [];
  const seenField = new Set<ImportField>();
  headers.forEach((h, i) => {
    const f = fieldByCol[i];
    // 같은 항목이 두 번 잡히면 첫 번째만 쓴다
    if (f && !seenField.has(f)) {
      seenField.add(f);
      mapped.push({ header: h, field: f });
    } else {
      if (f) fieldByCol[i] = undefined;
      if (h) ignored.push(h);
    }
  });

  if (!seenField.has("name")) {
    return {
      ...empty,
      mapped,
      ignored,
      errors: [
        {
          line: 1,
          raw: headers.join(", "),
          reason: "고객명 열을 찾지 못했습니다. 첫 줄에 '고객명' 머리글이 필요합니다.",
        },
      ],
    };
  }

  const byPhone = new Map<string, Customer>();
  for (const c of existing) {
    const d = phoneDigits(c.phone);
    if (d && !byPhone.has(d)) byPhone.set(d, c);
  }

  const fresh: ImportRow[] = [];
  const duplicated: ImportRow[] = [];
  const errors: ImportError[] = [];
  /** 파일 안에서의 연락처 중복도 잡는다 */
  const seenInFile = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    const line = r + 1;
    const raw = cols.join(", ");
    const get = (f: ImportField): string => {
      const i = fieldByCol.indexOf(f);
      return i >= 0 ? (cols[i] ?? "").trim() : "";
    };

    const name = get("name");
    if (!name) {
      errors.push({ line, raw, reason: "고객명이 비어 있습니다" });
      continue;
    }

    const phoneRaw = get("phone");
    const digits = phoneDigits(phoneRaw);
    if (phoneRaw && !/^0\d{8,10}$/.test(digits)) {
      errors.push({ line, raw, reason: `연락처 형식을 알 수 없습니다 (${phoneRaw})` });
      continue;
    }

    if (digits && seenInFile.has(digits)) {
      errors.push({ line, raw, reason: "같은 파일 안에 연락처가 중복됩니다" });
      continue;
    }
    if (digits) seenInFile.add(digits);

    const row: ImportRow = {
      line,
      name,
      phone: digits,
      gender: normalizeGender(get("gender")),
      birthYear: normalizeBirthYear(get("birthYear")),
      registeredAt: normalizeDate(get("registeredAt")),
      nextManageDate: normalizeDate(get("nextManageDate")),
      memo: get("memo") || undefined,
    };

    const hit = digits ? byPhone.get(digits) : undefined;
    if (hit) {
      duplicated.push({ ...row, existingId: hit.id, existingName: hit.name });
    } else {
      fresh.push(row);
    }
  }

  return { mapped, ignored, fresh, duplicated, errors };
}

/** 가져오기 예시 파일 — 사용자가 형식을 맞출 수 있도록 내려받게 한다 */
export function customerImportTemplate(): string {
  return (
    "﻿" +
    [
      "고객명,연락처,성별,출생연도,등록일,다음관리예정일,메모",
      "홍길동,010-1234-5678,여,1968,2024-03-05,2024-04-02,어깨 집중 관리 희망",
      "김영수,010-2345-6789,남,1972,2024-05-11,,",
    ].join("\r\n")
  );
}

// ==========================================================
// 전체 백업 복원
// ==========================================================

export interface BackupPayload {
  exportedAt?: string;
  customers: Customer[];
  visits: Visit[];
  memberships: Membership[];
  staff: Staff[];
  branches: Branch[];
  settings?: unknown;
}

export interface BackupCheck {
  ok: boolean;
  /** 사용자에게 보여줄 실패 이유 */
  reason?: string;
  payload?: BackupPayload;
  summary?: {
    exportedAt?: string;
    customers: number;
    visits: number;
    memberships: number;
    staff: number;
    branches: number;
  };
}

const isArrayOfObjects = (v: unknown): v is Record<string, unknown>[] =>
  Array.isArray(v) && v.every((x) => typeof x === "object" && x !== null);

/**
 * 백업 파일을 검사한다. 형태가 맞지 않으면 이유를 돌려주고,
 * 맞으면 "무엇이 몇 건 들어 있는지"를 함께 돌려준다.
 * 되돌릴 수 없는 작업이므로 반영 전에 반드시 이 단계를 거친다.
 */
export function checkBackup(text: string): BackupCheck {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: "JSON 형식이 아닙니다. 백업으로 내려받은 파일인지 확인해 주세요." };
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { ok: false, reason: "백업 파일 구조가 아닙니다." };
  }

  const o = data as Record<string, unknown>;
  const required = ["customers", "visits", "memberships", "staff", "branches"] as const;
  for (const key of required) {
    if (!isArrayOfObjects(o[key])) {
      return { ok: false, reason: `'${key}' 항목이 없거나 형식이 다릅니다.` };
    }
  }

  const customers = o.customers as Customer[];
  if (customers.length > 0) {
    const bad = customers.find((c) => !c.id || !c.name);
    if (bad) {
      return { ok: false, reason: "고객 기록에 id 또는 이름이 없는 행이 있습니다." };
    }
  }

  const payload: BackupPayload = {
    exportedAt: typeof o.exportedAt === "string" ? o.exportedAt : undefined,
    customers,
    visits: o.visits as Visit[],
    memberships: o.memberships as Membership[],
    staff: o.staff as Staff[],
    branches: o.branches as Branch[],
    settings: o.settings,
  };

  return {
    ok: true,
    payload,
    summary: {
      exportedAt: payload.exportedAt,
      customers: payload.customers.length,
      visits: payload.visits.length,
      memberships: payload.memberships.length,
      staff: payload.staff.length,
      branches: payload.branches.length,
    },
  };
}

/** 파일을 텍스트로 읽는다 */
export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다"));
    reader.readAsText(file, "utf-8");
  });
}
