/**
 * Wellness Profile · Wellness Type
 * =================================
 *
 * 고객이 자기 화면에서 보는 값들을 계산한다.
 *
 * 지켜야 하는 선
 * --------------
 * 여기서 다루는 것은 **이용 행동**뿐이다. 얼마나 자주 왔는가, 이용권을
 * 어떻게 쓰는가, 어떤 정보를 눌러 보는가.
 *
 * 몸 상태를 판정하지 않는다. 무엇이 좋아졌다거나 나빠졌다고 말하지 않고,
 * 언제 와야 한다고 권하지도 않는다. "지금까지 평균 18일 간격으로
 * 오셨습니다" 는 사실이지만 "18일마다 오셔야 합니다" 는 권고다.
 * 이 파일은 앞의 문장만 만든다.
 *
 * 평균 이용주기는 직원 화면과 **같은 함수**(calcAvgCycleDays)를 쓴다.
 * 두 화면이 같은 고객을 두고 다른 숫자를 말하면, 그 순간 둘 다 못 믿는다.
 */

import type { Membership, Visit } from "@/lib/types";
import { calcAvgCycleDays } from "@/lib/scoring/priority";
import { daysAgo, localDateOf, todayISO } from "@/lib/utils/date";

// ---------------------------------------------------------
// 이용 요약
// ---------------------------------------------------------

export interface UsageSummary {
  /** 실제 이용한 방문 횟수 (상담만 한 날은 세지 않는다) */
  visitCount: number;
  /** 마지막 이용일 (YYYY-MM-DD) */
  lastVisitDate?: string;
  /** 마지막 이용일로부터 며칠 지났는가 */
  daysSinceLastVisit?: number;
  /** 평균 이용 간격 (일) — 2회 이상 이용했을 때만 나온다 */
  avgCycleDays?: number;
  /** 최근 간격 — 마지막 두 번 사이의 일수 */
  latestGapDays?: number;
  /** 최근 90일 이용 횟수 */
  visitsLast90Days: number;
  /** 첫 이용일 */
  firstVisitDate?: string;
}

/** 실제 이용(visit)만 남기고 최신순으로 정렬 */
function usedVisits(visits: Visit[]): Visit[] {
  return visits
    .filter((v) => v.type === "visit" && v.visitedAt)
    .sort((a, b) => (a.visitedAt < b.visitedAt ? 1 : -1));
}

export function summarizeUsage(visits: Visit[], today = todayISO()): UsageSummary {
  const list = usedVisits(visits);
  const dates = list.map((v) => localDateOf(v.visitedAt));

  const lastVisitDate = dates[0];
  const firstVisitDate = dates[dates.length - 1];

  let latestGapDays: number | undefined;
  if (dates.length >= 2) {
    const a = new Date(dates[0]).getTime();
    const b = new Date(dates[1]).getTime();
    latestGapDays = Math.round((a - b) / 86400_000);
  }

  const cutoff = new Date(new Date(today).getTime() - 90 * 86400_000)
    .toISOString()
    .slice(0, 10);

  return {
    visitCount: list.length,
    lastVisitDate,
    daysSinceLastVisit: lastVisitDate ? daysAgo(lastVisitDate) : undefined,
    avgCycleDays: calcAvgCycleDays(list),
    latestGapDays,
    visitsLast90Days: dates.filter((d) => d >= cutoff).length,
    firstVisitDate,
  };
}

// ---------------------------------------------------------
// 다음 관리 참고일
// ---------------------------------------------------------

export interface NextReference {
  /** 참고일 (YYYY-MM-DD). 계산할 근거가 없으면 없다 */
  date?: string;
  /** 어떻게 나온 값인지 — 화면에 그대로 보여 준다 */
  basis: string;
  /** 매장이 직접 잡아 둔 날짜인가 (계산값이 아니라) */
  fromStore: boolean;
}

/**
 * 다음 관리 참고일.
 *
 * 두 가지 출처가 있고, 순서가 있다.
 *  1) 매장이 직접 잡아 둔 날짜 — 사람이 정한 것이 계산보다 앞선다
 *  2) 마지막 이용일 + 평균 이용 간격 — 지금까지의 이용 흐름에서 나온 참고값
 *
 * 어느 쪽이든 "오셔야 합니다" 가 아니라 "참고하실 시점" 으로만 쓴다.
 */
export function nextReference(
  usage: UsageSummary,
  storeNextManageDate?: string,
): NextReference {
  if (storeNextManageDate) {
    return {
      date: storeNextManageDate,
      basis: "매장에서 안내해 드린 날짜입니다.",
      fromStore: true,
    };
  }
  if (usage.lastVisitDate && usage.avgCycleDays) {
    const d = new Date(usage.lastVisitDate);
    d.setDate(d.getDate() + usage.avgCycleDays);
    return {
      date: d.toISOString().slice(0, 10),
      basis: `지금까지의 평균 이용 간격(${usage.avgCycleDays}일)을 기준으로 계산된 참고일입니다.`,
      fromStore: false,
    };
  }
  return {
    date: undefined,
    basis:
      "이용 기록이 더 쌓이면 평균 이용 간격을 기준으로 참고일을 보여 드립니다.",
    fromStore: false,
  };
}

