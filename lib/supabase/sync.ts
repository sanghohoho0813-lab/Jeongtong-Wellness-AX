"use client";

/**
 * 직원 AX ↔ Supabase 동기화
 * ==========================
 *
 * 왜 액션마다 서버를 부르지 않는가
 * --------------------------------
 * 스무 개 남짓한 액션(addVisit, removeMembership, restoreVisit …)을 전부
 * 비동기 서버 호출로 바꾸면 화면 코드가 전부 따라 바뀐다. 지금 잘 돌고 있는
 * 것을 한꺼번에 흔드는 셈이고, 실패했을 때 되돌리는 경우의 수도 액션마다
 * 따로 생긴다.
 *
 * 대신 **상태가 바뀌면 잠시 뒤 통째로 밀어 넣는다**. 매장 하나가 다루는
 * 자료는 고객 수백 명 · 방문 수천 건 규모라서, 통째로 보내도 한 번에 끝난다.
 * 화면은 지금까지처럼 즉시 바뀌고(있던 그대로), 저장은 뒤에서 따라간다.
 *
 * 대신 감수하는 것: 두 사람이 같은 시각에 같은 고객을 고치면 나중 저장이
 * 이긴다. 지금 매장 규모에서 실제로 생길 일이 아니고, 생기기 시작하면
 * 그때 행 단위 갱신으로 좁히면 된다.
 *
 * 켜지는 조건
 * -----------
 * 매장 계정으로 로그인했을 때만 돈다. 로그인하지 않으면 지금까지와 똑같이
 * 이 기기 안에서만(localStorage) 움직인다 — 시연이나 연습은 그대로 하면 된다.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
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
  branchFromRow,
  branchToRow,
  customerFromRow,
  customerToRow,
  membershipFromRow,
  membershipToRow,
  preferenceFromRow,
  preferenceToRow,
  productFromRow,
  productToRow,
  staffFromRow,
  staffToRow,
  visitFromRow,
  visitToRow,
} from "./mappers";
import { toUuid } from "./ids";

export interface SyncData {
  branches: Branch[];
  staff: Staff[];
  customers: Customer[];
  memberships: Membership[];
  visits: Visit[];
  products: ServiceProduct[];
}

/** 지금 로그인한 매장 계정이 어느 지점 · 어떤 사람인지 */
export interface StaffIdentity {
  authUserId: string;
  staffId: string;
  staffName: string;
  branchId: string;
  role: "owner" | "manager" | "staff";
}

/**
 * 로그인한 계정에 이어진 직원 레코드를 찾는다.
 *
 * 없으면 null 이다. 로그인은 됐는데 staff.auth_user_id 가 비어 있는 상태이며,
 * 이때 화면에는 "계정은 되는데 아무것도 안 보임" 이 아니라 무엇을 해야 하는지
 * (관리자가 계정을 이어 줘야 한다) 를 띄운다.
 */
export async function loadStaffIdentity(
  sb: SupabaseClient,
): Promise<StaffIdentity | null> {
  const { data: auth } = await sb.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return null;

  const { data, error } = await sb
    .from("staff")
    .select("id,name,role,branch_id")
    .eq("auth_user_id", uid)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    authUserId: uid,
    staffId: data.id,
    staffName: data.name,
    branchId: data.branch_id,
    role: data.role,
  };
}

// ---------------------------------------------------------
// 내려받기
// ---------------------------------------------------------

/**
 * 지점 자료를 통째로 읽어 온다.
 *
 * 방문 기록이 수천 건이면 한 번에 다 오지 않는다(Supabase 기본 상한 1,000행).
 * 그래서 방문만 페이지를 넘겨 가며 받는다. 여기서 잘리면 평균 이용주기와
 * 방문 횟수가 조용히 틀린 값이 되므로 눈에 띄지도 않는다.
 */
