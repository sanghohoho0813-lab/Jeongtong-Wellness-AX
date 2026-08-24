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
  /**
   * 관리한 뒤 실제로 방문한 고객 수.
   * 추정이 아니라 처리 시각 이후의 방문 기록이 실제로 존재하는 경우만 센다.
   */
  actualRevisit: number;
}

/**
 * 매출기회 현황 집계 — 대상 → 실행 → 결과 흐름을 세는 것까지만 한다.
 * 매출 금액이나 전환율을 추정하지 않는다.
 */
export function summarizeOpportunities(
  tasks: Array<{
    customerId?: string;
    opportunity?: SalesOpportunity;
    status: string;
    statusChangedAt?: string;
    outcome?: TaskOutcome;
  }>,
  /** 처리 시각 이후 실제 방문이 있었는지 확인하는 함수 (없으면 실제 재방문은 0) */
  hasVisitAfter?: (customerId: string, sinceIso: string) => boolean,
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
    actualRevisit:
      hasVisitAfter === undefined
        ? 0
        : done.filter(
            (t) =>
              t.customerId &&
              t.statusChangedAt &&
              hasVisitAfter(t.customerId, t.statusChangedAt),
          ).length,
  };
}

// ---------- 관리 후 실제 등록된 이용권 ----------

export interface RenewalRevenue {
  /** 관리한 뒤 실제로 등록된 이용권 건수 */
  count: number;
  /** 그 이용권들의 실제 판매금액 합 (원) */
  amount: number;
  /** 몇 일 안의 등록까지 셌는지 */
  windowDays: number;
}

/**
 * 재등록 기회를 관리한 뒤, 그 고객에게 **실제로 등록된 이용권**을 센다.
 *
 * 왜 이것만 세는가
 * ----------------
 * "이 고객이 재등록할 확률", "예상 매출 40만원" 같은 값은 만들지 않는다.
 * 아직 일어나지 않은 일이라 근거가 없기 때문이다.
 * 대신 이미 일어난 것 — 직원이 관리한 날짜 이후 창(窓) 안에 실제로
 * 등록된 이용권과 그 금액 — 만 집계한다.
 *
 * 인과관계에 대하여
 * -----------------
 * 관리 뒤에 등록되었다고 해서 그 관리 때문이라고 단정할 수는 없다.
 * 그래서 이 값의 이름도 "AX가 만든 매출"이 아니라
 * "관리 후 실제로 등록된 이용권"이다. 화면 문구도 그렇게 쓴다.
 *
 * 같은 이용권이 두 과제에 걸쳐 두 번 세어지지 않도록 id 로 한 번만 센다.
 */
export function renewalRevenueAfterHandling(
  tasks: Array<{
    customerId?: string;
    status: string;
    statusChangedAt?: string;
    opportunity?: SalesOpportunity;
    outcome?: TaskOutcome;
  }>,
  memberships: Array<{
    id: string;
    customerId: string;
    purchasedAt: string;
    price: number;
  }>,
  windowDays = 30,
): RenewalRevenue {
  const handled = tasks.filter(
    (t) =>
      t.status === "done" &&
      t.customerId &&
      t.statusChangedAt &&
      (t.outcome?.opportunityType ?? t.opportunity?.type) === "renewal",
  );
  if (handled.length === 0) return { count: 0, amount: 0, windowDays };

  /** 고객별로 가장 이른 처리 시각 (여러 번 관리했으면 첫 관리부터 본다) */
  const firstHandledAt = new Map<string, string>();
  for (const t of handled) {
    const at = t.statusChangedAt!.slice(0, 10);
    const cur = firstHandledAt.get(t.customerId!);
    if (!cur || at < cur) firstHandledAt.set(t.customerId!, at);
  }

  const counted = new Set<string>();
  let count = 0;
  let amount = 0;

  for (const m of memberships) {
    if (counted.has(m.id)) continue;
    const since = firstHandledAt.get(m.customerId);
    if (!since) continue;
    const bought = m.purchasedAt.slice(0, 10);
    if (bought < since) continue;
    // diffDays(a, b) = a - b — 등록일이 처리일에서 며칠 지났는지
    if (diffDays(bought, since) > windowDays) continue;
    counted.add(m.id);
    count++;
    amount += m.price || 0;
  }

  return { count, amount, windowDays };
}

