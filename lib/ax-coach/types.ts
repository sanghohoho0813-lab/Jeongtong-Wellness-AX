/**
 * AX Coach — 타입
 * ================
 *
 * AX Coach 는 「오늘의 실행 브리핑」 위에 얹는 **실증 운영 레이어**다.
 * 둘의 질문이 다르다.
 *
 *   실행 브리핑 : 오늘 누구에게 연락해야 하지?
 *   AX Coach   : 이 시스템을 실제로 쓰고 있고, 그 변화가 증거로 쌓이고
 *                있나? 아니라면 오늘 어떤 **실제 업무**를 해야 하나?
 *
 * 그래서 Coach 는 고객 우선순위를 다시 계산하지 않는다. 누구를 챙길지는
 * `lib/scoring/priority.ts` 가 정하고, Coach 는 그 결과를 **재료로만** 쓴다.
 * (두 번째 우선순위 엔진을 만들면 매장이 서로 다른 두 목록을 보게 된다)
 */

/** 실증 영역 넷 — 이 매장 규모에서 이 이상 쪼개면 아무도 안 본다 */
export type EvidenceArea = "record" | "action" | "result" | "adoption";

export const AREA_LABEL: Record<EvidenceArea, string> = {
  record: "방문 · 상담 기록",
  action: "고객관리 실행",
  result: "재방문 결과",
  adoption: "고객 직접사용",
};

/** 화면에 크게 쓰지 않는 속뜻 — 문서·툴팁용 */
export const AREA_QUESTION: Record<EvidenceArea, string> = {
  record: "실제 방문과 상담이 시스템에 남고 있는가",
  action: "시스템이 알려준 고객을 실제로 챙기고 있는가",
  result: "관리 행동 뒤에 실제 재방문 · 재등록이 있었는가",
  adoption: "고객도 MY WELLNESS 를 직접 쓰고 있는가",
};

export type CoachMissionType =
  | "visit_record" // A 오늘 방문한 고객 기록
  | "briefing_action" // B 오늘 챙길 고객 처리
  | "task_outcome" // C 처리 결과 남기기
  | "consult_followup" // D 상담 후 미예약 챙기기
  | "membership_care" // E 이용권 잔여 임박 · 소진
  | "request_handle" // F 고객 요청 처리
  | "portal_invite"; // G 고객에게 MY WELLNESS 안내

/**
 * 무엇이 실제로 생겨야 완료로 보는가.
 * 사람이 「완료」를 누르는 길은 없다 — 아래 사건이 기록에 나타나야 한다.
 */
export type VerificationType =
  | "visit_created" // 새 방문 · 상담 기록이 저장됨
  | "task_status_changed" // 브리핑 과제가 실제로 처리됨 (statusChangedAt)
  | "task_outcome_saved" // 처리 결과(메모 · 다음 관리일)가 채워짐
  | "request_handled" // 고객 요청을 직원이 처리함 (handledAt)
  | "request_created"; // 고객이 직접 요청을 남김 (createdAt)

/**
 * Mission 이력 — **새로운 자료**만 담는다.
 *
 * 방문 · 과제 · 요청의 내용은 여기에 복사하지 않는다. 원본은 이미
 * 다른 곳에 있고, 두 벌이 되면 어느 쪽이 진짜인지 알 수 없게 된다.
 * 여기 남기는 것은 「언제 무엇을 하자고 했고, 나중에 어떤 실제 기록이
 * 그것을 충족했는가」 뿐이다.
 */
export interface CoachMissionLog {
  id: string;
  branchId: string;
  type: CoachMissionType;
  area: EvidenceArea;
  /** 특정 고객을 겨냥한 Mission 이면 그 고객 (D · E) */
  targetCustomerId?: string;
  /** 발행 시각 (ISO). 검증은 **이 시각 이후**에 생긴 기록만 인정한다 */
  issuedAt: string;
  /** 이 날이 지나면 새로 발행한다 (ISO, 발행일 끝) */
  expiresAt: string;
  /**
   * 발행 시점의 「충족 사건 개수」.
   *
   * 방문 기록에는 "언제 저장했는가" 가 남지 않는다 (visitedAt 은 사람이
   * 고르는 방문 날짜다). 그래서 시각 비교 대신 **개수가 늘었는지**로
   * 본다. 늘었다면 발행 이후에 실제로 새 기록이 저장된 것이다.
   */
  baseline: number;
  verifiedAt?: string;
  verificationType?: VerificationType;
  /** 무엇이 이를 충족했는지 — 원본 기록의 id 하나만 (내용은 복사하지 않는다) */
  verificationRef?: string;
}

/** 한 영역의 실증 준비도 */
export interface AreaScore {
  area: EvidenceArea;
  label: string;
  /** null = 아직 측정 전. 0 과 구분한다 — 0 은 "쟀는데 없다" 는 뜻이다 */
  percent: number | null;
  /** 어떻게 센 값인지 — "최근 4주 3건 / 목표 20건" */
  detail: string;
  /** 사람 말 한 줄 */
  message: string;
  /** 측정할 수 없다면 왜 */
  unmeasurableReason?: string;
}

/** 리포트에서 다시 쓰는 실제 셈 결과 (지어낸 값 없음) */
export interface CoachCounts {
  /** 최근 28일 방문 · 상담 기록 수 */
  visits28: number;
  /** 최근 28일 중 무언가 기록된 날 수 */
  activeDays28: number;
  /** 최근 28일 실제 처리한 과제 수 (pending 은 실행이 아니다) */
  actions28: number;
  /** 그중 결과(메모 · 다음 관리일 · 재등록)를 남긴 수 */
  actionsWithOutcome28: number;
  /** 처리 후 30일 안에 실제 재방문이 확인된 수 */
  results: number;
  /** 처리 결과에 이용권 재등록이 기록된 수 */
  renewals: number;
  /** 고객이 직접 남긴 요청 · 피드백 수 */
  portalEvents: number;
  /** 그중 직원이 처리한 요청 수 */
  portalHandled: number;
  /** 지금 처리 대기 중인 브리핑 과제 수 */
  pendingTasks: number;
}

export interface CoverageResult {
  /** 전체 실증 준비도 (측정 가능한 영역 평균). null = 아직 측정 전 */
  overall: number | null;
  areas: AreaScore[];
  counts: CoachCounts;
  /** 몇 개 영역을 실제로 잴 수 있었는지 — 평균의 근거 */
  measurableAreas: number;
}
