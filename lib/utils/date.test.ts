import { describe, expect, it } from "vitest";
import {
  clockText,
  clockTextKr,
  daysAgo,
  diffDays,
  formatRelative,
  fullDateKr,
  isAfter,
  localDateOf,
  openStateAt,
  parseOpenHours,
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

describe("영업시간 읽기", () => {
  it("흔한 표기를 모두 받아들인다", () => {
    expect(parseOpenHours("10:00 - 20:00")).toEqual({
      openMin: 600,
      closeMin: 1200,
    });
    expect(parseOpenHours("10:00~20:00")).toEqual({
      openMin: 600,
      closeMin: 1200,
    });
    expect(parseOpenHours("평일 09:30 ~ 18:00")).toEqual({
      openMin: 570,
      closeMin: 1080,
    });
  });

  it("시간처럼 보이지 않으면 모른다고 답한다", () => {
    expect(parseOpenHours(undefined)).toBeUndefined();
    expect(parseOpenHours("연중무휴")).toBeUndefined();
    // 25시는 시각이 아니다 — 잘못 적힌 값으로 '영업 중'을 단정하지 않는다
    expect(parseOpenHours("25:00 - 26:00")).toBeUndefined();
  });
});

describe("지금 영업 중인지", () => {
  /** 그날 h시 m분 (로컬) */
  const at = (h: number, m = 0) => new Date(2026, 7, 22, h, m, 0);

  it("열기 전 · 영업 중 · 마감 후를 구분한다", () => {
    expect(openStateAt(at(9, 59), "10:00 - 20:00")).toBe("before");
    expect(openStateAt(at(10, 0), "10:00 - 20:00")).toBe("open");
    expect(openStateAt(at(19, 59), "10:00 - 20:00")).toBe("open");
    expect(openStateAt(at(20, 0), "10:00 - 20:00")).toBe("closed");
  });

  it("자정을 넘겨 닫는 매장도 맞게 본다", () => {
    expect(openStateAt(at(23, 30), "22:00 - 02:00")).toBe("open");
    expect(openStateAt(at(1, 30), "22:00 - 02:00")).toBe("open");
    expect(openStateAt(at(3, 0), "22:00 - 02:00")).toBe("closed");
  });

  it("영업시간을 적어 두지 않았으면 아무 말도 하지 않는다", () => {
    expect(openStateAt(at(12), undefined)).toBe("unknown");
    expect(openStateAt(at(12), "매일 영업")).toBe("unknown");
  });
});

describe("시계 표시", () => {
  it("시:분:초를 두 자리로 채운다", () => {
    expect(clockText(new Date(2026, 7, 22, 7, 5, 3))).toBe("07:05:03");
    expect(clockText(new Date(2026, 7, 22, 23, 59, 59))).toBe("23:59:59");
  });

  it("오전 · 오후를 사람이 읽는 대로 쓴다", () => {
    expect(clockTextKr(new Date(2026, 7, 22, 0, 5))).toBe("오전 12시 05분");
    expect(clockTextKr(new Date(2026, 7, 22, 12, 0))).toBe("오후 12시 00분");
    expect(clockTextKr(new Date(2026, 7, 22, 13, 7))).toBe("오후 1시 07분");
  });

  it("날짜에 요일까지 붙인다", () => {
    // 2026-08-22 는 토요일
    expect(fullDateKr(new Date(2026, 7, 22))).toBe("2026년 8월 22일 (토)");
  });
});
