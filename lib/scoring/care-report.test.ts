import { describe, expect, it } from "vitest";
import { Customer, Membership, Visit } from "@/lib/types";
import { buildCareReport } from "./care-report";

/**
 * 케어 리포트는 고객에게 직접 보여 드리는 자료다.
 * 숫자가 틀리면 상담 자리에서 바로 드러나므로 경계를 촘촘히 잡는다.
 */

const TODAY = new Date(2026, 7, 21); // 2026-08-21 (지역 시각)

/**
 * 기준일(TODAY)에서 n일 전 날짜.
 * 실제 오늘을 쓰면 달이 바뀔 때 테스트가 깨지므로 기준일에 맞춰 만든다.
 */
const ago = (days: number): string => {
  const d = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const customer = (patch: Partial<Customer> = {}): Customer => ({
  id: "c-1",
  branchId: "b1",
  name: "한복순",
  phone: "01012340006",
  registeredAt: "2026-02-21",
  focusBodyParts: [],
  ...patch,
});

const visit = (daysAgo: number, patch: Partial<Visit> = {}): Visit => ({
  id: `v-${daysAgo}`,
  branchId: "b1",
  customerId: "c-1",
  visitedAt: `${ago(daysAgo)}T10:00:00`,
  type: "visit",
  bodyParts: [],
  ...patch,
});

const membership = (patch: Partial<Membership> = {}): Membership => ({
  id: "m-1",
  branchId: "b1",
  customerId: "c-1",
  programName: "딥 릴랙스 10회권",
  totalCount: 10,
  remainingCount: 5,
  purchasedAt: ago(40),
  price: 450000,
  status: "active",
  ...patch,
});

const build = (
  c = customer(),
  visits: Visit[] = [],
  memberships: Membership[] = [],
) => buildCareReport(c, visits, memberships, 6, TODAY);

describe("케어 리포트 — 기본 집계", () => {
  it("다른 고객의 기록은 섞이지 않는다", () => {
    const r = build(customer(), [
      visit(10),
      { ...visit(5), id: "other", customerId: "c-2" },
    ]);
    expect(r.visitCount).toBe(1);
  });

  it("상담은 이용 횟수에 넣지 않고 따로 센다", () => {
    const r = build(customer(), [
      visit(30),
      visit(16),
      { ...visit(5), type: "consult" },
    ]);
    expect(r.visitCount).toBe(2);
    expect(r.consultCount).toBe(1);
  });

  it("첫 방문과 최근 방문을 짚는다", () => {
    const r = build(customer(), [visit(30), visit(2), visit(16)]);
    expect(r.firstVisitDate).toBe(ago(30));
    expect(r.lastVisitDate).toBe(ago(2));
  });

  it("평균 이용 주기는 방문 2회부터 계산한다", () => {
    expect(build(customer(), [visit(10)]).avgCycleDays).toBeUndefined();
    expect(build(customer(), [visit(28), visit(14), visit(0)]).avgCycleDays).toBe(14);
  });

  it("함께한 기간은 등록일부터 오늘까지", () => {
    const r = build(customer({ registeredAt: "2026-08-01" }));
    expect(r.daysSinceRegistered).toBe(20);
  });

  it("등록일이 미래여도 음수가 되지 않는다", () => {
    const r = build(customer({ registeredAt: "2026-09-01" }));
    expect(r.daysSinceRegistered).toBe(0);
  });
});

describe("케어 리포트 — 관리 부위", () => {
  it("많이 관리한 부위 순으로 비율을 낸다", () => {
    const r = build(customer(), [
      visit(30, { bodyParts: [{ part: "waist" }, { part: "neck_shoulder" }] }),
      visit(16, { bodyParts: [{ part: "waist" }] }),
      visit(2, { bodyParts: [{ part: "waist" }] }),
    ]);
    expect(r.parts[0].part).toBe("waist");
    expect(r.parts[0].count).toBe(3);
    expect(r.parts[0].label).toBe("허리");
    expect(r.parts[0].ratio).toBeCloseTo(0.75);
    expect(r.parts[1].part).toBe("neck_shoulder");
  });

  it("부위 기록이 없으면 빈 목록", () => {
    expect(build(customer(), [visit(10)]).parts).toEqual([]);
  });
});

describe("케어 리포트 — 이용권", () => {
  it("사용 횟수와 진행률을 낸다", () => {
    const r = build(customer(), [], [membership({ remainingCount: 3, totalCount: 10 })]);
    expect(r.memberships[0].usedCount).toBe(7);
    expect(r.memberships[0].progress).toBeCloseTo(0.7);
  });

  it("잔여 합계는 사용 중인 이용권만 센다", () => {
    const r = build(
      customer(),
      [],
      [
        membership({ id: "m1", remainingCount: 3, status: "active" }),
        membership({ id: "m2", remainingCount: 2, status: "expired" }),
        membership({ id: "m3", remainingCount: 0, status: "exhausted" }),
      ],
    );
    expect(r.remainingTotal).toBe(3);
  });

  it("최근에 산 이용권이 앞에 온다", () => {
    const r = build(
      customer(),
      [],
      [
        membership({ id: "m1", purchasedAt: ago(200), programName: "옛것" }),
        membership({ id: "m2", purchasedAt: ago(10), programName: "최근것" }),
      ],
    );
    expect(r.memberships[0].programName).toBe("최근것");
  });

  it("총 횟수가 0이어도 진행률이 깨지지 않는다", () => {
    const r = build(customer(), [], [membership({ totalCount: 0, remainingCount: 0 })]);
    expect(r.memberships[0].progress).toBe(0);
  });
});

describe("케어 리포트 — 고객에게 보여 줄 내용", () => {
  it("매번 확인하기로 고정한 요청만 담는다", () => {
    const r = build(
      customer({
        preferences: [
          { id: "p1", category: "temperature", note: "온도 낮게", createdAt: "2026-01-01", pinned: true },
          { id: "p2", category: "beverage", note: "따뜻한 차", createdAt: "2026-01-01" },
        ],
      }),
    );
    expect(r.pinnedPreferences).toHaveLength(1);
    expect(r.pinnedPreferences[0].category).toBe("온도");
  });

  it("남긴 반응은 최근 3개까지 최신순으로", () => {
    const r = build(customer(), [
      visit(50, { reaction: "첫번째" }),
      visit(40, { reaction: "두번째" }),
      visit(30, { reaction: "세번째" }),
      visit(20, { reaction: "네번째" }),
      visit(10, { reaction: "   " }), // 공백만 있는 것은 제외
    ]);
    expect(r.recentReactions.map((x) => x.note)).toEqual([
      "네번째",
      "세번째",
      "두번째",
    ]);
  });

  it("월별 흐름은 방문이 없는 달도 0으로 채운다", () => {
    const r = build(customer(), [visit(0), visit(0)]);
    expect(r.monthlyVisits).toHaveLength(6);
    expect(r.monthlyVisits.at(-1)).toEqual({ month: "2026-08", count: 2 });
    expect(r.monthlyVisits[0]).toEqual({ month: "2026-03", count: 0 });
  });
});
