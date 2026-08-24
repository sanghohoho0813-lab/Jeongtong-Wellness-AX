import { describe, expect, it } from "vitest";
import type { Membership, Visit } from "@/lib/types";
import {
  buildReportFacts,
  buildReportLines,
  classifyWellnessType,
  nextReference,
  summarizePasses,
  summarizeUsage,
} from "./wellness";
import { isReportTextAcceptable } from "./report-prompt";

const TODAY = "2026-08-24";

function visit(date: string, type: "visit" | "consult" = "visit"): Visit {
  return {
    id: `v-${date}-${type}`,
    branchId: "b1",
    customerId: "c1",
    visitedAt: `${date}T14:00:00`,
    type,
    bodyParts: [],
  };
}

function pass(over: Partial<Membership> = {}): Membership {
  return {
    id: "m1",
    branchId: "b1",
    customerId: "c1",
    programName: "대왕쑥뜸 10회권",
    totalCount: 10,
    remainingCount: 6,
    purchasedAt: "2026-06-01",
    price: 400000,
    status: "active",
    ...over,
  };
}

describe("이용 요약", () => {
  it("상담만 한 날은 이용 횟수로 세지 않는다", () => {
    const u = summarizeUsage(
      [visit("2026-08-01"), visit("2026-08-10", "consult"), visit("2026-08-20")],
      TODAY,
    );
    expect(u.visitCount).toBe(2);
    expect(u.lastVisitDate).toBe("2026-08-20");
  });

  it("최근 간격은 마지막 두 번 사이의 일수다", () => {
    const u = summarizeUsage(
      [visit("2026-07-01"), visit("2026-07-20"), visit("2026-08-20")],
      TODAY,
    );
    expect(u.latestGapDays).toBe(31);
  });

  it("이용이 한 번뿐이면 평균 간격이 없다", () => {
    const u = summarizeUsage([visit("2026-08-01")], TODAY);
    expect(u.avgCycleDays).toBeUndefined();
    expect(u.latestGapDays).toBeUndefined();
  });

  it("기록이 없으면 0회로 보고 날짜를 지어내지 않는다", () => {
    const u = summarizeUsage([], TODAY);
    expect(u.visitCount).toBe(0);
    expect(u.lastVisitDate).toBeUndefined();
    expect(u.daysSinceLastVisit).toBeUndefined();
  });
});

describe("다음 관리 참고일", () => {
  it("매장이 잡아 둔 날짜가 계산값보다 앞선다", () => {
    const u = summarizeUsage([visit("2026-08-01"), visit("2026-08-15")], TODAY);
    const n = nextReference(u, "2026-09-01");
    expect(n.date).toBe("2026-09-01");
    expect(n.fromStore).toBe(true);
  });

  it("매장 날짜가 없으면 마지막 이용일 + 평균 간격", () => {
    const u = summarizeUsage([visit("2026-08-01"), visit("2026-08-15")], TODAY);
    expect(u.avgCycleDays).toBe(14);
    const n = nextReference(u, undefined);
    expect(n.date).toBe("2026-08-29");
    expect(n.fromStore).toBe(false);
  });

  it("근거가 없으면 날짜를 만들지 않는다", () => {
    const n = nextReference(summarizeUsage([], TODAY), undefined);
    expect(n.date).toBeUndefined();
  });

  it("참고일 설명에 권고 표현을 쓰지 않는다", () => {
    const u = summarizeUsage([visit("2026-08-01"), visit("2026-08-15")], TODAY);
    for (const basis of [
      nextReference(u, "2026-09-01").basis,
      nextReference(u, undefined).basis,
      nextReference(summarizeUsage([], TODAY), undefined).basis,
    ]) {
      expect(basis).not.toMatch(/오셔야|하셔야|권장|추천|권해/);
    }
  });
});

describe("이용권 요약", () => {
  it("사용 중인 이용권의 잔여를 합산한다", () => {
    const s = summarizePasses([
      pass({ id: "m1", remainingCount: 3 }),
      pass({ id: "m2", remainingCount: 0, status: "exhausted" }),
    ]);
    expect(s.totalRemaining).toBe(3);
    expect(s.purchasedCount).toBe(2);
    expect(s.usedOfActive).toBe(7);
  });

  it("보유 이용권이 없으면 0", () => {
    expect(summarizePasses([]).totalRemaining).toBe(0);
  });
});