export async function pullAll(
  sb: SupabaseClient,
  branchId: string,
): Promise<SyncData> {
  const bid = toUuid(branchId);

  const [branches, staff, customers, prefs, memberships, products] =
    await Promise.all([
      sb.from("branches").select("*").eq("id", bid),
      sb.from("staff").select("*").eq("branch_id", bid),
      pullCustomers(sb, bid),
      sb.from("customer_preferences").select("*").eq("branch_id", bid),
      sb.from("memberships").select("*").eq("branch_id", bid),
      sb.from("service_products").select("*").eq("branch_id", bid),
    ]);

  const firstError =
    branches.error ??
    staff.error ??
    customers.error ??
    prefs.error ??
    memberships.error ??
    products.error;
  if (firstError) throw firstError;

  const visits = await pullVisits(sb, bid);

  // 선호 항목을 고객별로 모아 둔다
  const prefsBy = new Map<string, CarePreference[]>();
  for (const row of prefs.data ?? []) {
    const p = preferenceFromRow(row);
    const list = prefsBy.get(p.customerId) ?? [];
    const { customerId: _drop, ...pref } = p;
    void _drop;
    list.push(pref);
    prefsBy.set(p.customerId, list);
  }

  return {
    branches: (branches.data ?? []).map(branchFromRow),
    staff: (staff.data ?? []).map(staffFromRow),
    customers: (customers.data ?? []).map((r) =>
      customerFromRow(r, prefsBy.get(r.id) ?? []),
    ),
    memberships: (memberships.data ?? []).map(membershipFromRow),
    visits,
    products: (products.data ?? []).map(productFromRow),
  };
}

/**
 * 고객은 테이블이 아니라 뷰에서 읽는다.
 *
 * customers.phone 은 컬럼 단위로 읽기 권한을 회수해 둔다
 * (supabase/auth-hardening.sql). 원문은 ADMIN 에게만, 직원에게는 가린
 * 값이 이 뷰를 통해서만 나온다.
 *
 * 아직 그 SQL 을 돌리지 않은 서버도 있다. 그때는 뷰가 없거나 모양이
 * 달라 실패하는데, 그것 때문에 매장 화면 전체가 멎으면 안 된다.
 * 실패하면 테이블로 되돌아간다 — 지점 범위는 어느 쪽이든 RLS 가 잡는다.
 */
async function pullCustomers(sb: SupabaseClient, bid: string) {
  const v = await sb.from("customers_view").select("*").eq("branch_id", bid);
  if (!v.error) return v;
  return sb.from("customers").select("*").eq("branch_id", bid);
}

const PAGE = 1000;

async function pullVisits(sb: SupabaseClient, bid: string): Promise<Visit[]> {
  const out: Visit[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from("visits")
      .select("*")
      .eq("branch_id", bid)
      .order("visited_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows.map((r) => visitFromRow(r)));
    if (rows.length < PAGE) break;
  }
  return out;
}

// ---------------------------------------------------------
// 올려보내기
// ---------------------------------------------------------

/** upsert 는 한 번에 너무 많이 보내면 실패한다 — 나눠 보낸다 */
async function upsertChunked(
  sb: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  size = 400,
) {
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await sb
      .from(table)
      .upsert(rows.slice(i, i + size), { onConflict: "id" });
    if (error) throw error;
  }
}

/**
 * 고객만 함수로 저장한다.
 *
 * 연락처 컬럼의 읽기 권한을 회수한 뒤부터, PostgREST 의 upsert 는
 * 테이블 전체 select 를 요구하며 42501 로 막힌다 (select id · update ·
 * insert 는 되는데 on conflict 만 막힌다). 그래서 고객 저장만 서버 함수
 * 하나로 모았다 — 요청 수는 그대로 한 번이고, 클라이언트에게 테이블
 * select 권한을 되돌려 줄 필요도 없다.
 *
 * 함수가 안 깔린 서버(아직 auth-hardening.sql 을 안 돌린 곳)에서는
 * 예전처럼 upsert 로 되돌아간다.
 */
async function saveCustomers(
  sb: SupabaseClient,
  bid: string,
  customers: Customer[],
) {
  const rows = customers.map((c) => customerToRow(c));
  if (rows.length === 0) return;

  const { error } = await sb.rpc("save_customers", { p_rows: rows });
  if (!error) return;
  // 함수가 아직 없는 서버 — 아래 느린 길로 간다
  if (!/function|does not exist|PGRST202|schema cache/i.test(error.message ?? "")) {
    throw error;
  }

  /*
   * 함수가 없을 때의 길.
   *
   * upsert 는 못 쓴다(42501). 대신 있는 줄과 없는 줄을 갈라
   *   · 없는 줄 → 한 번에 insert
   *   · 있는 줄 → 한 줄씩 update
   * 로 나눈다. update 는 보낸 칸만 고치므로, 연락처를 빼면 서버 값이 남는다.
   * 요청 수가 고객 수만큼 늘어나므로 어디까지나 임시 길이다.
   */
  const { data: existing, error: readErr } = await sb
    .from("customers")
    .select("id")
    .eq("branch_id", bid);
  if (readErr) throw readErr;
  const have = new Set((existing ?? []).map((r) => r.id as string));

  const fresh = rows.filter((r) => !have.has(r.id as string));
  if (fresh.length > 0) {
    // 새 줄은 연락처가 반드시 있어야 한다 (NOT NULL)
    const withPhone = fresh.map((r) => ({ ...r, phone: r.phone ?? "" }));
    for (let i = 0; i < withPhone.length; i += 400) {
      const { error: e } = await sb
        .from("customers")
        .insert(withPhone.slice(i, i + 400));
      if (e) throw e;
    }
  }

  for (const r of rows) {
    if (!have.has(r.id as string)) continue;
    const { id, phone, ...rest } = r;
    // 가려진 값(null)이면 그 칸을 빼고 보낸다 — 서버 원본을 지킨다
    const patch = phone === null ? rest : { ...rest, phone };
    const { error: e } = await sb.from("customers").update(patch).eq("id", id);
    if (e) throw e;
  }
}

