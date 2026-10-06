"use client";

/**
 * 매장 계정 연결 (직원 AX ↔ Supabase)
 * ====================================
 *
 * 이 파일이 하는 일은 셋이다.
 *   1) 매장 계정 로그인 상태를 들고 있는다
 *   2) 연결돼 있으면 서버 것을 받아 이 기기 것과 합친 뒤 바뀐 것만 올린다
 *      (바뀔 때마다 잠깐 뒤에, 화면으로 돌아올 때, 그리고 1분마다 — merge.ts)
 *   3) 고객이 남긴 피드백·요청을 받아 와 직원 화면에 넘긴다
 *
 * 연결하지 않으면 아무 일도 하지 않는다. 그 상태가 지금까지의 동작 그대로다.
 * 시연·연습은 연결 없이 하고, 실제 운영만 연결해서 쓰면 된다 — 그렇게 두면
 * 시연 화면에 실제 고객이 섞여 들어갈 길 자체가 없다.
 *
 * 첫 연결 때 어느 쪽이 이기는가
 * ------------------------------
 * 서버가 비어 있으면 이 기기 것을 올린다(처음 붙이는 매장).
 * 서버에 이미 자료가 있으면 서버 것을 받아 온다(둘째 기기를 붙이는 경우).
 * 이 판단만은 자동으로 하지 않고 화면에서 사람이 고르게 한다 — 잘못 고르면
 * 한쪽이 통째로 사라지기 때문이다.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useStore } from "@/lib/data/store";
import { markStaffDevice } from "@/lib/auth/surface";
import { humanError, staffClient, supabaseConfigured } from "./client";
import {
  type CustomerFeedbackRow,
  type CustomerRequestRow,
  type StaffIdentity,
  issueLinkCode,
  loadStaffIdentity,
  pullAll,
  pullCustomerInbox,
  pushAll,
  pushPlan,
} from "./sync";
import {
  clearBase,
  hasWork,
  makeBase,
  planSync,
  readBase,
  writeBase,
} from "./merge";

export type LinkPhase =
  | "off" // 설정 없음 — 이 빌드는 서버를 모른다
  | "checking" // 세션을 확인하는 중 — 아직 아무것도 단정하지 않는다
  | "signed_out" // 설정은 있고 로그인 안 함
  | "no_staff" // 로그인은 됐는데 직원 레코드에 이어지지 않음
  | "choosing" // 첫 연결 — 어느 쪽을 살릴지 고르는 중
  | "syncing"
  | "linked"
  | "error";

interface LinkValue {
  phase: LinkPhase;
  identity?: StaffIdentity;
  error: string;
  /** 마지막으로 서버에 반영한 시각 */
  lastSyncedAt?: string;
  /** 첫 연결 때 서버에 이미 들어 있던 고객 수 */
  remoteCustomerCount: number;

  feedback: CustomerFeedbackRow[];
  requests: CustomerRequestRow[];

  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** 첫 연결 선택 — 이 기기 것을 올릴지, 서버 것을 받을지 */
  resolveFirstSync: (choice: "push" | "pull") => Promise<void>;
  syncNow: () => Promise<void>;
  makeLinkCode: (customerId: string) => Promise<{ code: string; expiresAt: string }>;
  markFeedbackRead: (id: string) => Promise<void>;
  setRequestStatus: (id: string, status: "handled" | "closed") => Promise<void>;
}

const Ctx = createContext<LinkValue | null>(null);

/** 상태가 멎은 뒤에 한 번만 올린다 — 타이핑 한 글자마다 보내지 않게 */
const PUSH_DELAY_MS = 2500;
/** 다른 기기가 적은 것을 받아 오는 간격 — 화면을 보고 있을 때만 */
const PULL_EVERY_MS = 60_000;
/** 창을 오갈 때마다 부르지 않게 — 이보다 짧게는 다시 받지 않는다 */
const MIN_GAP_MS = 10_000;

