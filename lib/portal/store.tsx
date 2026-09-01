"use client";

/**
 * MY WELLNESS 고객 스토어
 * =======================
 *
 * 직원용 스토어(lib/data/store.tsx)와 완전히 다른 물건이다. 같은 데이터베이스를
 * 보지만, 이쪽은 **읽기 위주**이고 **자기 것 하나**만 다룬다.
 *
 * 왜 나눴는가
 * -----------
 * 직원 스토어는 지점 전체를 통째로 들고 계산한다(우선순위·매출기회·브리핑).
 * 고객 화면에 그걸 가져오면 남의 자료가 브라우저까지 내려온 뒤 화면에서만
 * 가려지는 꼴이 된다. 개발자 도구를 열면 다 보인다.
 *
 * 그래서 고객 쪽은 아예 다른 통로로 다닌다. 서버가 자기 행만 내려 주고
 * (RLS), 앱은 받은 것만 그린다. 화면에서 거르지 않는다 — 애초에 오지 않는다.
 *
 * 로그인 상태
 * -----------
 *   loading  — 아직 확인 중
 *   anon     — 로그인 안 함
 *   unlinked — 로그인은 했지만 아직 어느 고객인지 이어지지 않음 (연결코드 필요)
 *   ready    — 자기 자료를 볼 수 있음
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
import { portalClient, supabaseConfigured, humanError } from "@/lib/supabase/client";
import { demoMode } from "@/lib/auth/mode";
import {
  DEMO_BRANCH,
  DEMO_CUSTOMER,
  DEMO_MEMBERSHIPS,
  DEMO_PRODUCTS,
  DEMO_VISITS,
} from "./demo";
import {
  branchFromRow,
  customerFromRow,
  membershipFromRow,
  productFromRow,
  visitFromRow,
} from "@/lib/supabase/mappers";
import type {
  BodyPart,
  Branch,
  Customer,
  Membership,
  ServiceProduct,
  Visit,
} from "@/lib/types";

export type PortalPhase = "loading" | "anon" | "unlinked" | "ready" | "error";

export interface WellnessProfileInput {
  purpose?: string;
  interestAreas?: BodyPart[];
  preferredTime?: "morning" | "afternoon" | "evening";
  homecareInterest?: boolean;
  note?: string;
}

export interface WellnessProfile extends WellnessProfileInput {
  updatedAt?: string;
}

export interface MyFeedback {
  id: string;
  visitId?: string;
  satisfaction?: number;
  revisitIntent?: "yes" | "maybe" | "no";
  note?: string;
  homecareInterest?: boolean;
  createdAt: string;
}

export interface MyRequest {
  id: string;
  kind: "booking" | "inquiry";
  preferredDate?: string;
  preferredSlot?: "morning" | "afternoon" | "evening";
  note?: string;
  status: "open" | "handled" | "closed";
  createdAt: string;
}

interface PortalValue {
  phase: PortalPhase;
  /** 설정이 아예 없는 빌드인지 (연결 안내 문구를 다르게 낸다) */
  configured: boolean;
  /**
   * 지금 보이는 것이 **예시 자료**인가.
   *
   * demoMode 와 일부러 다른 이름을 쓴다. demoMode 는 직원 화면의 로그인
   * 우회까지 함께 여는 스위치라, 그 하나로 이것까지 묶으면 "고객에게
   * 예시를 보여 주고 싶다" 는 이유로 직원 화면이 열려 버린다.
   * 이 값은 **고객 화면에 무엇을 그릴지만** 정한다.
   */
  sample: boolean;
  /** 로그인 화면에서 "예시로 둘러보기" 를 눌렀을 때 */
  enterSample: () => void;
  error: string;
  email: string;

  customer?: Customer;
  branch?: Branch;
  visits: Visit[];
  memberships: Membership[];
  products: ServiceProduct[];
  profile: WellnessProfile;
  feedback: MyFeedback[];
  requests: MyRequest[];
  /** 콘텐츠를 열어 본 횟수 — Wellness Type 참고값 */
  contentOpens: number;

  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  redeemLinkCode: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;

  saveProfile: (input: WellnessProfileInput) => Promise<void>;
  submitFeedback: (input: {
    visitId?: string;
    satisfaction: number;
    revisitIntent: "yes" | "maybe" | "no";
    note?: string;
    homecareInterest?: boolean;
  }) => Promise<void>;
  submitRequest: (input: {
    kind: "booking" | "inquiry";
    preferredDate?: string;
    preferredSlot?: "morning" | "afternoon" | "evening";
    note?: string;
  }) => Promise<void>;
  logContentOpen: (contentId: string) => void;
}

