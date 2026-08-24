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
 *  /               ✅      ❌      대시보드(운영 현황) — ADMIN 전용
 *  /briefing       ✅      ❌      실행 브리핑 — ADMIN 전용
 *  /customers      ✅      ✅      STAFF의 유일한 업무 화면 (검색/조회/등록/수정)
 *  /customers/[id] ✅      ✅      케어 부위·다음 관리일·케어 선호 기록 포함
 *  /visits         ✅      ❌      방문/이용 기록은 고객 상세에서 입력
 *  /retention      ✅      ❌      재방문 업무 배분 — ADMIN 전용
 *  /analytics      ✅      ❌      성과 지표 — ADMIN 전용
 *  /branches       ✅      ❌      경영지표 — ADMIN 전용
 *  /settings       ✅      ❌      STAFF는 /more(계정)에서 화면 표시만 조정
 *  /service        ✅      ✅      서비스 표준 (구성·제품·판매 가격)
 *  /more           ✅      ✅      모바일 보조 메뉴 / STAFF는 계정·화면 표시 전용
 *  /guide          ✅      ✅      사용 가이드 (문서)
 *  /intro          ✅      ✅      기획의도 (문서)
 *
 *  STAFF는 네비게이션에 '고객' 하나만 노출되며, 그 외 경로로 직접 접근하면
 *  /customers 로 되돌린다 (AppShell 의 RouteGuard).
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

/**
 * STAFF 에게 허용되는 경로 — 네비게이션 노출과 화면 가드의 단일 기준.
 * 고객 업무(조회·기록)만 남기고 운영·경영 화면은 모두 ADMIN 전용으로 둔다.
 * /more 는 메뉴가 아니라 계정 전환·화면 표시 설정 컨테이너라 함께 허용한다.
 */
export const STAFF_ROUTES = [
  "/customers",
  "/service", // 서비스 표준 — 직원이 우리 서비스 구성·가격을 확인하는 화면
  "/more",
  "/guide", // 사용 가이드 — 직원이 업무를 익히는 문서
  "/intro", // 기획의도 — 왜 이 시스템을 쓰는지
] as const;

/** STAFF 의 기본 진입 경로 (허용되지 않은 경로 접근 시 이동) */
export const STAFF_HOME = "/customers";

/** 해당 역할이 경로에 접근 가능한지 — 하위 경로(/customers/c-01)까지 포함 */
export function canAccessRoute(role: AppRole, pathname: string): boolean {
  if (role === "ADMIN") return true;
  return STAFF_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );
}

/** ADMIN 전용 페이지 경로 — 화면 가드·RLS 설계의 단일 기준 */
export const ADMIN_ONLY_ROUTES = [
  "/",
  "/briefing",
  "/visits",
  "/retention",
  "/analytics",
  "/branches",
  "/settings",
] as const;

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
