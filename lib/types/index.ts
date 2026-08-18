/**
 * 정통대왕쑥뜸원 Wellness AX Platform — 도메인 타입
 *
 * 장기 확장 구조: HQ → Branch → Staff → Customer → Visit / Activity
 * 현재는 1개 지점이지만 모든 엔티티는 branchId를 가진다.
 * 추후 Supabase 테이블과 1:1 매핑을 염두에 둔 구조.
 */

// ---------- 조직 ----------

export interface Branch {
  id: string;
  hqId: string;
  name: string;
  address?: string;
  phone?: string;
  openHours?: string;
  createdAt: string; // ISO date
}

export type StaffRole = "owner" | "manager" | "staff";

export interface Staff {
  id: string;
  branchId: string;
  name: string;
  role: StaffRole;
  phone?: string;
  active: boolean;
}

// ---------- 고객 ----------

export type CustomerStatus =
  | "new" // 신규 (첫 방문 후 초기 관리 기간)
  | "active" // 활성 (정상 주기 방문 중)
  | "at_risk" // 이탈 위험 (평균 주기 초과)
  | "dormant"; // 장기 미방문

export interface Customer {
  id: string;
  branchId: string;
  name: string;
  phone: string;
  gender?: "female" | "male" | "other";
  birthYear?: number;
  registeredAt: string; // ISO date
  assignedStaffId?: string;
  memo?: string; // 일반 특이사항
  /**
   * preferredCareAreas — 고객 프로필 기준 "주요 케어 부위".
   * 고객이 평소 집중 관리를 원하는 장기적인 선호 부위이며,
   * 고객 프로필(고객 상세 / 등록)에서만 수정한다.
   * 방문별 실제 케어 부위는 Visit.bodyParts(visitCareAreas)에 별도로 쌓인다.
   * (Supabase: customers.focus_body_parts jsonb)
   */
  focusBodyParts: BodyPartRecord[];
  nextManageDate?: string; // 다음 관리 예정일 (ISO date)
  lastContactDate?: string; // 마지막 연락일
  tags?: string[];
}

// ---------- 신체 부위 ----------

/** 1차 부위 구분. 향후 세부 부위 확장은 subPart 필드로. */
export type BodyPart =
  | "neck_shoulder"
  | "back"
  | "waist"
  | "abdomen"
  | "pelvis_hip"
  | "arm"
  | "knee"
  | "leg"
  | "foot_ankle"
  | "etc";

export type BodySide = "left" | "right" | "both";

export interface BodyPartRecord {
  part: BodyPart;
  side?: BodySide; // 향후 좌/우 구분 확장용 (현재 UI는 both 기본)
  subPart?: string; // 향후 세부 부위 확장용
  note?: string;
}

export const BODY_PART_LABELS: Record<BodyPart, string> = {
  neck_shoulder: "목/어깨",
  back: "등",
  waist: "허리",
  abdomen: "복부",
  pelvis_hip: "골반/엉덩이",
  arm: "팔",
  knee: "무릎",
  leg: "다리",
  foot_ankle: "발/발목",
  etc: "기타",
};

// ---------- 이용권 ----------

export type MembershipStatus = "active" | "exhausted" | "expired";

export interface Membership {
  id: string;
  branchId: string;
  customerId: string;
  programName: string; // 예: 쑥뜸 케어 10회권
  totalCount: number;
  remainingCount: number;
  purchasedAt: string;
  expiresAt?: string;
  price: number; // 원 단위
  status: MembershipStatus;
}

// ---------- 방문 / 이용 ----------

export type VisitType = "visit" | "consult"; // 이용 방문 / 상담

export interface Visit {
  id: string;
  branchId: string;
  customerId: string;
  staffId?: string;
  visitedAt: string; // ISO datetime
  type: VisitType;
  programName?: string; // 이용한 프로그램
  membershipId?: string; // 차감된 이용권
  /**
   * visitCareAreas — 이 방문 회차에서 실제 기록된 케어 부위.
   * 방문/상담 기록 입력 시에만 저장되며, 과거 방문을 다시 열면
   * 그 당시 선택한 부위가 그대로 표시된다 (방문별 스냅샷).
   * 고객 프로필의 주요 케어 부위(focusBodyParts)와는 독립적이다.
   * (Supabase: visits.body_parts jsonb)
   */
  bodyParts: BodyPartRecord[];
  reaction?: string; // 고객 반응/메모
  amount?: number; // 현장 결제 금액 (이용권 외)
  nextManageDate?: string; // 이 방문에서 잡은 다음 관리 예정일
}

// ---------- 오늘의 실행 브리핑 ----------

export type TaskCategory =
  | "revisit_due" // 재방문 예정
  | "dormant" // 장기 미방문
  | "membership_low" // 이용권 잔여 임박
  | "new_followup" // 신규 고객 후속관리
  | "consult_no_booking" // 상담 후 미예약
  | "focus_care"; // 집중 관리 대상

