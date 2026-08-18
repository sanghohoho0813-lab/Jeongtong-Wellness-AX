/**
 * AX 표현 레이어 — 기존 지표/판단 결과를 사람이 읽는 문장으로 조합한다.
 *
 * 중요: 새로운 점수 알고리즘·분석지표를 만들지 않는다.
 *  - 고객 판단근거는 calculateCustomerPriority()가 만든 reasons를 그대로 재사용
 *  - 권장 행동은 generateDailyBriefing()이 만든 suggestedAction을 그대로 재사용
 *  → 고객목록 / AX Insight / 실행 브리핑이 항상 동일한 근거 체계를 쓴다.
 */

import {
  BriefingTask,
  CareRuleSettings,
  CustomerDerived,
} from "@/lib/types";
import { AxSummary, MonthlyMetric } from "./metrics";
import { CustomerFacts, calcAvgCycleDays } from "./priority";
import { daysFromToday, formatDateKr } from "@/lib/utils/date";

// ---------- 고객 AX Insight ----------

export interface CustomerInsight {
  /** 관리 대상 여부 — 표시 톤 결정 */
  attention: boolean;
  /** 판단 근거 (관리 대상: priorityReasons / 정상군: 현재 상태 요약) */
  reasons: string[];
  /** 권장 행동 (관리 대상: 브리핑 suggestedAction 재사용) */
  recommendation: string;
}

/**
 * 고객 상세 / 고객 목록 공용 AX Insight.
 * task가 있으면 브리핑과 완전히 동일한 근거·행동을 사용한다.
 */
export function buildCustomerInsight(
  derived: CustomerDerived,
  task: BriefingTask | undefined,
  rules: CareRuleSettings,
): CustomerInsight {
  if (derived.priorityScore > 0 && derived.priorityReasons.length > 0) {
    return {
      attention: true,
      reasons: derived.priorityReasons,
      recommendation: task?.suggestedAction ?? "안부 연락 후 방문 일정 확인",
    };
  }

  // 정상 관리군 — 현재 보유 데이터만으로 상태를 요약한다
  const reasons: string[] = [];
  if (derived.avgCycleDays !== undefined) {
    reasons.push(`평균 방문주기 ${derived.avgCycleDays}일, 주기 내 방문 중`);
  } else if (derived.visitCount > 0) {
    reasons.push(`누적 방문 ${derived.visitCount}회, 방문주기 산출 전`);
  } else {
    reasons.push("방문 이력 없음 — 첫 방문 안내 대상");
  }
  if (derived.activeMembership) {
    reasons.push(
      `${derived.activeMembership.programName} 잔여 ${derived.activeMembership.remainingCount}회`,
    );
  }
  if (derived.customer.nextManageDate) {
    reasons.push(
      `다음 관리 예정일 ${formatDateKr(derived.customer.nextManageDate)}`,
    );
  } else {
    reasons.push(`다음 관리 예정일 미지정 (기본 주기 ${rules.defaultCycleDays}일)`);
  }

  return {
    attention: false,
    reasons,
    recommendation: derived.customer.nextManageDate
      ? "정상 관리군 — 예정일에 맞춰 안내"
      : "정상 관리군 — 다음 관리 예정일 지정 권장",
  };
}

// ---------- AX 추천 다음 관리일 ----------

export interface NextManageRecommendation {
  /** YYYY-MM-DD — 데이터가 부족하면 undefined */
  date?: string;
  /** 추천 근거 (또는 데이터 부족 사유) */
  basis: string;
}

/**
 * 방문 기록 입력 시 보조로 제시하는 추천 관리일.
 * 평균 방문주기(2회 이상 방문) → 없으면 설정의 기본 관리주기를 사용한다.
 * 새로운 예측 모델이 아니라 기존 주기 데이터의 단순 적용이다.
 */
