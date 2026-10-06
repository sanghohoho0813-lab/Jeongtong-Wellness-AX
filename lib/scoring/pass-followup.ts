/**
 * 이용권 챙길 분 — 기한 · 잔여 · 소진
 * ===================================
 *
 * 매출기회(opportunity.ts) 는 오늘 브리핑에 오른 고객에게만 붙는다. 그래서
 * 「기한이 엿새 남았는데 4회가 그대로 남은 이용권」 은 그 고객이 브리핑에
 * 오르지 않으면 아무 데도 안 보이고, 기한이 지나서야 손님 쪽에서 먼저
 * 「그거 날아갔어요?」 로 돌아온다.
 *
 * 여기서는 이용권 자료만 보고 「지금 연락할 이유가 있는 분」 을 한 줄씩 고른다.
 * 근거는 저장된 날짜 · 횟수뿐이다. 「재등록할 확률」 같은 숫자는 만들지 않는다.
 *
 * 한 분에 한 줄 — 이유가 여럿이면 가장 급한 것 하나만.
 *   1. 기한 임박  — 사용 기한까지 14일 이내, 남은 횟수 있음
 *   2. 기한 지남  — 기한이 지난 지 14일 이내, 남은 횟수 있음
 *   3. 다 쓰심    — 마지막으로 쓴 지 30일 이내, 지금 쓸 이용권 없음
 *   4. 잔여 적음  — 남은 횟수가 매장 기준(설정) 이하
 *
 * 최근 7일 안에 「연락함」 을 눌렀으면 목록 맨 아래로 내린다 — 오늘 할 일과
 * 이미 한 일을 섞지 않는다.
 */

import type { Customer, Membership, Visit } from "@/lib/types";
import { diffDays, todayISO } from "@/lib/utils/date";

export const EXPIRING_WITHIN_DAYS = 14;
export const EXPIRED_WITHIN_DAYS = 14;
export const EXHAUSTED_WITHIN_DAYS = 30;
export const CONTACTED_WITHIN_DAYS = 7;

export type PassFollowKind = "expiring" | "expired" | "exhausted" | "low";

export interface PassFollowUp {
  customerId: string;
  membershipId: string;
  kind: PassFollowKind;
  programName: string;
  remainingCount: number;
  /** 기한 임박이면 남은 날, 기한 지남이면 지난 날 */
  days?: number;
  /** 근거가 되는 날짜 — 기한 또는 마지막 사용일 */
  date?: string;
  /** 최근 7일 안에 연락함 */
  contacted: boolean;
  contactedAt?: string;
}

const RANK: Record<PassFollowKind, number> = {
  expiring: 0,
  expired: 1,
  exhausted: 2,
  low: 3,
};

/** 이 화면의 「권장」 — 무엇을 안내할지만, 문구는 짧게 */
export const PASS_FOLLOW_ACTION: Record<PassFollowKind, string> = {
  expiring: "기한 전 이용 안내",
  expired: "남은 횟수 상담",
  exhausted: "재등록 안내",
  low: "재등록 안내",
};

export function findPassFollowUps(
  customers: Customer[],
  memberships: Membership[],
  visits: Visit[],
  lowCount: number,
  today = todayISO(),
): PassFollowUp[] {
  const byCustomer = new Map<string, Membership[]>();
  for (const m of memberships) {
    const list = byCustomer.get(m.customerId) ?? [];
    list.push(m);
    byCustomer.set(m.customerId, list);
  }
  // 이용권마다 마지막으로 쓴 날
  const lastUse = new Map<string, string>();
  for (const v of visits) {
    if (!v.membershipId) continue;
    const d = v.visitedAt.slice(0, 10);
    if ((lastUse.get(v.membershipId) ?? "") < d) lastUse.set(v.membershipId, d);
  }

  const out: PassFollowUp[] = [];
  for (const c of customers) {
    const list = byCustomer.get(c.id);
    if (!list?.length) continue;

    const usable = list.filter(
      (m) =>
        m.status !== "expired" &&
        m.remainingCount > 0 &&
        (!m.expiresAt || m.expiresAt >= today),
    );
    const candidates: Omit<PassFollowUp, "contacted" | "contactedAt">[] = [];

    for (const m of list) {
      const base = {
        customerId: c.id,
        membershipId: m.id,
        programName: m.programName,
        remainingCount: m.remainingCount,
      };
      if (m.remainingCount > 0 && m.expiresAt) {
        const left = diffDays(m.expiresAt, today);
        if (left >= 0 && left <= EXPIRING_WITHIN_DAYS && m.status !== "expired") {
          candidates.push({ ...base, kind: "expiring", days: left, date: m.expiresAt });
          continue;
        }
        if (left < 0 && -left <= EXPIRED_WITHIN_DAYS) {
          candidates.push({ ...base, kind: "expired", days: -left, date: m.expiresAt });
          continue;
        }
      }
      if (m.remainingCount <= 0 && usable.length === 0) {
        const used = lastUse.get(m.id);
        if (used && diffDays(today, used) <= EXHAUSTED_WITHIN_DAYS) {
          candidates.push({ ...base, kind: "exhausted", date: used });
          continue;
        }
      }
      if (
        m.status === "active" &&
        m.remainingCount > 0 &&
        m.remainingCount <= lowCount &&
        (!m.expiresAt || m.expiresAt >= today)
      ) {
        candidates.push({ ...base, kind: "low" });
      }
    }

    if (!candidates.length) continue;
    candidates.sort(
      (a, b) =>
        RANK[a.kind] - RANK[b.kind] ||
        (a.kind === "expiring" ? (a.days ?? 0) - (b.days ?? 0) : 0) ||
        a.remainingCount - b.remainingCount,
    );
    const contactedAt = c.lastContactDate;
    const contacted =
      !!contactedAt && diffDays(today, contactedAt) <= CONTACTED_WITHIN_DAYS;
    out.push({ ...candidates[0], contacted, contactedAt });
  }

  return out.sort(
    (a, b) =>
      Number(a.contacted) - Number(b.contacted) ||
      RANK[a.kind] - RANK[b.kind] ||
      (a.days ?? 99) - (b.days ?? 99),
  );
}

/** 한 줄 설명 — 날짜는 「10월 12일」 처럼, 숫자는 저장된 그대로 */
export function describePassFollowUp(f: PassFollowUp): string {
  const md = (d?: string) =>
    d ? `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일` : "";
  switch (f.kind) {
    case "expiring":
      return `${f.programName} · 기한 ${md(f.date)}${
        f.days === 0 ? " (오늘까지)" : ` (${f.days}일 남음)`
      } · 잔여 ${f.remainingCount}회`;
    case "expired":
      return `${f.programName} · 기한 ${md(f.date)} 지남 · ${f.remainingCount}회 남은 채`;
    case "exhausted":
      return `${f.programName} 다 쓰심 (마지막 ${md(f.date)}) · 쓸 이용권 없음`;
    case "low":
      return `${f.programName} · 잔여 ${f.remainingCount}회`;
  }
}
