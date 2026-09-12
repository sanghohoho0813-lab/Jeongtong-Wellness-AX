/**
 * 사용자 권한 정의
 * =================
 *
 * 여기 적힌 것은 **화면을 어디까지 열어 줄지**다. 실제 방어가 아니다.
 *
 * 실제 방어는 Supabase 의 RLS 와 컬럼 권한이 한다 (supabase/schema.sql ·
 * portal.sql · auth-hardening.sql). 브라우저에서 이 파일을 통째로 지워도
 * 서버는 여전히 남의 자료를 내주지 않는다. 반대로 말하면, 이 파일만
 * 손보고 RLS 를 빼먹으면 아무것도 막은 게 아니다.
 *
 * 누가 나인가 — 서버가 정한다
 * ---------------------------
 *   auth.uid()  →  staff.auth_user_id  →  staff.role  →  branch_id
 *
 * 로그인해서 들어왔다면 useStore().isManager 는 위 경로로 받은 role 에서만
 * 나온다 (lib/supabase/StaffLink.tsx → store.setAuthStaff). 화면에서 직원을
 * 골라 바꾸는 일은 Demo(NEXT_PUBLIC_DEMO_MODE=1) 에서만 가능하고,
 * 로그인 상태에서는 setCurrentStaff 자체가 아무 일도 하지 않는다.
 *
 * 역할 매핑
 *  - Staff.role: "owner" | "manager"  → ADMIN
 *  - Staff.role: "staff"              → STAFF
 *  - customer_accounts.auth_user_id   → CUSTOMER (MY WELLNESS, 본인 한 행만)
 *
 * ── 페이지 접근 ──────────────────────────────────────
 *  경로            ADMIN  STAFF   비고
 *  /               ✅      ❌      대시보드(운영 현황) — ADMIN 전용
 *  /briefing       ✅      ❌      실행 브리핑 — ADMIN 전용
 *  /coach          ✅      ❌      AX 코치(실증 준비도·오늘 할 일) — ADMIN 전용
 *  /customers      ✅      ✅      STAFF의 유일한 업무 화면 (검색/조회/등록/수정)
 *  /customers/[id] ✅      ✅      케어 부위·다음 관리 예정일·케어 선호 기록 포함
 *  /visits         ✅      ❌      방문/이용 기록은 고객 상세에서 입력
 *  /retention      ✅      ❌      재방문 업무 배분 — ADMIN 전용
 *  /analytics      ✅      ❌      성과 지표 — ADMIN 전용
 *  /branches       ✅      ❌      경영지표 — ADMIN 전용
 *  /settings       ✅      ❌      STAFF는 /more(계정)에서 화면 표시만 조정
 *  /service        ✅      ✅      서비스 표준 (구성·제품·판매 가격)
 *  /more           ✅      ✅      모바일 보조 메뉴 / STAFF는 계정·화면 표시 전용
 *  /guide          ✅      ✅      사용 가이드 (문서)
 *  /intro          ✅      ✅      기획의도 (문서)
 *  /why            ✅      ✅      Why AX — 우리 매장 이야기 (문서)
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
 *  직원에게는 고객 연락처를 노출하지 않는다 (010-****-5678 로 마스킹).
 *
 *  RLS 는 행 단위라 컬럼은 못 막는다. 그래서 두 겹으로 한다.
 *    1) customers.phone 의 SELECT 권한 자체를 회수한다 (컬럼 단위 GRANT).
 *       이제 누가 API 로 phone 을 읽으려 해도 42501 이다.
 *    2) 읽기는 customers_view 로만 한다. 뷰가 is_admin() / 본인 여부를 보고
 *       원문 또는 가린 값을 준다.
 *  앱은 가려진 값을 들고 있을 때 그 칸을 서버로 되돌려 쓰지 않는다
 *  (Customer.phoneMasked → customerToRow(c, false)). 안 그러면 원본 번호가
 *  별표로 덮인다.
 *  → useStore().canSeePhone === isManager (화면 표시 규칙)
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
  "/why", // Why AX — 우리 매장에 무엇이 달라지는지
  /*
    고객 공개 화면. 로그인 없이 누구나 볼 수 있는 주소라 여기서 막을 것이
    없다. 목록에 넣는 이유는 메뉴 노출 때문이다 — 직원도 "고객에게는 이렇게
    보인다" 를 확인할 수 있어야 한다.
  */
  "/welcome",
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
  // AX 코치 — 매장 전체의 실증 상태를 보는 운영 화면이라 대표/관리자만
  "/coach",
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