// ---------------------------------------------------------
// 이용권
// ---------------------------------------------------------

export interface PassSummary {
  active?: Membership;
  totalRemaining: number;
  /** 지금까지 등록한 이용권 수 */
  purchasedCount: number;
  /** 현재 이용권에서 쓴 횟수 */
  usedOfActive?: number;
}

export function summarizePasses(memberships: Membership[]): PassSummary {
  const mine = [...memberships].sort((a, b) =>
    a.purchasedAt < b.purchasedAt ? 1 : -1,
  );
  const actives = mine.filter((m) => m.status === "active" && m.remainingCount > 0);
  const active = actives[0];
  return {
    active,
    totalRemaining: actives.reduce((s, m) => s + m.remainingCount, 0),
    purchasedCount: mine.length,
    usedOfActive: active ? active.totalCount - active.remainingCount : undefined,
  };
}

// ---------------------------------------------------------
// Wellness Type
// ---------------------------------------------------------

export type WellnessTypeKey =
  | "accumulating" // 데이터 축적 중
  | "steady" // 꾸준관리형
  | "intensive" // 집중이용형
  | "homecare" // 홈케어 관심형
  | "dormant" // 장기미방문형
  | "renewal"; // 재등록 관심형

export interface WellnessType {
  key: WellnessTypeKey;
  label: string;
  /** 한 줄 설명 — 상태 판정이 아니라 이용 방식에 대한 서술 */
  description: string;
  /** 왜 이렇게 분류했는지. 저장된 사실만 적는다 */
  reasons: string[];
}

const LABEL: Record<WellnessTypeKey, string> = {
  accumulating: "데이터 축적 중",
  steady: "꾸준관리형",
  intensive: "집중이용형",
  homecare: "홈케어 관심형",
  dormant: "장기미방문형",
  renewal: "재등록 관심형",
};

export interface WellnessTypeInput {
  usage: UsageSummary;
  pass: PassSummary;
  /** 홈케어 정보에 관심 있다고 표시했는가 */
  homecareInterest?: boolean;
  /** 콘텐츠를 열어 본 횟수 */
  contentOpens?: number;
}

/**
 * 이용 행동만으로 유형을 나눈다.
 *
 * 판정 순서에 뜻이 있다. 오래 안 오신 분에게 "꾸준관리형" 이라고 말하면
 * 화면이 현실과 어긋나 보이므로, 가장 눈에 띄는 사실부터 본다.
 *
 * 근거가 모자라면 억지로 붙이지 않고 "데이터 축적 중" 으로 둔다.
 * 두 번 오신 분을 유형으로 나누는 건 분류가 아니라 짐작이다.
 */
export function classifyWellnessType(input: WellnessTypeInput): WellnessType {
  const { usage, pass } = input;
  const reasons: string[] = [];

  // 근거 부족 — 이용 2회 미만이면 간격 자체가 없다
  if (usage.visitCount < 2 || !usage.avgCycleDays) {
    return {
      key: "accumulating",
      label: LABEL.accumulating,
      description:
        "이용 기록이 조금 더 쌓이면 이용 패턴을 정리해 보여 드립니다.",
      reasons:
        usage.visitCount > 0
          ? [`지금까지 ${usage.visitCount}회 이용하셨습니다.`]
          : ["아직 이용 기록이 없습니다."],
    };
  }

  const gap = usage.daysSinceLastVisit ?? 0;
  const cycle = usage.avgCycleDays;

  // 1) 오래 안 오신 경우 — 평균 간격의 두 배를 넘겼을 때
  if (gap > cycle * 2 && gap >= 45) {
    reasons.push(`마지막 이용일로부터 ${gap}일 지났습니다.`);
    reasons.push(`평균 이용 간격은 ${cycle}일입니다.`);
    return {
      key: "dormant",
      label: LABEL.dormant,
      description: "평소 이용 간격보다 오랜만이시네요.",
      reasons,
    };
  }

  // 2) 이용권이 거의 다 됐을 때
  if (pass.active && pass.totalRemaining > 0 && pass.totalRemaining <= 2) {
    reasons.push(`보유하신 이용권이 ${pass.totalRemaining}회 남았습니다.`);
    if (pass.purchasedCount > 1)
      reasons.push(`지금까지 이용권을 ${pass.purchasedCount}번 등록하셨습니다.`);
    return {
      key: "renewal",
      label: LABEL.renewal,
      description: "이용권 잔여 횟수가 얼마 남지 않았습니다.",
      reasons,
    };
  }

  // 3) 짧은 간격으로 자주 오시는 경우
  if (cycle <= 10 || usage.visitsLast90Days >= 8) {
    reasons.push(`평균 ${cycle}일 간격으로 이용하고 계십니다.`);
    reasons.push(`최근 3개월간 ${usage.visitsLast90Days}회 이용하셨습니다.`);
    return {
      key: "intensive",
      label: LABEL.intensive,
      description: "짧은 간격으로 집중해서 이용하고 계십니다.",
      reasons,
    };
  }

  // 4) 홈케어 정보에 관심을 보이신 경우
  if (input.homecareInterest === true || (input.contentOpens ?? 0) >= 3) {
    if (input.homecareInterest)
      reasons.push("홈케어 정보를 받아보고 싶다고 선택하셨습니다.");
    if ((input.contentOpens ?? 0) >= 3)
      reasons.push(`웰니스 정보를 ${input.contentOpens}번 열어 보셨습니다.`);
    reasons.push(`평균 ${cycle}일 간격으로 이용하고 계십니다.`);
    return {
      key: "homecare",
      label: LABEL.homecare,
      description: "매장 이용과 함께 일상 관리에도 관심을 두고 계십니다.",
      reasons,
    };
  }

  // 5) 그 외 — 자기 간격을 지키며 오시는 분
  reasons.push(`평균 ${cycle}일 간격으로 ${usage.visitCount}회 이용하셨습니다.`);
  if (usage.lastVisitDate) reasons.push(`마지막 이용일은 ${usage.lastVisitDate}입니다.`);
  return {
    key: "steady",
    label: LABEL.steady,
    description: "일정한 간격으로 꾸준히 이용하고 계십니다.",
    reasons,
  };
}

