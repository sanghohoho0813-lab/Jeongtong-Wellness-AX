import { describe, expect, it } from "vitest";
import { CareRuleSettings, Customer, DEFAULT_CARE_RULES, Visit } from "@/lib/types";
import { daysFromToday } from "@/lib/utils/date";
import { CustomerFacts } from "./priority";
import { countWithRules, previewRuleChange } from "./rule-preview";

/**
 * 이 미리보기는 대표가 관리 기준을 정할 때 보는 숫자다.
 * 실제 브리핑과 어긋나면 오히려 판단을 망치므로, 규칙 엔진을 그대로 쓰는지
 * (흉내 내지 않는지) 결과로 확인한다.
 */

const facts = (id: string, lastVisitDaysAgo: number, cycleDays = 14): CustomerFacts => {
  const customer: Customer = {
    id,
    branchId: "b1",
    name: id,
    phone: "010-0000-0000",
    registeredAt: daysFromToday(-300),
    focusBodyParts: [],
  };
  // 주기를 만들기 위해 일정 간격의 방문 3회를 넣는다
  const visits: Visit[] = [0, 1, 2].map((i) => ({
    id: `${id}-v${i}`,
    branchId: "b1",
    customerId: id,
    visitedAt: `${daysFromToday(-(lastVisitDaysAgo + i * cycleDays))}T10:00:00`,
    type: "visit" as const,
    bodyParts: [],
  }));
  return { customer, visits, memberships: [] };
};

const rules = (patch: Partial<CareRuleSettings> = {}): CareRuleSettings => ({
  ...DEFAULT_CARE_RULES,
  ...patch,
});

describe("기준별 대상 세기", () => {
  it("기준을 느슨하게 하면 장기 미방문 대상이 줄어든다", () => {
    const all = [facts("a", 50), facts("b", 60), facts("c", 100)];
    const tight = countWithRules(all, rules({ dormantDays: 45 }));
    const loose = countWithRules(all, rules({ dormantDays: 90 }));
    expect(loose.byCategory.dormant).toBeLessThan(tight.byCategory.dormant);
  });

  it("고객이 없으면 대상도 없다", () => {
    const r = countWithRules([], rules());
    expect(r.total).toBe(0);
    expect(r.byCategory.dormant).toBe(0);
  });

  it("분류별 합계는 전체 대상 수와 같다", () => {
    const all = [facts("a", 50), facts("b", 20), facts("c", 100)];
    const r = countWithRules(all, rules());
    const sum = Object.values(r.byCategory).reduce((a, b) => a + b, 0);
    expect(sum).toBe(r.total);
  });
});

describe("기준 변경 미리보기", () => {
  const all = [facts("a", 50), facts("b", 60), facts("c", 100), facts("d", 10)];

  it("바꾼 값이 지금과 같으면 변화 없음으로 알린다", () => {
    const p = previewRuleChange(all, rules(), rules());
    expect(p.unchanged).toBe(true);
    expect(p.totalDelta).toBe(0);
    expect(p.changed).toEqual([]);
  });

  it("달라진 분류만 돌려준다", () => {
    const p = previewRuleChange(all, rules({ dormantDays: 45 }), rules({ dormantDays: 90 }));
    expect(p.unchanged).toBe(false);
    expect(p.changed.every((r) => r.delta !== 0)).toBe(true);
    expect(p.changed.some((r) => r.category === "dormant")).toBe(true);
  });

  it("변화가 큰 분류가 앞에 온다", () => {
    const p = previewRuleChange(all, rules({ dormantDays: 45 }), rules({ dormantDays: 200 }));
    for (let i = 1; i < p.changed.length; i++) {
      expect(Math.abs(p.changed[i - 1].delta)).toBeGreaterThanOrEqual(
        Math.abs(p.changed[i].delta),
      );
    }
  });

  it("before / after 는 각 기준으로 센 값과 일치한다", () => {
    const before = rules({ dormantDays: 45 });
    const after = rules({ dormantDays: 90 });
    const p = previewRuleChange(all, before, after);
    expect(p.before).toEqual(countWithRules(all, before));
    expect(p.after).toEqual(countWithRules(all, after));
    expect(p.totalDelta).toBe(p.after.total - p.before.total);
  });

  it("미리보기는 저장된 처리 상태에 영향받지 않는다", () => {
    // 같은 기준이면 몇 번을 계산해도 같은 값이어야 한다
    const a = previewRuleChange(all, rules(), rules({ dormantDays: 90 }));
    const b = previewRuleChange(all, rules(), rules({ dormantDays: 90 }));
    expect(a.after).toEqual(b.after);
  });
});
