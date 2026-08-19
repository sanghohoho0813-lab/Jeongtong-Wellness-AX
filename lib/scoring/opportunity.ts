/**
 * AX 매출기회 판정 — 기존 고객 매출(재방문 · 이용권 재등록) 관점의 파생 분류
 * ==========================================================================
 *
 * Priority Score 와의 관계
 * ------------------------
 *  - Priority Score (lib/scoring/priority.ts)
 *      "지금 관리가 필요한 고객인가" — 기존 AX 엔진. 이 파일은 그 값을 읽지도 바꾸지도 않는다.
 *  - 매출기회 (이 파일)
 *      "관리하면 기존 매출(재방문 · 재등록)로 이어질 수 있는가" — 완전히 별개의 판정.
 *
 * 원칙
 * ----
 *  1) 저장된 데이터로 실제 계산되는 사실만 근거로 쓴다.
 *     (구매 확률 · 예상 매출 같은 추정치는 만들지 않는다)
 *  2) 기존 고객만 대상으로 한다. 신규 유치는 이 레이어의 범위가 아니다.
 *  3) 이용권 축(재등록)을 먼저 보고, 해당이 없으면 방문 축(재방문)을 본다.
 */

import {
  CareRuleSettings,
  DEFAULT_OPPORTUNITY_RULES,
  OpportunityLevel,
  OpportunityRuleSettings,
  SalesOpportunity,
  SalesOpportunityType,
  TaskOutcome,
} from "@/lib/types";
import { daysAgo, diffDays, formatDateKr, todayISO } from "@/lib/utils/date";
import { CustomerFacts, calcAvgCycleDays } from "./priority";

const NONE: SalesOpportunity = {
  type: "none",
  level: "none",
  label: "해당 없음",
  reasons: [],
  action: "",
};

const LABEL: Record<SalesOpportunityType, string> = {
  renewal: "재등록 기회",
  revisit: "재방문 기회",
  none: "해당 없음",
};

function make(
  type: Exclude<SalesOpportunityType, "none">,
  level: OpportunityLevel,
  reasons: string[],
  action: string,
): SalesOpportunity {
  return { type, level, label: LABEL[type], reasons, action };
}

/**
 * 고객 1명의 매출기회 판정.
 * @param lastOutcome 직전 관리 업무의 처리 결과 (있으면 근거로 함께 사용)
 */