// ---------------------------------------------------------
// 월간 웰니스 리포트
// ---------------------------------------------------------

/**
 * 이번 달 리포트 문장.
 *
 * 지금은 규칙으로 만든다. 저장된 숫자를 사실 그대로 문장에 옮길 뿐이라
 * 틀릴 수가 없고, 인터넷이 끊겨도 나오며, 비용도 들지 않는다.
 *
 * 나중에 이 자리를 언어모델로 바꿔도 **입력과 출력의 성격은 그대로 둔다** —
 * 넣는 것은 아래 facts 뿐이고, 나오는 것은 그 사실을 풀어 쓴 문장뿐이다.
 * 무엇이 좋아졌는지, 어디가 문제인지, 언제 와야 하는지는 만들지 않는다.
 * (lib/portal/report-prompt.ts 에 그 규칙을 시스템 프롬프트로 적어 두었다)
 */
export interface ReportFacts {
  months: number;
  visitsInPeriod: number;
  avgCycleDays?: number;
  latestGapDays?: number;
  remaining: number;
  lastVisitDate?: string;
  avgSatisfaction?: number;
  feedbackCount: number;
}

export function buildReportFacts(
  visits: Visit[],
  memberships: Membership[],
  satisfactions: number[],
  months = 3,
  today = todayISO(),
): ReportFacts {
  const usage = summarizeUsage(visits, today);
  const pass = summarizePasses(memberships);
  const cutoff = new Date(new Date(today).getTime() - months * 30 * 86400_000)
    .toISOString()
    .slice(0, 10);

  const inPeriod = usedVisits(visits).filter(
    (v) => localDateOf(v.visitedAt) >= cutoff,
  ).length;

  const avgSat =
    satisfactions.length > 0
      ? Math.round(
          (satisfactions.reduce((s, n) => s + n, 0) / satisfactions.length) * 10,
        ) / 10
      : undefined;

  return {
    months,
    visitsInPeriod: inPeriod,
    avgCycleDays: usage.avgCycleDays,
    latestGapDays: usage.latestGapDays,
    remaining: pass.totalRemaining,
    lastVisitDate: usage.lastVisitDate,
    avgSatisfaction: avgSat,
    feedbackCount: satisfactions.length,
  };
}

/** 사실만 옮긴 문장들. 조언·예측은 넣지 않는다 */
export function buildReportLines(f: ReportFacts): string[] {
  const lines: string[] = [];

  if (f.visitsInPeriod === 0) {
    lines.push(`최근 ${f.months}개월간 이용 기록이 없습니다.`);
  } else {
    lines.push(
      `최근 ${f.months}개월간 총 ${f.visitsInPeriod}회 이용하셨습니다.`,
    );
  }

  if (f.avgCycleDays) {
    lines.push(`평균 이용 간격은 ${f.avgCycleDays}일입니다.`);
    if (f.latestGapDays !== undefined) {
      const diff = f.latestGapDays - f.avgCycleDays;
      // 3일 이내 차이는 "같다"고 본다. 하루 이틀 차이를 변화라고 말하면
      // 매달 문장이 흔들려서 읽는 사람이 의미를 못 붙인다.
      if (Math.abs(diff) <= 3)
        lines.push("최근 이용 간격은 평소와 비슷합니다.");
      else if (diff > 0)
        lines.push(`최근 이용 간격은 평소보다 ${diff}일 길었습니다.`);
      else
        lines.push(`최근 이용 간격은 평소보다 ${-diff}일 짧았습니다.`);
    }
  }

  if (f.remaining > 0) lines.push(`현재 이용권은 ${f.remaining}회 남아 있습니다.`);
  else lines.push("현재 남아 있는 이용권이 없습니다.");

  if (f.avgSatisfaction !== undefined)
    lines.push(
      `남겨 주신 만족도는 ${f.feedbackCount}건, 평균 ${f.avgSatisfaction}점입니다.`,
    );

  return lines;
}