export function recommendNextManageDate(
  facts: CustomerFacts | undefined,
  rules: CareRuleSettings,
): NextManageRecommendation {
  if (!facts) {
    return { basis: "고객을 선택하면 추천일이 생성됩니다" };
  }
  const cycle = calcAvgCycleDays(facts.visits);
  if (cycle !== undefined && cycle > 0) {
    return {
      date: daysFromToday(cycle),
      basis: `평균 이용주기 ${cycle}일 기준`,
    };
  }
  const visitCount = facts.visits.filter((v) => v.type === "visit").length;
  if (visitCount === 0) {
    return {
      date: daysFromToday(rules.defaultCycleDays),
      basis: `첫 방문 — 기본 관리주기 ${rules.defaultCycleDays}일 기준`,
    };
  }
  return {
    date: daysFromToday(rules.defaultCycleDays),
    basis: `방문 이력 1회 — 기본 관리주기 ${rules.defaultCycleDays}일 기준 (이력이 쌓이면 주기 기반으로 조정)`,
  };
}

// ---------- AX 운영 인사이트 (분석 화면) ----------

export interface OperationInsight {
  headline: string;
  /** 권장 운영 방향 (규칙 기반, 과장 없음) */
  recommendation: string;
}

/**
 * 현재 지표에서 도출되는 규칙 기반 운영 인사이트 1~2문장.
 * 생성형 AI를 사용하지 않으며, 모든 문장은 저장된 수치에서만 계산된다.
 */
export function buildOperationInsight(
  summary: AxSummary,
  monthly: MonthlyMetric[],
  openTaskCount: number,
  membershipLowCount: number,
): OperationInsight {
  const latest = monthly.at(-1);
  const prev = monthly.at(-2);
  const visitDelta =
    latest && prev ? latest.visitCount - prev.visitCount : 0;
  const newDelta =
    latest && prev ? latest.newCustomers - prev.newCustomers : 0;

  const parts: string[] = [];

  // 1) 유입 흐름
  if (latest && prev) {
    if (newDelta > 0) {
      parts.push(`이번 달 신규 고객은 지난달 대비 ${newDelta}명 증가했습니다`);
    } else if (newDelta < 0) {
      parts.push(`이번 달 신규 고객은 지난달 대비 ${-newDelta}명 감소했습니다`);
    } else {
      parts.push(`이번 달 신규 고객은 지난달과 동일한 수준입니다`);
    }
  } else if (latest) {
    parts.push(`이번 달 신규 고객은 ${latest.newCustomers}명입니다`);
  }

  // 2) 유지 흐름 (장기 미방문 / 방문 증감)
  if (summary.dormantCount > 0) {
    parts.push(`장기 미방문 고객이 ${summary.dormantCount}명 있습니다`);
  } else if (visitDelta < 0) {
    parts.push(`이번 달 방문은 지난달 대비 ${-visitDelta}건 줄었습니다`);
  } else if (visitDelta > 0) {
    parts.push(`이번 달 방문은 지난달 대비 ${visitDelta}건 늘었습니다`);
  }

  // 권장 방향 — 우선순위: 미처리 관리업무 > 장기 미방문 > 이용권 임박 > 유입
  let recommendation: string;
  if (openTaskCount > 0) {
    recommendation = `오늘 관리 대상 ${openTaskCount}명이 미처리 상태입니다. 실행 브리핑의 우선순위 순으로 처리하세요.`;
  } else if (summary.dormantCount > 0) {
    recommendation = `장기 미방문 고객 ${summary.dormantCount}명에 대한 재방문 안내가 우선입니다.`;
  } else if (membershipLowCount > 0) {
    recommendation = `이용권 소진 임박 고객 ${membershipLowCount}명의 재구매 상담을 먼저 진행하세요.`;
  } else if (newDelta < 0) {
    recommendation =
      "신규 유입이 줄었습니다. 기존 고객 재방문 관리와 함께 신규 상담 전환을 점검하세요.";
  } else {
    recommendation =
      "현재 관리 대기 업무가 없습니다. 재방문 주기 유지 상태를 계속 확인하세요.";
  }

  return {
    headline: parts.length > 0 ? parts.join(", ") + "." : "운영 데이터 축적 중입니다.",
    recommendation,
  };
}