const Ctx = createContext<PortalValue | null>(null);

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<PortalPhase>("loading");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  const [customer, setCustomer] = useState<Customer | undefined>();
  const [branch, setBranch] = useState<Branch | undefined>();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [products, setProducts] = useState<ServiceProduct[]>([]);
  const [profile, setProfile] = useState<WellnessProfile>({});
  const [feedback, setFeedback] = useState<MyFeedback[]>([]);
  const [requests, setRequests] = useState<MyRequest[]>([]);
  const [contentOpens, setContentOpens] = useState(0);
  const [sample, setSample] = useState(false);

  const sbRef = useRef<SupabaseClient | null>(null);
  if (sbRef.current === null && typeof window !== "undefined") {
    sbRef.current = portalClient();
  }

  const clearAll = useCallback(() => {
    setCustomer(undefined);
    setBranch(undefined);
    setVisits([]);
    setMemberships([]);
    setProducts([]);
    setProfile({});
    setFeedback([]);
    setRequests([]);
    setContentOpens(0);
  }, []);

  /**
   * 자기 자료를 읽어 온다.
   *
   * 어느 것도 customer_id 를 조건에 넣지 않는다. 넣을 필요가 없다 —
   * 서버가 이 계정에 이어진 행만 내려 준다. 조건을 앱에 두면 언젠가
   * 한 화면에서 빠뜨리고, 그게 곧 남의 자료가 보이는 길이 된다.
   */
  const load = useCallback(async () => {
    const sb = sbRef.current;
    if (!sb) return;

    /*
      본인 한 행을 읽는다.

      customers_view 를 먼저 본다 — 연락처를 컬럼 단위로 잠근 뒤에는
      본인 번호가 이 뷰로만 온다(auth-hardening.sql). 아직 그 SQL 을
      돌리지 않은 서버에서는 뷰가 직원 범위로만 좁혀져 있어 0행이 되므로,
      그때는 테이블로 되돌아간다. 어느 쪽이든 RLS 가 "본인 한 행" 을
      보장하므로 남의 자료가 나올 길은 없다.
    */
    let me: Record<string, unknown> | null = null;
    let meErr: unknown = null;
    {
      const v = await sb.from("customers_view").select("*").limit(1).maybeSingle();
      if (v.data) {
        me = v.data;
      } else {
        const t = await sb.from("customers").select("*").limit(1).maybeSingle();
        me = t.data;
        meErr = t.error ?? (v.error && !t.data ? v.error : null);
      }
    }

    if (meErr) throw meErr;
    if (!me) {
      // 로그인은 됐는데 이어진 고객이 없다 → 연결코드를 받아야 한다
      clearAll();
      setPhase("unlinked");
      return;
    }

    const [vs, ms, ps, br, pf, fb, rq, ci] = await Promise.all([
      sb.from("visits").select("*").order("visited_at", { ascending: false }),
      sb.from("memberships").select("*").order("purchased_at", { ascending: false }),
      sb.from("service_products").select("*").order("sort_order"),
      sb.from("branches").select("*").limit(1).maybeSingle(),
      sb.from("customer_wellness_profiles").select("*").limit(1).maybeSingle(),
      sb
        .from("customer_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      sb
        .from("customer_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      sb
        .from("customer_content_interactions")
        .select("id")
        .eq("action", "open")
        .limit(200),
    ]);

    setCustomer(customerFromRow(me));
    setVisits((vs.data ?? []).map((r) => visitFromRow(r)));
    setMemberships((ms.data ?? []).map(membershipFromRow));
    setProducts((ps.data ?? []).map(productFromRow));
    setBranch(br.data ? branchFromRow(br.data) : undefined);
    setContentOpens((ci.data ?? []).length);

    setProfile(
      pf.data
        ? {
            purpose: pf.data.purpose ?? undefined,
            interestAreas: Array.isArray(pf.data.interest_areas)
              ? (pf.data.interest_areas as BodyPart[])
              : [],
            preferredTime: pf.data.preferred_time ?? undefined,
            homecareInterest: pf.data.homecare_interest ?? undefined,
            note: pf.data.note ?? undefined,
            updatedAt: pf.data.updated_at ?? undefined,
          }
        : {},
    );

    setFeedback(
      (fb.data ?? []).map((r) => ({
        id: r.id,
        visitId: r.visit_id ?? undefined,
        satisfaction: r.satisfaction ?? undefined,
        revisitIntent: r.revisit_intent ?? undefined,
        note: r.note ?? undefined,
        homecareInterest: r.homecare_interest ?? undefined,
        createdAt: r.created_at,
      })),
    );

    setRequests(
      (rq.data ?? []).map((r) => ({
        id: r.id,
        kind: r.kind,
        preferredDate: r.preferred_date ?? undefined,
        preferredSlot: r.preferred_slot ?? undefined,
        note: r.note ?? undefined,
        status: r.status,
        createdAt: r.created_at,
      })),
    );

    setPhase("ready");
  }, [clearAll]);

  const refresh = useCallback(async () => {
    try {
      await load();
    } catch (e) {
      setError(humanError(e));
      setPhase("error");
    }
  }, [load]);

  /**
   * 예시 고객으로 화면을 채운다.
   *
   * 여기 들어오는 사람은 실존하지 않는다 (lib/portal/demo.ts — 이름 ·
   * 연락처 · 이메일 전부 지어낸 것이고 전화번호는 통화가 되지 않는다).
   * 그래서 이 통로로 실제 개인정보에 닿을 길은 없다. 서버에 아무것도
   * 묻지 않고 화면만 채운다.
   */
  const enterSample = useCallback(() => {
    setEmail("example@email.com");
    setCustomer(DEMO_CUSTOMER);
    setBranch(DEMO_BRANCH);
    setVisits(DEMO_VISITS);
    setMemberships(DEMO_MEMBERSHIPS);
    setProducts(DEMO_PRODUCTS);
    setSample(true);
    setError("");
    setPhase("ready");
  }, []);

  // 첫 진입 — 이미 로그인돼 있으면 바로 자기 화면으로
  useEffect(() => {
    /*
      예시로 열어야 하는 두 경우.

      ① 시연 빌드(NEXT_PUBLIC_DEMO_MODE=1)
         대표님이 남에게 보여 줄 때 실제 고객 계정을 빌리지 않아도 되고,
         만드는 쪽도 자기가 만든 화면을 눈으로 볼 수 있다.

      ② 매장 시스템이 아직 연결되지 않은 빌드
         전에는 이때 "아직 연결 준비 중입니다" 한 장만 띄우고 끝이었다.
         그런데 연결 설정이 없다는 것은 **읽어 올 실제 자료가 어디에도
         없다** 는 뜻이다. 보호할 것이 없는 자리에 막다른 길을 세워 둔
         셈이었고, 보러 온 사람은 이 서비스가 무엇인지 알 방법이 없었다.
         그래서 예시로 연다.

      ②가 ①과 같은 스위치가 아닌 이유는 중요하다. demoMode 는 **직원
      화면의 로그인 우회**까지 함께 여는 값이다. 고객에게 예시를 보여
      주려고 그 값을 켜면 내부 AX 가 같이 열린다. 그래서 여기서는
      supabaseConfigured 만 본다 — 고객 화면에 무엇을 그릴지의 문제이지
      권한의 문제가 아니다.
    */
    if (demoMode || !supabaseConfigured) {
      enterSample();
      return;
    }

    const sb = sbRef.current;
    if (!sb) {
      setPhase("anon");
      return;
    }
    let alive = true;

    (async () => {
      try {
        const { data } = await sb.auth.getSession();
        if (!alive) return;
        if (!data.session) {
          setPhase("anon");
          return;
        }
        setEmail(data.session.user.email ?? "");
        await load();
      } catch (e) {
        if (!alive) return;
        setError(humanError(e));
        setPhase("error");
      }
    })();

    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        clearAll();
        setEmail("");
        setPhase("anon");
      } else if (session) {
        setEmail(session.user.email ?? "");
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
    /*
      enterSample 은 useCallback([]) 이라 신원이 바뀌지 않는다. 그래도
      의존성에 적어 둔다 — 나중에 누가 그 안에서 무언가를 참조하도록
      고치면, 적어 두지 않은 쪽은 낡은 값을 붙든 채 조용히 어긋난다.
    */
  }, [load, clearAll, enterSample]);

  // ---------- 로그인 ----------

  const sendCode = useCallback(async (addr: string) => {
    const sb = sbRef.current;
    if (!sb) throw new Error("연결 설정이 되어 있지 않습니다.");
    setError("");
    const { error: e } = await sb.auth.signInWithOtp({
      email: addr.trim(),
      options: { shouldCreateUser: true },
    });
    if (e) throw new Error(humanError(e));
  }, []);

  const verifyCode = useCallback(
    async (addr: string, code: string) => {
      const sb = sbRef.current;
      if (!sb) throw new Error("연결 설정이 되어 있지 않습니다.");
      setError("");
      const { error: e } = await sb.auth.verifyOtp({
        email: addr.trim(),
        token: code.trim(),
        type: "email",
      });
      if (e) throw new Error(humanError(e));
      setPhase("loading");
      await refresh();
    },
    [refresh],
  );

  /** 매장에서 받은 연결코드로 기존 고객 기록과 잇는다 */
  const redeemLinkCode = useCallback(
    async (code: string) => {
      const sb = sbRef.current;
      if (!sb) throw new Error("연결 설정이 되어 있지 않습니다.");
      setError("");
      const { error: e } = await sb.rpc("redeem_customer_link_code", {
        p_code: code.trim().toUpperCase(),
      });
      if (e) throw new Error(humanError(e));
      setPhase("loading");
      await refresh();
    },
    [refresh],
  );

  const signOut = useCallback(async () => {
    const sb = sbRef.current;
    if (sb) await sb.auth.signOut();
    clearAll();
    setEmail("");
    setPhase("anon");
  }, [clearAll]);

  // ---------- 고객이 남기는 것 ----------

  /**
   * 예시로 열려 있을 때 남기는 것들.
   *
   * 서버가 없으니 저장은 못 한다. 그렇다고 아무 일도 하지 않으면,
   * 예시를 보러 온 분이 예약을 남기고 "확인" 을 눌렀는데 화면이 그대로다 —
   * 고장난 것처럼 보인다. 그래서 **이 기기 안에서만** 목록에 얹어 주고,
   * 실제로 매장에 전달되지는 않았다는 말을 화면이 따로 적는다.
   *
   * 방금 만든 것에 붙일 id. 서버가 주던 값을 대신한다.
   */
  const sampleId = () => `sample-${Date.now().toString(36)}`;

  const saveProfile = useCallback(
    async (input: WellnessProfileInput) => {
      if (sample) {
        setProfile({ ...input, updatedAt: new Date().toISOString() });
        return;
      }
      const sb = sbRef.current;
      if (!sb || !customer) return;
      const { error: e } = await sb.from("customer_wellness_profiles").upsert(
        {
          customer_id: customer.id,
          branch_id: customer.branchId,
          purpose: input.purpose ?? null,
          interest_areas: input.interestAreas ?? [],
          preferred_time: input.preferredTime ?? null,
          homecare_interest: input.homecareInterest ?? null,
          note: input.note ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "customer_id" },
      );
      if (e) throw new Error(humanError(e));
      setProfile({ ...input, updatedAt: new Date().toISOString() });
    },
    [customer, sample],
  );

  const submitFeedback = useCallback<PortalValue["submitFeedback"]>(
    async (input) => {
      if (sample) {
        setFeedback((prev) => [
          {
            id: sampleId(),
            visitId: input.visitId,
            satisfaction: input.satisfaction,
            revisitIntent: input.revisitIntent,
            note: input.note?.trim() || undefined,
            homecareInterest: input.homecareInterest,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        return;
      }
      const sb = sbRef.current;
      if (!sb || !customer) return;
      const { data, error: e } = await sb
        .from("customer_feedback")
        .insert({
          customer_id: customer.id,
          branch_id: customer.branchId,
          visit_id: input.visitId ?? null,
          satisfaction: input.satisfaction,
          revisit_intent: input.revisitIntent,
          note: input.note?.trim() || null,
          homecare_interest: input.homecareInterest ?? null,
        })
        .select()
        .single();
      if (e) throw new Error(humanError(e));
      setFeedback((prev) => [
        {
          id: data.id,
          visitId: data.visit_id ?? undefined,
          satisfaction: data.satisfaction ?? undefined,
          revisitIntent: data.revisit_intent ?? undefined,
          note: data.note ?? undefined,
          homecareInterest: data.homecare_interest ?? undefined,
          createdAt: data.created_at,
        },
        ...prev,
      ]);
    },
    [customer, sample],
  );

  const submitRequest = useCallback<PortalValue["submitRequest"]>(
    async (input) => {
      if (sample) {
        setRequests((prev) => [
          {
            id: sampleId(),
            kind: input.kind,
            preferredDate: input.preferredDate,
            preferredSlot: input.preferredSlot,
            note: input.note?.trim() || undefined,
            status: "open",
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        return;
      }
      const sb = sbRef.current;
      if (!sb || !customer) return;
      const { data, error: e } = await sb
        .from("customer_requests")
        .insert({
          customer_id: customer.id,
          branch_id: customer.branchId,
          kind: input.kind,
          preferred_date: input.preferredDate ?? null,
          preferred_slot: input.preferredSlot ?? null,
          note: input.note?.trim() || null,
          status: "open",
        })
        .select()
        .single();
      if (e) throw new Error(humanError(e));
      setRequests((prev) => [
        {
          id: data.id,
          kind: data.kind,
          preferredDate: data.preferred_date ?? undefined,
          preferredSlot: data.preferred_slot ?? undefined,
          note: data.note ?? undefined,
          status: data.status,
          createdAt: data.created_at,
        },
        ...prev,
      ]);
    },
    [customer, sample],
  );

  /**
   * 콘텐츠를 열어 본 기록.
   *
   * 화면을 막지 않는다 — 실패해도 글은 이미 펼쳐져 있고, 이 기록이
   * 남지 않았다고 고객에게 알릴 일도 아니다. 추천 순서가 조금 덜
   * 맞춰질 뿐이다.
   */
  const logContentOpen = useCallback(
    (contentId: string) => {
      if (sample) {
        setContentOpens((n) => n + 1);
        return;
      }
      const sb = sbRef.current;
      if (!sb || !customer) return;
      setContentOpens((n) => n + 1);
      void sb
        .from("customer_content_interactions")
        .insert({
          customer_id: customer.id,
          branch_id: customer.branchId,
          content_id: contentId,
          action: "open",
        })
        .then(() => undefined);
    },
    [customer, sample],
  );

  const value = useMemo<PortalValue>(
    () => ({
      phase,
      configured: supabaseConfigured,
      sample,
      enterSample,
      error,
      email,
      customer,
      branch,
      visits,
      memberships,
      products,
      profile,
      feedback,
      requests,
      contentOpens,
      sendCode,
      verifyCode,
      redeemLinkCode,
      signOut,
      refresh,
      saveProfile,
      submitFeedback,
      submitRequest,
      logContentOpen,
    }),
    [
      phase,
      sample,
      enterSample,
      error,
      email,
      customer,
      branch,
      visits,
      memberships,
      products,
      profile,
      feedback,
      requests,
      contentOpens,
      sendCode,
      verifyCode,
      redeemLinkCode,
      signOut,
      refresh,
      saveProfile,
      submitFeedback,
      submitRequest,
      logContentOpen,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePortal(): PortalValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePortal 은 PortalProvider 안에서만 쓸 수 있습니다.");
  return v;
}