/**
 * 현재 상태를 서버에 반영한다.
 *
 * 순서가 중요하다. 방문은 고객과 이용권을 가리키고 있어서, 고객보다 먼저
 * 넣으면 외래키에서 막힌다. 지점 → 직원 → 고객 → 이용권 → 방문 순이다.
 *
 * 지운 기록도 함께 반영한다. 서버에만 남아 있고 이 기기에는 없는 줄은
 * 매장이 지운 것이므로 서버에서도 지운다. 이걸 빼먹으면 고객 화면에는
 * 지운 방문이 계속 보인다.
 */
export async function pushAll(
  sb: SupabaseClient,
  branchId: string,
  data: SyncData,
  opts: { isAdmin: boolean } = { isAdmin: true },
): Promise<void> {
  const bid = toUuid(branchId);
  /*
   * 직원(STAFF)은 매장 설정을 못 고친다.
   *
   * 지점 정보 · 직원 명단 · 가격표는 관리자만 쓸 수 있다(RLS). 그런데
   * 여기서는 바뀐 것만 골라 보내는 게 아니라 늘 통째로 밀어 넣으므로,
   * 직원 계정에서는 첫 표에서 403 이 나고 **그 뒤 고객·방문·이용권까지
   * 통째로 안 올라간다**. 화면에는 저장된 것처럼 보이는데 서버에는 없다.
   *
   * 그래서 직원 세션에서는 관리자 몫의 표를 아예 건너뛴다. 직원이 그
   * 표들을 바꿀 수 있는 화면도 없으니 보낼 것도 없다.
   */
  const admin = opts.isAdmin;

  /*
   * 지점은 upsert 가 아니라 update 다.
   *
   * 지점 행은 이미 서버에 있다 — 없으면 직원 계정이 그 지점을 가리킬 수
   * 없어 로그인 단계에서 걸린다. 그런데 upsert 는 결국 INSERT 문이라,
   * 소속 본사(hq_id)를 빼고 보내면 "hq_id 가 비었다" 며 통째로 거부된다.
   * 그렇다고 기기에 있는 값을 보내면 서버에 없는 본사를 가리키게 된다.
   * 어느 쪽도 맞지 않아서, 있는 행의 이름·주소·연락처만 고친다.
   */
  if (admin) {
    for (const b of data.branches) {
      const { id: _id, ...patch } = branchToRow(b);
      void _id;
      const { error } = await sb.from("branches").update(patch).eq("id", toUuid(b.id));
      if (error) throw error;
    }
    await upsertChunked(sb, "staff", data.staff.map(staffToRow));
  }
  await saveCustomers(sb, bid, data.customers);
  if (admin) {
    await upsertChunked(
      sb,
      "service_products",
      data.products.map(productToRow),
    );
  }
  await upsertChunked(sb, "memberships", data.memberships.map(membershipToRow));
  await upsertChunked(sb, "visits", data.visits.map(visitToRow));

  // 케어 선호는 고객 행 안에 얹혀 있어 따로 펴 준다
  const prefRows = data.customers.flatMap((c) =>
    (c.preferences ?? []).map((p) => preferenceToRow(p, c.id, c.branchId)),
  );
  await upsertChunked(sb, "customer_preferences", prefRows);

  await deleteMissing(sb, bid, data, admin);
}

/**
 * 이 기기에서 지운 기록을 서버에서도 지운다.
 *
 * 서버의 id 목록만 받아 와 (전체 행이 아니라) 이 기기에 없는 것을 고른다.
 * 지우는 순서는 넣을 때의 반대다 — 방문이 이용권을 가리키므로 방문부터.
 */
