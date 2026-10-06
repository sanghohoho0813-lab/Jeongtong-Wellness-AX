/**
 * 두 기기가 같이 쓸 때 — 받아서 합친 뒤 올린다
 * =============================================
 *
 * 예전 방식은 「이 기기에 있는 것을 통째로 올리고, 서버에만 있는 줄은 지운다」
 * 였다. 기기가 하나면 맞는 말이다. 그런데 카운터 태블릿을 아침에 켜 두고,
 * 원장님이 폰으로 방문을 하나 적으면 —
 *
 *   1. 폰이 방문을 올린다 (서버: 있음)
 *   2. 태블릿은 그 방문을 모른다. 태블릿에서 다른 손님을 적는다
 *   3. 태블릿이 통째로 올리며 「서버에만 있는 줄」 인 폰의 방문을 **지운다**
 *
 * 화면에는 아무 표시도 없다. 저녁에 「아까 적었는데?」 로 드러난다.
 *
 * 그래서 이제는 마지막으로 서버와 맞췄을 때의 모습(base) 을 기억해 두고,
 * 줄마다 「누가 바꿨나」 를 본다 (3-way merge).
 *
 *   · 이 기기만 바꿨으면 → 이 기기 것
 *   · 서버만 바뀌었으면(다른 기기가 바꿈) → 서버 것
 *   · 둘 다 바꿨으면 → 이 기기 것 (나중 저장이 이긴다). 단 이용권 남은 횟수는
 *     두 기기의 차감을 **더한다** — 10회권을 두 기기가 각각 1회씩 쓰면 8회다
 *   · 이 기기가 지운 줄 → 서버에서도 지운다 (그 사이 다른 기기가 고쳤으면 살린다)
 *   · 다른 기기가 지운 줄 → 이 기기에서도 뺀다 (그 사이 이 기기가 고쳤으면 살린다)
 *   · 다른 기기가 새로 만든 줄 → 받아 온다. **절대 지우지 않는다**
 *
 * 줄을 비교할 때는 서버에 들어가는 모양(toRow)으로 바꿔서 본다. 그래야
 * 서버가 돌려준 날짜 표기 · 빈 칸 표기 차이를 「바뀌었다」 로 잘못 읽지 않는다.
 *
 * 이 파일은 계산만 한다 — 네트워크도 화면도 모른다. 그래서 단위 테스트로
 * 경우의 수를 전부 돌려 볼 수 있다 (merge.test.ts).
 */

import type {
  Branch,
  CarePreference,
  Customer,
  Membership,
  ServiceProduct,
  Staff,
  Visit,
} from "@/lib/types";
import {
  branchToRow,
  customerToRow,
  membershipToRow,
  preferenceToRow,
  productToRow,
  staffToRow,
  visitToRow,
} from "./mappers";
import { toUuid } from "./ids";

export interface MergeData {
  customers: Customer[];
  visits: Visit[];
  memberships: Membership[];
  products: ServiceProduct[];
  staff: Staff[];
  branches: Branch[];
}

export type TableKey = keyof MergeData;

/** 마지막으로 서버와 맞췄을 때의 모습 — 줄마다 지문 하나, 이용권은 남은 횟수도 */
export interface SyncBase {
  v: 1;
  /** `${table}:${uuid}` → 지문 */
  rows: Record<string, string>;
  /** 이용권 uuid → 그때의 남은 횟수 (차감을 더할 때 쓴다) */
  remaining: Record<string, number>;
}

const TABLES: TableKey[] = [
  "branches",
  "staff",
  "customers",
  "products",
  "memberships",
  "visits",
];

// ---------------------------------------------------------
// 지문
// ---------------------------------------------------------