/**
 * "이 기기는 이미 연결을 마쳤다" 는 표시.
 *
 * 이게 없으면 새로고침할 때마다 처음 연결 화면(어느 쪽을 살릴지 고르세요)이
 * 다시 뜬다. 원장님 입장에서는 어제 연결해 뒀는데 오늘 아침에 또 고르라고
 * 하는 셈이고, 고르기 전까지는 기록이 서버로 올라가지도 않는다.
 * 실제로 이것 때문에 방문을 기록해도 고객 화면에 반영되지 않았다.
 */
const LINK_KEY = "jeongtong-ax-link";
const readLinked = (): string | null => {
  try {
    return window.localStorage.getItem(LINK_KEY);
  } catch {
    return null;
  }
};
const writeLinked = (branchId: string) => {
  try {
    window.localStorage.setItem(LINK_KEY, branchId);
  } catch {
    /* 저장 못 해도 이번 세션은 그대로 동작한다 */
  }
};
const clearLinked = () => {
  try {
    window.localStorage.removeItem(LINK_KEY);
  } catch {
    /* 무시 */
  }
};

export function StaffLinkProvider({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const { ready, customers, visits, memberships, products, staff, branches } = store;
  const applyRemote = store.applyRemote;
  const setAuthStaff = store.setAuthStaff;

  /*
    처음에는 "로그인 안 함" 이 아니라 "아직 모른다(checking)" 로 시작한다.
    세션 확인은 비동기라 첫 렌더에서는 답이 없는데, 그 찰나를 로그인 안 함
    으로 단정하면 로그인해 둔 사람도 새로고침할 때마다 로그인 화면으로
    튕겨 나간다.
  */
  const [phase, setPhase] = useState<LinkPhase>(
    supabaseConfigured ? "checking" : "off",
  );
  const [identity, setIdentity] = useState<StaffIdentity | undefined>();
  const [error, setError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>();
  const [remoteCustomerCount, setRemoteCustomerCount] = useState(0);
  const [feedback, setFeedback] = useState<CustomerFeedbackRow[]>([]);
  const [requests, setRequests] = useState<CustomerRequestRow[]>([]);

  const sbRef = useRef<SupabaseClient | null>(null);
  if (sbRef.current === null && typeof window !== "undefined") {
    sbRef.current = staffClient();
  }

  /**
   * 방금 서버에서 받아 온 것 때문에 다시 올리지 않도록 하는 표시.
   * 없으면 pull → state 변경 → push → … 로 스스로를 계속 부른다.
   */
  const skipNextPush = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 서버가 준 역할로 판단한다 — 화면에서 고른 값이 아니다 */
  const isAdmin = identity?.role === "owner" || identity?.role === "manager";

  const currentData = useCallback(
    () => ({ customers, visits, memberships, products, staff, branches }),
    [customers, visits, memberships, products, staff, branches],
  );

  /** 서버에서 받아 온 직후 합칠 때 쓰는 「지금 이 순간」 의 자료 */
  const localRef = useRef(currentData());
  localRef.current = { customers, visits, memberships, products, staff, branches };
  const running = useRef(false);
  const rerun = useRef(false);
  const lastCycleAt = useRef(0);

  /**
   * 받아서 합치고, 바뀐 것만 올린다 — 이 앱의 저장 한 바퀴.
   *
   * 예전에는 「이 기기 것을 통째로 올리고 서버에만 있는 줄은 지운다」 였고,
   * 그래서 다른 기기가 막 적은 방문이 지워졌다. 자세한 규칙은 merge.ts.
   * 한 번에 한 바퀴만 돈다. 도는 중에 또 바뀌면 끝나고 한 번 더 돈다.
   */
  const runCycle = useCallback(
    async (sb: SupabaseClient, who: StaffIdentity) => {
      if (running.current) {
        rerun.current = true;
        return;
      }
      running.current = true;
      lastCycleAt.current = Date.now();
      const admin = who.role === "owner" || who.role === "manager";
      try {
        const server = await pullAll(sb, who.branchId);
        const base = readBase(who.branchId);
        if (!base) {
          // 이 방식으로 처음 맞추는 기기 — 지금까지처럼 서버를 기준으로 삼는다
          skipNextPush.current = true;
          applyRemote(server, { keepTasks: true });
          writeBase(who.branchId, makeBase(server));
        } else {
          const plan = planSync(localRef.current, server, base);
          if (plan.localChanged) {
            skipNextPush.current = true;
            applyRemote(plan.merged, { keepTasks: true });
          }
          if (hasWork(plan)) await pushPlan(sb, who.branchId, plan, { isAdmin: admin });
          writeBase(who.branchId, makeBase(plan.merged));
        }
        setLastSyncedAt(new Date().toISOString());
        setError("");
      } finally {
        running.current = false;
        if (rerun.current) {
          rerun.current = false;
          setTimeout(() => {
            void runCycle(sb, who).catch((e) => setError(humanError(e)));
          }, 0);
        }
      }
    },
    [applyRemote],
  );

  const loadInbox = useCallback(async (sb: SupabaseClient, branchId: string) => {
    try {
      const inbox = await pullCustomerInbox(sb, branchId);
      setFeedback(inbox.feedback);
      setRequests(inbox.requests);
    } catch {
      // 수신함을 못 읽었다고 화면을 막지 않는다. 나머지는 그대로 쓸 수 있다
    }
  }, []);

  // ---------- 로그인 상태 확인 ----------

  const bootstrap = useCallback(
    async (sb: SupabaseClient) => {
      const id = await loadStaffIdentity(sb);
      if (!id) {
        const { data } = await sb.auth.getSession();
        setAuthStaff(undefined);
        // 직원이 아니면 이 기기의 '직원 표시' 도 내린다
        markStaffDevice(false);
        setPhase(data.session ? "no_staff" : "signed_out");
        return;
      }
      setIdentity(id);
      /*
        이 기기에서 직원으로 들어온 적이 있다고 표시해 둔다.
        고객 화면·공개 화면의 껍데기는 StaffLink 를 볼 수 없어서(Provider
        가 (staff) 안에만 있다) 이 표시로 왕복 스위치를 그릴지 정한다.
        권한이 아니라 화면 표시용이고, 로그아웃하면 바로 꺼진다.
      */
      markStaffDevice(true);
      /*
        여기가 권한의 출발점이다.

        role 은 화면이 고른 값이 아니라 서버가 auth.uid() 로 찾아 준
        staff 레코드의 값이다. 이걸 저장소에 넘겨 주면 그때부터 화면의
        관리자 판정은 전부 여기서 나온다.
      */
      setAuthStaff({ staffId: id.staffId, name: id.staffName, role: id.role });

      /*
       * 이미 연결을 마친 기기라면 묻지 않는다.
       * 서버 것을 받아 와 화면을 맞추고 바로 쓰던 대로 이어 간다.
       * (연결한 뒤로는 서버가 기준이다 — 바꾼 내용은 2.5초 뒤 자동으로
       *  서버에 반영되므로, 받아 오면서 잃어버릴 것이 없다)
       */
      if (readLinked() === id.branchId) {
        setPhase("syncing");
        // 받아서 합친다 — 지난번에 못 올린 이 기기 기록도 잃지 않는다
        await runCycle(sb, id);
        setPhase("linked");
        void loadInbox(sb, id.branchId);
        return;
      }

      // 처음 연결하는 기기 — 서버에 이미 자료가 있는지 보여 주고 고르게 한다
      const { count } = await sb
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("branch_id", id.branchId);

      setRemoteCustomerCount(count ?? 0);
      setPhase("choosing");
      void loadInbox(sb, id.branchId);
    },
    [loadInbox, runCycle, setAuthStaff],
  );

  useEffect(() => {
    const sb = sbRef.current;
    if (!supabaseConfigured || !sb) return;
    let alive = true;

    (async () => {
      try {
        const { data } = await sb.auth.getSession();
        if (!alive) return;
        if (!data.session) {
          setPhase("signed_out");
          return;
        }
        await bootstrap(sb);
      } catch (e) {
        if (alive) {
          setError(humanError(e));
          setPhase("error");
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [bootstrap]);

  // ---------- 첫 연결 방향 ----------

  const resolveFirstSync = useCallback(
    async (choice: "push" | "pull") => {
      const sb = sbRef.current;
      if (!sb || !identity) return;
      setPhase("syncing");
      setError("");
      try {
        if (choice === "pull") {
          const data = await pullAll(sb, identity.branchId);
          skipNextPush.current = true;
          applyRemote(data);
          writeBase(identity.branchId, makeBase(data));
        } else {
          // 「이 기기 것을 살린다」 를 고른 경우만 통째로 올린다
          await pushAll(sb, identity.branchId, currentData(), { isAdmin });
          // 올린 것을 서버 모양(uuid)으로 다시 받아 기준으로 삼는다
          const data = await pullAll(sb, identity.branchId);
          skipNextPush.current = true;
          applyRemote(data, { keepTasks: true });
          writeBase(identity.branchId, makeBase(data));
        }
        writeLinked(identity.branchId);
        setLastSyncedAt(new Date().toISOString());
        setPhase("linked");
        void loadInbox(sb, identity.branchId);
      } catch (e) {
        setError(humanError(e));
        setPhase("error");
      }
    },
    [identity, isAdmin, applyRemote, currentData, loadInbox],
  );

  const syncNow = useCallback(async () => {
    const sb = sbRef.current;
    if (!sb || !identity || phase !== "linked") return;
    try {
      // 성공하면 runCycle 이 경고를 거둔다. 안 거두면 "다시 시도" 를 눌러
      // 성공해도 화면이 계속 빨간 채로 남아, 원장님은 아직 고장 났다고 읽는다.
      await runCycle(sb, identity);
      await loadInbox(sb, identity.branchId);
    } catch (e) {
      setError(humanError(e));
    }
  }, [identity, phase, runCycle, loadInbox]);

  // ---------- 바뀌면 잠시 뒤 올린다 ----------

  useEffect(() => {
    if (!ready || phase !== "linked" || !identity) return;
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }
    const sb = sbRef.current;
    if (!sb) return;

    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      runCycle(sb, identity).catch((e) => setError(humanError(e)));
    }, PUSH_DELAY_MS);

    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [
    ready,
    phase,
    identity,
    runCycle,
    customers,
    visits,
    memberships,
    products,
    staff,
    branches,
  ]);

  /*
   * 다른 기기가 적은 것을 받아 온다.
   *
   * 아무것도 안 고치고 화면만 보고 있는 기기(카운터 태블릿)는 위의 「바뀌면
   * 올린다」 가 한 번도 돌지 않아, 폰에서 적은 방문을 하루 종일 모른다.
   * 그래서 화면으로 돌아올 때 한 번, 보고 있는 동안 1분마다 한 번 받는다.
   * 화면이 꺼져 있을 때는 받지 않는다.
   */
  useEffect(() => {
    if (!ready || phase !== "linked" || !identity) return;
    const sb = sbRef.current;
    if (!sb) return;
    const visible = () =>
      typeof document === "undefined" || document.visibilityState === "visible";
    const tick = () => {
      if (!visible()) return;
      if (Date.now() - lastCycleAt.current < MIN_GAP_MS) return;
      runCycle(sb, identity).catch((e) => setError(humanError(e)));
    };
    const t = setInterval(tick, PULL_EVERY_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [ready, phase, identity, runCycle]);

  // 고객이 남긴 것은 이쪽에서 알 길이 없으니 주기적으로 확인한다.
  // 5분이면 "오늘 남긴 것을 오늘 본다" 에는 충분하고, 서버 호출도 적다.
  useEffect(() => {
    if (phase !== "linked" || !identity) return;
    const sb = sbRef.current;
    if (!sb) return;
    const t = setInterval(() => void loadInbox(sb, identity.branchId), 5 * 60_000);
    return () => clearInterval(t);
  }, [phase, identity, loadInbox]);

  // ---------- 계정 ----------

  const signIn = useCallback(
    async (email: string, password: string) => {
      const sb = sbRef.current;
      if (!sb) throw new Error("연결 설정이 되어 있지 않습니다.");
      setError("");
      const { error: e } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (e) throw new Error(humanError(e));
      await bootstrap(sb);
    },
    [bootstrap],
  );

  const signOut = useCallback(async () => {
    const sb = sbRef.current;
    clearLinked();
    if (identity) clearBase(identity.branchId);
    if (sb) await sb.auth.signOut();
    setIdentity(undefined);
    // 권한도 함께 내려놓는다 — 세션만 지우고 role 을 남겨 두면 안 된다
    setAuthStaff(undefined);
    /*
      매장 태블릿 하나를 직원과 고객이 번갈아 쓰는 일이 실제로 있다.
      로그아웃했는데 '내부 AX' 스위치가 그대로 남아 있으면, 다음에 그
      기기를 잡은 고객에게 눌러 봐야 막히는 길이 보인다.
    */
    markStaffDevice(false);
    setFeedback([]);
    setRequests([]);
    setLastSyncedAt(undefined);
    setPhase(supabaseConfigured ? "signed_out" : "off");
  }, [identity, setAuthStaff]);

  // ---------- 고객 연결코드 · 수신함 처리 ----------

  const makeLinkCode = useCallback(
    async (customerId: string) => {
      const sb = sbRef.current;
      if (!sb || !identity) throw new Error("먼저 매장 계정을 연결해 주세요.");
      try {
        return await issueLinkCode(sb, {
          customerId,
          branchId: identity.branchId,
          staffId: identity.staffId,
        });
      } catch (e) {
        throw new Error(humanError(e));
      }
    },
    [identity],
  );

  const markFeedbackRead = useCallback(
    async (id: string) => {
      const sb = sbRef.current;
      if (!sb || !identity) return;
      const at = new Date().toISOString();
      setFeedback((prev) =>
        prev.map((f) => (f.id === id ? { ...f, readAt: at } : f)),
      );
      const { error: e } = await sb
        .from("customer_feedback")
        .update({ read_at: at, read_by_staff_id: identity.staffId })
        .eq("id", id);
      if (e) setError(humanError(e));
    },
    [identity],
  );

  const setRequestStatus = useCallback(
    async (id: string, status: "handled" | "closed") => {
      const sb = sbRef.current;
      if (!sb || !identity) return;
      const at = new Date().toISOString();
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status, handledAt: at } : r)),
      );
      const { error: e } = await sb
        .from("customer_requests")
        .update({ status, handled_at: at, handled_by_staff_id: identity.staffId })
        .eq("id", id);
      if (e) setError(humanError(e));
    },
    [identity],
  );

  const value = useMemo<LinkValue>(
    () => ({
      phase,
      identity,
      error,
      lastSyncedAt,
      remoteCustomerCount,
      feedback,
      requests,
      signIn,
      signOut,
      resolveFirstSync,
      syncNow,
      makeLinkCode,
      markFeedbackRead,
      setRequestStatus,
    }),
    [
      phase,
      identity,
      error,
      lastSyncedAt,
      remoteCustomerCount,
      feedback,
      requests,
      signIn,
      signOut,
      resolveFirstSync,
      syncNow,
      makeLinkCode,
      markFeedbackRead,
      setRequestStatus,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * 연결 상태를 읽는다.
 *
 * Provider 밖에서도 부를 수 있게 기본값을 준다. 고객 포털처럼 이 Provider 가
 * 없는 화면에서도 같은 컴포넌트를 쓸 수 있어야 하기 때문이다.
 */
export function useStaffLink(): LinkValue {
  const v = useContext(Ctx);
  return v ?? FALLBACK;
}

const noop = async () => {};
const FALLBACK: LinkValue = {
  phase: "off",
  error: "",
  remoteCustomerCount: 0,
  feedback: [],
  requests: [],
  signIn: noop,
  signOut: noop,
  resolveFirstSync: noop,
  syncNow: noop,
  makeLinkCode: async () => {
    throw new Error("연결되지 않았습니다.");
  },
  markFeedbackRead: noop,
  setRequestStatus: noop,
};