describe("Wellness Type", () => {
  const noPass = summarizePasses([]);

  it("이용 2회 미만이면 유형을 만들지 않는다", () => {
    const t = classifyWellnessType({
      usage: summarizeUsage([visit("2026-08-20")], TODAY),
      pass: noPass,
    });
    expect(t.key).toBe("accumulating");
    expect(t.label).toBe("데이터 축적 중");
  });

  it("평균 간격의 두 배를 넘기면 장기미방문형", () => {
    const u = summarizeUsage(
      [visit("2026-04-01"), visit("2026-04-21"), visit("2026-05-11")],
      TODAY,
    );
    const t = classifyWellnessType({ usage: u, pass: noPass });
    expect(t.key).toBe("dormant");
  });

  it("이용권이 2회 이하로 남으면 재등록 관심형", () => {
    const u = summarizeUsage(
      [visit("2026-07-25"), visit("2026-08-08"), visit("2026-08-22")],
      TODAY,
    );
    const t = classifyWellnessType({
      usage: u,
      pass: summarizePasses([pass({ remainingCount: 2 })]),
    });
    expect(t.key).toBe("renewal");
  });

  it("짧은 간격으로 자주 오면 집중이용형", () => {
    const u = summarizeUsage(
      [
        visit("2026-08-02"),
        visit("2026-08-09"),
        visit("2026-08-16"),
        visit("2026-08-23"),
      ],
      TODAY,
    );
    const t = classifyWellnessType({
      usage: u,
      pass: summarizePasses([pass({ remainingCount: 6 })]),
    });
    expect(t.key).toBe("intensive");
  });

  it("홈케어 관심을 표시하면 홈케어 관심형", () => {
    const u = summarizeUsage(
      [visit("2026-06-20"), visit("2026-07-14"), visit("2026-08-10")],
      TODAY,
    );
    const t = classifyWellnessType({
      usage: u,
      pass: summarizePasses([pass({ remainingCount: 6 })]),
      homecareInterest: true,
    });
    expect(t.key).toBe("homecare");
  });

  it("자기 간격을 지키며 오면 꾸준관리형", () => {
    const u = summarizeUsage(
      [visit("2026-06-20"), visit("2026-07-14"), visit("2026-08-10")],
      TODAY,
    );
    const t = classifyWellnessType({
      usage: u,
      pass: summarizePasses([pass({ remainingCount: 6 })]),
    });
    expect(t.key).toBe("steady");
  });

  it("어떤 유형이든 의료 표현을 쓰지 않는다", () => {
    const cases = [
      classifyWellnessType({ usage: summarizeUsage([], TODAY), pass: noPass }),
      classifyWellnessType({
        usage: summarizeUsage(
          [visit("2026-04-01"), visit("2026-04-21"), visit("2026-05-11")],
          TODAY,
        ),
        pass: noPass,
      }),
      classifyWellnessType({
        usage: summarizeUsage(
          [visit("2026-08-02"), visit("2026-08-09"), visit("2026-08-16")],
          TODAY,
        ),
        pass: summarizePasses([pass()]),
      }),
    ];
    for (const t of cases) {
      const text = [t.label, t.description, ...t.reasons].join(" ");
      expect(text).not.toMatch(/치료|치유|환자|질환|진단|처방|효능|증상|개선|호전/);
    }
  });
});

describe("월간 리포트", () => {
  const visits = [
    visit("2026-06-20"),
    visit("2026-07-14"),
    visit("2026-08-10"),
    visit("2026-08-22"),
  ];

  it("저장된 수치만 문장으로 옮긴다", () => {
    const f = buildReportFacts(visits, [pass({ remainingCount: 4 })], [5, 4], 3, TODAY);
    expect(f.visitsInPeriod).toBe(4);
    expect(f.remaining).toBe(4);
    expect(f.avgSatisfaction).toBe(4.5);

    const lines = buildReportLines(f);
    expect(lines[0]).toContain("총 4회");
    expect(lines.join(" ")).toContain("이용권은 4회 남아");
  });

  it("이용이 없으면 없다고 적고 숫자를 지어내지 않는다", () => {
    const f = buildReportFacts([], [], [], 3, TODAY);
    const lines = buildReportLines(f);
    expect(lines[0]).toContain("이용 기록이 없습니다");
    expect(lines.join(" ")).toContain("남아 있는 이용권이 없습니다");
  });

  it("간격 차이가 3일 이내면 '비슷하다'로 본다", () => {
    const f = buildReportFacts(
      [visit("2026-07-01"), visit("2026-07-21"), visit("2026-08-11")],
      [],
      [],
      3,
      TODAY,
    );
    expect(buildReportLines(f).join(" ")).toContain("평소와 비슷");
  });

  it("리포트 문장은 예측·확률·의료 표현을 담지 않는다", () => {
    const f = buildReportFacts(visits, [pass()], [4], 3, TODAY);
    const text = buildReportLines(f).join(" ");
    expect(text).not.toMatch(/치료|치유|효능|진단|증상|개선|예상|확률|전망|%/);
  });
});

describe("언어모델 응답 검사", () => {
  it("규칙으로 만든 문장은 통과한다", () => {
    const f = buildReportFacts(
      [visit("2026-07-01"), visit("2026-08-11")],
      [pass()],
      [4],
      3,
      TODAY,
    );
    expect(isReportTextAcceptable(buildReportLines(f).join(" "))).toBe(true);
  });

  it("의료 표현이 섞이면 버린다", () => {
    expect(
      isReportTextAcceptable("최근 3회 이용하셨고 증상이 개선되고 있습니다."),
    ).toBe(false);
  });

  it("지어낸 확률이 섞이면 버린다", () => {
    expect(
      isReportTextAcceptable("최근 3회 이용하셨습니다. 재방문 가능성은 82% 입니다."),
    ).toBe(false);
  });

  it("빈 응답은 버린다", () => {
    expect(isReportTextAcceptable("")).toBe(false);
    expect(isReportTextAcceptable("네.")).toBe(false);
  });
});
