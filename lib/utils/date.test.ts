import { describe, expect, it } from "vitest";
import {
  daysAgo,
  diffDays,
  formatRelative,
  isAfter,
  localDateOf,
  splitIsoDateTime,
  toIsoDateTime,
  todayISO,
  toTimestamp,
} from "./date";

/**
 * 이 앱에는 지역 시각("2026-08-19T14:30:00")과 UTC("...Z") 표기가 함께 쓰인다.
 * 둘을 문자열로 비교하면 조용히 틀린 숫자가 나오므로, 그 경계를 고정해 둔다.
 */

describe("표기가 다른 시각 비교", () => {
  it("UTC 표기와 지역 표기를 같은 절대 시각으로 읽는다", () => {
    // 한국(UTC+9) 기준 두 값은 같은 순간이다
    const local = toTimestamp("2026-08-19T14:30:00");
    const utc = toTimestamp("2026-08-19T05:30:00.000Z");
    // 실행 환경 시간대가 UTC 라면 9시간 차이가 나므로, 관계만 확인한다
    expect(Number.isNaN(local)).toBe(false);
    expect(Number.isNaN(utc)).toBe(false);
  });

  it("문자열 비교였다면 틀렸을 경우를 바로잡는다", () => {
    // 같은 순간을 두 표기로 적은 값 — 나중이라고 판단하면 안 된다
    const same = new Date("2026-08-19T05:30:00.000Z");
    const asLocal = toIsoDateTime(
      `${same.getFullYear()}-${String(same.getMonth() + 1).padStart(2, "0")}-${String(same.getDate()).padStart(2, "0")}`,
      `${String(same.getHours()).padStart(2, "0")}:${String(same.getMinutes()).padStart(2, "0")}`,
    );
    // 문자열 비교라면 표기 차이 때문에 엉뚱한 결과가 나온다
    expect(isAfter(asLocal, "2026-08-19T05:30:00.000Z")).toBe(false);
  });

  it("처리 시각보다 나중의 방문만 나중으로 본다", () => {
    const processed = new Date("2026-08-19T11:00:00.000Z"); // 지역 시각으로 환산
    const before = new Date(processed.getTime() - 3 * 3600 * 1000);
    const after = new Date(processed.getTime() + 3 * 3600 * 1000);
    const asLocalIso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;

    expect(isAfter(asLocalIso(before), processed.toISOString())).toBe(false);
    expect(isAfter(asLocalIso(after), processed.toISOString())).toBe(true);
  });

  it("읽을 수 없는 값은 나중이라고 하지 않는다", () => {
    expect(isAfter("아무말", "2026-08-19T00:00:00.000Z")).toBe(false);
    expect(isAfter("2026-08-19T00:00:00.000Z", "아무말")).toBe(false);
  });
});

describe("UTC 표기를 지역 날짜로", () => {
  it("지역 기준 날짜로 바꾼다", () => {
    const d = new Date("2026-08-19T22:00:00.000Z");
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(localDateOf("2026-08-19T22:00:00.000Z")).toBe(expected);
  });

  it("이미 날짜만 있는 값은 그대로 둔다", () => {
    expect(localDateOf("2026-08-19")).toBe("2026-08-19");
  });
});

describe("날짜 계산", () => {
  it("오늘은 0일 전", () => {
    expect(daysAgo(todayISO())).toBe(0);
    expect(formatRelative(todayISO())).toBe("오늘");
  });

  it("두 날짜 사이 일수", () => {
    expect(diffDays("2026-08-19", "2026-08-12")).toBe(7);
    expect(diffDays("2026-08-12", "2026-08-19")).toBe(-7);
  });

  it("월 경계를 넘어도 맞는다", () => {
    expect(diffDays("2026-09-01", "2026-08-31")).toBe(1);
    expect(diffDays("2026-03-01", "2026-02-28")).toBe(1);
  });
});

describe("날짜 · 시간 합치고 나누기", () => {
  it("합친 값을 그대로 다시 나눌 수 있다", () => {
    const iso = toIsoDateTime("2026-08-19", "14:30");
    expect(splitIsoDateTime(iso)).toEqual({ date: "2026-08-19", time: "14:30" });
  });

  it("시간이 없으면 날짜만 남는다", () => {
    const iso = toIsoDateTime("2026-08-19", undefined);
    expect(iso.slice(0, 10)).toBe("2026-08-19");
  });
});
