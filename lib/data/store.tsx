"use client";

/**
 * 앱 데이터 스토어 (Context + localStorage)
 *
 * 현재는 mock seed 기반이지만, 액션 인터페이스(addCustomer, addVisit 등)를
 * 그대로 유지한 채 내부 구현만 Supabase 호출로 교체할 수 있도록 분리했다.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AppSettings,
  BodyPartRecord,
  Branch,
  BriefingTask,
  Customer,
  DEFAULT_SETTINGS,
  Membership,
  ServiceProduct,
  Staff,
  StaffRole,
  CarePreference,
  PreferenceCategory,
  SalesOpportunity,
  TaskOutcome,
  TaskStatus,
  Visit,
} from "@/lib/types";
import {
  seedBranches,
  seedCustomers,
  seedMemberships,
  seedProducts,
  seedStaff,
  seedVisits,
} from "@/lib/data/mock/seed";
import {
  CustomerFacts,
  deriveCustomer,
  generateDailyBriefing,
} from "@/lib/scoring/priority";
import { detectSalesOpportunity } from "@/lib/scoring/opportunity";
import type { BackupPayload, ImportRow } from "@/lib/utils/import";
import { todayISO } from "@/lib/utils/date";
import { StorageUsage, measureStorage } from "@/lib/utils/storage";

const STORAGE_KEY = "jeongtong-ax-v1";

interface PersistedState {
  customers: Customer[];
  visits: Visit[];
  memberships: Membership[];
  /** 서비스 · 이용권 상품 (매장 가격표) */
  products: ServiceProduct[];
  branches: Branch[];
  staff: Staff[];
  /** 브리핑 과제 상태 오버라이드 (생성은 항상 규칙 엔진이 수행) */
  taskOverrides: BriefingTask[];
  settings: AppSettings;
  /** 고객별 최초 미처리 발생일 — "며칠째 미처리" 계산용 (customerId → YYYY-MM-DD) */
  taskFirstSeen?: Record<string, string>;
  /** 현재 사용자 (향후 Supabase Auth 연동 시 auth 유저와 매핑) */
  currentStaffId?: string;
  seededAt?: string;
}

export interface NewCustomerInput {
  name: string;
  phone: string;
  gender?: "female" | "male";
  birthYear?: number;
  ageGroup?: string;
  /** 고객이 말한 그대로의 첫 상담 내용 (시스템이 해석하지 않는다) */
  consultationNote?: string;
  memo?: string;
  focusBodyParts: BodyPartRecord[];
  assignedStaffId?: string;
  nextManageDate?: string;
  nextManageTime?: string;
}

export interface NewMembershipInput {
  customerId: string;
  programName: string;
  totalCount: number;
  price: number;
  purchasedAt: string;
  expiresAt?: string;
  /** 중간부터 등록할 때 남은 횟수 지정 (기본: 총 횟수) */
  remainingCount?: number;
}

export interface NewVisitInput {
  customerId: string;
  /** 방문 일시 (ISO datetime). 지정하지 않으면 지금 시각 */
  visitedAt?: string;
  type: "visit" | "consult";
  programName?: string;
  membershipId?: string;
  bodyParts: BodyPartRecord[];
  reaction?: string;
  amount?: number;
  nextManageDate?: string;
  nextManageTime?: string;
  staffId?: string;
  appliedPreferenceIds?: string[];
}

/** 삭제한 이용권 스냅샷 — 되돌리기 위해 끊어진 방문 연결까지 같이 들고 있는다 */
export interface RemovedMembership {
  membership: Membership;
  linkedVisitIds: string[];
}

