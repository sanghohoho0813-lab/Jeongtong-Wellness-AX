"use client";

/**
 * AX Coach — 화면이 쓰는 하나의 입구
 * ==================================
 *
 * 화면은 계산을 모른다. 여기서 세 가지를 한다.
 *
 *   1) 지금 기록으로 실증 준비도를 잰다
 *   2) 오늘 할 일을 고르고, 아직 안 낸 것만 발행한다
 *   3) 이미 낸 것 중 실제 기록으로 충족된 것을 찾아 표시한다
 *
 * 발행과 검증은 **화면을 열 때** 일어난다. 그래서 방문을 기록하고
 * 이틀 뒤에 들어와도 그때 확인된다 — 발행 시각 이후의 기록을 보기
 * 때문에 놓치지 않는다.
 */

import { useEffect, useMemo } from "react";
import { useStore } from "@/lib/data/store";
import { useStaffLink } from "@/lib/supabase/StaffLink";
import { useDeliveryStage } from "@/lib/stage";
import { displayName } from "@/lib/utils/format";
import { localDateOf, todayISO } from "@/lib/utils/date";
import { computeCoverage, type CoverageInput } from "./coverage";
import { selectMissions, type MissionCandidate } from "./missions";
import { snapshotFor, verifyAll } from "./verify";
import type { CoachMissionLog, CoverageResult } from "./types";

export interface CoachMissionView {
  candidate: MissionCandidate;
  log?: CoachMissionLog;
  /** 실제 기록으로 충족이 확인됐는가 */
  verified: boolean;
  verifiedAt?: string;
}

export interface CoachView {
  ready: boolean;
  coverage: CoverageResult;
  coverageInput: CoverageInput;
  missions: CoachMissionView[];
  todayIssued: CoachMissionLog[];
  todayVerified: number;
  allMissions: CoachMissionLog[];
  /** 시연 자료로 도는 중인가 — 화면에 그대로 적는다 */
  isDemo: boolean;
  stageLabel: string;
  portalLinked: boolean;
}

export function useCoach(): CoachView {
  const {
    ready,
    visits,
    taskOverrides,
    briefingTasks,
    memberships,
    customers,
    privacyMode,
    coachMissions,
    issueCoachMission,
    markCoachMissionVerified,
  } = useStore();
  const { phase, requests, feedback } = useStaffLink();
  const stage = useDeliveryStage();

  const portalLinked = phase === "linked";
  const logs = useMemo(() => coachMissions ?? [], [coachMissions]);

  const coverageInput = useMemo<CoverageInput>(
    () => ({
      visits,
      taskOverrides,
      pendingTasks: briefingTasks.filter(
        (t) => t.status === "pending" || t.status === "confirmed",
      ),
      memberships,
      customerCount: customers.length,
      portalLinked,
      requests,
      feedback,
    }),
    [visits, taskOverrides, briefingTasks, memberships, customers.length, portalLinked, requests, feedback],
  );

  const coverage = useMemo(() => computeCoverage(coverageInput), [coverageInput]);

  const nameOf = useMemo(
    () => (id: string) => {
      const c = customers.find((x) => x.id === id);
      return c ? displayName(c.name, privacyMode) : "고객";
    },
    [customers, privacyMode],
  );

  const candidates = useMemo(
    () =>
      selectMissions({
        coverage,
        pendingTasks: coverageInput.pendingTasks,
        taskOverrides,
        customers,
        customerCount: customers.length,
        portalLinked,
        requests,
        nameOf,
      }),
    [coverage, coverageInput.pendingTasks, taskOverrides, customers, portalLinked, requests, nameOf],
  );

  const today = todayISO();
  const todayIssued = useMemo(
    () => logs.filter((m) => localDateOf(m.issuedAt) === today),
    [logs, today],
  );

  /* ── 발행 — 오늘 아직 안 낸 종류만 ── */
  useEffect(() => {
    if (!ready) return;
    for (const c of candidates) {
      if (todayIssued.some((m) => m.type === c.type)) continue;
      issueCoachMission({
        type: c.type,
        area: c.area,
        targetCustomerId: c.targetCustomerId,
        baseline: snapshotFor(c.type, c.targetCustomerId, {
          visits,
          taskOverrides,
          requests,
        }),
      });
    }
  }, [ready, candidates, todayIssued, issueCoachMission, visits, taskOverrides, requests]);

  /* ── 검증 — 사람이 누르는 길은 없다. 기록에서 찾는다 ── */
  useEffect(() => {
    if (!ready) return;
    const found = verifyAll(logs, { visits, taskOverrides, requests });
    for (const f of found) {
      markCoachMissionVerified(f.id, {
        verifiedAt: f.verifiedAt,
        verificationType: f.verificationType,
        verificationRef: f.verificationRef,
      });
    }
  }, [ready, logs, visits, taskOverrides, requests, markCoachMissionVerified]);

  /*
    화면에 올릴 목록.

    오늘 낸 것이 먼저다 — 검증된 것도 자리를 지켜 "오늘 3개 중 2개" 가
    보이게 한다. 아직 안 낸 후보는 그 뒤에 붙는다(발행 직후 한 번의
    렌더에서만 생기는 상태다).
  */
  const missions = useMemo<CoachMissionView[]>(() => {
    const byType = new Map(candidates.map((c) => [c.type, c]));
    const out: CoachMissionView[] = [];
    for (const log of todayIssued) {
      const c = byType.get(log.type);
      if (!c) continue; // 조건이 사라진 Mission 은 더 보여 주지 않는다
      out.push({
        candidate: c,
        log,
        verified: !!log.verifiedAt,
        verifiedAt: log.verifiedAt,
      });
      byType.delete(log.type);
    }
    for (const c of candidates) {
      if (!byType.has(c.type)) continue;
      out.push({ candidate: c, verified: false });
    }
    return out.slice(0, 3);
  }, [candidates, todayIssued]);

  return {
    ready,
    coverage,
    coverageInput,
    missions,
    todayIssued,
    todayVerified: missions.filter((m) => m.verified).length,
    allMissions: logs,
    isDemo: !stage.canClaimResults,
    stageLabel: stage.label,
    portalLinked,
  };
}
