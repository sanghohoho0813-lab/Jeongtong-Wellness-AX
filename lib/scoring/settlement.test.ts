import { describe, expect, it } from "vitest";
import type { Membership, Staff, Visit } from "@/lib/types";
import { computeSettlement, settlementCsvRows } from "./settlement";

const staff: Staff[] = [
  { id: "s1", branchId: "b", name: "원장", role: "owner", active: true },
  { id: "s2", branchId: "b", name: "실장", role: "staff", active: true },
];
const v = (id: string, at: string, over: Partial<Visit> = {}): Visit => ({
  id,
  branchId: "b",
  customerId: "c1",
  visitedAt: at,
  type: "visit",
  bodyParts: [],
  ...over,
});
const m = (id: string, purchasedAt: string, price: number): Membership => ({
  id,
  branchId: "b",
  customerId: "c2",
  programName: "대왕쑥뜸 10회권",
  totalCount: 10,
  remainingCount: 10,
  purchasedAt,
  price,
  status: "active",
});

describe("마감 정산", () => {
  const visits = [
    v("a", "2026-10-06T10:00:00", { staffId: "s1", programName: "대왕쑥뜸", membershipId: "m0" }),
    v("b", "2026-10-06T14:30:00", { staffId: "s2", programName: "대왕쑥뜸", amount: 45000 }),
    v("c", "2026-10-06T16:00:00", { staffId: "s2", type: "consult" }),
    v("d", "2026-10-05T11:00:00", { staffId: "s1", amount: 99000 }),
  ];
  const memberships = [m("m1", "2026-10-06", 450000), m("m2", "2026-10-01", 300000)];
  const s = computeSettlement("2026-10-06", visits, memberships, staff);

  it("그날 것만 센다 — 방문 · 상담 · 이용권 차감", () => {
    expect([s.visits, s.consults, s.passUses]).toEqual([2, 1, 1]);
    expect(s.records.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("받은 돈 = 현장 결제 + 그날 판 이용권, 원 단위 그대로", () => {
    expect(s.onSite).toBe(45000);
    expect(s.passSales).toBe(450000);
    expect(s.total).toBe(495000);
  });

  it("직원별 · 프로그램별로 나눈다", () => {
    expect(s.byStaff.map((l) => [l.label, l.visits, l.consults, l.amount])).toEqual([
      ["실장", 1, 1, 45000],
      ["원장", 1, 0, 0],
    ]);
    expect(s.byProgram.map((l) => [l.label, l.visits, l.passUses])).toEqual([
      ["대왕쑥뜸", 2, 1],
      ["상담", 0, 0],
    ]);
  });

  it("CSV 에 기록 · 판매 · 합계 줄이 있다", () => {
    const { rows } = settlementCsvRows(s, () => "고객", (id) => id ?? "");
    expect(rows.filter((r) => r[0] === "이용권 판매")).toHaveLength(1);
    expect(rows.find((r) => r[0] === "합계")?.at(-1)).toBe(495000);
  });
});
