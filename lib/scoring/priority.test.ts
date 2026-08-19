import { describe, expect, it } from "vitest";
import { DEFAULT_CARE_RULES, Customer, Membership, Visit } from "@/lib/types";
import { daysFromToday } from "@/lib/utils/date";
import {
  calcAvgCycleDays,
  calculateCustomerPriority,
  classifyCustomerStatus,
  generateDailyBriefing,
} from "./priority";

/**
 * Priority Score 는 AX 판단의 기준선이라 변경을 금지하고 있다.
 * 이 테스트는 규칙이 의도치 않게 바뀌는 것을 막는 안전장치다.
 */

const customer = (patch: Partial<Customer> = {}): Customer => ({
  id: "c-t",
  branchId: "b1",
  name: "테스트고객",
  phone: "010-0000-0000",
  registeredAt: daysFromToday(-200),
  focusBodyParts: [],
  ...patch,
});

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

const calc = (c: Customer, visits: Visit[], memberships: Membership[] = []) =>
  calculateCustomerPriority(
    { customer: c, visits, memberships },
    DEFAULT_CARE_RULES,
  );

describe("평균 방문주기", () => {
  it("방문이 1회뿐이면 산출하지 않는다", () => {
    expect(calcAvgCycleDays(visitsAgo(5))).toBeUndefined();
  });

  it("방문 간격의 평균을 반올림해 돌려준다", () => {
    expect(calcAvgCycleDays(visitsAgo(0, 14, 28))).toBe(14);
  });

  it("상담 기록은 주기 계산에서 제외한다", () => {
    const withConsult: Visit[] = [
      ...visitsAgo(0, 14),
      {
        id: "cs",
        branchId: "b1",
        customerId: "c-t",
        visitedAt: `${daysFromToday(-7)}T10:00:00`,
        type: "consult",
        bodyParts: [],
      },
    ];
    expect(calcAvgCycleDays(withConsult)).toBe(14);
  });
});

describe("Priority Score 규칙", () => {
  it("정상 주기 내 이용 중인 고객은 점수가 0이다", () => {
    const r = calc(customer(), visitsAgo(2, 16, 30));
    expect(r.score).toBe(0);
    expect(r.categories).toHaveLength(0);
  });

  it("다음 관리 예정일이 지나면 재방문 예정으로 잡힌다", () => {
    const r = calc(
      customer({ nextManageDate: daysFromToday(-2) }),
      visitsAgo(16, 30),
    );
    expect(r.categories).toContain("revisit_due");
    expect(r.reasons.join(" ")).toContain("2일 지남");
    expect(r.score).toBeGreaterThan(0);
  });

  it("경과일이 길수록 점수가 높아진다", () => {
    const a = calc(customer({ nextManageDate: daysFromToday(-1) }), visitsAgo(16, 30));
    const b = calc(customer({ nextManageDate: daysFromToday(-10) }), visitsAgo(16, 30));
    expect(b.score).toBeGreaterThan(a.score);
  });

  it("장기 미방문 기준을 넘으면 dormant 로 분류한다", () => {
    const r = calc(customer(), visitsAgo(60, 74));
    expect(r.categories).toContain("dormant");
  });

  it("이용권 잔여가 임박하면 membership_low 로 잡힌다", () => {
    const r = calc(customer(), visitsAgo(3, 17), [
      membership({ remainingCount: 1 }),
    ]);
    expect(r.categories).toContain("membership_low");
  });

  it("점수는 100을 넘지 않는다", () => {
    const r = calc(
      customer({ nextManageDate: daysFromToday(-90), tags: ["집중관리"] }),
      visitsAgo(...Array.from({ length: 12 }, (_, i) => 100 + i * 14)),
      [membership({ status: "exhausted", remainingCount: 0 })],
    );
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe("고객 상태 분류", () => {
  const classify = (c: Customer, visits: Visit[]) =>
    classifyCustomerStatus({ customer: c, visits, memberships: [] }, DEFAULT_CARE_RULES);

  it("등록 초기 고객은 신규", () => {
    expect(classify(customer({ registeredAt: daysFromToday(-3) }), visitsAgo(2))).toBe("new");
  });

  it("주기 내 방문 중이면 활성", () => {
    expect(classify(customer(), visitsAgo(2, 16, 30))).toBe("active");
  });

  it("주기를 크게 넘기면 관리 필요", () => {
    expect(classify(customer(), visitsAgo(25, 39, 53))).toBe("at_risk");
  });

  it("장기 미방문 기준을 넘으면 장기 미방문", () => {
    expect(classify(customer(), visitsAgo(60, 74))).toBe("dormant");
  });
});

describe("브리핑 과제 생성", () => {
  it("점수가 0인 고객은 과제를 만들지 않는다", () => {
    const tasks = generateDailyBriefing(
      [{ customer: customer(), visits: visitsAgo(2, 16, 30), memberships: [] }],
      DEFAULT_CARE_RULES,
      [],
    );
    expect(tasks).toHaveLength(0);
  });

  it("점수 내림차순으로 정렬된다", () => {
    const tasks = generateDailyBriefing(
      [
        {
          customer: customer({ id: "c-1", nextManageDate: daysFromToday(-1) }),
          visits: visitsAgo(16, 30),
          memberships: [],
        },
        {
          customer: customer({ id: "c-2", nextManageDate: daysFromToday(-20) }),
          visits: visitsAgo(40, 54),
          memberships: [],
        },
      ],
      DEFAULT_CARE_RULES,
      [],
    );
    expect(tasks.length).toBe(2);
    expect(tasks[0].priorityScore).toBeGreaterThanOrEqual(tasks[1].priorityScore);
  });

  it("저장된 처리 상태와 실행 결과를 이어받는다", () => {
    const c = customer({ nextManageDate: daysFromToday(-2) });
    const date = daysFromToday(0);
    const tasks = generateDailyBriefing(
      [{ customer: c, visits: visitsAgo(16, 30), memberships: [] }],
      DEFAULT_CARE_RULES,
      [
        {
          id: `task-${date}-${c.id}`,
          branchId: "b1",
          customerId: c.id,
          date,
          category: "revisit_due",
          priorityScore: 0,
          reason: "",
          suggestedAction: "",
          status: "done",
          holdUntil: undefined,
          outcome: { contactResult: "reserved", revisitPlanned: true },
        },
      ],
    );
    expect(tasks[0].status).toBe("done");
    expect(tasks[0].outcome?.contactResult).toBe("reserved");
  });
});
