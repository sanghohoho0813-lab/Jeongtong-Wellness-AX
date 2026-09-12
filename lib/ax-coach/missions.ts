/**
 * AX Coach — 오늘 할 일(Mission) 고르기
 * =====================================
 *
 * 규칙 세 가지
 * ------------
 * 1. **실제 대상이 없으면 띄우지 않는다.** 상담 후 미예약 고객이 0명인데
 *    "상담 후 미예약 고객에게 연락하세요" 를 띄우는 순간, 이 화면은
 *    두 번 다시 신뢰받지 못한다.
 * 2. **누구를 챙길지는 여기서 정하지 않는다.** 고객 우선순위는
 *    `lib/scoring/priority.ts` 한 곳에서만 나온다. Coach 는 그 결과
 *    (브리핑 과제)를 재료로 받아 **어느 방향이 비었는지**만 고른다.
 * 3. **하루 안에서는 흔들리지 않는다.** 오늘 이미 낸 Mission 은 검증되기
 *    전까지 그대로 둔다. 업무 중에 카드가 계속 바뀌면 60대 사용자에게는
 *    "아까 그거 어디 갔지" 가 된다. 검증되면 그 자리에 다음 것이 온다.
 */

import type { BriefingTask, Customer } from "@/lib/types";
import type { CustomerRequestRow } from "@/lib/supabase/sync";
import { hasRealOutcome } from "./coverage";
import type {
  AreaScore,
  CoachMissionType,
  CoverageResult,
  EvidenceArea,
  VerificationType,
} from "./types";

export interface MissionCandidate {
  type: CoachMissionType;
  area: EvidenceArea;
  /** 특정 고객을 겨냥하면 그 고객 */
  targetCustomerId?: string;
  targetCustomerName?: string;
  /** 한 줄 제목 — 동사로 끝난다 */
  title: string;
  /** 왜 이걸 하는지 — 두 줄 이내 */
  why: string;
  ctaLabel: string;
  ctaHref: string;
  /** 검증되기 전 안내 */
  waiting: string;
  /** 검증된 뒤 안내 */
  verified: string;
  /** 무엇이 생겨야 완료인지 (화면에 그대로 적는다) */
  verifyBy: VerificationType;
  score: number;
}

export interface MissionInput {
  coverage: CoverageResult;
  /** 오늘 계산된 브리핑 과제 (pending · confirmed 포함) */
  pendingTasks: BriefingTask[];
  /** 저장된 과제 상태 */
  taskOverrides: BriefingTask[];
  customers: Customer[];
  customerCount: number;
  portalLinked: boolean;
  requests: CustomerRequestRow[];
  /** 이름 가리기 (화면 공유 모드) */
  nameOf: (customerId: string) => string;
}

const areaOf = (coverage: CoverageResult, area: EvidenceArea): AreaScore =>
  coverage.areas.find((a) => a.area === area)!;

/**
 * 이 영역이 얼마나 비었나 (0~1).
 * 아직 측정 전이면 1 — 「잴 수 있게 만드는 것」이 가장 급하다.
 */
function gap(coverage: CoverageResult, area: EvidenceArea): number {
  const a = areaOf(coverage, area);
  return a.percent === null ? 1 : (100 - a.percent) / 100;
}

/**
 * Mission 종류별 기본 무게.
 *
 * 기록 → 실행 → 결과 순으로 쌓인다. 앞 단계가 비어 있으면 뒤 단계는
 * 아무리 재촉해도 생기지 않으므로, 앞쪽에 더 큰 무게를 둔다.
 */
const BASE_WEIGHT: Record<CoachMissionType, number> = {
  visit_record: 1.0,
  briefing_action: 0.95,
  request_handle: 0.9, // 고객이 기다리고 있다 — 오늘 안에 답해야 한다
  consult_followup: 0.85,
  membership_care: 0.8,
  task_outcome: 0.6,
  portal_invite: 0.4,
};

