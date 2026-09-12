/**
 * AX Coach — 실증 준비도 계산
 * ============================
 *
 * "우리 매장이 AX 를 실제로 쓰고 있다" 를 **말이 아니라 기록으로** 보일 수
 * 있는 정도를 넷으로 나눠 잰다.
 *
 * 지어낸 숫자를 만들지 않기 위한 두 가지 규칙
 * -------------------------------------------
 * 1. **목표를 먼저 적는다.** 준비도는 「실제 건수 ÷ 목표 건수」 다. 목표가
 *    화면에 함께 적히므로 (3건 / 20건) 사람이 검산할 수 있다. 목표 없이
 *    "38%" 만 띄우면 그건 지어낸 숫자다.
 * 2. **잴 수 없으면 0 이 아니라 「아직 측정 전」이다.** 0% 는 "쟀는데
 *    없다", 측정 전은 "아직 잴 수 없다" 로 뜻이 다르다. 고객 화면이
 *    매장 계정과 연결되기 전에는 고객이 남긴 기록이 있을 수 없는데,
 *    그것을 0% 로 적으면 매장이 못한 것처럼 보인다.
 *
 * 재방문 결과(RESULT)는 증적 내보내기(`lib/utils/evidence.ts`)와 **같은
 * 함수**를 쓴다. 화면의 숫자와 심사자에게 내보내는 표가 어긋나면 둘 다
 * 못 믿게 된다.
 */

import type { BriefingTask, Membership, Visit } from "@/lib/types";
import type { CustomerFeedbackRow, CustomerRequestRow } from "@/lib/supabase/sync";
import { findResultVisit } from "@/lib/utils/evidence";
import { localDateOf, todayISO } from "@/lib/utils/date";
import {
  AREA_LABEL,
  type AreaScore,
  type CoachCounts,
  type CoverageResult,
  type EvidenceArea,
} from "./types";

/**
 * 실증 목표 — 심사에서 "쓰고 있다" 고 말하려면 이 정도는 있어야 한다는
 * 우리 매장의 기준. 단일 매장 · 주 6일 · 대표 부부 운영을 전제로 잡았고,
 * 화면에 함께 적어 사람이 검산할 수 있게 한다.
 */
export const COACH_TARGET = {
  /** 최근 4주 방문 · 상담 기록 (주 5건 × 4주) */
  visits28: 20,
  /** 최근 4주 중 기록이 남은 날 (주 3일 × 4주) */
  activeDays28: 12,
  /** 최근 4주 실제 처리한 관리 과제 (주 3건 × 4주) */
  actions28: 12,
  /** 처리 건 중 결과를 남긴 비율 */
  outcomeRatio: 0.7,
  /** 처리 뒤 30일 안에 실제 재방문이 확인된 건수 */
  results: 5,
  /** 처리 결과에 이용권 재등록이 기록된 건수 */
  renewals: 2,
  /** 고객이 직접 남긴 요청 · 피드백 */
  portalEvents: 5,
  /** 그중 직원이 처리한 요청 */
  portalHandled: 3,
} as const;

/** 최근 N일 창 */
export const WINDOW_DAYS = 28;

const pct = (v: number) => Math.max(0, Math.min(100, Math.round(v * 100)));
const ratio = (actual: number, target: number) =>
  target <= 0 ? 0 : Math.min(1, actual / target);

/** 오늘 기준 N일 전 날짜 (YYYY-MM-DD) */
export function windowStart(days: number = WINDOW_DAYS, today = todayISO()): string {
  const d = new Date(today + "T00:00:00");
  d.setDate(d.getDate() - (days - 1));
  return d.toISOString().slice(0, 10);
}

export interface CoverageInput {
  visits: Visit[];
  /** 저장된 과제 상태 — 실행 증거의 원본 (pending 은 실행이 아니다) */
  taskOverrides: BriefingTask[];
  /** 지금 처리 대기 중인 과제 (오늘 계산된 브리핑) */
  pendingTasks: BriefingTask[];
  memberships: Membership[];
  customerCount: number;
  /** 고객 화면이 매장 계정에 연결되어 있는가 — 아니면 고객 기록은 측정 불가 */
  portalLinked: boolean;
  requests: CustomerRequestRow[];
  feedback: CustomerFeedbackRow[];
  today?: string;
}

