/**
 * 대시보드 / AX 도입성과 지표 계산
 * 모든 지표는 실제 저장된 데이터에서 계산한다 (허구 성과 없음).
 */

import {
  BriefingTask,
  CareRuleSettings,
  Customer,
  Membership,
  Visit,
} from "@/lib/types";
import { daysAgo, monthKey, recentMonthKeys, todayISO } from "@/lib/utils/date";
import { CustomerFacts, calcAvgCycleDays } from "./priority";

export interface DashboardKpis {
  todayNewConsults: number; // 오늘 신규 상담
  revisitDueCount: number; // 재방문 예정 고객 (관리일 도래 ±window)
  todayVisits: number; // 오늘 방문 완료
  monthRevenue: number; // 이번 달 매출 (이용권 판매 + 현장 결제)
}

export function calcDashboardKpis(
  customers: Customer[],
  visits: Visit[],
  memberships: Membership[],
  rules: CareRuleSettings,
): DashboardKpis {
  const today = todayISO();
  const thisMonth = monthKey(today);

  const todayNewConsults = visits.filter(
    (v) => v.type === "consult" && v.visitedAt.slice(0, 10) === today,
  ).length;

  const todayVisits = visits.filter(
    (v) => v.type === "visit" && v.visitedAt.slice(0, 10) === today,
  ).length;

  const revisitDueCount = customers.filter((c) => {
    if (!c.nextManageDate) return false;
    const diff = daysAgo(c.nextManageDate); // 양수 = 경과
    return diff >= -rules.revisitWindowDays;
  }).length;

  const membershipRevenue = memberships
    .filter((m) => monthKey(m.purchasedAt) === thisMonth)
    .reduce((sum, m) => sum + m.price, 0);
  const visitRevenue = visits
    .filter((v) => monthKey(v.visitedAt) === thisMonth)
    .reduce((sum, v) => sum + (v.amount ?? 0), 0);

  return {
    todayNewConsults,
    revisitDueCount,
    todayVisits,
    monthRevenue: membershipRevenue + visitRevenue,
  };
}

export interface MonthlyMetric {
  month: string; // YYYY-MM
  newCustomers: number;
  visitCount: number;
  revisitCustomers: number; // 해당 월에 2회차 이상 방문한 고객 수
  revenue: number;
  membershipSold: number;
}

/** 최근 n개월 월별 지표 */
export function calcMonthlyMetrics(
  customers: Customer[],
  visits: Visit[],
  memberships: Membership[],
  months = 6,
): MonthlyMetric[] {
  const keys = recentMonthKeys(months);

  // 고객별 첫 방문일 (재방문 판별용)
  const firstVisitByCustomer = new Map<string, string>();
  for (const v of visits) {
    if (v.type !== "visit") continue;
    const d = v.visitedAt.slice(0, 10);
    const prev = firstVisitByCustomer.get(v.customerId);
    if (!prev || d < prev) firstVisitByCustomer.set(v.customerId, d);
  }

  return keys.map((key) => {
    const monthVisits = visits.filter(
      (v) => v.type === "visit" && monthKey(v.visitedAt) === key,
    );
    const revisitSet = new Set(
      monthVisits
        .filter(
          (v) =>
            firstVisitByCustomer.get(v.customerId)! < v.visitedAt.slice(0, 10),
        )
        .map((v) => v.customerId),
    );
    const monthMemberships = memberships.filter(
      (m) => monthKey(m.purchasedAt) === key,
    );
    return {
      month: key,
      newCustomers: customers.filter((c) => monthKey(c.registeredAt) === key)
        .length,
      visitCount: monthVisits.length,
      revisitCustomers: revisitSet.size,
      revenue:
        monthMemberships.reduce((s, m) => s + m.price, 0) +
        monthVisits.reduce((s, v) => s + (v.amount ?? 0), 0),
      membershipSold: monthMemberships.length,
    };
  });
}

export interface AxSummary {
  totalCustomers: number;
  newCustomers30d: number;
  revisitRate: number; // 2회 이상 방문 고객 비율
  dormantCount: number;
  avgVisitGapDays?: number;
  taskDoneCount: number;
  taskTotalCount: number;
  taskDoneRate: number;
  visitCount30d: number;
}

export function calcAxSummary(
  allFacts: CustomerFacts[],
  tasks: BriefingTask[],
  rules: CareRuleSettings,
): AxSummary {
  const totalCustomers = allFacts.length;
  let revisitCustomers = 0;
  let visitedCustomers = 0;
  let dormantCount = 0;
  let gapSum = 0;
  let gapCount = 0;
  let newCustomers30d = 0;
  let visitCount30d = 0;

  for (const f of allFacts) {
    const realVisits = f.visits.filter((v) => v.type === "visit");
    if (realVisits.length > 0) visitedCustomers++;
    if (realVisits.length >= 2) revisitCustomers++;
    if (daysAgo(f.customer.registeredAt) <= 30) newCustomers30d++;
    visitCount30d += realVisits.filter(
      (v) => daysAgo(v.visitedAt) <= 30,
    ).length;

    const last = realVisits
      .map((v) => v.visitedAt.slice(0, 10))
      .sort()
      .at(-1);
    if (last && daysAgo(last) >= rules.dormantDays) dormantCount++;

    const cycle = calcAvgCycleDays(f.visits);
    if (cycle !== undefined) {
      gapSum += cycle;
      gapCount++;
    }
  }

  const doneCount = tasks.filter((t) => t.status === "done").length;

  return {
    totalCustomers,
    newCustomers30d,
    revisitRate: visitedCustomers > 0 ? revisitCustomers / visitedCustomers : 0,
    dormantCount,
    avgVisitGapDays: gapCount > 0 ? Math.round(gapSum / gapCount) : undefined,
    taskDoneCount: doneCount,
    taskTotalCount: tasks.length,
    taskDoneRate: tasks.length > 0 ? doneCount / tasks.length : 0,
    visitCount30d,
  };
}
