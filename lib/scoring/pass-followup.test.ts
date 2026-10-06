import { describe, expect, it } from "vitest";
import type { Customer, Membership, Visit } from "@/lib/types";
import { describePassFollowUp, findPassFollowUps } from "./pass-followup";

const TODAY = "2026-10-06";
const cust = (id: string, over: Partial<Customer> = {}): Customer => ({
  id,
  branchId: "b",
  name: id,
  phone: "",
  registeredAt: "2026-01-01",
  focusBodyParts: [],
  ...over,
});
const pass = (id: string, customerId: string, over: Partial<Membership> = {}): Membership => ({
  id,
  branchId: "b",
  customerId,
  programName: "대왕쑥뜸 10회권",
  totalCount: 10,
  remainingCount: 5,
  purchasedAt: "2026-08-01",
  price: 0,
  status: "active",
  ...over,
});
const use = (membershipId: string, date: string): Visit => ({
  id: `v-${membershipId}-${date}`,
  branchId: "b",
  customerId: "x",
  visitedAt: `${date}T10:00:00`,
  type: "visit",
  membershipId,
  bodyParts: [],
});
const run = (c: Customer[], m: Membership[], v: Visit[] = []) =>
  findPassFollowUps(c, m, v, 2, TODAY);

describe("이용권 챙길 분", () => {
  it("기한 14일 이내 · 남은 횟수 있음 → 기한 임박, 날짜 · 남은 날 · 잔여가 문장에 있다", () => {
    const r = run([cust("a")], [pass("m", "a", { expiresAt: "2026-10-12", remainingCount: 4 })]);
    expect(r).toHaveLength(1);
    expect(r[0].kind).toBe("expiring");
    expect(describePassFollowUp(r[0])).toBe(
      "대왕쑥뜸 10회권 · 기한 10월 12일 (6일 남음) · 잔여 4회",
    );
  });

  it("기한이 15일 넘게 남았으면 올리지 않는다", () => {
    expect(run([cust("a")], [pass("m", "a", { expiresAt: "2026-10-21" })])).toEqual([]);
  });

  it("기한이 지난 지 14일 이내 · 남은 횟수 있음 → 기한 지남 (상태가 만료로 바뀌었어도)", () => {
    const r = run(
      [cust("a")],
      [pass("m", "a", { expiresAt: "2026-10-01", remainingCount: 3, status: "expired" })],
    );
    expect(r[0].kind).toBe("expired");
    expect(describePassFollowUp(r[0])).toContain("3회 남은 채");
  });

  it("다 쓰고 쓸 이용권이 없으면 → 다 쓰심 (마지막 사용 30일 이내)", () => {
    const r = run(
      [cust("a")],
      [pass("m", "a", { remainingCount: 0, status: "exhausted" })],
      [use("m", "2026-10-02")],
    );
    expect(r[0].kind).toBe("exhausted");
    expect(describePassFollowUp(r[0])).toContain("마지막 10월 2일");
  });

  it("다 썼어도 새 이용권을 이미 샀으면 올리지 않는다", () => {
    const r = run(
      [cust("a")],
      [
        pass("old", "a", { remainingCount: 0, status: "exhausted" }),
        pass("new", "a", { remainingCount: 10 }),
      ],
      [use("old", "2026-10-02")],
    );
    expect(r).toEqual([]);
  });

  it("오래전에 다 쓴 이용권은 올리지 않는다 (지어낸 기회를 만들지 않는다)", () => {
    const r = run(
      [cust("a")],
      [pass("m", "a", { remainingCount: 0, status: "exhausted" })],
      [use("m", "2026-07-01")],
    );
    expect(r).toEqual([]);
  });

  it("한 분에 한 줄 — 가장 급한 이유 하나만", () => {
    const r = run(
      [cust("a")],
      [
        pass("low", "a", { remainingCount: 1 }),
        pass("exp", "a", { remainingCount: 6, expiresAt: "2026-10-09" }),
      ],
    );
    expect(r).toHaveLength(1);
    expect(r[0].membershipId).toBe("exp");
  });

  it("최근 7일 안에 연락했으면 맨 아래로 내린다", () => {
    const r = run(
      [cust("a", { lastContactDate: "2026-10-05" }), cust("b")],
      [pass("m1", "a", { expiresAt: "2026-10-07" }), pass("m2", "b", { remainingCount: 1 })],
    );
    expect(r.map((x) => [x.customerId, x.contacted])).toEqual([
      ["b", false],
      ["a", true],
    ]);
  });
});