// ---------- 월별 실행 추이 ----------

export interface OpportunityMonthly {
  month: string; // YYYY-MM
  handled: number;
  revisitPlanned: number;
  renewed: number;
}

/**
 * 저장된 처리 이력(taskOverrides)에서 월별 매출기회 실행 결과를 센다.
 * 과제 날짜(task.date) 기준이며, 없는 달은 0으로 채운다.
 */
export function monthlyOpportunityResults(
  history: Array<{
    date: string;
    status: string;
    outcome?: TaskOutcome;
    opportunity?: SalesOpportunity;
  }>,
  monthKeys: string[],
): OpportunityMonthly[] {
  return monthKeys.map((month) => {
    const rows = history.filter(
      (t) =>
        t.status === "done" &&
        t.date.startsWith(month) &&
        (t.outcome?.opportunityType ?? t.opportunity?.type ?? "none") !== "none",
    );
    return {
      month,
      handled: rows.length,
      revisitPlanned: rows.filter((t) => t.outcome?.revisitPlanned).length,
      renewed: rows.filter((t) => t.outcome?.membershipRenewed).length,
    };
  });
}

// ---------- 담당자별 실행 현황 ----------

export interface StaffActivity {
  staffId: string;
  /** 처리한 관리과제 수 (완료 + 보류) */
  handled: number;
  /** 그중 처리완료 */
  done: number;
  /** 그중 보류 */
  held: number;
  /** 매출기회 과제를 처리한 수 */
  opportunityHandled: number;
  /** 재방문 일정을 잡은 수 */
  revisitPlanned: number;
  /** 이용권 재등록으로 이어진 수 */
  renewed: number;
  /** 마지막 처리 시각 (ISO) */
  lastHandledAt?: string;
}

/**
 * 누가 무엇을 처리했는지 센다.
 *
 * 등수를 매기거나 평가하기 위한 것이 아니라, 관리가 특정 직원에게 쏠려 있는지,
 * 아무도 손대지 않는 과제가 있는지를 대표가 바로 보게 하려는 것이다.
 * 저장된 처리 이력만 사용하며 추정치는 만들지 않는다.
 */
export function summarizeStaffActivity(
  history: Array<{
    status: string;
    handledByStaffId?: string;
    statusChangedAt?: string;
    outcome?: TaskOutcome;
    opportunity?: SalesOpportunity;
  }>,
): StaffActivity[] {
  const map = new Map<string, StaffActivity>();

  for (const t of history) {
    if (t.status !== "done" && t.status !== "hold") continue;
    const id = t.handledByStaffId;
    if (!id) continue;

    const cur: StaffActivity = map.get(id) ?? {
      staffId: id,
      handled: 0,
      done: 0,
      held: 0,
      opportunityHandled: 0,
      revisitPlanned: 0,
      renewed: 0,
    };

    cur.handled++;
    if (t.status === "done") cur.done++;
    else cur.held++;

    const oppType = t.outcome?.opportunityType ?? t.opportunity?.type ?? "none";
    if (t.status === "done" && oppType !== "none") {
      cur.opportunityHandled++;
      if (t.outcome?.revisitPlanned) cur.revisitPlanned++;
      if (t.outcome?.membershipRenewed) cur.renewed++;
    }

    if (
      t.statusChangedAt &&
      (!cur.lastHandledAt || t.statusChangedAt > cur.lastHandledAt)
    ) {
      cur.lastHandledAt = t.statusChangedAt;
    }

    map.set(id, cur);
  }

  return [...map.values()].sort((a, b) => b.handled - a.handled);
}
