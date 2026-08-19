import { describe, expect, it } from "vitest";
import {
  DEFAULT_CARE_RULES,
  DEFAULT_OPPORTUNITY_RULES,
  Customer,
  Membership,
  Visit,
} from "@/lib/types";
import { daysFromToday, todayISO } from "@/lib/utils/date";
import {
  detectSalesOpportunity,
  monthlyOpportunityResults,
  summarizeOpportunities,
} from "./opportunity";
import { CustomerFacts } from "./priority";

// ---------- 테스트 데이터 헬퍼 ----------

const customer = (patch: Partial<Customer> = {}): Customer => ({
  id: "c-t",
  branchId: "b1",
  name: "테스트고객",
  phone: "010-0000-0000",
  registeredAt: daysFromToday(-200),
  focusBodyParts: [],
  ...patch,
});

/** n일 전 방문들을 만든다 */
const visitsAgo = (...offsets: number[]): Visit[] =>
  offsets.map((d, i) => ({
    id: `v${i}`,
    branchId: "b1",
    customerId: "c-t",
    visitedAt: `${daysFromToday(-d)}T10:00:00`,
    type: "visit" as const,
    bodyParts: [],
  }));

const membership = (patch: Partial<Membership> = {}): Membership => ({
  id: "m1",
  branchId: "b1",
  customerId: "c-t",
  programName: "쑥뜸 베이직 케어 10회권",
  totalCount: 10,
  remainingCount: 10,
  purchasedAt: daysFromToday(-30),
  price: 450000,
  status: "active",
  ...patch,
});

const facts = (
  c: Customer,
  visits: Visit[],
  memberships: Membership[] = [],
): CustomerFacts => ({ customer: c, visits, memberships });

const detect = (f: CustomerFacts, lastOutcome?: Parameters<typeof detectSalesOpportunity>[2]) =>
  detectSalesOpportunity(
    f,
    DEFAULT_CARE_RULES,
    lastOutcome,
    DEFAULT_OPPORTUNITY_RULES,
  );

// ---------- 대상 자격 ----------

describe("매출기회 — 대상 자격", () => {
  it("방문 1회에 이용권도 없는 신규 고객은 대상이 아니다", () => {
    const r = detect(facts(customer(), visitsAgo(3)));
    expect(r.type).toBe("none");
  });

  it("방문 이력이 없어도 이용권 구매 이력이 있으면 대상이 된다", () => {
    const r = detect(
      facts(customer(), [], [membership({ remainingCount: 1 })]),
    );
    expect(r.type).toBe("renewal");
  });
});

// ---------- 재등록 기회 ----------

describe("매출기회 — 재등록", () => {
  it("잔여가 임박 기준 이하이면 재등록 기회", () => {
    const r = detect(
      facts(
        customer(),
        visitsAgo(5, 19, 33),
        [membership({ remainingCount: 2 })],
      ),
    );
    expect(r.type).toBe("renewal");
    expect(r.action).toBe("이용권 재등록 안내 권장");
    expect(r.reasons[0]).toContain("잔여 2회");
  });

  it("이용 흐름이 유지 중이면 high, 오래 끊겼으면 normal", () => {
    const steady = detect(
      facts(customer(), visitsAgo(3, 17), [membership({ remainingCount: 1 })]),
    );
    const cold = detect(
      facts(customer(), visitsAgo(80, 94), [membership({ remainingCount: 1 })]),
    );
    expect(steady.level).toBe("high");
    expect(cold.level).toBe("normal");
  });

  it("소진 후 사용 중인 이용권이 없고 누적 방문이 충분하면 재등록 기회", () => {
    const r = detect(
      facts(
        customer(),
        visitsAgo(6, 20, 34),
        [membership({ status: "exhausted", remainingCount: 0 })],
      ),
    );
    expect(r.type).toBe("renewal");
    expect(r.reasons.join(" ")).toContain("소진");
  });

  it("소진했어도 누적 방문이 기준 미만이면 재등록 기회로 보지 않는다", () => {
    const r = detect(
      facts(
        customer({ nextManageDate: undefined }),
        visitsAgo(6, 20),
        [membership({ status: "exhausted", remainingCount: 0 })],
      ),
    );
    expect(r.type).not.toBe("renewal");
  });

  it("소진 후 기준 기간이 지나면 재등록 기회에서 제외한다", () => {
    const r = detect(
      facts(
        customer(),
        visitsAgo(200, 214, 228),
        [
          membership({
            status: "exhausted",
            remainingCount: 0,
            purchasedAt: daysFromToday(-400),
          }),
        ],
      ),
    );
    expect(r.type).not.toBe("renewal");
  });
});

// ---------- 재방문 기회 ----------

