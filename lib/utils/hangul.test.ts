import { describe, expect, it } from "vitest";
import { initials, isChosungOnly, matchesQuery } from "./hangul";

describe("초성 추출", () => {
  it("한글 음절의 초성만 뽑는다", () => {
    expect(initials("홍길동")).toBe("ㅎㄱㄷ");
    expect(initials("최정철")).toBe("ㅊㅈㅊ");
    expect(initials("한복순")).toBe("ㅎㅂㅅ");
  });

  it("한글이 아닌 글자는 그대로 둔다", () => {
    expect(initials("김A수")).toBe("ㄱAㅅ");
    expect(initials("010-1234")).toBe("010-1234");
  });
});

describe("초성 입력 판정", () => {
  it("자음만 있으면 초성 입력으로 본다", () => {
    expect(isChosungOnly("ㅎㄱㄷ")).toBe(true);
    expect(isChosungOnly("ㄱ")).toBe(true);
  });

  it("완성된 글자나 빈 값은 초성 입력이 아니다", () => {
    expect(isChosungOnly("홍")).toBe(false);
    expect(isChosungOnly("ㅎ길")).toBe(false);
    expect(isChosungOnly("")).toBe(false);
  });
});

describe("고객 이름 검색", () => {
  it("이름에 포함되면 맞는다", () => {
    expect(matchesQuery("홍길동", "길")).toBe(true);
    expect(matchesQuery("홍길동", "홍길")).toBe(true);
  });

  it("초성으로도 찾는다", () => {
    expect(matchesQuery("홍길동", "ㅎㄱㄷ")).toBe(true);
    expect(matchesQuery("홍길동", "ㅎㄱ")).toBe(true);
    expect(matchesQuery("홍길동", "ㅎ")).toBe(true);
  });

  it("초성 순서가 다르면 맞지 않는다", () => {
    expect(matchesQuery("홍길동", "ㄷㄱㅎ")).toBe(false);
    expect(matchesQuery("홍길동", "ㅁㄴㅇ")).toBe(false);
  });

  it("겹자음으로 쳐도 대표 자음으로 맞춰 준다", () => {
    expect(matchesQuery("김영수", "ㄲㅇ")).toBe(true);
  });

  it("빈 검색어는 모두 통과시킨다", () => {
    expect(matchesQuery("홍길동", "  ")).toBe(true);
  });

  it("초성이 아닌 글자가 섞인 검색어는 포함 검색만 한다", () => {
    expect(matchesQuery("홍길동", "ㅎ길")).toBe(false);
  });
});
