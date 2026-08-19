/**
 * 사용자 권한 정의 — Supabase Auth / RLS 설계 기준 문서
 * =====================================================
 *
 * 이 파일은 아직 실행 로직이 아니다.
 * 현재 화면·기능 기준으로 ADMIN / STAFF 역할의 접근 범위를 고정해 두어,
 * Supabase 연동 시 RLS 정책과 화면 가드를 이 정의대로 구현한다.
 *
 * 현재 프론트 구현과의 매핑:
 *  - Staff.role: "owner" | "manager"  → ADMIN
 *  - Staff.role: "staff"              → STAFF
 *  - useStore().isManager             → role === ADMIN 판정 (화면 분기에 이미 사용 중)
 *
 * ── 페이지 접근 ──────────────────────────────────────
 *  경로            ADMIN  STAFF   비고
 *  /               ✅      ✅      STAFF는 매출 KPI 대신 '오늘 관리 대상' 표시
 *  /briefing       ✅      ✅      본인이 처리하는 업무 상태 변경 가능
 *  /customers      ✅      ✅      고객 검색/조회/등록/수정
 *  /customers/[id] ✅      ✅      주요 케어 부위·다음 관리일 수정 포함
 *  /visits         ✅      ✅      방문/이용 기록 입력, 이용권 사용
 *  /retention      ✅      ✅      재방문 업무 확인·처리
 *  /analytics      ✅      ✅*     *STAFF는 매출 타일·매출 추이 숨김
 *  /branches       ✅      ❌      경영지표 — ADMIN 전용 (직접 접근 시 안내)
 *  /settings       ✅      ✅*     *STAFF는 화면 설정만, 매장/직원/관리기준은 ADMIN
 *
 * ── 데이터 접근 (RLS 설계 방향) ─────────────────────
 *  테이블               ADMIN            STAFF
 *  branches             자기 지점 R/W     자기 지점 R
 *  staff                자기 지점 R/W     자기 지점 R (본인 프로필 W)
 *  customers            자기 지점 R/W     자기 지점 R/W (단, phone 열람 ❌)
 *  visits               자기 지점 R/W     자기 지점 R/W (입력 주체)
 *  memberships          자기 지점 R/W     자기 지점 R + 사용(차감) W
 *  customer_preferences 자기 지점 R/W     자기 지점 R/W (현장 기록 주체)
 *  briefing_task_logs   자기 지점 R/W     자기 지점 R + 본인 처리 건 W
 *  매출 집계(view)       자기 지점 R       ❌
 *
 *  공통 원칙: 모든 행은 branch_id 로 스코프되며,
 *  사용자는 staff.auth_user_id = auth.uid() 로 자기 지점을 판별한다.
 *
 *  ── 연락처(phone) 처리 ──
 *  직원에게는 고객 연락처를 노출하지 않는다 (010-****-1234 로 마스킹).
 *  RLS 는 행 단위이므로 컬럼 차단은 customers_view 에서 처리하며,
 *  프론트는 displayPhone(phone, canSeePhone) 으로 동일 규칙을 적용한다.
 *  → useStore().canSeePhone === isManager
 */

import type { StaffRole } from "@/lib/types";

export type AppRole = "ADMIN" | "STAFF";

/** Staff.role → 앱 권한 역할 매핑 (Supabase 연동 시에도 동일 규칙 사용) */
export function toAppRole(role: StaffRole): AppRole {
  return role === "staff" ? "STAFF" : "ADMIN";
}

/** ADMIN 전용 페이지 경로 — 화면 가드·RLS 설계의 단일 기준 */
export const ADMIN_ONLY_ROUTES = ["/branches"] as const;

/** STAFF에게 숨기는 화면 요소 (구현은 각 컴포넌트의 isManager 분기) */
export const ADMIN_ONLY_UI = [
  "dashboard.kpi.monthRevenue",
  "analytics.tile.monthRevenue",
  "analytics.chart.monthlyRevenue",
  "settings.section.store",
  "settings.section.staff",
  "settings.section.careRules",
  "settings.section.data",
  "customer.phone", // 직원에게는 마스킹 (displayPhone)
] as const;
