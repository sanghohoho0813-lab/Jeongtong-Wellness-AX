/**
 * AX Coach — 7일 / 14일 실증 리포트
 * ==================================
 *
 * 심사자에게 내밀 한 장이 아니라, 대표님이 월요일 아침에 30초 보는
 * 한 장이다. 그래서 숫자 다섯 줄과 문장 세 개로 끝낸다.
 *
 * 「7일 전 24% → 지금 38%」 를 어떻게 정직하게 적는가
 * ----------------------------------------------------
 * 그때의 화면을 저장해 두지는 않았다. 대신 **지금 남아 있는 기록에
 * 시각이 다 붙어 있으므로**, 7일 전 시점까지의 기록만 남기고 같은
 * 계산식을 다시 돌리면 그때 값을 되살릴 수 있다.
 *
 * 이것은 "그때 화면에 그렇게 떠 있었다" 가 아니라 "지금 기록으로 그때를
 * 다시 계산하면 이 값이다" 이다. 화면에도 그렇게 적는다. 되살릴 수 없는
 * 경우(그 시점 이전 기록이 아예 없음)에는 만들지 않고 「이전 비교자료
 * 없음」이라고 쓴다.
 */

import { computeCoverage, hasRealOutcome, type CoverageInput } from "./coverage";
import { findResultVisit } from "@/lib/utils/evidence";
import { localDateOf, todayISO } from "@/lib/utils/date";
import type { CoachMissionLog } from "./types";

export interface CoachReport {
  days: number;
  /** 시스템을 실제로 쓴 날 (무언가 기록된 날) */
  activeDays: number;
  newVisits: number;
  actions: number;
  /** 관리 후 30일 안에 재방문이 확인된 건 (기간 안에 처리한 건 기준) */
  resultsConfirmed: number;
  customerRequests: number;
  /** 이 기간에 실제로 검증된 Mission 수 */
  missionsVerified: number;
  /** 이번 기간에 달라진 점 · 아직 더 필요한 것 · 다음 추천 */
  changed: string[];
  needed: string[];
  next: string[];
}

/** N일 전 날짜 (오늘 포함 N일 창의 시작) */
function startOf(days: number, today: string): string {
  const d = new Date(today + "T00:00:00");
  d.setDate(d.getDate() - (days - 1));
  return d.toISOString().slice(0, 10);
}

export function buildReport(
  input: CoverageInput,
  missions: CoachMissionLog[],
  days: 7 | 14,
  today: string = todayISO(),
): CoachReport {
  const from = startOf(days, today);
  const inWindow = (iso?: string) => {
    if (!iso) return false;
    const d = localDateOf(iso);
    return d >= from && d <= today;
  };

  const visits = input.visits.filter((v) => inWindow(v.visitedAt));
  const handled = input.taskOverrides.filter(
    (t) =>
      t.status !== "pending" && t.status !== "confirmed" && inWindow(t.statusChangedAt),
  );
  const done = handled.filter((t) => t.status === "done");
  const resultsConfirmed = done.filter((t) => findResultVisit(t, input.visits)).length;
  const renewals = done.filter((t) => t.outcome?.membershipRenewed).length;
  const requests = input.requests.filter((r) => inWindow(r.createdAt));
  const missionsVerified = missions.filter((m) => inWindow(m.verifiedAt)).length;

  const activeDays = new Set([
    ...visits.map((v) => localDateOf(v.visitedAt)),
    ...handled.map((t) => localDateOf(t.statusChangedAt!)),
  ]).size;

  /* ── 문장 셋 — 있는 사실만 적는다 ── */
  const changed: string[] = [];
  const needed: string[] = [];
  const next: string[] = [];

  if (activeDays > 0)
    changed.push(`${days}일 중 ${activeDays}일 기록을 남기셨습니다.`);
  if (visits.length > 0) changed.push(`새 방문·상담 기록 ${visits.length}건이 쌓였습니다.`);
  if (handled.length > 0)
    changed.push(`고객관리 과제를 실제로 ${handled.length}건 처리하셨습니다.`);
  if (resultsConfirmed > 0)
    changed.push(
      `관리한 고객 ${resultsConfirmed}분이 그 뒤 실제로 다시 오신 것이 확인되었습니다.`,
    );
  if (requests.length > 0)
    changed.push(`고객이 직접 남긴 요청이 ${requests.length}건 들어왔습니다.`);
  if (changed.length === 0)
    changed.push("이 기간에 새로 쌓인 기록이 아직 없습니다.");

  if (visits.length === 0) needed.push("방문·상담 기록이 아직 없습니다.");
  if (handled.length === 0) needed.push("실제로 처리한 관리 과제가 아직 없습니다.");
  else if (handled.filter(hasRealOutcome).length < handled.length)
    needed.push(
      `처리한 ${handled.length}건 중 ${handled.length - handled.filter(hasRealOutcome).length}건은 결과 내용이 비어 있습니다.`,
    );
  if (done.length > 0 && resultsConfirmed === 0)
    needed.push("관리 뒤 재방문이 아직 확인되지 않았습니다.");
  if (renewals === 0)
    needed.push("이용권 소진 뒤 재등록 사례가 아직 부족합니다.");
  if (input.portalLinked && requests.length === 0)
    needed.push("고객이 직접 남긴 요청이 아직 없습니다.");

  const cov = computeCoverage(input);
  const weakest = [...cov.areas]
    .filter((a) => a.percent !== null)
    .sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0))[0];
  if (weakest) next.push(`${weakest.label} 기록을 먼저 쌓아 보세요.`);
  const unmeasured = cov.areas.find((a) => a.percent === null);
  if (unmeasured?.unmeasurableReason) next.push(unmeasured.unmeasurableReason);
  if (next.length === 0) next.push("지금 흐름을 그대로 이어가시면 됩니다.");

  return {
    days,
    activeDays,
    newVisits: visits.length,
    actions: handled.length,
    resultsConfirmed,
    customerRequests: requests.length,
    missionsVerified,
    changed,
    needed,
    next,
  };
}

