/**
 * 앱 도메인 타입 ↔ 데이터베이스 행
 * =================================
 *
 * 화면이 쓰는 모양(camelCase, 날짜 문자열)과 표가 쓰는 모양(snake_case,
 * timestamptz)은 다르다. 그 변환을 여기 한 곳에만 둔다.
 *
 * 이 파일 밖에서는 snake_case 를 볼 일이 없어야 한다. 화면 코드 곳곳에
 * `next_manage_date` 같은 이름이 섞이기 시작하면, 나중에 컬럼 하나를
 * 바꿀 때 어디를 고쳐야 하는지 아무도 모르게 된다.
 */

import type {
  BodyPartRecord,
  Branch,
  CarePreference,
  Customer,
  Membership,
  MembershipStatus,
  PreferenceCategory,
  ServiceProduct,
  Staff,
  StaffRole,
  Visit,
} from "@/lib/types";
import { toUuid, toUuidOpt } from "./ids";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** timestamptz → 화면이 쓰는 지역시각 문자열 (YYYY-MM-DDTHH:mm:ss) */
export function fromTimestamptz(v: string | null | undefined): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
}

/**
 * 화면의 지역시각 문자열 → timestamptz 로 보낼 값.
 *
 * 여기가 조용히 하루를 밀어내는 자리다. "2026-08-19T14:30" 을 그대로
 * 보내면 Postgres 는 서버 타임존으로 읽는다. 한국 오후 2시 방문이
 * 전날로 기록되면 평균 이용주기가 통째로 어긋난다.
 * 그래서 Date 로 한 번 세워 ISO(UTC)로 못 박아 보낸다.
 */
export function toTimestamptz(v: string | undefined): string | null {
  if (!v) return null;
  const s = v.length === 10 ? `${v}T00:00:00` : v;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** date 컬럼 → YYYY-MM-DD (빈 값은 undefined 로 둔다) */
const asDate = (v: unknown): string | undefined =>
  typeof v === "string" && v.length >= 10 ? v.slice(0, 10) : undefined;

/** time 컬럼("14:30:00") → 화면 표기("14:30") */
const asTime = (v: unknown): string | undefined =>
  typeof v === "string" && v.length >= 4 ? v.slice(0, 5) : undefined;

const asText = (v: unknown): string | undefined => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : undefined;
};

/** jsonb 부위 배열 — 표는 sub_part, 화면은 subPart 를 쓴다 */
function partsFromDb(v: unknown): BodyPartRecord[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => x && typeof x === "object" && typeof (x as Row).part === "string")
    .map((x) => {
      const r = x as Row;
      return {
        part: r.part,
        side: r.side ?? undefined,
        subPart: r.subPart ?? r.sub_part ?? undefined,
        note: r.note ?? undefined,
      } as BodyPartRecord;
    });
}

function partsToDb(v: BodyPartRecord[] | undefined): Row[] {
  if (!Array.isArray(v)) return [];
  return v.map((p) => ({
    part: p.part,
    side: p.side ?? null,
    sub_part: p.subPart ?? null,
    note: p.note ?? null,
  }));
}

// ---------- 지점 ----------

export function branchFromRow(r: Row): Branch {
  return {
    id: r.id,
    hqId: r.hq_id ?? "hq-1",
    name: r.name ?? "",
    address: asText(r.address),
    phone: asText(r.phone),
    openHours: asText(r.open_hours),
    createdAt: asDate(r.created_at) ?? "",
  };
}

/**
 * 지점 갱신용 행.
 *
 * hq_id 는 일부러 넣지 않는다. 어느 본사 소속인지는 처음 만들 때 한 번
 * 정해지는 값이고, 기기에 저장된 값으로 덮어쓰면 서버에 없는 본사를
 * 가리키게 되어 저장이 통째로 막힌다.
 */
export function branchToRow(b: Branch): Row {
  return {
    id: toUuid(b.id),
    name: b.name,
    address: b.address ?? null,
    phone: b.phone ?? null,
    open_hours: b.openHours ?? null,
  };
}

// ---------- 직원 ----------

export function staffFromRow(r: Row): Staff {
  return {
    id: r.id,
    branchId: r.branch_id,
    name: r.name ?? "",
    role: (r.role ?? "staff") as StaffRole,
    phone: asText(r.phone),
    active: r.active !== false,
  };
}

export function staffToRow(s: Staff): Row {
  return {
    id: toUuid(s.id),
    branch_id: toUuid(s.branchId),
    name: s.name,
    role: s.role,
    phone: s.phone ?? null,
    active: s.active !== false,
  };
}

// ---------- 고객 ----------

export function customerFromRow(r: Row, preferences: CarePreference[] = []): Customer {
  return {
    id: r.id,
    branchId: r.branch_id,
    name: r.name ?? "",
    phone: asText(r.phone) ?? "",
    gender: r.gender ?? undefined,
    birthYear: typeof r.birth_year === "number" ? r.birth_year : undefined,
    ageGroup: asText(r.age_group),
    consultationNote: asText(r.consultation_note),
    registeredAt: asDate(r.registered_at) ?? "",
    assignedStaffId: r.assigned_staff_id ?? undefined,
    memo: asText(r.memo),
    focusBodyParts: partsFromDb(r.focus_body_parts),
    nextManageDate: asDate(r.next_manage_date),
    nextManageTime: asTime(r.next_manage_time),
    lastContactDate: asDate(r.last_contact_date),
    tags: Array.isArray(r.tags) ? r.tags : undefined,
    preferences: preferences.length ? preferences : undefined,
  };
}