/** 키 순서 · 빈 값(null/undefined) 표기에 흔들리지 않는 문자열 */
function stable(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== null && o[k] !== undefined)
      .sort()
      .map((k) => `${k}:${stable(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}

/** 짧은 지문 — 저장 공간을 아끼려고 줄여 둔다 (암호용 아님) */
function digest(s: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x1b873593;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
  }
  return h1.toString(36) + h2.toString(36) + s.length.toString(36);
}

/** 서버 모양으로 바꾼 한 줄 — 비교는 늘 이 모양으로 한다 */
function rowOf(table: TableKey, x: unknown): Record<string, unknown> {
  switch (table) {
    case "customers": {
      const c = x as Customer;
      // 케어 선호는 고객 줄에 얹혀 다니므로 함께 지문에 넣는다
      const prefs = (c.preferences ?? [])
        .map((p) => preferenceToRow(p, c.id, c.branchId))
        .sort((a, b) => String(a.id).localeCompare(String(b.id)));
      return { ...customerToRow(c), prefs };
    }
    case "visits":
      return visitToRow(x as Visit);
    case "memberships":
      return membershipToRow(x as Membership);
    case "products":
      return productToRow(x as ServiceProduct);
    case "staff":
      return staffToRow(x as Staff);
    case "branches": {
      const b = x as Branch;
      return { ...branchToRow(b), id: toUuid(b.id) };
    }
  }
}

export function fingerprint(table: TableKey, x: unknown): string {
  return digest(stable(rowOf(table, x)));
}

const keyOf = (x: { id: string }) => toUuid(x.id);

/** 케어 선호 한 줄의 지문 — 어느 고객 것인지는 고객 줄이 들고 있다 */
function prefPrint(p: CarePreference): string {
  return digest(stable(preferenceToRow(p, "", "")));
}

/** 지금 자료 전체의 지문 — 서버와 맞춘 직후에 base 로 저장한다 */
export function makeBase(data: MergeData): SyncBase {
  const rows: Record<string, string> = {};
  const remaining: Record<string, number> = {};
  for (const t of TABLES) {
    for (const x of data[t] as Array<{ id: string }>) {
      rows[`${t}:${keyOf(x)}`] = fingerprint(t, x);
    }
  }
  for (const m of data.memberships) remaining[keyOf(m)] = m.remainingCount;
  for (const c of data.customers)
    for (const p of c.preferences ?? []) rows[`prefs:${keyOf(p)}`] = prefPrint(p);
  return { v: 1, rows, remaining };
}

// ---------------------------------------------------------
// 합치기
// ---------------------------------------------------------

export interface MergePlan {
  /** 이 기기에 둘 자료 */
  merged: MergeData;
  /** 서버에 올려야 할 줄 (서버 것과 다른 것만) */
  upserts: MergeData;
  /** 서버에서 지울 uuid — 이 기기가 지운 것만. 케어 선호는 따로 */
  deletes: Record<TableKey, string[]> & { preferences: string[] };
  /** 둘 다 같은 줄을 고쳐 이 기기 것을 남긴 수 (이용권 차감 합산은 제외) */
  conflicts: number;
  /** 이 기기 자료가 바뀌었는가 (다른 기기 것을 받아 왔는가) */
  localChanged: boolean;
}

/** 두 기기의 차감을 더한다 — 다른 칸은 이 기기 것 */
function combineMembership(
  local: Membership,
  server: Membership,
  baseRemaining: number | undefined,
): Membership {
  const base = baseRemaining ?? server.remainingCount;
  const total = Math.max(local.totalCount, 0);
  const remainingCount = Math.min(
    total,
    Math.max(0, server.remainingCount + (local.remainingCount - base)),
  );
  let status = local.status;
  if (status !== "expired") status = remainingCount <= 0 ? "exhausted" : "active";
  return { ...local, remainingCount, status };
}

/**
 * 두 기기가 같은 고객을 고쳤을 때 — 고객 칸은 이 기기 것, 케어 선호는 한 줄씩 합친다.
 * 다른 기기가 막 적은 「쑥뜸 온도 낮게」 가 이 기기의 연락처 수정에 밀려
 * 사라지면 안 된다.
 */
function combineCustomer(local: Customer, server: Customer, base: SyncBase): Customer {
  const L = new Map((local.preferences ?? []).map((p) => [keyOf(p), p]));
  const S = new Map((server.preferences ?? []).map((p) => [keyOf(p), p]));
  const out: CarePreference[] = [];
  for (const k of [...L.keys(), ...[...S.keys()].filter((k) => !L.has(k))]) {
    const l = L.get(k);
    const s = S.get(k);
    const b = base.rows[`prefs:${k}`];
    if (l && s) out.push(b !== undefined && prefPrint(l) === b ? s : l);
    else if (l) {
      if (b === undefined || prefPrint(l) !== b) out.push(l);
    } else if (s) {
      if (b === undefined || prefPrint(s) !== b) out.push(s);
    }
  }
  return { ...local, preferences: out.length ? out : undefined };
}

function mergeTable<T extends { id: string }>(
  table: TableKey,
  local: T[],
  server: T[],
  base: SyncBase,
): { rows: T[]; upserts: T[]; deletes: string[]; conflicts: number; changed: boolean } {
  const L = new Map(local.map((x) => [keyOf(x), x]));
  const S = new Map(server.map((x) => [keyOf(x), x]));
  const fp = (x: T) => fingerprint(table, x);

  const rows: T[] = [];
  const upserts: T[] = [];
  const deletes: string[] = [];
  let conflicts = 0;
  let changed = false;

  // 이 기기 순서를 지키고, 새로 받아 온 줄은 뒤에 붙인다
  const order = [...L.keys(), ...[...S.keys()].filter((k) => !L.has(k))];

  for (const k of order) {
    const l = L.get(k);
    const s = S.get(k);
    const b = base.rows[`${table}:${k}`];
    const hl = l ? fp(l) : undefined;
    const hs = s ? fp(s) : undefined;

    let out: T | undefined;
    const baseRem = base.remaining[k];
    if (
      l &&
      s &&
      table === "memberships" &&
      baseRem !== undefined &&
      (l as unknown as Membership).remainingCount !== baseRem &&
      (s as unknown as Membership).remainingCount !== baseRem
    ) {
      /*
       * 남은 횟수는 줄 비교가 아니라 「얼마나 움직였나」 로 합친다.
       * 두 기기가 10회권을 각각 1회씩 쓰면 두 줄이 똑같이 「9」 가 되어
       * 같은 줄처럼 보이지만, 실제로는 2회가 빠졌다.
       */
      out = combineMembership(
        l as unknown as Membership,
        s as unknown as Membership,
        baseRem,
      ) as unknown as T;
    } else if (l && s) {
      if (hl === hs) out = l;
      else if (b !== undefined && hl === b) out = s; // 다른 기기만 고쳤다
      else if (b !== undefined && hs === b) out = l; // 이 기기만 고쳤다
      else if (table === "customers") {
        out = combineCustomer(
          l as unknown as Customer,
          s as unknown as Customer,
          base,
        ) as unknown as T;
        conflicts++;
      } else if (table === "memberships") {
        out = combineMembership(
          l as unknown as Membership,
          s as unknown as Membership,
          base.remaining[k],
        ) as unknown as T;
      } else {
        out = l;
        conflicts++;
      }
    } else if (l) {
      // 서버에 없다 — 새로 만들었거나, 다른 기기가 지웠거나
      if (b === undefined) out = l; // 새로 만든 줄
      else if (hl !== b) out = l; // 지워졌지만 그 뒤 이 기기가 고쳤다 — 살린다
      else out = undefined; // 다른 기기가 지웠다
    } else if (s) {
      // 이 기기에 없다 — 다른 기기가 만들었거나, 이 기기가 지웠거나
      if (b === undefined) out = s; // 다른 기기가 새로 만든 줄 — 받아 온다
      else if (hs !== b) out = s; // 지웠지만 그 사이 다른 기기가 고쳤다 — 살린다
      else {
        out = undefined;
        deletes.push(k); // 이 기기가 지웠다 — 서버에서도 지운다
      }
    }

    if (!out) {
      if (l) changed = true;
      continue;
    }
    rows.push(out);
    if (out !== l) changed = true;
    if (!s || fp(out) !== hs) upserts.push(out);
  }

  return { rows, upserts, deletes, conflicts, changed };
}

/**
 * 이 기기 자료 · 서버 자료 · 마지막으로 맞췄을 때의 지문 → 합친 결과와 할 일.
 */
export function planSync(
  local: MergeData,
  server: MergeData,
  base: SyncBase,
): MergePlan {
  const merged = {} as MergeData;
  const upserts = {} as MergeData;
  const deletes = { preferences: [] } as unknown as MergePlan["deletes"];
  let conflicts = 0;
  let localChanged = false;

  for (const t of TABLES) {
    const r = mergeTable(
      t,
      local[t] as Array<{ id: string }>,
      server[t] as Array<{ id: string }>,
      base,
    );
    (merged as unknown as Record<string, unknown>)[t] = r.rows;
    (upserts as unknown as Record<string, unknown>)[t] = r.upserts;
    deletes[t] = r.deletes;
    conflicts += r.conflicts;
    if (r.changed) localChanged = true;
  }

  /*
   * 아직 방문 · 이용권이 가리키는 고객은 지우지 않는다.
   *
   * 이 기기에서 고객을 합쳐 한 분을 지우는 사이, 다른 기기가 바로 그분에게
   * 방문을 적을 수 있다. 그대로 지우면 서버가 외래키로 거부하고, 다음
   * 저장에서도 또 거부해 그 뒤로 아무것도 안 올라간다. 그래서 그분을 다시
   * 살려 두고(방문이 갈 곳이 있게) 다음에 다시 합치게 한다.
   */
  const referenced = new Set([
    ...merged.visits.map((v) => toUuid(v.customerId)),
    ...merged.memberships.map((m) => toUuid(m.customerId)),
  ]);
  const serverCustomers = new Map(server.customers.map((c) => [keyOf(c), c]));
  deletes.customers = deletes.customers.filter((k) => {
    if (!referenced.has(k)) return true;
    const c = serverCustomers.get(k);
    if (c) {
      merged.customers.push(c);
      localChanged = true;
    }
    return false;
  });

  // 케어 선호 — 서버에 있는데 합친 결과 어디에도 없으면 이 기기가 지운 것.
  // 지우는 고객의 선호도 먼저 지워야 고객 줄이 지워진다.
  const keptPrefs = new Set(
    merged.customers.flatMap((c) => (c.preferences ?? []).map(keyOf)),
  );
  for (const c of server.customers) {
    for (const p of c.preferences ?? []) {
      if (!keptPrefs.has(keyOf(p))) deletes.preferences.push(keyOf(p));
    }
  }

  return { merged, upserts, deletes, conflicts, localChanged };
}

/** 올리거나 지울 것이 하나라도 있는가 */
export function hasWork(plan: MergePlan): boolean {
  return (
    TABLES.some((t) => plan.upserts[t].length > 0 || plan.deletes[t].length > 0) ||
    plan.deletes.preferences.length > 0
  );
}

// ---------------------------------------------------------
// base 보관 — 지점마다 하나
// ---------------------------------------------------------

const BASE_KEY = (branchId: string) => `jt-sync-base:${toUuid(branchId)}`;

export function readBase(branchId: string): SyncBase | undefined {
  try {
    const raw = window.localStorage.getItem(BASE_KEY(branchId));
    if (!raw) return undefined;
    const b = JSON.parse(raw) as SyncBase;
    return b && b.v === 1 && b.rows ? b : undefined;
  } catch {
    return undefined;
  }
}

export function writeBase(branchId: string, base: SyncBase): void {
  try {
    window.localStorage.setItem(BASE_KEY(branchId), JSON.stringify(base));
  } catch {
    /* 못 적으면 다음 번엔 서버 기준으로 다시 맞춘다 — 잃는 것은 없다 */
  }
}

export function clearBase(branchId: string): void {
  try {
    window.localStorage.removeItem(BASE_KEY(branchId));
  } catch {
    /* 무시 */
  }
}