/**
 * RevisitTask 상태 (재방문 관리 / 실행 브리핑 공용):
 *   pending → PENDING  처리대기
 *   done    → COMPLETED 처리완료
 *   hold    → HOLD     보류
 * "confirmed"는 의미가 모호하여 UI에서 제거됨 — 과거 저장 데이터 호환을
 * 위해 타입에만 남겨두며(=pending과 동일하게 취급), 신규 저장에는 쓰지 않는다.
 */
export type TaskStatus = "pending" | "confirmed" | "done" | "hold";

export interface BriefingTask {
  id: string;
  branchId: string;
  customerId: string;
  date: string; // 브리핑 기준일 (YYYY-MM-DD)
  category: TaskCategory;
  priorityScore: number;
  reason: string; // 사람이 읽는 근거 설명
  suggestedAction: string; // 제안 실행 내용
  status: TaskStatus;
  /** processedAt — 상태가 마지막으로 변경된 시각 (Supabase: status_changed_at) */
  statusChangedAt?: string;
  /** processedBy — 상태를 변경한 직원 (Supabase: handled_by_staff_id) */
  handledByStaffId?: string;
  /**
   * holdUntil — 보류 과제의 재확인 예정일 (YYYY-MM-DD).
   * status = "hold" 일 때만 유효하며, 자동 재노출 엔진은 아직 없다.
   * (Supabase: briefing_task_logs.hold_until date)
   */
  holdUntil?: string;
  /** 실행결과 — 처리완료 시 기록되며, 향후 AX 분석/스코어 개선의 입력이 된다 */
  outcome?: TaskOutcome;
}

/**
 * AX 실행결과 — "데이터 → 판단 → 실행 → 결과 축적" 흐름의 마지막 단계.
 * 처리완료 시 현재 흐름 안에서 최소한으로 기록한다.
 * (Supabase: briefing_task_logs 에 컬럼으로 확장 예정)
 */
export type TaskContactResult =
  | "contacted" // 연락 완료
  | "reserved" // 재방문 예약
  | "no_answer" // 부재 / 미응답
  | "not_needed"; // 연락 불필요

export interface TaskOutcome {
  /** 연락 여부 / 처리 결과 (Supabase: contact_result) */
  contactResult: TaskContactResult;
  /** 재방문 예정 여부 (Supabase: revisit_expected) */
  revisitPlanned: boolean;
  /** 처리 시점의 다음 관리 예정일 (Supabase: next_management_date) */
  nextManageDate?: string;
  /** 간단 메모 (Supabase: memo) */
  note?: string;
}

export const TASK_CONTACT_RESULT_LABELS: Record<TaskContactResult, string> = {
  contacted: "연락 완료",
  reserved: "재방문 예약",
  no_answer: "부재 / 미응답",
  not_needed: "연락 불필요",
};

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  revisit_due: "재방문 예정",
  dormant: "장기 미방문",
  membership_low: "이용권 잔여 임박",
  new_followup: "신규 후속관리",
  consult_no_booking: "상담 후 미예약",
  focus_care: "집중 관리",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "대기",
  confirmed: "확인",
  done: "처리완료",
  hold: "보류",
};

// ---------- 설정 ----------

export type FontScale = "small" | "default" | "large";
export type Density = "default" | "relaxed";
export type Theme = "light" | "dark" | "system";

export interface CareRuleSettings {
  dormantDays: number; // 장기 미방문 판단 기준 (일)
  membershipLowCount: number; // 이용권 소진 임박 기준 (회)
  revisitWindowDays: number; // 재방문 예정 판단 여유 (일)
  newFollowupDays: number; // 신규 후속관리 기간 (일)
  defaultCycleDays: number; // 기본 관리주기 (방문이력 부족 시)
}

export interface AppSettings {
  fontScale: FontScale;
  density: Density;
  theme: Theme;
  companyName: string;
  branchName: string;
  ownerName: string;
  openHours: string;
  careRules: CareRuleSettings;
}

export const DEFAULT_CARE_RULES: CareRuleSettings = {
  dormantDays: 45,
  membershipLowCount: 2,
  revisitWindowDays: 3,
  newFollowupDays: 14,
  defaultCycleDays: 14,
};

export const DEFAULT_SETTINGS: AppSettings = {
  fontScale: "default",
  density: "default",
  theme: "light",
  companyName: "정통대왕쑥뜸원",
  branchName: "본점",
  ownerName: "대표 관리자",
  openHours: "10:00 - 20:00",
  careRules: DEFAULT_CARE_RULES,
};

// ---------- 파생 지표 ----------

export interface CustomerDerived {
  customer: Customer;
  lastVisitDate?: string;
  visitCount: number;
  avgCycleDays?: number; // 평균 방문 주기
  activeMembership?: Membership;
  status: CustomerStatus;
  priorityScore: number;
  priorityReasons: string[];
}
