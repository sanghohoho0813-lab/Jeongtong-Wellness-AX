import { describe, expect, it } from "vitest";
import type { Customer } from "@/lib/types";
import { findLikelySame, mergeCustomerRecords } from "./merge-customers";

const cust = (id: string, over: Partial<Customer> = {}): Customer => ({
  id,
  branchId: "b",
  name: "김영희",
  phone: "",
  registeredAt: "2026-05-01",
  focusBodyParts: [],
  ...over,
});

describe("같은 고객 합치기", () => {
  it("남기는 분 칸이 기준이고, 빈 칸만 다른 분 값으로 채운다", () => {
    const m = mergeCustomerRecords(
      cust("a", { ageGroup: "60대", registeredAt: "2026-05-01" }),
      cust("b", { phone: "010-1234-5678", ageGroup: "50대", registeredAt: "2026-03-02" }),
    );
    expect(m.id).toBe("a");
    expect(m.phone).toBe("010-1234-5678");
    expect(m.ageGroup).toBe("60대");
    expect(m.registeredAt).toBe("2026-03-02");
  });

  it("둘 다 적힌 메모 · 상담 원문은 버리지 않고 이어 붙인다", () => {
    const m = mergeCustomerRecords(
      cust("a", { memo: "오후 선호", consultationNote: "허리가 뻐근" }),
      cust("b", { memo: "주차 필요", consultationNote: "허리가 뻐근" }),
    );
    expect(m.memo).toBe("오후 선호\n\n주차 필요");
    expect(m.consultationNote).toBe("허리가 뻐근");
  });

  it("케어 부위 · 케어 선호는 합치되 같은 것은 한 번만", () => {
    const m = mergeCustomerRecords(
      cust("a", {
        focusBodyParts: [{ part: "waist" }],
        preferences: [{ id: "p1", category: "temperature", note: "온도 낮게", createdAt: "" }],
      }),
      cust("b", {
        focusBodyParts: [{ part: "waist" }, { part: "knee" }],
        preferences: [
          { id: "p2", category: "temperature", note: "온도 낮게", createdAt: "" },
          { id: "p3", category: "beverage", note: "따뜻한 차", createdAt: "" },
        ],
      }),
    );
    expect(m.focusBodyParts.map((p) => p.part)).toEqual(["waist", "knee"]);
    expect(m.preferences?.map((p) => p.id)).toEqual(["p1", "p3"]);
  });

  it("같은 이름 또는 같은 번호를 같은 분 후보로 찾는다 (자기 자신 · 가린 번호 제외)", () => {
    const me = cust("a", { phone: "010-1111-2222" });
    const list = [
      me,
      cust("b"),
      cust("c", { name: "이순자", phone: "01011112222" }),
      cust("d", { name: "박말순", phone: "010-****-2222", phoneMasked: true }),
      cust("e", { name: "최옥자" }),
    ];
    expect(findLikelySame(me, list).map((c) => c.id)).toEqual(["b", "c"]);
  });
});