interface StoreValue extends PersistedState {
  ready: boolean;
  /**
   * 마지막 저장이 실패했는지.
   * 저장 공간이 꽉 찼거나 사생활 보호 모드면 화면만 바뀌고 기록은 남지 않는다.
   */
  saveFailed: boolean;
  /**
   * 자료를 읽으면서 모양이 깨져 건너뛴 기록.
   * 비어 있지 않으면 화면 위에 알리고, 그대로 파일로 내려받게 한다.
   */
  droppedRecords: unknown[];
  /** 이 기기 저장 공간 사용량 — 한도에 닿기 전에 미리 알리는 데 쓴다 */
  storage: StorageUsage;
  briefingTasks: BriefingTask[];
  factsById: Map<string, CustomerFacts>;
  derivedById: Map<string, ReturnType<typeof deriveCustomer>>;
  /** AX 매출기회 — 고객별 파생 판정 (Priority Score 와 별개) */
  opportunityById: Map<string, SalesOpportunity>;
  /** 현재 사용자 (기본: 첫 owner) */
  currentStaff: Staff;
  /** 대표/관리자 여부 — 매출·운영 정보 노출 판단 */
  isManager: boolean;
  /** 연락처 원본 열람 권한 — 대표/관리자만 (직원은 마스킹) */
  canSeePhone: boolean;
  /** 화면 공유 모드 — 고객 이름·연락처를 가려서 보여준다 */
  privacyMode: boolean;
  setCurrentStaff: (staffId: string) => void;
  /**
   * 서버가 정한 나 — 로그인한 계정에 이어진 직원 레코드.
   *
   * 이 값이 있으면 화면의 권한은 전적으로 여기서 나온다. 사이드바에서
   * 직원을 바꿔도 권한은 따라 바뀌지 않는다(애초에 바꿀 수 없게 막는다).
   * 없는 경우는 Demo — 이 기기 안 가상 자료로만 도는 상태다.
   */
  authStaff?: { staffId: string; name: string; role: StaffRole };
  /** StaffLink 가 로그인 결과를 알려 주는 통로 (다른 곳에서 부르지 않는다) */
  setAuthStaff: (
    v: { staffId: string; name: string; role: StaffRole } | undefined,
  ) => void;
  /** 케어 선호 · 특이사항 (고객 감동 포인트) */
  addPreference: (
    customerId: string,
    input: { category: PreferenceCategory; note: string; pinned?: boolean },
  ) => void;
  togglePreferencePin: (customerId: string, preferenceId: string) => void;
  removePreference: (customerId: string, preferenceId: string) => void;
  addCustomer: (input: NewCustomerInput) => Customer;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  addVisit: (input: NewVisitInput) => Visit;
  /** 방문/상담 기록 수정 — 이용권 차감도 함께 정정한다 */
  updateVisit: (id: string, input: NewVisitInput) => void;
  /**
   * 방문/상담 기록 삭제 — 차감했던 이용권을 되돌린다.
   * 삭제한 기록을 그대로 돌려주므로 화면에서 '되돌리기'에 쓸 수 있다.
   */
  removeVisit: (id: string) => Visit | undefined;
  /** 삭제한 방문 기록을 원래대로 되살린다 (이용권 차감도 다시 적용) */
  restoreVisit: (visit: Visit) => void;
  /** 이용권 등록 (신규 구매 · 재구매) */
  addProduct: (
    input: Omit<ServiceProduct, "id" | "branchId" | "sortOrder" | "source">,
  ) => ServiceProduct;
  updateProduct: (id: string, patch: Partial<ServiceProduct>) => void;
  removeProduct: (id: string) => void;
  addMembership: (input: NewMembershipInput) => Membership;
  updateMembership: (id: string, patch: Partial<Membership>) => void;
  /** 이용권 삭제 — 삭제한 이용권과 끊긴 방문 연결을 돌려주어 '되돌리기'에 쓴다 */
  removeMembership: (id: string) => RemovedMembership | undefined;
  /** 삭제한 이용권을 방문 연결까지 원래대로 되살린다 */
  restoreMembership: (removed: RemovedMembership) => void;
  setTaskStatus: (
    taskId: string,
    status: TaskStatus,
    extra?: { outcome?: Partial<TaskOutcome>; holdUntil?: string },
  ) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  updateStaff: (staff: Staff[]) => void;
  /** 실제 운영 시작 — 샘플 고객·방문·이용권을 비우고 빈 상태로 만든다 */
  startFresh: () => void;
  /** 전체 백업 파일로 되돌리기 — 현재 데이터를 백업 시점 상태로 교체한다 */
  restoreBackup: (payload: BackupPayload) => void;
  /**
   * 서버에서 내려받은 지점 자료로 통째로 바꾼다.
   *
   * 매장 계정을 연결한 직후, 그리고 다른 기기에서 바뀐 내용을 받아 올 때
   * 쓴다. 백업 복원(restoreBackup)과 달리 상품 가격표까지 함께 바꾸고,
   * 설정은 건드리지 않는다 — 글자 크기·테마는 기기마다 다른 값이다.
   */
  applyRemote: (data: {
    customers: Customer[];
    visits: Visit[];
    memberships: Membership[];
    products: ServiceProduct[];
    staff: Staff[];
    branches: Branch[];
  }) => void;
  /**
   * 고객 명부 일괄 등록.
   * mode "skip" 은 이미 있는 연락처를 건너뛰고, "update" 는 비어 있던 항목만 채운다.
   */
  importCustomers: (
    rows: ImportRow[],
    mode: "skip" | "update",
  ) => { added: number; updated: number };
  resetData: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

/**
 * 가져오기 한 줄에서 메모로 남길 내용을 만든다.
 * 특이사항 칸과, 부위로 알아보지 못한 관리부위 표기를 함께 남긴다.
 * (알아보지 못했다고 버리면 매장이 적어 둔 정보가 사라진다)
 */
function mergeMemo(row: ImportRow): string | undefined {
  const parts = [row.memo, row.careAreasRaw ? `관리부위: ${row.careAreasRaw}` : ""]
    .map((x) => (x ?? "").trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : undefined;
}

function seedState(): PersistedState {
  return {
    customers: seedCustomers,
    visits: seedVisits,
    memberships: seedMemberships,
    products: seedProducts,
    branches: seedBranches,
    staff: seedStaff,
    taskOverrides: [],
    settings: DEFAULT_SETTINGS,
    seededAt: todayISO(),
  };
}

/**
 * 읽어 들인 자료 중 화면이 다룰 수 없는 모양을 걸러 낸다.
 *
 * 날짜가 비어 있는 방문 기록 하나 때문에 우선순위 계산이 멈추면 화면 전체가
 * 하얗게 된다. 원장 입장에서는 "어제까지 되던 게 갑자기 안 된다"이고,
 * 무엇이 잘못됐는지 알 길도 없다.
 * 못 읽는 줄은 빼서 화면을 살리되, 뺀 줄은 그대로 손에 쥐어 준다
 * (화면 위 안내에서 파일로 내려받을 수 있다).
 */
function sanitize(s: PersistedState): {
  state: PersistedState;
  dropped: unknown[];
} {
  const isDate = (v: unknown) => typeof v === "string" && v.length >= 8;
  const dropped: unknown[] = [];

  function keep<T>(kind: string, list: T[] | undefined, ok: (x: T) => boolean) {
    if (!Array.isArray(list)) return [];
    const out: T[] = [];
    for (const row of list) {
      if (ok(row)) out.push(row);
      else dropped.push({ kind, row });
    }
    return out;
  }

  const state: PersistedState = {
    ...s,
    customers: keep(
      "customer",
      s.customers,
      (c) => typeof c?.id === "string" && typeof c?.name === "string",
    ),
    visits: keep(
      "visit",
      s.visits,
      (v) => typeof v?.id === "string" && isDate(v?.visitedAt),
    ),
    memberships: keep(
      "membership",
      s.memberships,
      (m) => typeof m?.id === "string" && isDate(m?.purchasedAt),
    ),
    /*
     * 상품 목록은 뒤늦게 들어온 항목이라 예전 백업에는 아예 없다.
     * 비어 있으면 매장 가격표(기본값)로 되돌려 이용권 등록 화면이
     * 빈 채로 열리지 않게 한다.
     */
    products:
      Array.isArray(s.products) && s.products.length > 0
        ? keep(
            "product",
            s.products,
            (x) => typeof x?.id === "string" && typeof x?.name === "string",
          )
        : seedProducts,
  };
  return { state, dropped };
}

/**
 * 저장된 데이터 보정 — 샘플 기본값이 그대로 남아 있는 경우에만 현재 기본값으로 맞춘다.
 * (사용자가 직접 수정한 값은 건드리지 않는다)
 */
function migrate(s: PersistedState): PersistedState {
  return {
    ...s,
    staff: s.staff.map((m) =>
      m.role === "owner" && m.name === "김대표"
        ? { ...m, name: DEFAULT_SETTINGS.ownerName }
        : m,
    ),
    settings: {
      ...s.settings,
      ownerName:
        s.settings.ownerName === "대표 관리자" || !s.settings.ownerName
          ? DEFAULT_SETTINGS.ownerName
          : s.settings.ownerName,
    },
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(seedState);
  const [ready, setReady] = useState(false);
  /** 마지막 저장이 실패했는지 — 화면에서 경고를 띄우는 데 쓴다 */
  const [saveFailed, setSaveFailed] = useState(false);
  /** 읽는 중에 건너뛴 기록 — 비어 있지 않으면 화면에 알리고 내려받게 한다 */
  const [droppedRecords, setDroppedRecords] = useState<unknown[]>([]);
  const [storage, setStorage] = useState<StorageUsage>({
    bytes: 0,
    ratio: 0,
    nearLimit: false,
  });

  /**
   * 최초 로드: localStorage 복원.
   *
   * "고객이 한 명이라도 있으면" 을 기준으로 삼으면 안 된다.
   * 실제 운영 시작으로 명부를 비운 매장이 새로고침할 때마다
   * 샘플 고객 24명이 되살아나기 때문이다.
   * 저장된 형태가 맞는지만 보고, 비어 있는 상태도 그대로 존중한다.
   */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState;
        if (Array.isArray(parsed?.customers) && Array.isArray(parsed?.visits)) {
          const clean = sanitize(migrate({ ...seedState(), ...parsed }));
          setState(clean.state);
          setDroppedRecords(clean.dropped);
        }
      }
    } catch {
      // 복원 실패 시 seed 유지
    }
    setReady(true);
  }, []);

  /**
   * 변경 시 저장.
   *
   * 저장이 실패하면(브라우저 저장 공간 초과, 사생활 보호 모드 등)
   * 화면에는 정상적으로 보이지만 실제로는 아무것도 남지 않는다.
   * 조용히 넘기면 하루치 기록을 통째로 잃을 수 있어, 실패 사실을 밖으로 알린다.
   */
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSaveFailed(false);
      setStorage(measureStorage(STORAGE_KEY));
    } catch {
      setSaveFailed(true);
    }
  }, [state, ready]);

  /**
   * 이용권 사용 기한 자동 만료.
   * 기한이 지난 이용권이 '사용 중'으로 남아 있으면 잔여 횟수·재등록 기회
   * 판정이 모두 어긋나므로, 데이터를 열 때 한 번 정리한다.
   */
  useEffect(() => {
    if (!ready) return;
    const today = todayISO();
    setState((s) => {
      const next = s.memberships.map((m) =>
        m.status !== "expired" && m.expiresAt && m.expiresAt < today
          ? { ...m, status: "expired" as const }
          : m,
      );
      return next.some((m, i) => m !== s.memberships[i])
        ? { ...s, memberships: next }
        : s;
    });
  }, [ready]);

  // 폰트 크기 / 밀도 / 테마 → CSS 변수 반영 ("system"은 OS 설정 추종)
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.fontScale = state.settings.fontScale;
    root.dataset.density = state.settings.density;

    const theme = state.settings.theme ?? "light";
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      root.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
    };
    apply();

    /*
     * 인쇄할 때는 무조건 라이트로 되돌린다.
     * 다크로 쓰다가 '오늘 할 일 인쇄'를 누르면 흰 종이에 밝은 회색 글자가
     * 찍혀 거의 아무것도 안 보였다. CSS 만으로는 반쪽짜리다 — 색 변수는
     * 바꿀 수 있어도 dark: 로 붙은 뱃지·알약 색까지는 못 되돌리기 때문에,
     * 인쇄 직전에 data-theme 자체를 light 로 바꾸고 끝나면 되돌린다.
     */
    const toLight = () => {
      root.dataset.theme = "light";
    };
    window.addEventListener("beforeprint", toLight);
    window.addEventListener("afterprint", apply);

    if (theme === "system") media.addEventListener("change", apply);
    return () => {
      window.removeEventListener("beforeprint", toLight);
      window.removeEventListener("afterprint", apply);
      if (theme === "system") media.removeEventListener("change", apply);
    };
  }, [state.settings.fontScale, state.settings.density, state.settings.theme]);

  const factsById = useMemo(() => {
    const map = new Map<string, CustomerFacts>();
    for (const c of state.customers) {
      map.set(c.id, {
        customer: c,
        visits: state.visits.filter((v) => v.customerId === c.id),
        memberships: state.memberships.filter((m) => m.customerId === c.id),
      });
    }
    return map;
  }, [state.customers, state.visits, state.memberships]);

  const derivedById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof deriveCustomer>>();
    for (const [id, facts] of factsById) {
      map.set(id, deriveCustomer(facts, state.settings.careRules));
    }
    return map;
  }, [factsById, state.settings.careRules]);

  /**
   * AX 매출기회 — Priority Score 와 분리된 파생 판정.
   * 과제 생성이 끝난 뒤 고객별로 계산해 얹기만 하므로 기존 엔진에 영향이 없다.
   */
  const opportunityById = useMemo(() => {
    const map = new Map<string, SalesOpportunity>();
    for (const [id, facts] of factsById) {
      // 직전 관리의 처리 결과를 근거로 함께 사용한다
      const lastOutcome = state.taskOverrides
        .filter((t) => t.customerId === id && t.outcome)
        .sort((a, b) =>
          (b.statusChangedAt ?? "").localeCompare(a.statusChangedAt ?? ""),
        )[0]?.outcome;
      map.set(
        id,
        detectSalesOpportunity(
          facts,
          state.settings.careRules,
          lastOutcome,
          state.settings.opportunityRules,
        ),
      );
    }
    return map;
  }, [
    factsById,
    state.settings.careRules,
    state.settings.opportunityRules,
    state.taskOverrides,
  ]);

  const briefingTasks = useMemo(
    () =>
      generateDailyBriefing(
        [...factsById.values()],
        state.settings.careRules,
        state.taskOverrides,
      ).map((t) => ({
        ...t,
        opportunity: opportunityById.get(t.customerId),
        // 며칠째 미처리인지 — 처리되면 초기화된다
        openSince:
          t.status === "pending" || t.status === "confirmed"
            ? (state.taskFirstSeen?.[t.customerId] ?? t.date)
            : undefined,
      })),
    [
      factsById,
      state.settings.careRules,
      state.taskOverrides,
      state.taskFirstSeen,
      opportunityById,
    ],
  );

  /**
   * 미처리 경과 추적 — 오늘 처음 미처리로 올라온 고객은 오늘 날짜로 기록하고,
   * 처리(완료·보류)되거나 대상에서 빠지면 지운다.
   * 과제 자체는 매일 새로 생성되므로 이 맵이 유일한 연속성 기준이다.
   */
  useEffect(() => {
    if (!ready) return;
    const today = todayISO();
    const open = briefingTasks.filter(
      (t) => t.status === "pending" || t.status === "confirmed",
    );
    setState((s) => {
      const prev = s.taskFirstSeen ?? {};
      const next: Record<string, string> = {};
      for (const t of open) next[t.customerId] = prev[t.customerId] ?? today;
      const same =
        Object.keys(next).length === Object.keys(prev).length &&
        Object.entries(next).every(([k, v]) => prev[k] === v);
      return same ? s : { ...s, taskFirstSeen: next };
    });
  }, [ready, briefingTasks]);

  /**
   * 서버가 정한 나.
   *
   * 이 값은 저장하지 않는다(localStorage 에 넣지 않는다). 저장해 두면
   * 브라우저 개발자도구에서 role 을 owner 로 고쳐 넣는 순간 관리자
   * 화면이 열린다. 매번 로그인 세션에서 새로 받아 온다.
   */
  const [authStaff, setAuthStaff] = useState<
    { staffId: string; name: string; role: StaffRole } | undefined
  >();

  // 현재 사용자 — 지정되지 않았거나 비활성이면 첫 owner(없으면 첫 직원)
  const currentStaff = useMemo(() => {
    // 로그인한 계정이 있으면 그 사람이다. 고를 여지가 없다
    if (authStaff) {
      const mine = state.staff.find((s) => s.id === authStaff.staffId);
      if (mine) return mine;
      // 아직 지점 자료를 못 받아 온 찰나 — 서버가 알려 준 것만으로 세운다
      return {
        id: authStaff.staffId,
        branchId: "",
        name: authStaff.name,
        role: authStaff.role,
        active: true,
      } as Staff;
    }
    const found = state.staff.find(
      (s) => s.id === state.currentStaffId && s.active,
    );
    return (
      found ??
      state.staff.find((s) => s.role === "owner" && s.active) ??
      state.staff[0]
    );
  }, [state.staff, state.currentStaffId, authStaff]);

  /**
   * 관리자인가.
   *
   * 로그인해서 들어왔다면 **서버가 준 role 만** 본다. 화면에서 고른
   * 직원이 아니라 auth.uid() 에 이어진 staff.role 이 기준이다.
   * (진짜 방어는 RLS 다. 이 값은 메뉴를 감추는 데 쓴다)
   */
  const isManager = authStaff
    ? authStaff.role === "owner" || authStaff.role === "manager"
    : currentStaff?.role === "owner" || currentStaff?.role === "manager";
  // 연락처 원본은 대표/관리자만 열람 (직원 화면에서는 마스킹)
  /**
   * 화면 공유 모드 — 켜져 있으면 관리자에게도 연락처를 가린다.
   * 실제 고객자료를 넣은 채로 화면을 함께 보는 상황을 위한 것이라,
   * 권한과 상관없이 가리는 것이 맞다.
   */
  const privacyMode = state.settings.privacyMode === true;
  const canSeePhone = isManager && !privacyMode;

  /**
   * 직원 바꾸기 — 로그인 상태에서는 아무 일도 하지 않는다.
   *
   * 화면에서 단추를 숨기는 것만으로는 부족하다. 콘솔에서 이 함수를
   * 부르면 그만이기 때문이다. 로그인해서 들어왔다면 나는 서버가 정한
   * 그 사람 하나뿐이다.
   */
  const setCurrentStaff = useCallback(
    (staffId: string) => {
      if (authStaff) return;
      setState((s) => ({ ...s, currentStaffId: staffId }));
    },
    [authStaff],
  );

  // ---------- 케어 선호 · 특이사항 ----------

  const addPreference = useCallback(
    (
      customerId: string,
      input: { category: PreferenceCategory; note: string; pinned?: boolean },
    ) => {
      const pref: CarePreference = {
        id: `pref-${Date.now().toString(36)}`,
        category: input.category,
        note: input.note.trim(),
        createdAt: new Date().toISOString(),
        createdByStaffId: currentStaff?.id,
        pinned: input.pinned,
      };
      setState((s) => ({
        ...s,
        customers: s.customers.map((c) =>
          c.id === customerId
            ? { ...c, preferences: [...(c.preferences ?? []), pref] }
            : c,
        ),
      }));
    },
    [currentStaff],
  );

  const togglePreferencePin = useCallback(
    (customerId: string, preferenceId: string) => {
      setState((s) => ({
        ...s,
        customers: s.customers.map((c) =>
          c.id === customerId
            ? {
                ...c,
                preferences: (c.preferences ?? []).map((p) =>
                  p.id === preferenceId ? { ...p, pinned: !p.pinned } : p,
                ),
              }
            : c,
        ),
      }));
    },
    [],
  );

  const removePreference = useCallback(
    (customerId: string, preferenceId: string) => {
      setState((s) => ({
        ...s,
        customers: s.customers.map((c) =>
          c.id === customerId
            ? {
                ...c,
                preferences: (c.preferences ?? []).filter(
                  (p) => p.id !== preferenceId,
                ),
              }
            : c,
        ),
      }));
    },
    [],
  );

  const addCustomer = useCallback((input: NewCustomerInput): Customer => {
    const customer: Customer = {
      id: `c-${Date.now().toString(36)}`,
      branchId: state.branches[0]?.id ?? "branch-main",
      name: input.name.trim(),
      phone: input.phone.trim(),
      gender: input.gender,
      birthYear: input.birthYear,
      ageGroup: input.ageGroup,
      consultationNote: input.consultationNote,
      registeredAt: todayISO(),
      assignedStaffId: input.assignedStaffId,
      memo: input.memo,
      focusBodyParts: input.focusBodyParts,
      nextManageDate: input.nextManageDate,
      nextManageTime: input.nextManageDate ? input.nextManageTime : undefined,
    };
    setState((s) => ({ ...s, customers: [customer, ...s.customers] }));
    return customer;
  }, [state.branches]);

  const updateCustomer = useCallback((id: string, patch: Partial<Customer>) => {
    setState((s) => ({
      ...s,
      customers: s.customers.map((c) => {
        if (c.id !== id) return c;
        const next = { ...c, ...patch };
        /*
          연락처를 직접 고쳤다면 그 값은 더 이상 '가려진 값' 이 아니다.
          이 표시를 안 지우면 직원이 새 번호를 적어도 서버로 안 올라간다
          (서버는 가려진 줄의 연락처를 무시하도록 되어 있다).
        */
        if (patch.phone !== undefined && patch.phone !== c.phone) {
          next.phoneMasked = undefined;
        }
        return next;
      }),
    }));
  }, []);

  const addVisit = useCallback((input: NewVisitInput): Visit => {
    const now = new Date();
    const visit: Visit = {
      id: `v-${Date.now().toString(36)}`,
      branchId: state.branches[0]?.id ?? "branch-main",
      customerId: input.customerId,
      staffId: input.staffId,
      // 지난 방문을 나중에 입력하는 경우가 많아 일시를 직접 지정할 수 있다
      visitedAt: input.visitedAt ?? now.toISOString(),
      type: input.type,
      programName: input.programName,
      membershipId: input.membershipId,
      bodyParts: input.bodyParts,
      reaction: input.reaction,
      amount: input.amount,
      nextManageDate: input.nextManageDate,
      nextManageTime: input.nextManageDate ? input.nextManageTime : undefined,
      appliedPreferenceIds: input.appliedPreferenceIds?.length
        ? input.appliedPreferenceIds
        : undefined,
    };
    setState((s) => {
      let memberships = s.memberships;
      if (input.membershipId) {
        memberships = s.memberships.map((m) => {
          if (m.id !== input.membershipId) return m;
          const remaining = Math.max(0, m.remainingCount - 1);
          return {
            ...m,
            remainingCount: remaining,
            status: remaining === 0 ? "exhausted" : m.status,
          };
        });
      }
      // 방문의 케어 부위(visitCareAreas)는 방문 기록에만 저장한다.
      // 고객 프로필의 주요 케어 부위(preferredCareAreas)는 프로필에서만 수정.
      const customers = s.customers.map((c) => {
        if (c.id !== input.customerId) return c;
        return {
          ...c,
          nextManageDate: input.nextManageDate ?? c.nextManageDate,
          nextManageTime: input.nextManageDate
            ? input.nextManageTime
            : c.nextManageTime,
        };
      });
      return { ...s, visits: [visit, ...s.visits], memberships, customers };
    });
    return visit;
  }, [state.branches]);

  /**
   * 이용권 차감 되돌리기/적용 — 방문 기록 수정·삭제 시 잔여 횟수를 정확히 맞춘다.
   * delta: +1 = 되돌림(사용 취소), -1 = 차감
   */
  const applyMembershipDelta = (
    list: Membership[],
    membershipId: string | undefined,
    delta: number,
  ): Membership[] => {
    if (!membershipId) return list;
    return list.map((m) => {
      if (m.id !== membershipId) return m;
      const remaining = Math.max(0, Math.min(m.totalCount, m.remainingCount + delta));
      return {
        ...m,
        remainingCount: remaining,
        // 만료(expired)는 사용자가 지정한 상태이므로 유지한다
        status:
          m.status === "expired"
            ? "expired"
            : remaining === 0
              ? "exhausted"
              : "active",
      };
    });
  };

  const updateVisit = useCallback((id: string, input: NewVisitInput) => {
    setState((s) => {
      const old = s.visits.find((v) => v.id === id);
      if (!old) return s;

      // 이용권이 바뀌었으면 이전 것은 되돌리고 새 것을 차감한다
      let memberships = s.memberships;
      if (old.membershipId !== input.membershipId) {
        memberships = applyMembershipDelta(memberships, old.membershipId, +1);
        memberships = applyMembershipDelta(memberships, input.membershipId, -1);
      }

      const updated: Visit = {
        ...old,
        visitedAt: input.visitedAt ?? old.visitedAt,
        customerId: input.customerId,
        staffId: input.staffId,
        type: input.type,
        programName: input.programName,
        membershipId: input.membershipId,
        bodyParts: input.bodyParts,
        reaction: input.reaction,
        amount: input.amount,
        nextManageDate: input.nextManageDate,
        nextManageTime: input.nextManageDate ? input.nextManageTime : undefined,
        appliedPreferenceIds: input.appliedPreferenceIds?.length
          ? input.appliedPreferenceIds
          : undefined,
      };

      // 이 고객의 가장 최근 방문을 수정한 경우에만 고객의 다음 관리일을 함께 갱신
      const latestForCustomer = s.visits
        .filter((v) => v.customerId === input.customerId)
        .map((v) => (v.id === id ? updated : v))
        .reduce<Visit | undefined>(
          (acc, v) => (!acc || v.visitedAt > acc.visitedAt ? v : acc),
          undefined,
        );
      const customers =
        latestForCustomer?.id === id && input.nextManageDate
          ? s.customers.map((c) =>
              c.id === input.customerId
                ? {
                    ...c,
                    nextManageDate: input.nextManageDate,
                    nextManageTime: input.nextManageTime,
                  }
                : c,
            )
          : s.customers;

      return {
        ...s,
        memberships,
        customers,
        visits: s.visits.map((v) => (v.id === id ? updated : v)),
      };
    });
  }, []);

  const removeVisit = useCallback(
    (id: string): Visit | undefined => {
      const removed = state.visits.find((v) => v.id === id);
      setState((s) => {
        const old = s.visits.find((v) => v.id === id);
        if (!old) return s;
        return {
          ...s,
          memberships: applyMembershipDelta(s.memberships, old.membershipId, +1),
          visits: s.visits.filter((v) => v.id !== id),
        };
      });
      return removed;
    },
    [state.visits],
  );

  /** 삭제 직후 '되돌리기' — 기록과 이용권 차감을 함께 복구한다 */
  const restoreVisit = useCallback((visit: Visit) => {
    setState((s) => {
      if (s.visits.some((v) => v.id === visit.id)) return s;
      return {
        ...s,
        memberships: applyMembershipDelta(s.memberships, visit.membershipId, -1),
        visits: [visit, ...s.visits],
      };
    });
  }, []);

  // ---------- 이용권 ----------

  const addMembership = useCallback(
    (input: NewMembershipInput): Membership => {
      const remaining = Math.min(
        input.totalCount,
        input.remainingCount ?? input.totalCount,
      );
      const membership: Membership = {
        id: `m-${Date.now().toString(36)}`,
        branchId: state.branches[0]?.id ?? "branch-main",
        customerId: input.customerId,
        programName: input.programName.trim(),
        totalCount: input.totalCount,
        remainingCount: remaining,
        purchasedAt: input.purchasedAt,
        expiresAt: input.expiresAt,
        price: input.price,
        status: remaining === 0 ? "exhausted" : "active",
      };
      setState((s) => ({ ...s, memberships: [membership, ...s.memberships] }));
      return membership;
    },
    [state.branches],
  );

  const updateMembership = useCallback(
    (id: string, patch: Partial<Membership>) => {
      setState((s) => ({
        ...s,
        memberships: s.memberships.map((m) => {
          if (m.id !== id) return m;
          const next = { ...m, ...patch };
          // 잔여 횟수가 바뀌면 상태를 다시 계산 (만료는 명시 지정 시에만 유지)
          if (patch.remainingCount !== undefined && patch.status === undefined) {
            next.status =
              next.remainingCount === 0
                ? "exhausted"
                : next.status === "expired"
                  ? "expired"
                  : "active";
          }
          return next;
        }),
      }));
    },
    [],
  );

  const removeMembership = useCallback(
    (id: string): RemovedMembership | undefined => {
      const membership = state.memberships.find((m) => m.id === id);
      if (!membership) return undefined;
      const linkedVisitIds = state.visits
        .filter((v) => v.membershipId === id)
        .map((v) => v.id);
      setState((s) => ({
        ...s,
        memberships: s.memberships.filter((m) => m.id !== id),
        // 이 이용권을 쓴 방문 기록은 남기되 연결만 끊는다 (기록 자체는 보존)
        visits: s.visits.map((v) =>
          v.membershipId === id ? { ...v, membershipId: undefined } : v,
        ),
      }));
      return { membership, linkedVisitIds };
    },
    [state.memberships, state.visits],
  );

  const restoreMembership = useCallback((removed: RemovedMembership) => {
    setState((s) => {
      if (s.memberships.some((m) => m.id === removed.membership.id)) return s;
      const linked = new Set(removed.linkedVisitIds);
      return {
        ...s,
        memberships: [removed.membership, ...s.memberships],
        visits: s.visits.map((v) =>
          linked.has(v.id) ? { ...v, membershipId: removed.membership.id } : v,
        ),
      };
    });
  }, []);

  const setTaskStatus = useCallback(
    (
      taskId: string,
      status: TaskStatus,
      extra?: { outcome?: Partial<TaskOutcome>; holdUntil?: string },
    ) => {
      setState((s) => {
        const generated = generateDailyBriefing(
          [...factsById.values()],
          s.settings.careRules,
          s.taskOverrides,
        );
        const task = generated.find((t) => t.id === taskId);
        if (!task) return s;
        const prev = s.taskOverrides.find((t) => t.id === taskId);
        const customer = s.customers.find((c) => c.id === task.customerId);

        // 실행결과 축적: 처리완료일 때만 결과를 남기고, 그 외 상태에서는 비운다
        let nextOutcome: TaskOutcome | undefined;
        let customers = s.customers;
        if (status === "done") {
          const base = prev?.outcome ?? task.outcome;
          const o = extra?.outcome;
          const nextManageDate =
            o?.nextManageDate ?? base?.nextManageDate ?? customer?.nextManageDate;
          const nextManageTime =
            o?.nextManageDate !== undefined
              ? o.nextManageTime
              : (base?.nextManageTime ?? customer?.nextManageTime);
          nextOutcome = {
            contactResult: o?.contactResult ?? base?.contactResult ?? "contacted",
            revisitPlanned: o?.revisitPlanned ?? !!nextManageDate,
            nextManageDate,
            nextManageTime: nextManageDate ? nextManageTime : undefined,
            note: o?.note ?? base?.note,
            // 매출기회(재등록) 과제에서만 기록되는 결과값
            membershipRenewed: o?.membershipRenewed ?? base?.membershipRenewed,
            // 처리 당시 매출기회 유형 스냅샷 — 이후 판정이 바뀌어도 성과가 남는다
            opportunityType:
              o?.opportunityType ??
              base?.opportunityType ??
              task.opportunity?.type,
          };
          // 결과에서 다음 관리일을 조정했으면 고객 데이터에도 반영 (기존 필드 갱신)
          if (
            o?.nextManageDate &&
            customer &&
            (o.nextManageDate !== customer.nextManageDate ||
              nextManageTime !== customer.nextManageTime)
          ) {
            customers = s.customers.map((c) =>
              c.id === customer.id
                ? {
                    ...c,
                    nextManageDate: o.nextManageDate,
                    nextManageTime,
                  }
                : c,
            );
          }
        }

        const updated: BriefingTask = {
          ...task,
          status,
          statusChangedAt: new Date().toISOString(), // processedAt
          handledByStaffId: currentStaff?.id, // processedBy
          holdUntil: status === "hold" ? extra?.holdUntil : undefined,
          outcome: nextOutcome,
        };
        const others = s.taskOverrides.filter((t) => t.id !== taskId);
        return { ...s, customers, taskOverrides: [...others, updated] };
      });
    },
    [factsById, currentStaff],
  );

  // ---------- 서비스 · 이용권 상품 ----------

  const addProduct = useCallback(
    (input: Omit<ServiceProduct, "id" | "branchId" | "sortOrder" | "source">) => {
      const branchId = state.branches[0]?.id ?? "branch-main";
      const product: ServiceProduct = {
        ...input,
        id: `prod-${Date.now().toString(36)}`,
        branchId,
        sortOrder: state.products.length + 1,
        source: "manual",
      };
      setState((s) => ({ ...s, products: [...s.products, product] }));
      return product;
    },
    [state.branches, state.products.length],
  );

  const updateProduct = useCallback(
    (id: string, patch: Partial<ServiceProduct>) => {
      setState((s) => ({
        ...s,
        products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
    },
    [],
  );

  const removeProduct = useCallback((id: string) => {
    setState((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) }));
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const updateStaff = useCallback((staff: Staff[]) => {
    setState((s) => ({ ...s, staff }));
  }, []);

  // ---------- 가져오기 / 복원 ----------

  /**
   * 백업 파일로 되돌리기.
   * 기록(고객·방문·이용권·직원·지점)은 백업 시점으로 교체하되,
   * 화면 표시 설정처럼 이 기기에서 쓰던 값은 백업에 있을 때만 덮어쓴다.
   * 브리핑 과제 상태는 기록이 통째로 바뀌면 의미가 없으므로 비운다.
   */
  const applyRemote = useCallback<StoreValue["applyRemote"]>((data) => {
    setState((s) => ({
      ...s,
      customers: data.customers,
      visits: data.visits,
      memberships: data.memberships,
      products: data.products.length ? data.products : s.products,
      staff: data.staff.length ? data.staff : s.staff,
      branches: data.branches.length ? data.branches : s.branches,
      // 과제 상태는 날짜별 계산 결과라 자료가 바뀌면 다시 세운다
      taskOverrides: [],
      taskFirstSeen: {},
    }));
  }, []);

  const restoreBackup = useCallback((payload: BackupPayload) => {
    setState((s) => ({
      ...s,
      customers: payload.customers,
      visits: payload.visits,
      memberships: payload.memberships,
      staff: payload.staff.length ? payload.staff : s.staff,
      branches: payload.branches.length ? payload.branches : s.branches,
      settings:
        payload.settings && typeof payload.settings === "object"
          ? { ...s.settings, ...(payload.settings as Partial<AppSettings>) }
          : s.settings,
      taskOverrides: [],
      taskFirstSeen: {},
    }));
  }, []);

  /**
   * 고객 명부 일괄 등록.
   * - "skip"   : 이미 있는 연락처는 건너뛴다 (기존 기록을 절대 건드리지 않음)
   * - "update" : 기존 고객에서 비어 있던 항목만 파일 값으로 채운다 (덮어쓰기 아님)
   * 어느 쪽이든 기존 방문·이용권 기록은 그대로 둔다.
   */
  const importCustomers = useCallback(
    (rows: ImportRow[], mode: "skip" | "update") => {
      const branchId = state.branches[0]?.id ?? "branch-main";
      const today = todayISO();
      let added = 0;
      let updated = 0;

      setState((s) => {
        const byId = new Map(s.customers.map((c) => [c.id, c]));
        const fresh: Customer[] = [];

        rows.forEach((row, i) => {
          if (row.existingId && byId.has(row.existingId)) {
            if (mode !== "update") return;
            const cur = byId.get(row.existingId)!;
            // 비어 있던 항목만 채운다
            const patched: Customer = {
              ...cur,
              gender: cur.gender ?? row.gender,
              birthYear: cur.birthYear ?? row.birthYear,
              ageGroup: cur.ageGroup || row.ageGroup,
              consultationNote: cur.consultationNote || row.consultationNote,
              nextManageDate: cur.nextManageDate ?? row.nextManageDate,
              memo: cur.memo || mergeMemo(row),
              focusBodyParts:
                cur.focusBodyParts.length > 0
                  ? cur.focusBodyParts
                  : (row.careAreas ?? []),
            };
            const changed = (Object.keys(patched) as Array<keyof Customer>).some(
              (k) => patched[k] !== cur[k],
            );
            if (changed) {
              byId.set(cur.id, patched);
              updated++;
            }
            return;
          }
          fresh.push({
            id: `c-i${Date.now().toString(36)}-${i}`,
            branchId,
            name: row.name,
            phone: row.phone,
            gender: row.gender,
            ageGroup: row.ageGroup,
            consultationNote: row.consultationNote,
            birthYear: row.birthYear,
            registeredAt: row.registeredAt ?? today,
            memo: mergeMemo(row),
            focusBodyParts: row.careAreas ?? [],
            nextManageDate: row.nextManageDate,
          });
          added++;
        });

        return { ...s, customers: [...fresh, ...byId.values()] };
      });

      return { added, updated };
    },
    [state.branches],
  );

  const resetData = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setState(seedState());
  }, []);

  /**
   * 실제 운영 시작 — 샘플 고객·방문·이용권 기록을 모두 비운다.
   *
   * 매장 정보와 직원 명단, 관리 기준 설정은 그대로 둔다.
   * 도입 준비 과정에서 이미 맞춰 놓은 값이라 다시 입력하게 만들 이유가 없다.
   */
  const startFresh = useCallback(() => {
    setState((s) => ({
      ...s,
      customers: [],
      visits: [],
      memberships: [],
      taskOverrides: [],
      taskFirstSeen: {},
      seededAt: undefined,
      // 가격표는 매장 실제 자료라 샘플이 아니다 — 지우지 않는다
    }));
  }, []);

  const value: StoreValue = {
    ...state,
    ready,
    saveFailed,
    droppedRecords,
    storage,
    briefingTasks,
    factsById,
    derivedById,
    opportunityById,
    currentStaff,
    isManager,
    canSeePhone,
    privacyMode,
    setCurrentStaff,
    authStaff,
    setAuthStaff,
    addPreference,
    togglePreferencePin,
    removePreference,
    addCustomer,
    updateCustomer,
    addVisit,
    updateVisit,
    removeVisit,
    restoreVisit,
    addProduct,
    updateProduct,
    removeProduct,
    addMembership,
    updateMembership,
    removeMembership,
    restoreMembership,
    setTaskStatus,
    updateSettings,
    updateStaff,
    restoreBackup,
    applyRemote,
    importCustomers,
    startFresh,
    resetData,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within AppProvider");
  return ctx;
}