/** 결과(메모 · 다음 관리일 · 재등록)가 실제로 채워졌는가 */
export function hasRealOutcome(task: BriefingTask): boolean {
  const o = task.outcome;
  if (!o) return false;
  return Boolean(o.note?.trim() || o.nextManageDate || o.membershipRenewed);
}

export function computeCounts(input: CoverageInput): CoachCounts {
  const today = input.today ?? todayISO();
  const from = windowStart(WINDOW_DAYS, today);

  const inWindow = (iso?: string) => {
    if (!iso) return false;
    const d = localDateOf(iso);
    return d >= from && d <= today;
  };

  const visits28 = input.visits.filter((v) => inWindow(v.visitedAt)).length;
  const activeDays28 = new Set(
    input.visits.filter((v) => inWindow(v.visitedAt)).map((v) => localDateOf(v.visitedAt)),
  ).size;

  // 실행 증거 — pending 은 세지 않는다. "추천을 봤다" 는 행동이 아니다.
  const handled = input.taskOverrides.filter(
    (t) => t.status !== "pending" && t.status !== "confirmed" && t.statusChangedAt,
  );
  const handled28 = handled.filter((t) => inWindow(t.statusChangedAt));

  const done = handled.filter((t) => t.status === "done");

  return {
    visits28,
    activeDays28,
    actions28: handled28.length,
    actionsWithOutcome28: handled28.filter(hasRealOutcome).length,
    results: done.filter((t) => findResultVisit(t, input.visits)).length,
    renewals: done.filter((t) => t.outcome?.membershipRenewed).length,
    portalEvents: input.requests.length + input.feedback.length,
    portalHandled: input.requests.filter((r) => r.status !== "open").length,
    pendingTasks: input.pendingTasks.length,
  };
}

/** 사람 말 한 줄 — 숫자가 아니라 다음에 뭘 하면 되는지 */
function messageFor(area: EvidenceArea, percent: number | null): string {
  if (percent === null) return "아직 측정 전이에요";
  if (percent >= 90) return "충분히 쌓였어요";
  if (percent >= 60)
    return area === "record" ? "잘 쌓이고 있어요" : "조금만 더 쌓으면 됩니다";
  if (percent >= 25)
    return area === "record"
      ? "기록이 쌓이는 중이에요"
      : area === "action"
        ? "처리결과를 조금 더 남겨주세요"
        : area === "result"
          ? "실제 재방문 기록이 더 필요해요"
          : "고객 요청 기록이 아직 적어요";
  if (percent > 0) return "이제 막 시작했어요";
  return area === "record"
    ? "오늘 첫 기록부터 시작하면 됩니다"
    : area === "action"
      ? "아직 실제 처리기록이 없어요"
      : area === "result"
        ? "관리 뒤 재방문이 아직 확인되지 않았어요"
        : "고객이 남긴 기록이 아직 없어요";
}