/**
 * 며칠 전 시점의 준비도를 지금 기록으로 다시 계산한다.
 *
 * **같은 영역끼리만 견준다.** 그때는 두 영역만 잴 수 있었고 지금은 셋을
 * 잴 수 있다면, 두 평균은 애초에 다른 것을 잰 값이라 빼기가 성립하지
 * 않는다. 실제로 처음 만들었을 때 「7일 전 54% → 지금 24%」 라는 말이
 * 나왔는데, 준비도가 떨어진 게 아니라 잴 수 있는 영역이 하나 늘어난
 * 것뿐이었다. 그런 비교는 만들지 않고 「이전 비교자료 없음」으로 둔다.
 */
export function trendVsDaysAgo(
  input: CoverageInput,
  daysAgoCount: number,
  today: string = todayISO(),
): { before: number; delta: number } | null {
  const now = computeCoverage(input);
  if (now.overall === null) return null;

  const d = new Date(today + "T00:00:00");
  d.setDate(d.getDate() - daysAgoCount);
  const asOf = d.toISOString().slice(0, 10);
  const upTo = (iso?: string) => !!iso && localDateOf(iso) <= asOf;

  const past: CoverageInput = {
    ...input,
    today: asOf,
    visits: input.visits.filter((v) => upTo(v.visitedAt)),
    // 그 시점까지 실제로 처리된 것만 — 아직 처리 전이었던 건은 pending 이었다
    taskOverrides: input.taskOverrides.filter((t) => upTo(t.statusChangedAt)),
    requests: input.requests.filter((r) => upTo(r.createdAt)),
    feedback: input.feedback.filter((f) => upTo(f.createdAt)),
    /*
      그때의 "오늘 챙길 고객" 목록은 되살릴 수 없다 (매일 새로 계산되는
      값이라 저장돼 있지 않다). 그래서 그 시점에 처리 이력이 남아 있는
      경우에만 실행 영역을 잴 수 있고, 아니면 비교 자체를 접는다.
    */
    pendingTasks: [],
  };

  const hadAnything =
    past.visits.length > 0 || past.taskOverrides.length > 0 || past.requests.length > 0;
  if (!hadAnything) return null;

  const before = computeCoverage(past);
  if (before.overall === null) return null;

  const key = (r: ReturnType<typeof computeCoverage>) =>
    r.areas
      .filter((a) => a.percent !== null)
      .map((a) => a.area)
      .sort()
      .join(",");
  // 잴 수 있었던 영역이 다르면 두 숫자는 같은 것을 잰 값이 아니다
  if (key(before) !== key(now)) return null;

  return { before: before.overall, delta: now.overall - before.overall };
}
