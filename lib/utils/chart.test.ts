import { describe, expect, it } from "vitest";
import { niceMax } from "./chart";

/**
 * 눈금 최댓값은 "50" 처럼 읽기 쉬운 수여야 한다.
 * 31 위에 31 이라고 적혀 있으면 눈금이 아니라 그냥 값의 반복이라 도움이 안 된다.
 */
describe("차트 눈금 최댓값", () => {
  it("읽기 쉬운 수로 올린다", () => {
    expect(niceMax(31)).toBe(50);
    expect(niceMax(14)).toBe(20);
    expect(niceMax(7)).toBe(10);
    expect(niceMax(3)).toBe(5);
    expect(niceMax(1)).toBe(1);
  });

  it("이미 깔끔한 수는 그대로 둔다", () => {
    expect(niceMax(10)).toBe(10);
    expect(niceMax(20)).toBe(20);
    expect(niceMax(50)).toBe(50);
    expect(niceMax(100)).toBe(100);
  });

  it("큰 금액도 자릿수에 맞춰 올린다", () => {
    expect(niceMax(2_720_000)).toBe(5_000_000);
    expect(niceMax(1_200_000)).toBe(2_000_000);
    expect(niceMax(180_000)).toBe(200_000);
  });

  it("값이 0이거나 음수여도 눈금이 깨지지 않는다", () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(-5)).toBe(1);
  });

  it("항상 원래 값 이상이다 (막대가 눈금을 넘지 않게)", () => {
    for (const v of [1, 2, 3, 6, 9, 11, 23, 47, 99, 101, 999, 1234]) {
      expect(niceMax(v)).toBeGreaterThanOrEqual(v);
    }
  });
});