export function detectSalesOpportunity(
  facts: CustomerFacts,
  rules: CareRuleSettings,
  lastOutcome?: TaskOutcome,
  oppRules: OpportunityRuleSettings = DEFAULT_OPPORTUNITY_RULES,
): SalesOpportunity {
  const { customer, visits, memberships } = facts;
  const {
    exhaustedWindowDays: EXHAUSTED_WINDOW_DAYS,
    minVisitsForRenewal: RENEWAL_MIN_VISITS,
    loyalVisitCount: LOYAL_VISITS,
  } = oppRules;

  const realVisits = visits.filter((v) => v.type === "visit");
  const visitCount = realVisits.length;
  const lastVisitDate = realVisits
    .map((v) => v.visitedAt.slice(0, 10))
    .sort()
    .at(-1);
  const sinceLast = lastVisitDate ? daysAgo(lastVisitDate) : undefined;
  const cycle = calcAvgCycleDays(visits); // 2회 이상 방문해야 산출됨
  const effCycle = cycle ?? rules.defaultCycleDays;

  const activeMs = memberships.filter((m) => m.status === "active");
  const lowMs = activeMs
    .filter(
      (m) =>
        m.remainingCount > 0 && m.remainingCount <= rules.membershipLowCount,
    )
    .sort((a, b) => a.remainingCount - b.remainingCount)[0];
  const exhausted = memberships
    .filter((m) => m.status === "exhausted")
    .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt))[0];

  // 기존 고객만 — 방문 2회 이상이거나 이용권 구매 이력이 있는 고객
  const isExistingCustomer = visitCount >= 2 || memberships.length > 0;
  if (!isExistingCustomer) return NONE;

  // ---------- 1. 재등록 기회 (이용권 축) ----------

  // 1-1. 잔여 임박 — 아직 사용 중이라 가장 자연스러운 재등록 시점
  if (lowMs) {
    const reasons = [`${lowMs.programName} 잔여 ${lowMs.remainingCount}회`];
    if (cycle !== undefined) {
      reasons.push(`최근 ${visitCount}회 평균 이용주기 ${cycle}일`);
    }
    if (sinceLast !== undefined) {
      reasons.push(`최근 방문 ${sinceLast}일 전`);
    }
    if (customer.nextManageDate) {
      const d = -diffDays(customer.nextManageDate, todayISO());
      reasons.push(
        d > 0
          ? `다음 관리 예정일 ${d}일 경과`
          : d === 0
            ? "오늘이 다음 관리 예정일"
            : `다음 관리 예정일 ${-d}일 후`,
      );
    }
    // 이용 흐름이 유지되는 중이면 재등록 가능성이 더 높은 시점으로 본다
    const steady =
      sinceLast !== undefined && sinceLast <= effCycle + rules.revisitWindowDays;
    return make(
      "renewal",
      steady ? "high" : "normal",
      reasons,
      "이용권 재등록 안내 권장",
    );
  }

  // 1-2. 최근 소진 후 사용 중인 이용권 없음 — 재구매 상담 시점
  if (
    activeMs.length === 0 &&
    exhausted &&
    daysAgo(exhausted.purchasedAt) <= EXHAUSTED_WINDOW_DAYS &&
    visitCount >= RENEWAL_MIN_VISITS
  ) {
    const reasons = [
      `${exhausted.programName} 소진 (사용 중인 이용권 없음)`,
      `누적 방문 ${visitCount}회`,
    ];
    if (cycle !== undefined) reasons.push(`평균 이용주기 ${cycle}일`);
    if (sinceLast !== undefined) reasons.push(`최근 방문 ${sinceLast}일 전`);
    // 아직 이용 흐름이 살아 있는 고객을 우선으로 본다
    const warm = sinceLast !== undefined && sinceLast <= effCycle * 2;
    return make(
      "renewal",
      warm ? "high" : "normal",
      reasons,
      "이용권 재등록 안내 권장",
    );
  }

  // ---------- 2. 재방문 기회 (방문 축) ----------

  // 2-1. 다음 관리 예정일 도래 · 경과
  if (customer.nextManageDate && visitCount >= 1) {
    const overdue = -diffDays(customer.nextManageDate, todayISO());
    if (overdue >= -rules.revisitWindowDays) {
      const reasons = [
        overdue > 0
          ? `다음 관리 예정일 ${overdue}일 경과`
          : overdue === 0
            ? "오늘이 다음 관리 예정일"
            : `다음 관리 예정일 ${-overdue}일 후`,
        `누적 방문 ${visitCount}회`,
      ];
      if (cycle !== undefined) reasons.push(`평균 이용주기 ${cycle}일`);
      if (lastOutcome?.revisitPlanned) {
        reasons.push("직전 관리에서 재방문 예정으로 기록");
      }
      return make(
        "revisit",
        overdue >= 0 ? "high" : "normal",
        reasons,
        "재방문 안내 권장",
      );
    }
  }

  // 2-2. 평균 이용주기 초과 (반복 이용 고객)
  if (
    sinceLast !== undefined &&
    cycle !== undefined &&
    visitCount >= 2 &&
    sinceLast > cycle
  ) {
    const reasons = [
      `평균 이용주기(${cycle}일) ${sinceLast - cycle}일 초과`,
      `누적 방문 ${visitCount}회 반복 이용 고객`,
    ];
    if (activeMs[0]) {
      reasons.push(
        `${activeMs[0].programName} 잔여 ${activeMs[0].remainingCount}회`,
      );
    }
    return make(
      "revisit",
      visitCount >= LOYAL_VISITS ? "high" : "normal",
      reasons,
      "재방문 안내 권장",
    );
  }

  // 2-3. 장기 미방문이지만 과거 이용이 충분했던 고객
  if (
    sinceLast !== undefined &&
    sinceLast >= rules.dormantDays &&
    visitCount >= RENEWAL_MIN_VISITS
  ) {
    return make(
      "revisit",
      "normal",
      [
        `마지막 방문 후 ${sinceLast}일 경과`,
        `과거 누적 방문 ${visitCount}회`,
        ...(cycle !== undefined ? [`평균 이용주기 ${cycle}일`] : []),
      ],
      "재방문 안내 권장",
    );
  }

  // 2-4. 직전 관리에서 재방문 예정으로 기록된 고객 (예정일 확인 대상)
  if (lastOutcome?.revisitPlanned && lastOutcome.nextManageDate) {
    return make(
      "revisit",
      "normal",
      [
        "직전 관리에서 재방문 예정으로 기록",
        `예정일 ${formatDateKr(lastOutcome.nextManageDate)}`,
        `누적 방문 ${visitCount}회`,
      ],
      "재방문 일정 확인 권장",
    );
  }

  return NONE;
}

// ---------- 집계 ----------

export interface OpportunitySummary {
  /** 매출기회 대상 (재등록 + 재방문) */
  total: number;
  renewal: number;
  revisit: number;
  /** 그중 우선도가 높은 대상 */
  high: number;
  /** 실행(처리완료)된 매출기회 과제 수 */
  handled: number;
  /** 실행 결과 재방문 예정이 잡힌 수 */
  revisitPlanned: number;
  /** 실행 결과 이용권 재등록으로 이어진 수 */
  renewed: number;
}

/**
 * 매출기회 현황 집계 — 대상 → 실행 → 결과 흐름을 세는 것까지만 한다.
 * 매출 금액이나 전환율을 추정하지 않는다.
 */
export function summarizeOpportunities(
  tasks: Array<{
    opportunity?: SalesOpportunity;
    status: string;
    outcome?: TaskOutcome;
  }>,
): OpportunitySummary {
  /**
   * 처리 당시 유형(스냅샷)을 우선 사용한다.
   * 재등록이 실제로 일어나면 그 고객의 매출기회는 사라지는데,
   * 현재 판정만 보면 방금 만든 성과가 집계에서 빠져 버리기 때문이다.
   */
  const typeOf = (t: {
    opportunity?: SalesOpportunity;
    outcome?: TaskOutcome;
  }): SalesOpportunityType =>
    t.outcome?.opportunityType ?? t.opportunity?.type ?? "none";

  const withOpp = tasks.filter((t) => typeOf(t) !== "none");
  const done = withOpp.filter((t) => t.status === "done");
  return {
    total: withOpp.length,
    renewal: withOpp.filter((t) => typeOf(t) === "renewal").length,
    revisit: withOpp.filter((t) => typeOf(t) === "revisit").length,
    high: withOpp.filter((t) => t.opportunity?.level === "high").length,
    handled: done.length,
    revisitPlanned: done.filter((t) => t.outcome?.revisitPlanned).length,
    renewed: done.filter((t) => t.outcome?.membershipRenewed).length,
  };
}
