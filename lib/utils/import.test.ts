import { describe, expect, it } from "vitest";
import { Customer } from "@/lib/types";
import {
  checkBackup,
  customerImportTemplate,
  matchHeader,
  normalizeDate,
  parseCsv,
  parseCustomerCsv,
} from "./import";

/**
 * 가져오기는 사용자의 기존 기록을 건드릴 수 있는 유일한 통로다.
 * "잘못된 파일이 조용히 반영되는 일"이 없어야 해서 경계값을 촘촘히 잡는다.
 */

const customer = (patch: Partial<Customer> = {}): Customer => ({
  id: "c-1",
  branchId: "b1",
  name: "한복순",
  phone: "01012340006",
  registeredAt: "2024-01-05",
  focusBodyParts: [],
  ...patch,
});

describe("CSV 파싱", () => {
  it("따옴표 안의 쉼표와 줄바꿈을 한 칸으로 읽는다", () => {
    const rows = parseCsv('a,"b,c","d\ne"\n1,2,3\n');
    expect(rows[0]).toEqual(["a", "b,c", "d\ne"]);
    expect(rows[1]).toEqual(["1", "2", "3"]);
  });

  it('따옴표 이스케이프("")를 한 개의 따옴표로 읽는다', () => {
    expect(parseCsv('"그는 ""안녕"" 이라 했다"')[0][0]).toBe(
      '그는 "안녕" 이라 했다',
    );
  });

  it("엑셀 BOM 과 CRLF 를 걷어낸다", () => {
    const rows = parseCsv("﻿고객명,연락처\r\n홍길동,010-1111-2222\r\n");
    expect(rows[0]).toEqual(["고객명", "연락처"]);
    expect(rows[1]).toEqual(["홍길동", "010-1111-2222"]);
  });

  it("빈 줄은 버린다", () => {
    expect(parseCsv("a,b\n\n\nc,d")).toHaveLength(2);
  });

  it("마지막 줄이 개행으로 끝나지 않아도 읽는다", () => {
    expect(parseCsv("a,b\nc,d").at(-1)).toEqual(["c", "d"]);
  });
});

describe("머리글 자동 인식", () => {
  it("내보내기가 만든 머리글을 그대로 인식한다", () => {
    expect(matchHeader("고객명")).toBe("name");
    expect(matchHeader("연락처")).toBe("phone");
    expect(matchHeader("다음관리예정일")).toBe("nextManageDate");
  });

  it("매장에서 흔히 쓰는 다른 표기도 받는다", () => {
    expect(matchHeader("이름")).toBe("name");
    expect(matchHeader("휴대폰")).toBe("phone");
    expect(matchHeader("비고")).toBe("memo");
  });

  it("공백·괄호가 붙어 있어도 인식한다", () => {
    expect(matchHeader(" 고객명 (필수) ")).toBe("name");
    expect(matchHeader("전화 번호")).toBe("phone");
    expect(matchHeader("연락처*")).toBe("phone");
  });

  it("두 열쇳말이 겹치면 더 구체적인 쪽으로 잡는다", () => {
    // '고객'(이름)이 아니라 '연락처'로 읽혀야 한다
    expect(matchHeader("고객 연락처")).toBe("phone");
    expect(matchHeader("고객명(필수)")).toBe("name");
  });

  it("가운데에만 열쇳말이 끼어 있으면 인식하지 않는다", () => {
    // '메모'가 들어 있다고 메모 열로 단정하면 엉뚱한 값이 들어간다
    expect(matchHeader("담당자메모작성일")).toBeUndefined();
    expect(matchHeader("")).toBeUndefined();
  });
});

describe("날짜 정규화", () => {
  it("여러 표기를 ISO 로 맞춘다", () => {
    expect(normalizeDate("2024-3-5")).toBe("2024-03-05");
    expect(normalizeDate("2024.03.05")).toBe("2024-03-05");
    expect(normalizeDate("2024/3/5")).toBe("2024-03-05");
    expect(normalizeDate("20240305")).toBe("2024-03-05");
  });

  it("말이 안 되는 날짜는 버린다", () => {
    expect(normalizeDate("2024-13-05")).toBeUndefined();
    expect(normalizeDate("1800-01-01")).toBeUndefined();
    expect(normalizeDate("아무말")).toBeUndefined();
    expect(normalizeDate("")).toBeUndefined();
  });
});

