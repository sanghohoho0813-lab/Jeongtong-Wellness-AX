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
  Staff,
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

const STORAGE_KEY = "jeongtong-ax-v1";

interface PersistedState {
  customers: Customer[];
  visits: Visit[];
  memberships: Membership[];
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
  setCurrentStaff: (staffId: string) => void;
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
  /** 전체 백업 파일로 되돌리기 — 현재 데이터를 백업 시점 상태로 교체한다 */
  restoreBackup: (payload: BackupPayload) => void;
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

function seedState(): PersistedState {
  return {
    customers: seedCustomers,
    visits: seedVisits,
    memberships: seedMemberships,
    branches: seedBranches,
    staff: seedStaff,
    taskOverrides: [],
    settings: DEFAULT_SETTINGS,
    seededAt: todayISO(),
  };
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

  // 최초 로드: localStorage 복원 (seed 날짜가 오래되면 데이터 유지, 설정만 유지해도 됨)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState;
        if (parsed.customers?.length) {
          setState(migrate({ ...seedState(), ...parsed }));
        }
      }
    } catch {
      // 복원 실패 시 seed 유지
    }
    setReady(true);
  }, []);

  // 변경 시 저장
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 저장 실패는 무시 (용량 등)
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
    if (theme === "system") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
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

  // 현재 사용자 — 지정되지 않았거나 비활성이면 첫 owner(없으면 첫 직원)
  const currentStaff = useMemo(() => {
    const found = state.staff.find(
      (s) => s.id === state.currentStaffId && s.active,
    );
    return (
      found ??
      state.staff.find((s) => s.role === "owner" && s.active) ??
      state.staff[0]
    );
  }, [state.staff, state.currentStaffId]);

  const isManager =
    currentStaff?.role === "owner" || currentStaff?.role === "manager";
  // 연락처 원본은 대표/관리자만 열람 (직원 화면에서는 마스킹)
  const canSeePhone = isManager;

  const setCurrentStaff = useCallback((staffId: string) => {
    setState((s) => ({ ...s, currentStaffId: staffId }));
  }, []);

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
      customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
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
              nextManageDate: cur.nextManageDate ?? row.nextManageDate,
              memo: cur.memo || row.memo,
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
            birthYear: row.birthYear,
            registeredAt: row.registeredAt ?? today,
            memo: row.memo,
            focusBodyParts: [],
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

  const value: StoreValue = {
    ...state,
    ready,
    briefingTasks,
    factsById,
    derivedById,
    opportunityById,
    currentStaff,
    isManager,
    canSeePhone,
    setCurrentStaff,
    addPreference,
    togglePreferencePin,
    removePreference,
    addCustomer,
    updateCustomer,
    addVisit,
    updateVisit,
    removeVisit,
    restoreVisit,
    addMembership,
    updateMembership,
    removeMembership,
    restoreMembership,
    setTaskStatus,
    updateSettings,
    updateStaff,
    restoreBackup,
    importCustomers,
    resetData,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within AppProvider");
  return ctx;
}