describe("매출기회 — 재방문", () => {
  it("다음 관리 예정일이 지났으면 재방문 기회 (high)", () => {
    const r = detect(
      facts(customer({ nextManageDate: daysFromToday(-2) }), visitsAgo(16, 30)),
    );
    expect(r.type).toBe("revisit");
    expect(r.level).toBe("high");
    expect(r.reasons[0]).toContain("2일 경과");
  });

  it("평균 이용주기를 넘기면 재방문 기회", () => {
    const r = detect(facts(customer(), visitsAgo(30, 44, 58)));
    expect(r.type).toBe("revisit");
    expect(r.reasons[0]).toContain("평균 이용주기");
  });

  it("반복 이용 고객(누적 5회 이상)은 강도가 high", () => {
    const r = detect(facts(customer(), visitsAgo(30, 44, 58, 72, 86)));
    expect(r.level).toBe("high");
  });

  it("직전 처리에서 재방문 예정으로 기록됐으면 일정 확인 대상", () => {
    const r = detect(facts(customer(), visitsAgo(3, 17)), {
      contactResult: "reserved",
      revisitPlanned: true,
      nextManageDate: daysFromToday(30),
    });
    expect(r.type).toBe("revisit");
    expect(r.action).toBe("재방문 일정 확인 권장");
  });

  it("주기 안에서 정상 이용 중이면 매출기회가 아니다", () => {
    const r = detect(facts(customer(), visitsAgo(2, 16, 30)));
    expect(r.type).toBe("none");
  });
});

// ---------- 우선순위: 이용권 축이 먼저 ----------

describe("매출기회 — 판정 우선순위", () => {
  it("잔여 임박과 관리일 경과가 겹치면 재등록으로 판정한다", () => {
    const r = detect(
      facts(
        customer({ nextManageDate: daysFromToday(-3) }),
        visitsAgo(5, 19),
        [membership({ remainingCount: 1 })],
      ),
    );
    expect(r.type).toBe("renewal");
  });
});

// ---------- 근거 문구에 추정치가 없어야 한다 ----------

describe("매출기회 — 근거 표현", () => {
  it("확률·예상매출 같은 추정 표현을 만들지 않는다", () => {
    const all = [
      detect(facts(customer(), visitsAgo(5, 19), [membership({ remainingCount: 1 })])),
      detect(facts(customer({ nextManageDate: daysFromToday(-1) }), visitsAgo(16, 30))),
      detect(facts(customer(), visitsAgo(30, 44, 58))),
    ];
    for (const r of all) {
      const text = [...r.reasons, r.action].join(" ");
      expect(text).not.toMatch(/%|확률|예상 매출|전환율/);
    }
  });
});

// ---------- 집계 ----------

describe("매출기회 집계", () => {
  const base = {
    opportunity: {
      type: "renewal" as const,
      level: "high" as const,
      label: "재등록 기회",
      reasons: [],
      action: "",
    },
  };

  it("대상 · 실행 · 결과를 센다", () => {
    const s = summarizeOpportunities([
      { ...base, status: "pending" },
      {
        ...base,
        status: "done",
        outcome: {
          contactResult: "reserved",
          revisitPlanned: true,
          membershipRenewed: true,
        },
      },
    ]);
    expect(s.total).toBe(2);
    expect(s.renewal).toBe(2);
    expect(s.handled).toBe(1);
    expect(s.revisitPlanned).toBe(1);
    expect(s.renewed).toBe(1);
  });

  it("재등록 후 매출기회가 사라져도 처리 시점 스냅샷으로 성과가 남는다", () => {
    const s = summarizeOpportunities([
      {
        // 현재 판정은 없음 (재등록으로 이용권이 새로 생긴 상태)
        opportunity: {
          type: "none",
          level: "none",
          label: "해당 없음",
          reasons: [],
          action: "",
        },
        status: "done",
        outcome: {
          contactResult: "contacted",
          revisitPlanned: false,
          membershipRenewed: true,
          opportunityType: "renewal",
        },
      },
    ]);
    expect(s.total).toBe(1);
    expect(s.renewed).toBe(1);
  });

  it("실제 재방문은 처리 시각 이후 방문이 있을 때만 센다", () => {
    const tasks = [
      {
        customerId: "c-1",
        ...base,
        status: "done",
        statusChangedAt: `${daysFromToday(-10)}T10:00:00`,
        outcome: { contactResult: "contacted" as const, revisitPlanned: true },
      },
      {
        customerId: "c-2",
        ...base,
        status: "done",
        statusChangedAt: `${daysFromToday(-10)}T10:00:00`,
        outcome: { contactResult: "contacted" as const, revisitPlanned: true },
      },
    ];
    const s = summarizeOpportunities(tasks, (id) => id === "c-1");
    expect(s.actualRevisit).toBe(1);
  });

  it("확인 함수를 주지 않으면 실제 재방문은 0으로 둔다 (추정 금지)", () => {
    const s = summarizeOpportunities([{ ...base, status: "done" }]);
    expect(s.actualRevisit).toBe(0);
  });
});

describe("월별 매출기회 실행 추이", () => {
  it("처리완료된 매출기회 과제만 월별로 센다", () => {
    const month = todayISO().slice(0, 7);
    const rows = monthlyOpportunityResults(
      [
        {
          date: `${month}-05`,
          status: "done",
          outcome: {
            contactResult: "reserved",
            revisitPlanned: true,
            membershipRenewed: true,
            opportunityType: "renewal",
          },
        },
        // 매출기회가 아닌 과제는 제외
        { date: `${month}-06`, status: "done" },
        // 미처리도 제외
        {
          date: `${month}-07`,
          status: "pending",
          outcome: {
            contactResult: "contacted",
            revisitPlanned: false,
            opportunityType: "revisit",
          },
        },
      ],
      [month],
    );
    expect(rows[0].handled).toBe(1);
    expect(rows[0].revisitPlanned).toBe(1);
    expect(rows[0].renewed).toBe(1);
  });
});
