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
}

export interface NewVisitInput {
  customerId: string;
  type: "visit" | "consult";
  programName?: string;
  membershipId?: string;
  bodyParts: BodyPartRecord[];
  reaction?: string;
  amount?: number;
  nextManageDate?: string;
  staffId?: string;
}

interface StoreValue extends PersistedState {
  ready: boolean;
  briefingTasks: BriefingTask[];
  factsById: Map<string, CustomerFacts>;
  derivedById: Map<string, ReturnType<typeof deriveCustomer>>;
  /** 현재 사용자 (기본: 첫 owner) */
  currentStaff: Staff;
  /** 대표/관리자 여부 — 매출·운영 정보 노출 판단 */
  isManager: boolean;
  setCurrentStaff: (staffId: string) => void;
  addCustomer: (input: NewCustomerInput) => Customer;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  addVisit: (input: NewVisitInput) => Visit;
  setTaskStatus: (
    taskId: string,
    status: TaskStatus,
    extra?: { outcome?: Partial<TaskOutcome>; holdUntil?: string },
  ) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  updateStaff: (staff: Staff[]) => void;
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
          setState({ ...seedState(), ...parsed });
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

  const briefingTasks = useMemo(
    () =>
      generateDailyBriefing(
        [...factsById.values()],
        state.settings.careRules,
        state.taskOverrides,
      ),
    [factsById, state.settings.careRules, state.taskOverrides],
  );

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

  const setCurrentStaff = useCallback((staffId: string) => {
    setState((s) => ({ ...s, currentStaffId: staffId }));
  }, []);

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
      visitedAt: now.toISOString(),
      type: input.type,
      programName: input.programName,
      membershipId: input.membershipId,
      bodyParts: input.bodyParts,
      reaction: input.reaction,
      amount: input.amount,
      nextManageDate: input.nextManageDate,
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
        };
      });
      return { ...s, visits: [visit, ...s.visits], memberships, customers };
    });
    return visit;
  }, [state.branches]);

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
          nextOutcome = {
            contactResult: o?.contactResult ?? base?.contactResult ?? "contacted",
            revisitPlanned: o?.revisitPlanned ?? !!nextManageDate,
            nextManageDate,
            note: o?.note ?? base?.note,
          };
          // 결과에서 다음 관리일을 조정했으면 고객 데이터에도 반영 (기존 필드 갱신)
          if (
            o?.nextManageDate &&
            customer &&
            o.nextManageDate !== customer.nextManageDate
          ) {
            customers = s.customers.map((c) =>
              c.id === customer.id
                ? { ...c, nextManageDate: o.nextManageDate }
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
    currentStaff,
    isManager,
    setCurrentStaff,
    addCustomer,
    updateCustomer,
    addVisit,
    setTaskStatus,
    updateSettings,
    updateStaff,
    resetData,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within AppProvider");
  return ctx;
}
