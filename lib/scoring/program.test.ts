import { describe, expect, it } from "vitest";
import { Membership, Visit } from "@/lib/types";
import { daysFromToday } from "@/lib/utils/date";
import { programHeadline, summarizePrograms } from "./program";

/**
 * 프로그램별 성과는 "무엇을 권할까"를 정하는 근거로 쓰인다.
 * 숫자가 조금만 틀려도 잘못된 프로그램을 밀게 되므로 경계를 고정해 둔다.
 */

const visit = (
  customerId: string,
  daysAgo: number,
  programName?: string,
  patch: Partial<Visit> = {},
): Visit => ({
  id: `v-${customerId}-${daysAgo}`,
  branchId: "b1",
  customerId,
  visitedAt: `${daysFromToday(-daysAgo)}T10:00:00`,
  type: "visit",
  programName,
  bodyParts: [],
  ...patch,
});

const membership = (
  customerId: string,
  programName: string,
  price = 450000,
): Membership => ({
  id: `m-${customerId}-${programName}`,
  branchId: "b1",
  customerId,
  programName,
  totalCount: 10,
  remainingCount: 5,
  purchasedAt: daysFromToday(-30),
  price,
  status: "active",
});

describe("프로그램별 집계", () => {
  it("프로그램이 적힌 방문만 센다", () => {
    const stats = summarizePrograms(
      [
        visit("c1", 30, "쑥뜸 베이직 케어"),
        visit("c1", 16, "쑥뜸 베이직 케어"),
        visit("c2", 20), // 프로그램 없음 — 제외
        { ...visit("c3", 10), type: "consult", programName: "쑥뜸 베이직 케어" }, // 상담 — 제외
      ],
      [],
    );
    expect(stats).toHaveLength(1);
    expect(stats[0].visitCount).toBe(2);
    expect(stats[0].customerCount).toBe(1);
  });

  it("이용 후 다시 온 고객만 재방문으로 센다", () => {
    const stats = summarizePrograms(
      [
        // c1: 프로그램 이용 후 다시 방문했다
        visit("c1", 30, "딥 릴랙스"),
        visit("c1", 16, "딥 릴랙스"),
        // c2: 이용이 마지막 방문이라 이후 기록이 없다
        visit("c2", 20, "딥 릴랙스"),
      ],
      [],
    );
    expect(stats[0].customerCount).toBe(2);
    expect(stats[0].returnedCustomers).toBe(1);
  });

  it("같은 프로그램을 두 번 이상 쓴 고객을 따로 센다", () => {
    const stats = summarizePrograms(
      [
        visit("c1", 30, "딥 릴랙스"),
        visit("c1", 16, "딥 릴랙스"),
        visit("c2", 20, "딥 릴랙스"),
      ],
      [],
    );
    expect(stats[0].repeatCustomers).toBe(1);
  });

  it("다음 방문까지의 날수는 중앙값으로 낸다", () => {
    // 간격 14, 14, 90 → 평균은 39지만 중앙값은 14다
    const stats = summarizePrograms(
      [
        visit("c1", 120, "베이직"),
        visit("c1", 106, "x"),
        visit("c2", 100, "베이직"),
        visit("c2", 86, "x"),
        visit("c3", 200, "베이직"),
        visit("c3", 110, "x"),
      ],
      [],
    );
    const basic = stats.find((s) => s.name === "베이직")!;
    expect(basic.medianReturnDays).toBe(14);
  });

  it("표기가 달라도 같은 이용권을 붙여 준다", () => {
    // 방문은 "쑥뜸 딥 릴랙스 케어", 이용권은 "딥 릴랙스 10회권"
    const stats = summarizePrograms(
      [visit("c1", 30, "쑥뜸 딥 릴랙스 케어")],
      [membership("c1", "딥 릴랙스 10회권", 450000)],
    );
    expect(stats[0].membershipCount).toBe(1);
    expect(stats[0].membershipRevenue).toBe(450000);
  });

  it("다른 프로그램의 이용권은 붙이지 않는다", () => {
    const stats = summarizePrograms(
      [visit("c1", 30, "반신 온열 케어")],
      [membership("c1", "딥 릴랙스 10회권")],
    );
    expect(stats[0].membershipCount).toBe(0);
  });

  it("현장 결제 금액을 합산한다", () => {
    const stats = summarizePrograms(
      [
        visit("c1", 30, "베이직", { amount: 50000 }),
        visit("c2", 20, "베이직", { amount: 45000 }),
      ],
      [],
    );
    expect(stats[0].onSiteRevenue).toBe(95000);
  });

  it("많이 이용된 프로그램이 앞에 온다", () => {
    const stats = summarizePrograms(
      [
        visit("c1", 30, "A"),
        visit("c2", 25, "B"),
        visit("c3", 20, "B"),
        visit("c4", 15, "B"),
      ],
      [],
    );
    expect(stats.map((s) => s.name)).toEqual(["B", "A"]);
  });

  it("기록이 없으면 빈 목록", () => {
    expect(summarizePrograms([], [])).toEqual([]);
  });
});

describe("프로그램 한 줄 요약", () => {
  const many = (name: string, customers: number, returning: number): Visit[] => {
    const out: Visit[] = [];
    for (let i = 0; i < customers; i++) {
      const id = `${name}-c${i}`;
      out.push(visit(id, 60, name));
      // 이후 방문은 프로그램을 적지 않는다 — 집계 대상이 되면 안 된다
      if (i < returning) out.push(visit(id, 30));
    }
    return out;
  };

  it("표본이 얇으면 아무 말도 하지 않는다", () => {
    const stats = summarizePrograms(many("A", 2, 2), []);
    expect(programHeadline(stats)).toBeUndefined();
  });

  it("차이가 크지 않으면 말하지 않는다", () => {
    // A 4/5(80%), B 4/5(80%) — 차이 0
    const stats = summarizePrograms([...many("A", 5, 4), ...many("B", 5, 4)], []);
    expect(programHeadline(stats)).toBeUndefined();
  });

  it("차이가 뚜렷하면 두 프로그램을 짚어 준다", () => {
    // A 5/5(100%), B 1/5(20%)
    const stats = summarizePrograms([...many("A", 5, 5), ...many("B", 5, 1)], []);
    const line = programHeadline(stats);
    expect(line).toContain("A");
    expect(line).toContain("B");
  });

  it("확률이나 예상 매출 같은 추정 표현을 만들지 않는다", () => {
    const stats = summarizePrograms([...many("A", 5, 5), ...many("B", 5, 1)], []);
    const line = programHeadline(stats) ?? "";
    expect(line).not.toMatch(/확률|예상 매출|전환율|%/);
  });

  it("이름 뒤 조사를 받침에 맞춰 붙인다", () => {
    // "케어"(받침 없음) → 는, "온열팩"(받침 있음) → 은
    const noFinal = summarizePrograms(
      [...many("딥 릴랙스 케어", 5, 5), ...many("반신 온열 케어", 5, 1)],
      [],
    );
    expect(programHeadline(noFinal)).toContain("반신 온열 케어는");

    const withFinal = summarizePrograms(
      [...many("딥 릴랙스 케어", 5, 5), ...many("온열팩", 5, 1)],
      [],
    );
    expect(programHeadline(withFinal)).toContain("온열팩은");
  });
});
