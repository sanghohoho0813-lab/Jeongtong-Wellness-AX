/**
 * 오늘의 실행 브리핑 — 규칙 기반 Priority Score 엔진
 *
 * 흐름:
 *   calculateCustomerPriority()  고객별 점수 + 근거 산출
 *   → classifyCustomerStatus()   관리 대상 분류
 *   → generateDailyBriefing()    오늘의 실행 과제 생성
 *
 * 설정(CareRuleSettings)의 기준값과 연동되며,
 * 향후 ML 기반 예측으로 교체 시 이 모듈만 바꾸면 된다.
 */

import {
  BriefingTask,
  CareRuleSettings,
  Customer,
  CustomerDerived,
  CustomerStatus,
  Membership,
  TaskCategory,
  Visit,
} from "@/lib/types";
import { daysAgo, diffDays, todayISO } from "@/lib/utils/date";

// ---------- 가중치 ----------

const WEIGHTS = {
  revisitDue: 30, // 다음 관리 예정일 도래
  revisitOverdue: 3, // 예정일 경과 1일당 가산
  cycleOver: 25, // 평균 방문주기 초과
  cycleOverPerDay: 1.5, // 주기 초과 1일당 가산
  dormant: 40, // 장기 미방문
  membershipLow: 28, // 이용권 잔여 임박
  membershipEmpty: 35, // 이용권 소진 (재구매 관리)
  newFollowup: 32, // 신규 고객 후속관리
  consultNoBooking: 30, // 상담 후 미예약
  loyalBonus: 8, // 누적 방문 많은 고객 가산 (관계 유지 우선)
  maxScore: 100,
} as const;

export interface CustomerFacts {
  customer: Customer;
  visits: Visit[]; // 이 고객의 방문 (최신순 아님, 함수 내 정렬)
  memberships: Membership[];
}

export interface PriorityResult {
  score: number;
  reasons: string[];
  categories: TaskCategory[];
  lastVisitDate?: string;
  visitCount: number;
  avgCycleDays?: number;
}

/** 방문 이력에서 평균 방문 주기(일) 계산. 2회 미만이면 undefined */
export function calcAvgCycleDays(visits: Visit[]): number | undefined {
  const dates = visits
    .filter((v) => v.type === "visit")
    .map((v) => v.visitedAt.slice(0, 10))
    .sort();
  if (dates.length < 2) return undefined;
  let total = 0;
  for (let i = 1; i < dates.length; i++) {
    total += diffDays(dates[i], dates[i - 1]);
  }
  return Math.round(total / (dates.length - 1));
}

/** 고객 1명의 관리 우선순위 점수 계산 (규칙 기반) */
export function calculateCustomerPriority(
  facts: CustomerFacts,
  rules: CareRuleSettings,
): PriorityResult {
  const { customer, visits, memberships } = facts;
  const reasons: string[] = [];
  const categories: TaskCategory[] = [];
  let score = 0;

  const realVisits = visits.filter((v) => v.type === "visit");
  const visitCount = realVisits.length;
  const sortedDesc = [...visits].sort((a, b) =>
    b.visitedAt.localeCompare(a.visitedAt),
  );
  const lastVisit = sortedDesc.find((v) => v.type === "visit");
  const lastAny = sortedDesc[0];
  const lastVisitDate = lastVisit?.visitedAt.slice(0, 10);
  const avgCycleDays = calcAvgCycleDays(visits) ?? rules.defaultCycleDays;
  const sinceLast = lastVisitDate ? daysAgo(lastVisitDate) : undefined;
  const registeredDays = daysAgo(customer.registeredAt);

  // 1. 다음 관리 예정일 도래/경과 → 재방문 예정
  if (customer.nextManageDate) {
    const overdue = -diffDays(customer.nextManageDate, todayISO()); // 양수 = 경과
    if (overdue >= -rules.revisitWindowDays) {
      score += WEIGHTS.revisitDue + Math.max(0, overdue) * WEIGHTS.revisitOverdue;
      categories.push("revisit_due");
      reasons.push(
        overdue > 0
          ? `다음 관리 예정일이 ${overdue}일 지남`
          : overdue === 0
            ? "오늘이 다음 관리 예정일"
            : `${-overdue}일 후 관리 예정일`,
      );
    }
  }

  // 2. 장기 미방문
  if (sinceLast !== undefined && sinceLast >= rules.dormantDays) {
    score += WEIGHTS.dormant;
    categories.push("dormant");
    reasons.push(`마지막 방문 후 ${sinceLast}일 경과 (장기 미방문)`);
  }
  // 3. 평균 주기 초과 (장기 미방문 전 단계)
  else if (
    sinceLast !== undefined &&
    visitCount >= 2 &&
    sinceLast > avgCycleDays
  ) {
    const over = sinceLast - avgCycleDays;
    score += WEIGHTS.cycleOver + Math.min(over * WEIGHTS.cycleOverPerDay, 15);
    if (!categories.includes("revisit_due")) categories.push("revisit_due");
    reasons.push(`평균 방문주기(${avgCycleDays}일)보다 ${over}일 초과`);
  }

  // 4. 이용권 잔여 임박 / 소진
  const activeMs = memberships.filter((m) => m.status === "active");
  const lowMs = activeMs.find(
    (m) => m.remainingCount > 0 && m.remainingCount <= rules.membershipLowCount,
  );
  const exhausted = memberships.find(
    (m) => m.status === "exhausted" && daysAgo(m.purchasedAt) <= 120,
  );
  if (lowMs) {
    score += WEIGHTS.membershipLow;
    categories.push("membership_low");
    reasons.push(`${lowMs.programName} 잔여 ${lowMs.remainingCount}회`);
  } else if (exhausted && activeMs.length === 0) {
    score += WEIGHTS.membershipEmpty;
    categories.push("membership_low");
    reasons.push(`${exhausted.programName} 소진 후 재구매 미진행`);
  }

  // 5. 신규 고객 후속관리
  if (registeredDays <= rules.newFollowupDays && visitCount <= 1) {
    score += WEIGHTS.newFollowup;
    categories.push("new_followup");
    reasons.push(`등록 ${registeredDays}일차 신규 고객, 방문 ${visitCount}회`);
  }

  // 6. 상담 후 미예약 (마지막 활동이 상담이고 다음 관리일 없음)
  if (
    lastAny &&
    lastAny.type === "consult" &&
    !customer.nextManageDate &&
    daysAgo(lastAny.visitedAt) <= 21
  ) {
    score += WEIGHTS.consultNoBooking;
    categories.push("consult_no_booking");
    reasons.push(`${daysAgo(lastAny.visitedAt)}일 전 상담 후 예약 없음`);
  }

  // 7. 충성 고객 가산 (관리 대상일 때만)
  if (score > 0 && visitCount >= 10) {
    score += WEIGHTS.loyalBonus;
    reasons.push(`누적 ${visitCount}회 방문 단골 고객`);
  }

  // 8. 집중 관리 태그
  if (score > 0 && customer.tags?.includes("집중관리")) {
    categories.push("focus_care");
  }

  return {
    score: Math.min(Math.round(score), WEIGHTS.maxScore),
    reasons,
    categories,
    lastVisitDate,
    visitCount,
    avgCycleDays: calcAvgCycleDays(visits),
  };
}