async function deleteMissing(
  sb: SupabaseClient,
  bid: string,
  data: SyncData,
  admin: boolean,
) {
  const plan: Array<[string, Set<string>]> = [
    ["visits", new Set(data.visits.map((v) => toUuid(v.id)))],
    ["memberships", new Set(data.memberships.map((m) => toUuid(m.id)))],
    [
      "customer_preferences",
      new Set(
        data.customers.flatMap((c) =>
          (c.preferences ?? []).map((p) => toUuid(p.id)),
        ),
      ),
    ],
    ["customers", new Set(data.customers.map((c) => toUuid(c.id)))],
    // 가격표를 지우는 것도 관리자 몫이다
    ...(admin
      ? ([["service_products", new Set(data.products.map((p) => toUuid(p.id)))]] as Array<
          [string, Set<string>]
        >)
      : []),
  ];

  for (const [table, keep] of plan) {
    const { data: rows, error } = await sb
      .from(table)
      .select("id")
      .eq("branch_id", bid);
    if (error) throw error;
    const gone = (rows ?? []).map((r) => r.id).filter((id) => !keep.has(id));
    for (let i = 0; i < gone.length; i += 200) {
      const { error: delErr } = await sb
        .from(table)
        .delete()
        .in("id", gone.slice(i, i + 200));
      if (delErr) throw delErr;
    }
  }
}

// ---------------------------------------------------------
// 고객이 보낸 것 받아 오기 (밖 → 안)
// ---------------------------------------------------------

export interface CustomerFeedbackRow {
  id: string;
  customerId: string;
  visitId?: string;
  satisfaction?: number;
  revisitIntent?: "yes" | "maybe" | "no";
  note?: string;
  homecareInterest?: boolean;
  createdAt: string;
  readAt?: string;
}

export interface CustomerRequestRow {
  id: string;
  customerId: string;
  kind: "booking" | "inquiry";
  preferredDate?: string;
  preferredSlot?: "morning" | "afternoon" | "evening";
  note?: string;
  status: "open" | "handled" | "closed";
  createdAt: string;
  handledAt?: string;
}

/** 고객이 남긴 피드백 · 요청 — 직원 화면이 읽기 전용으로 본다 */
export async function pullCustomerInbox(
  sb: SupabaseClient,
  branchId: string,
): Promise<{ feedback: CustomerFeedbackRow[]; requests: CustomerRequestRow[] }> {
  const bid = toUuid(branchId);
  const [fb, rq] = await Promise.all([
    sb
      .from("customer_feedback")
      .select("*")
      .eq("branch_id", bid)
      .order("created_at", { ascending: false })
      .limit(500),
    sb
      .from("customer_requests")
      .select("*")
      .eq("branch_id", bid)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  if (fb.error) throw fb.error;
  if (rq.error) throw rq.error;

  return {
    feedback: (fb.data ?? []).map((r) => ({
      id: r.id,
      customerId: r.customer_id,
      visitId: r.visit_id ?? undefined,
      satisfaction: r.satisfaction ?? undefined,
      revisitIntent: r.revisit_intent ?? undefined,
      note: r.note ?? undefined,
      homecareInterest: r.homecare_interest ?? undefined,
      createdAt: r.created_at,
      readAt: r.read_at ?? undefined,
    })),
    requests: (rq.data ?? []).map((r) => ({
      id: r.id,
      customerId: r.customer_id,
      kind: r.kind,
      preferredDate: r.preferred_date ?? undefined,
      preferredSlot: r.preferred_slot ?? undefined,
      note: r.note ?? undefined,
      status: r.status,
      createdAt: r.created_at,
      handledAt: r.handled_at ?? undefined,
    })),
  };
}

/** 고객 연결코드 발급 — 매장이 고객에게 한 번 건네는 짧은 코드 */
export async function issueLinkCode(
  sb: SupabaseClient,
  args: { customerId: string; branchId: string; staffId?: string; days?: number },
): Promise<{ code: string; expiresAt: string }> {
  // 헷갈리는 글자(O/0, I/1)는 뺀다. 어르신이 문자로 받아 손으로 옮겨 적는다
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  const code = Array.from({ length: 6 }, pick).join("");

  const days = args.days ?? 14;
  const expiresAt = new Date(Date.now() + days * 86400_000).toISOString();

  const { error } = await sb.from("customer_link_codes").insert({
    code,
    customer_id: toUuid(args.customerId),
    branch_id: toUuid(args.branchId),
    created_by_staff_id: args.staffId ? toUuid(args.staffId) : null,
    expires_at: expiresAt,
  });
  if (error) throw error;
  return { code, expiresAt };
}
