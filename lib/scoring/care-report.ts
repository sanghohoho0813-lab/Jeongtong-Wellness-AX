/**
 * 고객 케어 리포트 자료 만들기
 * ============================
 * 이 리포트는 직원이 보는 화면이 아니라 **고객에게 보여 드리는 한 장**이다.
 * 그래서 두 가지를 지킨다.
 *
 *  1) 고객이 자기 기록으로 알아볼 수 있는 말만 쓴다.
 *     Priority Score, 매출기회, 관리 필요 같은 내부 판정은 넣지 않는다.
 *     그건 매장이 일하려고 만든 분류이지 고객에게 할 말이 아니다.
 *  2) 지어내지 않는다. 효과·호전·개선 같은 표현을 쓰지 않고,
 *     실제로 남은 기록(언제 오셨고, 어디를 관리했고, 몇 회 남았는지)만 센다.
 *
 * 재등록 상담 자리에서 "이만큼 이용하셨고 이런 흐름이었습니다"를
 * 함께 보며 이야기하기 위한 자료다.
 */

import { BODY_PART_LABELS, BodyPart, Customer, Membership, Visit } from "@/lib/types";
import { diffDays } from "@/lib/utils/date";

export interface CarePartShare {
  part: BodyPart;
  label: string;
  /** 이 부위가 기록된 방문 수 */
  count: number;
  /** 전체 부위 기록 대비 비율 (0~1) */
  ratio: number;
}

export interface CareReportMembership {
  programName: string;
  totalCount: number;
  remainingCount: number;
  usedCount: number;
  /** 사용 진행률 (0~1) */
  progress: number;
  purchasedAt: string;
  expiresAt?: string;
  status: Membership["status"];
}

export interface CareReport {
  customer: Customer;
  /** 함께한 기간 (등록일부터 오늘까지 일수) */
  daysSinceRegistered: number;
  /** 방문(이용) 횟수 — 상담은 세지 않는다 */
  visitCount: number;
  /** 상담 횟수 */
  consultCount: number;
  firstVisitDate?: string;
  lastVisitDate?: string;
  /** 평균 이용 주기 (일). 방문이 2회 미만이면 undefined */
  avgCycleDays?: number;
  /** 많이 관리한 부위 순 */
  parts: CarePartShare[];
  /** 이용권 현황 (최근 구매 순) */
  memberships: CareReportMembership[];
  /** 사용 중인 이용권 잔여 합계 */
  remainingTotal: number;
  /** 다음 관리 예정일 */
  nextManageDate?: string;
  nextManageTime?: string;
  /** 매 방문 확인하기로 한 케어 선호 (고정된 것만) */
  pinnedPreferences: Array<{ category: string; note: string }>;
  /** 고객이 남긴 반응 중 최근 것 (최대 3개) */
  recentReactions: Array<{ date: string; note: string }>;
  /** 월별 방문 횟수 — 리포트의 흐름 막대 (오래된 달부터) */
  monthlyVisits: Array<{ month: string; count: number }>;
}

const PREF_LABELS: Record<string, string> = {
  temperature: "온도",
  pressure: "강도",
  position: "자세",
  environment: "환경",
  beverage: "음료",
  conversation: "대화",
  caution: "주의사항",
  etc: "기타",
};

/** 방문 간격의 평균 (일). 방문이 2회 미만이면 undefined */
function avgCycle(sortedVisitDates: string[]): number | undefined {
  if (sortedVisitDates.length < 2) return undefined;
  let total = 0;
  for (let i = 1; i < sortedVisitDates.length; i++) {
    total += diffDays(
      sortedVisitDates[i].slice(0, 10),
      sortedVisitDates[i - 1].slice(0, 10),
    );
  }
  return Math.round(total / (sortedVisitDates.length - 1));
}

/**
 * 최근 N개월의 방문 횟수를 달 순서대로 만든다.
 * 방문이 없는 달도 0으로 채워야 흐름이 끊겨 보이지 않는다.
 */
function monthlyCounts(
  visitDates: string[],
  months: number,
  today: Date,
): Array<{ month: string; count: number }> {
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    keys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return keys.map((month) => ({
    month,
    count: visitDates.filter((v) => v.slice(0, 7) === month).length,
  }));
}

/**
 * 한 고객의 리포트 자료를 만든다.
 *
 * @param today 기준 날짜 (테스트에서 고정하려고 받는다)
 */
export function buildCareReport(
  customer: Customer,
  visits: Visit[],
  memberships: Membership[],
  months = 6,
  today: Date = new Date(),
): CareReport {
  const mine = visits
    .filter((v) => v.customerId === customer.id)
    .sort((a, b) => a.visitedAt.localeCompare(b.visitedAt));
  const used = mine.filter((v) => v.type === "visit");
  const consults = mine.filter((v) => v.type === "consult");

  // 부위 집계 — 방문마다 기록한 부위를 모두 센다
  const partCount = new Map<BodyPart, number>();
  for (const v of used) {
    for (const p of v.bodyParts ?? []) {
      partCount.set(p.part, (partCount.get(p.part) ?? 0) + 1);
    }
  }
  const partTotal = [...partCount.values()].reduce((a, b) => a + b, 0);
  const parts: CarePartShare[] = [...partCount.entries()]
    .map(([part, count]) => ({
      part,
      label: BODY_PART_LABELS[part],
      count,
      ratio: partTotal > 0 ? count / partTotal : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const mineMs = memberships
    .filter((m) => m.customerId === customer.id)
    .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));

  const reportMs: CareReportMembership[] = mineMs.map((m) => ({
    programName: m.programName,
    totalCount: m.totalCount,
    remainingCount: m.remainingCount,
    usedCount: Math.max(0, m.totalCount - m.remainingCount),
    progress:
      m.totalCount > 0
        ? Math.min(1, Math.max(0, (m.totalCount - m.remainingCount) / m.totalCount))
        : 0,
    purchasedAt: m.purchasedAt,
    expiresAt: m.expiresAt,
    status: m.status,
  }));

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return {
    customer,
    daysSinceRegistered: Math.max(
      0,
      diffDays(todayStr, customer.registeredAt.slice(0, 10)),
    ),
    visitCount: used.length,
    consultCount: consults.length,
    firstVisitDate: used[0]?.visitedAt.slice(0, 10),
    lastVisitDate: used.at(-1)?.visitedAt.slice(0, 10),
    avgCycleDays: avgCycle(used.map((v) => v.visitedAt)),
    parts,
    memberships: reportMs,
    remainingTotal: mineMs
      .filter((m) => m.status === "active")
      .reduce((sum, m) => sum + m.remainingCount, 0),
    nextManageDate: customer.nextManageDate,
    nextManageTime: customer.nextManageTime,
    pinnedPreferences: (customer.preferences ?? [])
      .filter((p) => p.pinned)
      .map((p) => ({
        category: PREF_LABELS[p.category] ?? p.category,
        note: p.note,
      })),
    recentReactions: used
      .filter((v) => v.reaction && v.reaction.trim())
      .slice(-3)
      .reverse()
      .map((v) => ({ date: v.visitedAt.slice(0, 10), note: v.reaction!.trim() })),
    monthlyVisits: monthlyCounts(
      used.map((v) => v.visitedAt),
      months,
      today,
    ),
  };
}