/** 고객 상태 분류 */
export function classifyCustomerStatus(
  facts: CustomerFacts,
  rules: CareRuleSettings,
): CustomerStatus {
  const realVisits = facts.visits.filter((v) => v.type === "visit");
  const lastVisit = realVisits
    .map((v) => v.visitedAt.slice(0, 10))
    .sort()
    .at(-1);
  const registeredDays = daysAgo(facts.customer.registeredAt);

  if (registeredDays <= rules.newFollowupDays) return "new";
  if (!lastVisit) return registeredDays > rules.dormantDays ? "dormant" : "new";
  const since = daysAgo(lastVisit);
  if (since >= rules.dormantDays) return "dormant";
  const cycle = calcAvgCycleDays(facts.visits) ?? rules.defaultCycleDays;
  if (since > cycle + rules.revisitWindowDays) return "at_risk";
  return "active";
}

// ---------- 브리핑 생성 ----------

const CATEGORY_ACTIONS: Record<TaskCategory, string> = {
  revisit_due: "안부 연락 후 방문 일정 확인",
  dormant: "장기 미방문 안내 연락 및 케어 제안",
  membership_low: "잔여 횟수 안내 및 재구매 상담",
  new_followup: "첫 이용 만족도 확인 및 다음 방문 안내",
  consult_no_booking: "상담 내용 기반 방문 제안 연락",
  focus_care: "집중 케어 부위 상태 확인 연락",
};

/** 오늘 날짜 기준 실행 과제 목록 생성 (점수 내림차순) */
export function generateDailyBriefing(
  allFacts: CustomerFacts[],
  rules: CareRuleSettings,
  existingTasks: BriefingTask[],
): BriefingTask[] {
  const date = todayISO();
  const tasks: BriefingTask[] = [];

  for (const facts of allFacts) {
    const result = calculateCustomerPriority(facts, rules);
    if (result.score <= 0 || result.categories.length === 0) continue;

    const primary = result.categories[0];
    const existing = existingTasks.find(
      (t) => t.customerId === facts.customer.id && t.date === date,
    );

    tasks.push({
      id: existing?.id ?? `task-${date}-${facts.customer.id}`,
      branchId: facts.customer.branchId,
      customerId: facts.customer.id,
      date,
      category: primary,
      priorityScore: result.score,
      reason: result.reasons.join(" · "),
      suggestedAction: CATEGORY_ACTIONS[primary],
      status: existing?.status ?? "pending",
      statusChangedAt: existing?.statusChangedAt,
      handledByStaffId: existing?.handledByStaffId,
    });
  }

  return tasks.sort((a, b) => b.priorityScore - a.priorityScore);
}

/** 파생 지표 일괄 계산 */
export function deriveCustomer(
  facts: CustomerFacts,
  rules: CareRuleSettings,
): CustomerDerived {
  const p = calculateCustomerPriority(facts, rules);
  const activeMembership = facts.memberships.find((m) => m.status === "active");
  return {
    customer: facts.customer,
    lastVisitDate: p.lastVisitDate,
    visitCount: p.visitCount,
    avgCycleDays: p.avgCycleDays,
    activeMembership,
    status: classifyCustomerStatus(facts, rules),
    priorityScore: p.score,
    priorityReasons: p.reasons,
  };
}