describe("고객 명부 가져오기 미리보기", () => {
  it("새 고객과 이미 있는 고객을 나눠 센다", () => {
    const p = parseCustomerCsv(
      [
        "고객명,연락처,성별,출생연도",
        "홍길동,010-1111-2222,여,1968",
        "한복순,010-1234-0006,여,1970",
      ].join("\n"),
      [customer()],
    );
    expect(p.fresh).toHaveLength(1);
    expect(p.fresh[0].name).toBe("홍길동");
    expect(p.fresh[0].gender).toBe("female");
    expect(p.fresh[0].birthYear).toBe(1968);
    expect(p.duplicated).toHaveLength(1);
    expect(p.duplicated[0].existingName).toBe("한복순");
  });

  it("고객명 열이 없으면 아무것도 가져오지 않고 이유를 알려 준다", () => {
    const p = parseCustomerCsv("전화,메모\n010-1111-2222,없음", []);
    expect(p.fresh).toHaveLength(0);
    expect(p.errors[0].reason).toContain("고객명");
  });

  it("이름이 빈 행과 형식이 깨진 연락처는 건너뛴다", () => {
    const p = parseCustomerCsv(
      ["고객명,연락처", ",010-1111-2222", "김영수,전화없음", "박정호,"].join("\n"),
      [],
    );
    expect(p.fresh.map((r) => r.name)).toEqual(["박정호"]);
    expect(p.errors).toHaveLength(2);
  });

  it("같은 파일 안의 연락처 중복도 잡는다", () => {
    const p = parseCustomerCsv(
      ["고객명,연락처", "홍길동,010-1111-2222", "홍길동,010-1111-2222"].join("\n"),
      [],
    );
    expect(p.fresh).toHaveLength(1);
    expect(p.errors[0].reason).toContain("중복");
  });

  it("모르는 열은 무시했다고 알려 준다", () => {
    const p = parseCustomerCsv("고객명,담당자메모작성일\n홍길동,2024", []);
    expect(p.ignored).toContain("담당자메모작성일");
    expect(p.fresh).toHaveLength(1);
  });

  it("내보내기 양식 파일을 그대로 다시 읽을 수 있다", () => {
    const p = parseCustomerCsv(customerImportTemplate(), []);
    expect(p.errors).toHaveLength(0);
    expect(p.fresh).toHaveLength(2);
    expect(p.fresh[0].registeredAt).toBe("2024-03-05");
  });
});

describe("백업 파일 검사", () => {
  const good = {
    exportedAt: "2026-08-19T00:00:00.000Z",
    customers: [customer()],
    visits: [],
    memberships: [],
    staff: [{ id: "s1", branchId: "b1", name: "최정철", role: "owner", active: true }],
    branches: [{ id: "b1", hqId: "hq", name: "본점", createdAt: "2024-01-01" }],
    settings: { ownerName: "최정철" },
  };

  it("정상 백업이면 건수를 함께 돌려준다", () => {
    const r = checkBackup(JSON.stringify(good));
    expect(r.ok).toBe(true);
    expect(r.summary?.customers).toBe(1);
    expect(r.summary?.exportedAt).toBe("2026-08-19T00:00:00.000Z");
  });

  it("JSON 이 아니면 거절한다", () => {
    expect(checkBackup("고객명,연락처").ok).toBe(false);
  });

  it("필요한 항목이 빠지면 무엇이 빠졌는지 알려 준다", () => {
    const rest: Record<string, unknown> = { ...good };
    delete rest.visits;
    const r = checkBackup(JSON.stringify(rest));
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("visits");
  });

  it("고객에 이름이나 id 가 없으면 거절한다", () => {
    const r = checkBackup(
      JSON.stringify({ ...good, customers: [{ id: "c-1" }] }),
    );
    expect(r.ok).toBe(false);
  });

  it("배열이 아닌 최상위 값은 거절한다", () => {
    expect(checkBackup("[1,2,3]").ok).toBe(false);
    expect(checkBackup("null").ok).toBe(false);
  });
});
