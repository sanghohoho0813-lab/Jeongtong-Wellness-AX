/**
 * AX Coach — 실제 Event 검증
 * ===========================
 *
 * AX Coach 에서 가장 중요한 부분이다.
 *
 * Mission 카드에 「완료」 단추를 두고 사람이 누르게 하면, 그 순간 이
 * 화면은 자기보고 체크리스트가 된다. 심사자 앞에서 "이건 눌러서 만든
 * 숫자인가요" 라는 질문 하나에 전부 무너진다.
 *
 * 그래서 완료는 **기록에서 찾는다.** CTA 는 업무 화면으로 보낼 뿐이고,
 * 그 뒤에 실제 방문 · 처리 · 요청이 생겼는지를 다시 와서 확인한다.
 *
 * 시각 비교와 개수 비교
 * ---------------------
 * 과제 처리(statusChangedAt) · 요청(createdAt · handledAt)에는 시스템이
 * 찍은 시각이 있으므로 **발행 시각 이후**인지로 본다.
 *
 * 방문 기록에는 그런 값이 없다. `visitedAt` 은 사람이 고르는 "방문한
 * 날" 이라 어제 방문을 오늘 적을 수도 있다. 그래서 방문만은 발행 시점의
 * **개수를 적어 두고, 늘었는지**로 본다. 늘었다면 발행 이후에 실제로
 * 저장하는 동작이 있었던 것이다.
 */

import type { BriefingTask, Visit } from "@/lib/types";
import type { CustomerRequestRow } from "@/lib/supabase/sync";
import { hasRealOutcome } from "./coverage";
import type { CoachMissionLog, CoachMissionType, VerificationType } from "./types";

export interface VerifyInput {
  visits: Visit[];
  taskOverrides: BriefingTask[];
  requests: CustomerRequestRow[];
}

export interface VerifyResult {
  verifiedAt: string;
  verificationType: VerificationType;
  verificationRef?: string;
}

/** 발행 시점에 적어 둘 개수 — 개수로 보는 Mission 에만 뜻이 있다 */
export function snapshotFor(
  type: CoachMissionType,
  targetCustomerId: string | undefined,
  input: VerifyInput,
): number {
  if (type === "visit_record") return input.visits.length;
  if (type === "consult_followup" || type === "membership_care") {
    return input.visits.filter((v) => v.customerId === targetCustomerId).length;
  }
  return 0;
}

/** ISO 시각 비교 — 값이 없으면 언제나 "이전" 으로 본다 */
const after = (iso: string | undefined, since: string) => !!iso && iso > since;

/** 가장 최근 방문 기록 (개수로 검증했을 때 무엇을 가리킬지) */
function newestVisit(visits: Visit[]): Visit | undefined {
  return [...visits].sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))[0];
}

export function verifyMission(
  m: CoachMissionLog,
  input: VerifyInput,
  now: string = new Date().toISOString(),
): VerifyResult | null {
  switch (m.type) {
    /* 새 방문 · 상담 기록이 저장되었는가 */
    case "visit_record": {
      if (input.visits.length <= m.baseline) return null;
      const v = newestVisit(input.visits);
      return {
        // 저장 시각이 남지 않으므로 "확인한 시각" 을 적는다
        verifiedAt: now,
        verificationType: "visit_created",
        verificationRef: v?.id,
      };
    }

    /* 브리핑 과제가 실제로 처리되었는가 (pending 은 처리가 아니다) */
    case "briefing_action": {
      const t = input.taskOverrides
        .filter(
          (x) =>
            (x.status === "done" || x.status === "hold") &&
            after(x.statusChangedAt, m.issuedAt),
        )
        .sort((a, b) => (a.statusChangedAt ?? "").localeCompare(b.statusChangedAt ?? ""))[0];
      if (!t) return null;
      return {
        verifiedAt: t.statusChangedAt!,
        verificationType: "task_status_changed",
        verificationRef: t.id,
      };
    }

    /* 처리 결과가 실제로 채워졌는가 */
    case "task_outcome": {
      const t = input.taskOverrides
        .filter(
          (x) =>
            x.status === "done" &&
            after(x.statusChangedAt, m.issuedAt) &&
            hasRealOutcome(x),
        )
        .sort((a, b) => (a.statusChangedAt ?? "").localeCompare(b.statusChangedAt ?? ""))[0];
      if (!t) return null;
      return {
        verifiedAt: t.statusChangedAt!,
        verificationType: "task_outcome_saved",
        verificationRef: t.id,
      };
    }

    /*
      이름을 부른 Mission — 그 고객의 과제가 처리되었거나, 그 고객의
      방문이 새로 기록되었거나. 둘 중 하나면 오늘 그분을 챙긴 것이다.
    */
    case "consult_followup":
    case "membership_care": {
      const t = input.taskOverrides.find(
        (x) =>
          x.customerId === m.targetCustomerId &&
          (x.status === "done" || x.status === "hold") &&
          after(x.statusChangedAt, m.issuedAt),
      );
      if (t) {
        return {
          verifiedAt: t.statusChangedAt!,
          verificationType: "task_status_changed",
          verificationRef: t.id,
        };
      }
      const mine = input.visits.filter((v) => v.customerId === m.targetCustomerId);
      if (mine.length > m.baseline) {
        return {
          verifiedAt: now,
          verificationType: "visit_created",
          verificationRef: newestVisit(mine)?.id,
        };
      }
      return null;
    }

    /* 고객 요청을 직원이 처리했는가 */
    case "request_handle": {
      const r = input.requests
        .filter((x) => x.status !== "open" && after(x.handledAt, m.issuedAt))
        .sort((a, b) => (a.handledAt ?? "").localeCompare(b.handledAt ?? ""))[0];
      if (!r) return null;
      return {
        verifiedAt: r.handledAt!,
        verificationType: "request_handled",
        verificationRef: r.id,
      };
    }

    /*
      고객이 직접 남겼는가 — 직원이 "안내했다" 고 체크하는 길은 없다.
      실제 요청 행이 새로 생겨야 한다.
    */
    case "portal_invite": {
      const r = input.requests
        .filter((x) => after(x.createdAt, m.issuedAt))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
      if (!r) return null;
      return {
        verifiedAt: r.createdAt,
        verificationType: "request_created",
        verificationRef: r.id,
      };
    }

    default:
      return null;
  }
}

/** 아직 검증되지 않은 Mission 을 한 번에 확인한다 */
export function verifyAll(
  missions: CoachMissionLog[],
  input: VerifyInput,
  now: string = new Date().toISOString(),
): Array<{ id: string } & VerifyResult> {
  const out: Array<{ id: string } & VerifyResult> = [];
  for (const m of missions) {
    if (m.verifiedAt) continue;
    const r = verifyMission(m, input, now);
    if (r) out.push({ id: m.id, ...r });
  }
  return out;
}

/** 사람이 읽는 검증 방식 — 화면에 그대로 적는다 */
export const VERIFY_LABEL: Record<VerificationType, string> = {
  visit_created: "새 방문 · 상담 기록이 저장되면 완료",
  task_status_changed: "브리핑에서 실제로 처리하면 완료",
  task_outcome_saved: "처리 결과를 남기면 완료",
  request_handled: "고객 요청을 처리하면 완료",
  request_created: "고객이 직접 요청을 남기면 완료",
};