export function buildCandidates(input: MissionInput): MissionCandidate[] {
  const { coverage, pendingTasks, taskOverrides, portalLinked, requests } = input;
  const out: MissionCandidate[] = [];

  const push = (c: Omit<MissionCandidate, "score">, urgency = 1) =>
    out.push({ ...c, score: gap(coverage, c.area) * BASE_WEIGHT[c.type] * urgency });

  /* ── A. 실제 방문기록 ── */
  if (input.customerCount > 0) {
    push({
      type: "visit_record",
      area: "record",
      title: "오늘 오신 고객의 관리기록 남기기",
      why: "방문기록이 쌓여야 재방문 주기와 관리 효과를 확인할 수 있어요.",
      ctaLabel: "방문 기록하기",
      ctaHref: "/visits",
      waiting: "아직 새 방문기록이 확인되지 않았어요",
      verified: "실제 방문기록을 확인했어요",
      verifyBy: "visit_created",
    });
  }

  /* ── B · D · E. 오늘 챙길 고객 ──
     셋 다 같은 브리핑 과제를 가리킨다. 세 장을 함께 띄우면 같은 말을
     세 번 하는 셈이라, 대기 건수를 보고 하나만 고른다.
       3건 이상 → 목록을 여는 편이 빠르다 (B)
       1~2건    → 사람 이름을 부르는 편이 명확하다 (D · E) */
  const openTasks = pendingTasks.filter(
    (t) => t.status === "pending" || t.status === "confirmed",
  );
  const consult = openTasks.find((t) => t.category === "consult_no_booking");
  const lowPass = openTasks.find((t) => t.category === "membership_low");
  const preferNamed = openTasks.length > 0 && openTasks.length <= 2;

  if (openTasks.length > 0) {
    if (preferNamed && consult) {
      push({
        type: "consult_followup",
        area: "action",
        targetCustomerId: consult.customerId,
        targetCustomerName: input.nameOf(consult.customerId),
        title: `상담만 받고 가신 ${input.nameOf(consult.customerId)} 님 챙기기`,
        why: "상담 뒤 예약으로 이어지지 않은 구간이 가장 놓치기 쉬워요.",
        ctaLabel: "이 고객 보기",
        ctaHref: `/customers/${consult.customerId}`,
        waiting: "아직 실제 처리기록이 확인되지 않았어요",
        verified: "실제 처리기록을 확인했어요",
        verifyBy: "task_status_changed",
      });
    } else if (preferNamed && lowPass) {
      push({
        type: "membership_care",
        area: "action",
        targetCustomerId: lowPass.customerId,
        targetCustomerName: input.nameOf(lowPass.customerId),
        title: `이용권이 얼마 남지 않은 ${input.nameOf(lowPass.customerId)} 님 확인하기`,
        why: "이용권을 다 쓰신 뒤 재등록이 놓치기 쉬운 구간입니다.",
        ctaLabel: "이 고객 보기",
        ctaHref: `/customers/${lowPass.customerId}`,
        waiting: "아직 실제 처리기록이 확인되지 않았어요",
        verified: "실제 처리기록을 확인했어요",
        verifyBy: "task_status_changed",
      });
    } else {
      push(
        {
          type: "briefing_action",
          area: "action",
          title: "오늘 챙길 고객 한 분 연락하기",
          why: "추천을 보는 것보다, 실제로 처리한 기록이 남는 것이 중요해요.",
          ctaLabel: "오늘의 브리핑 보기",
          ctaHref: "/briefing",
          waiting: "아직 실제 처리기록이 확인되지 않았어요",
          verified: "실제 처리기록을 확인했어요",
          verifyBy: "task_status_changed",
        },
        // 밀린 과제가 많을수록 급하다 (최대 1.3배)
        Math.min(1.3, 1 + openTasks.length / 20),
      );
    }
  }

  /* ── C. 결과 남기기 ──
     처리는 했는데 무엇을 했는지가 비어 있는 건. 이게 비면 나중에
     "관리해서 다시 오신 것" 을 이어 볼 수가 없다. */
  const thin = taskOverrides.filter(
    (t) => t.status === "done" && t.statusChangedAt && !hasRealOutcome(t),
  );
  if (thin.length > 0) {
    push({
      type: "task_outcome",
      area: "action",
      title: "연락한 고객의 결과 한 줄 남기기",
      why: `처리만 되어 있고 내용이 비어 있는 건이 ${thin.length}건 있어요.`,
      ctaLabel: "오늘의 브리핑 보기",
      ctaHref: "/briefing",
      waiting: "아직 결과가 채워지지 않았어요",
      verified: "처리 결과가 남은 것을 확인했어요",
      verifyBy: "task_outcome_saved",
    });
  }

  /* ── F. 고객 요청 처리 ── */
  const open = requests.filter((r) => r.status === "open");
  if (portalLinked && open.length > 0) {
    const first = [...open].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
    push({
      type: "request_handle",
      area: "adoption",
      targetCustomerId: first.customerId,
      targetCustomerName: input.nameOf(first.customerId),
      title: `고객이 남긴 요청 확인하기 (${open.length}건)`,
      why: "고객이 직접 남긴 것이라 오늘 안에 답하는 편이 좋아요.",
      ctaLabel: "요청 확인하기",
      ctaHref: `/customers/${first.customerId}`,
      waiting: "아직 처리하지 않은 요청이 남아 있어요",
      verified: "요청을 처리한 기록을 확인했어요",
      verifyBy: "request_handled",
    });
  }

  /* ── G. 고객 직접사용 ──
     "안내했다" 는 체크로는 완료되지 않는다. 고객이 실제로 요청을
     남겼을 때만 채워진다. 연결 전에는 남길 길이 없으므로 띄우지 않는다. */
  if (
    portalLinked &&
    open.length === 0 &&
    (areaOf(coverage, "adoption").percent ?? 0) < 100
  ) {
    push({
      type: "portal_invite",
      area: "adoption",
      title: "오시는 고객께 MY WELLNESS 안내하기",
      why: "고객이 직접 남긴 요청이 있어야 실제로 쓰이고 있다는 증거가 됩니다.",
      ctaLabel: "연결코드 안내문 보기",
      ctaHref: "/customers",
      waiting: "아직 고객이 남긴 새 요청이 없어요",
      verified: "고객이 직접 남긴 요청을 확인했어요",
      verifyBy: "request_created",
    });
  }

  return out.sort((a, b) => b.score - a.score);
}

/** 오늘 화면에 올릴 Mission — 최대 3개 */
export const MAX_MISSIONS = 3;

export function selectMissions(input: MissionInput): MissionCandidate[] {
  return buildCandidates(input).slice(0, MAX_MISSIONS);
}