export function computeCoverage(input: CoverageInput): CoverageResult {
  const counts = computeCounts(input);
  const areas: AreaScore[] = [];

  /* ── A. 방문 기록 ─────────────────────────────────────────
     명부가 비어 있으면 기록할 대상 자체가 없다 — 그때만 측정 전. */
  if (input.customerCount === 0) {
    areas.push({
      area: "record",
      label: AREA_LABEL.record,
      percent: null,
      detail: "고객 명부가 비어 있습니다",
      message: messageFor("record", null),
      unmeasurableReason: "고객을 먼저 등록하면 방문 기록을 셀 수 있어요",
    });
  } else {
    const p = pct(
      ratio(counts.visits28, COACH_TARGET.visits28) * 0.6 +
        ratio(counts.activeDays28, COACH_TARGET.activeDays28) * 0.4,
    );
    areas.push({
      area: "record",
      label: AREA_LABEL.record,
      percent: p,
      detail: `최근 4주 ${counts.visits28}건 / 목표 ${COACH_TARGET.visits28}건 · 기록한 날 ${counts.activeDays28}일 / ${COACH_TARGET.activeDays28}일`,
      message: messageFor("record", p),
    });
  }

  /* ── B. 고객관리 실행 ─────────────────────────────────────
     챙길 고객도 없고 처리한 적도 없으면 아직 잴 것이 없다. */
  const everHadTask = input.taskOverrides.length > 0 || counts.pendingTasks > 0;
  if (!everHadTask) {
    areas.push({
      area: "action",
      label: AREA_LABEL.action,
      percent: null,
      detail: "아직 관리 대상으로 올라온 고객이 없습니다",
      message: messageFor("action", null),
      unmeasurableReason: "방문 기록이 쌓이면 오늘 챙길 고객이 만들어져요",
    });
  } else {
    const outcomeRate =
      counts.actions28 > 0 ? counts.actionsWithOutcome28 / counts.actions28 : 0;
    const p = pct(
      ratio(counts.actions28, COACH_TARGET.actions28) * 0.7 +
        ratio(outcomeRate, COACH_TARGET.outcomeRatio) * 0.3,
    );
    areas.push({
      area: "action",
      label: AREA_LABEL.action,
      percent: p,
      detail: `최근 4주 처리 ${counts.actions28}건 / 목표 ${COACH_TARGET.actions28}건 · 결과 남김 ${counts.actionsWithOutcome28}건`,
      message: messageFor("action", p),
    });
  }

  /* ── C. 재방문 결과 ───────────────────────────────────────
     처리한 적이 없으면 "그 뒤에 무엇이 일어났나" 를 물을 수 없다.
     관리하지 않은 고객의 방문을 성과로 세지 않기 위한 선이다. */
  const doneCount = input.taskOverrides.filter((t) => t.status === "done").length;
  if (doneCount === 0) {
    areas.push({
      area: "result",
      label: AREA_LABEL.result,
      percent: null,
      detail: "처리완료한 관리 과제가 아직 없습니다",
      message: messageFor("result", null),
      unmeasurableReason:
        "고객을 챙긴 기록이 있어야 그 뒤의 재방문을 이어서 볼 수 있어요",
    });
  } else {
    const p = pct(
      ratio(counts.results, COACH_TARGET.results) * 0.7 +
        ratio(counts.renewals, COACH_TARGET.renewals) * 0.3,
    );
    areas.push({
      area: "result",
      label: AREA_LABEL.result,
      percent: p,
      detail: `관리 후 재방문 확인 ${counts.results}건 / 목표 ${COACH_TARGET.results}건 · 이용권 재등록 ${counts.renewals}건 / ${COACH_TARGET.renewals}건`,
      message: messageFor("result", p),
    });
  }

  /* ── D. 고객 직접사용 ─────────────────────────────────────
     연결 전에는 고객이 남길 길 자체가 없다. 0% 로 적으면 매장이
     못한 것처럼 보이므로 「아직 측정 전」이라고 쓴다. */
  if (!input.portalLinked) {
    areas.push({
      area: "adoption",
      label: AREA_LABEL.adoption,
      percent: null,
      detail: "고객 화면이 매장 계정과 아직 연결되지 않았습니다",
      message: messageFor("adoption", null),
      unmeasurableReason:
        "설정에서 매장 계정을 연결하면 고객이 남긴 요청을 셀 수 있어요",
    });
  } else {
    const p = pct(
      ratio(counts.portalEvents, COACH_TARGET.portalEvents) * 0.6 +
        ratio(counts.portalHandled, COACH_TARGET.portalHandled) * 0.4,
    );
    areas.push({
      area: "adoption",
      label: AREA_LABEL.adoption,
      percent: p,
      detail: `고객이 남긴 기록 ${counts.portalEvents}건 / 목표 ${COACH_TARGET.portalEvents}건 · 처리한 요청 ${counts.portalHandled}건 / ${COACH_TARGET.portalHandled}건`,
      message: messageFor("adoption", p),
    });
  }

  const measurable = areas.filter((a) => a.percent !== null);
  const overall =
    measurable.length === 0
      ? null
      : Math.round(
          measurable.reduce((sum, a) => sum + (a.percent ?? 0), 0) / measurable.length,
        );

  return { overall, areas, counts, measurableAreas: measurable.length };
}