export function customerToRow(c: Customer): Row {
  return {
    id: toUuid(c.id),
    branch_id: toUuid(c.branchId),
    name: c.name,
    phone: c.phone ?? "",
    gender: c.gender ?? null,
    birth_year: c.birthYear ?? null,
    age_group: c.ageGroup ?? null,
    consultation_note: c.consultationNote ?? null,
    registered_at: c.registeredAt || null,
    assigned_staff_id: toUuidOpt(c.assignedStaffId),
    memo: c.memo ?? null,
    focus_body_parts: partsToDb(c.focusBodyParts),
    next_manage_date: c.nextManageDate ?? null,
    next_manage_time: c.nextManageTime ?? null,
    last_contact_date: c.lastContactDate ?? null,
    tags: c.tags ?? [],
  };
}

// ---------- 이용권 ----------

export function membershipFromRow(r: Row): Membership {
  return {
    id: r.id,
    branchId: r.branch_id,
    customerId: r.customer_id,
    programName: r.program_name ?? "",
    totalCount: r.total_count ?? 0,
    remainingCount: r.remaining_count ?? 0,
    purchasedAt: asDate(r.purchased_at) ?? "",
    expiresAt: asDate(r.expires_at),
    price: r.price ?? 0,
    status: (r.status ?? "active") as MembershipStatus,
  };
}

export function membershipToRow(m: Membership): Row {
  return {
    id: toUuid(m.id),
    branch_id: toUuid(m.branchId),
    customer_id: toUuid(m.customerId),
    program_name: m.programName,
    total_count: m.totalCount,
    remaining_count: m.remainingCount,
    purchased_at: m.purchasedAt || null,
    expires_at: m.expiresAt ?? null,
    price: m.price ?? 0,
    status: m.status,
  };
}

// ---------- 방문 ----------

export function visitFromRow(r: Row, appliedPreferenceIds: string[] = []): Visit {
  return {
    id: r.id,
    branchId: r.branch_id,
    customerId: r.customer_id,
    staffId: r.staff_id ?? undefined,
    visitedAt: fromTimestamptz(r.visited_at),
    type: r.type === "consult" ? "consult" : "visit",
    programName: asText(r.program_name),
    membershipId: r.membership_id ?? undefined,
    bodyParts: partsFromDb(r.body_parts),
    reaction: asText(r.reaction),
    amount: typeof r.amount === "number" ? r.amount : undefined,
    nextManageDate: asDate(r.next_manage_date),
    nextManageTime: asTime(r.next_manage_time),
    appliedPreferenceIds: appliedPreferenceIds.length ? appliedPreferenceIds : undefined,
  };
}

export function visitToRow(v: Visit): Row {
  return {
    id: toUuid(v.id),
    branch_id: toUuid(v.branchId),
    customer_id: toUuid(v.customerId),
    staff_id: toUuidOpt(v.staffId),
    visited_at: toTimestamptz(v.visitedAt),
    type: v.type,
    program_name: v.programName ?? null,
    membership_id: toUuidOpt(v.membershipId),
    body_parts: partsToDb(v.bodyParts),
    reaction: v.reaction ?? null,
    amount: v.amount ?? null,
    next_manage_date: v.nextManageDate ?? null,
    next_manage_time: v.nextManageTime ?? null,
  };
}

// ---------- 상품 (매장 가격표) ----------

export function productFromRow(r: Row): ServiceProduct {
  return {
    id: r.id,
    branchId: r.branch_id,
    name: r.name ?? "",
    serviceName: r.service_name ?? "",
    sessionCount: r.session_count ?? 1,
    price: r.price ?? 0,
    active: r.active !== false,
    sortOrder: r.sort_order ?? 0,
    source: r.source === "manual" ? "manual" : "price_sheet",
  };
}

export function productToRow(p: ServiceProduct): Row {
  return {
    id: toUuid(p.id),
    branch_id: toUuid(p.branchId),
    name: p.name,
    service_name: p.serviceName,
    session_count: p.sessionCount,
    price: p.price,
    active: p.active,
    sort_order: p.sortOrder,
    source: p.source,
  };
}

// ---------- 케어 선호 ----------

/** 선호 항목은 고객 행에 얹어 돌려주므로 customer_id 를 함께 들고 나온다 */
export function preferenceFromRow(r: Row): CarePreference & { customerId: string } {
  return {
    id: r.id,
    customerId: r.customer_id,
    category: (r.category ?? "etc") as PreferenceCategory,
    note: r.note ?? "",
    pinned: r.pinned === true,
    createdAt: asDate(r.created_at) ?? "",
    createdByStaffId: r.created_by_staff_id ?? undefined,
  };
}

export function preferenceToRow(
  p: CarePreference,
  customerId: string,
  branchId: string,
): Row {
  return {
    id: toUuid(p.id),
    branch_id: toUuid(branchId),
    customer_id: toUuid(customerId),
    category: p.category,
    note: p.note,
    pinned: p.pinned === true,
    created_by_staff_id: toUuidOpt(p.createdByStaffId),
  };
}
