import { describe, expect, it } from "vitest";
import type { BriefingTask, Membership, Visit } from "@/lib/types";
import type { CustomerFeedbackRow, CustomerRequestRow } from "@/lib/supabase/sync";
import { daysFromToday, todayISO } from "@/lib/utils/date";
import { computeCoverage, hasRealOutcome, type CoverageInput } from "./coverage";
import { buildCandidates, selectMissions } from "./missions";
import { snapshotFor, verifyMission } from "./verify";
import { buildReport, trendVsDaysAgo } from "./report";
import type { CoachMissionLog } from "./types";

/**
 * AX Coach 는 "실제로 쓰고 있는가" 를 말하는 화면이라, 여기서 숫자가
 * 한 번이라도 지어내지면 제품 전체의 정직성이 무너진다. 그래서 이
 * 테스트가 지키는 것은 기능보다 **정직성**이다.
 *
 *   · 잴 수 없으면 0 이 아니라 null (아직 측정 전)
 *   · 실제 대상이 없는 Mission 은 절대 발행되지 않는다
 *   · 사람이 누르는 것으로는 어떤 Mission 도 완료되지 않는다
 */

const visit = (patch: Partial<Visit> = {}): Visit => ({
  id: `v-${Math.random().toString(36).slice(2, 8)}`,
  branchId: "b1",
  customerId: "c1",
  visitedAt: `${todayISO()}T10:00:00`,
  type: "visit",
  bodyParts: [],
  ...patch,
});

const task = (patch: Partial<BriefingTask> = {}): BriefingTask => ({
  id: `t-${Math.random().toString(36).slice(2, 8)}`,
  branchId: "b1",
  customerId: "c1",
  date: todayISO(),
  category: "revisit_due",
  priorityScore: 40,
  reason: "테스트",
  suggestedAction: "테스트",
  status: "pending",
  ...patch,
});

const membership = (patch: Partial<Membership> = {}): Membership => ({
  id: "m1",
  branchId: "b1",
  customerId: "c1",
  programName: "쑥뜸 10회권",
  totalCount: 10,
  remainingCount: 10,
  purchasedAt: daysFromToday(-30),
  price: 400000,
  status: "active",
  ...patch,
});

const request = (patch: Partial<CustomerRequestRow> = {}): CustomerRequestRow => ({
  id: `r-${Math.random().toString(36).slice(2, 8)}`,
  customerId: "c1",
  kind: "booking",
  status: "open",
  createdAt: new Date().toISOString(),
  ...patch,
});

const base = (patch: Partial<CoverageInput> = {}): CoverageInput => ({
  visits: [],
  taskOverrides: [],
  pendingTasks: [],
  memberships: [],
  customerCount: 12,
  portalLinked: false,
  requests: [],
  feedback: [] as CustomerFeedbackRow[],
  ...patch,
});

const areaOf = (input: CoverageInput, area: string) =>
  computeCoverage(input).areas.find((a) => a.area === area)!;

const missionInput = (input: CoverageInput) => ({
  coverage: computeCoverage(input),
  pendingTasks: input.pendingTasks,
  taskOverrides: input.taskOverrides,
  customers: [],
  customerCount: input.customerCount,
  portalLinked: input.portalLinked,
  requests: input.requests,
  nameOf: (id: string) => `고객${id}`,
});

/* ══════════ 실증 준비도 ══════════ */

describe("실증 준비도 — 잴 수 없으면 0 이 아니라 '아직 측정 전'", () => {
  it("① 방문기록 0건 — 명부가 있으면 0% (쟀는데 없다)", () => {
    const a = areaOf(base(), "record");
    expect(a.percent).toBe(0);
    expect(a.detail).toContain("목표 20건");
  });

  it("명부 자체가 비어 있으면 방문 기록은 측정 전", () => {
    const a = areaOf(base({ customerCount: 0 }), "record");
    expect(a.percent).toBeNull();
    expect(a.unmeasurableReason).toBeTruthy();
  });

  it("② 방문 1건이 생기면 0% 를 넘는다", () => {
    const a = areaOf(base({ visits: [visit()] }), "record");
    expect(a.percent).toBeGreaterThan(0);
    expect(a.detail).toContain("최근 4주 1건");
  });

  it("28일보다 오래된 방문은 최근 창에 들어오지 않는다", () => {
    const a = areaOf(
      base({ visits: [visit({ visitedAt: `${daysFromToday(-60)}T10:00:00` })] }),
      "record",
    );
    expect(a.percent).toBe(0);
  });

  it("③ pending 만 있으면 고객관리 실행은 0% — 추천을 본 것은 실행이 아니다", () => {
    const t = task();
    const a = areaOf(base({ pendingTasks: [t], taskOverrides: [t] }), "action");
    expect(a.percent).toBe(0);
  });

  it("관리 대상으로 올라온 적이 없으면 고객관리 실행은 측정 전", () => {
    expect(areaOf(base(), "action").percent).toBeNull();
  });

  it("④ done 이 생기면 고객관리 실행이 올라간다", () => {
    const t = task({
      status: "done",
      statusChangedAt: new Date().toISOString(),
      outcome: { contactResult: "contacted", revisitPlanned: false, note: "통화함" },
    });
    expect(areaOf(base({ taskOverrides: [t] }), "action").percent).toBeGreaterThan(0);
  });

  it("⑤ hold 도 실행으로 센다 (판단하고 미룬 것도 행동이다)", () => {
    const t = task({ status: "hold", statusChangedAt: new Date().toISOString() });
    const c = computeCoverage(base({ taskOverrides: [t] })).counts;
    expect(c.actions28).toBe(1);
  });

  it("⑥ 이 시스템에는 skipped 상태가 없다 — pending/confirmed/done/hold 뿐", () => {
    const c = computeCoverage(
      base({ taskOverrides: [task({ status: "confirmed", statusChangedAt: new Date().toISOString() })] }),
    ).counts;
    // confirmed 는 과거 호환용이며 pending 과 같게 취급 — 실행으로 세지 않는다
    expect(c.actions28).toBe(0);
  });

  it("⑦ 결과가 비어 있으면 결과 남김으로 세지 않는다", () => {
    const thin = task({
      status: "done",
      statusChangedAt: new Date().toISOString(),
      outcome: { contactResult: "contacted", revisitPlanned: false },
    });
    expect(hasRealOutcome(thin)).toBe(false);
    const filled = task({
      status: "done",
      statusChangedAt: new Date().toISOString(),
      outcome: { contactResult: "contacted", revisitPlanned: true, nextManageDate: daysFromToday(7) },
    });
    expect(hasRealOutcome(filled)).toBe(true);
  });

  it("⑧ 처리 후 30일 안에 재방문이 있으면 결과로 센다", () => {
    const t = task({
      customerId: "c1",
      status: "done",
      statusChangedAt: `${daysFromToday(-20)}T10:00:00.000Z`,
    });
    const v = visit({ customerId: "c1", visitedAt: `${daysFromToday(-5)}T10:00:00` });
    const c = computeCoverage(base({ taskOverrides: [t], visits: [v] })).counts;
    expect(c.results).toBe(1);
  });

  it("⑨ 처리 후 재방문이 없으면 결과 0 — 만들지 않는다", () => {
    const t = task({
      status: "done",
      statusChangedAt: `${daysFromToday(-20)}T10:00:00.000Z`,
    });
    const c = computeCoverage(base({ taskOverrides: [t] })).counts;
    expect(c.results).toBe(0);
    expect(areaOf(base({ taskOverrides: [t] }), "result").percent).toBe(0);
  });

  it("30일이 지난 뒤의 방문은 결과로 잇지 않는다", () => {
    const t = task({
      status: "done",
      statusChangedAt: `${daysFromToday(-60)}T10:00:00.000Z`,
    });
    const v = visit({ visitedAt: `${daysFromToday(-5)}T10:00:00` });
    expect(computeCoverage(base({ taskOverrides: [t], visits: [v] })).counts.results).toBe(0);
  });

  it("처리한 적이 없으면 재방문 결과는 측정 전 — 안 챙긴 방문을 성과로 세지 않는다", () => {
    const a = areaOf(base({ visits: [visit(), visit()] }), "result");
    expect(a.percent).toBeNull();
  });

  it("⑯ 고객 화면이 연결되기 전에는 고객 직접사용이 측정 전 (0% 아님)", () => {
    const a = areaOf(base({ portalLinked: false }), "adoption");
    expect(a.percent).toBeNull();
    expect(a.unmeasurableReason).toContain("매장 계정");
  });

  it("⑮ 연결됐는데 기록이 없으면 0% (쟀는데 없다)", () => {
    expect(areaOf(base({ portalLinked: true }), "adoption").percent).toBe(0);
  });

  it("⑭⑮ 요청이 처리되면 고객 직접사용이 올라간다", () => {
    const open = areaOf(base({ portalLinked: true, requests: [request()] }), "adoption");
    const handled = areaOf(
      base({
        portalLinked: true,
        requests: [request({ status: "handled", handledAt: new Date().toISOString() })],
      }),
      "adoption",
    );
    expect(handled.percent!).toBeGreaterThan(open.percent!);
  });

  it("전체 준비도는 잴 수 있는 영역만 평균낸다", () => {
    // 명부만 있는 상태 — 잴 수 있는 것은 방문 기록 하나뿐이다
    const only = computeCoverage(base());
    expect(only.measurableAreas).toBe(1);
    expect(only.overall).toBe(0);

    // 처리한 과제가 생기면 실행 · 결과까지 셋이 잴 수 있게 된다
    const t = task({
      status: "done",
      statusChangedAt: new Date().toISOString(),
      outcome: { contactResult: "contacted", revisitPlanned: false, note: "통화" },
    });
    const three = computeCoverage(base({ taskOverrides: [t] }));
    expect(three.measurableAreas).toBe(3);
    expect(three.overall).toBe(
      Math.round(
        three.areas
          .filter((a) => a.percent !== null)
          .reduce((s, a) => s + a.percent!, 0) / 3,
      ),
    );
  });

  it("아무것도 잴 수 없으면 전체도 '아직 측정 전'", () => {
    const r = computeCoverage(base({ customerCount: 0 }));
    expect(r.overall).toBeNull();
    expect(r.measurableAreas).toBe(0);
  });

  it("⑩⑪⑫ 이용권 상태는 준비도를 흔들지 않는다 (Priority 엔진의 몫)", () => {
    const withMs = base({
      memberships: [
        membership(),
        membership({ id: "m2", remainingCount: 1 }),
        membership({ id: "m3", status: "exhausted", remainingCount: 0 }),
      ],
    });
    expect(computeCoverage(withMs).overall).toBe(computeCoverage(base()).overall);
  });
});

/* ══════════ Mission 선정 ══════════ */

describe("Mission — 실제 대상이 없으면 절대 띄우지 않는다", () => {
  it("⑬ 상담 후 미예약 고객이 0명이면 그 Mission 은 없다", () => {
    const types = buildCandidates(missionInput(base())).map((c) => c.type);
    expect(types).not.toContain("consult_followup");
  });

  it("상담 후 미예약 대상이 1명 있으면 이름을 불러 준다", () => {
    const t = task({ category: "consult_no_booking", customerId: "c9" });
    const cands = buildCandidates(missionInput(base({ pendingTasks: [t], taskOverrides: [t] })));
    const m = cands.find((c) => c.type === "consult_followup");
    expect(m).toBeTruthy();
    expect(m!.targetCustomerId).toBe("c9");
    expect(m!.ctaHref).toBe("/customers/c9");
  });

  it("대기 과제가 많으면 이름 대신 브리핑 목록으로 보낸다", () => {
    const many = Array.from({ length: 5 }, (_, i) =>
      task({ id: `t${i}`, customerId: `c${i}`, category: "consult_no_booking" }),
    );
    const types = buildCandidates(
      missionInput(base({ pendingTasks: many, taskOverrides: many })),
    ).map((c) => c.type);
    expect(types).toContain("briefing_action");
    expect(types).not.toContain("consult_followup");
  });

  it("같은 브리핑 과제를 가리키는 Mission 은 하나만 띄운다", () => {
    const t1 = task({ category: "consult_no_booking", customerId: "c1" });
    const t2 = task({ id: "t2", category: "membership_low", customerId: "c2" });
    const types = buildCandidates(
      missionInput(base({ pendingTasks: [t1, t2], taskOverrides: [t1, t2] })),
    ).map((c) => c.type);
    const overlap = types.filter((t) =>
      ["briefing_action", "consult_followup", "membership_care"].includes(t),
    );
    expect(overlap).toHaveLength(1);
  });

  it("고객 화면이 연결되기 전에는 고객 요청 Mission 이 없다 (검증할 길이 없다)", () => {
    const types = buildCandidates(
      missionInput(base({ portalLinked: false, requests: [request()] })),
    ).map((c) => c.type);
    expect(types).not.toContain("request_handle");
    expect(types).not.toContain("portal_invite");
  });

  it("⑭ 열린 요청이 있으면 처리 Mission 이 뜬다", () => {
    const types = buildCandidates(
      missionInput(base({ portalLinked: true, requests: [request()] })),
    ).map((c) => c.type);
    expect(types).toContain("request_handle");
  });

  it("Mission 은 최대 3개", () => {
    const t = task({ category: "consult_no_booking" });
    const thin = task({
      id: "t-thin",
      status: "done",
      statusChangedAt: new Date().toISOString(),
      outcome: { contactResult: "contacted", revisitPlanned: false },
    });
    const picked = selectMissions(
      missionInput(
        base({
          pendingTasks: [t],
          taskOverrides: [t, thin],
          portalLinked: true,
          requests: [request()],
        }),
      ),
    );
    expect(picked.length).toBeLessThanOrEqual(3);
  });

  it("모든 Mission 카드에는 갈 곳과 완료 조건이 있다", () => {
    const t = task();
    for (const c of buildCandidates(missionInput(base({ pendingTasks: [t], taskOverrides: [t] })))) {
      expect(c.ctaHref.startsWith("/")).toBe(true);
      expect(c.ctaLabel.length).toBeGreaterThan(1);
      expect(c.verifyBy).toBeTruthy();
    }
  });
});

/* ══════════ Event 검증 ══════════ */

describe("검증 — 사람이 누르는 것으로는 완료되지 않는다", () => {
  const issuedAt = `${daysFromToday(-1)}T09:00:00.000Z`;
  const log = (patch: Partial<CoachMissionLog> = {}): CoachMissionLog => ({
    id: "coach-1",
    branchId: "b1",
    type: "visit_record",
    area: "record",
    issuedAt,
    expiresAt: `${daysFromToday(-1)}T23:59:59.999Z`,
    baseline: 0,
    ...patch,
  });

  it("방문 기록 — 개수가 늘어야 완료", () => {
    const empty = { visits: [], taskOverrides: [], requests: [] };
    expect(verifyMission(log(), empty)).toBeNull();
    const one = { ...empty, visits: [visit({ id: "v9" })] };
    const r = verifyMission(log(), one);
    expect(r?.verificationType).toBe("visit_created");
    expect(r?.verificationRef).toBe("v9");
  });

  it("발행 시점에 이미 있던 방문은 완료로 치지 않는다", () => {
    const before = [visit(), visit()];
    const m = log({ baseline: snapshotFor("visit_record", undefined, {
      visits: before, taskOverrides: [], requests: [],
    }) });
    expect(m.baseline).toBe(2);
    expect(verifyMission(m, { visits: before, taskOverrides: [], requests: [] })).toBeNull();
  });

  it("브리핑 처리 — 발행 이후의 statusChangedAt 만 인정", () => {
    const m = log({ type: "briefing_action", area: "action" });
    const old = task({ status: "done", statusChangedAt: `${daysFromToday(-5)}T10:00:00.000Z` });
    expect(verifyMission(m, { visits: [], taskOverrides: [old], requests: [] })).toBeNull();

    const fresh = task({
      id: "t-fresh",
      status: "done",
      statusChangedAt: new Date().toISOString(),
    });
    const r = verifyMission(m, { visits: [], taskOverrides: [fresh], requests: [] });
    expect(r?.verificationType).toBe("task_status_changed");
    expect(r?.verificationRef).toBe("t-fresh");
  });

  it("pending 인 채로는 절대 완료되지 않는다", () => {
    const m = log({ type: "briefing_action", area: "action" });
    const pending = task({ status: "pending", statusChangedAt: new Date().toISOString() });
    expect(verifyMission(m, { visits: [], taskOverrides: [pending], requests: [] })).toBeNull();
  });

  it("결과 남기기 — 내용이 채워져야 완료", () => {
    const m = log({ type: "task_outcome", area: "action" });
    const thin = task({
      status: "done",
      statusChangedAt: new Date().toISOString(),
      outcome: { contactResult: "contacted", revisitPlanned: false },
    });
    expect(verifyMission(m, { visits: [], taskOverrides: [thin], requests: [] })).toBeNull();

    const filled = task({
      id: "t-ok",
      status: "done",
      statusChangedAt: new Date().toISOString(),
      outcome: { contactResult: "contacted", revisitPlanned: false, note: "다음 주 재확인" },
    });
    expect(
      verifyMission(m, { visits: [], taskOverrides: [filled], requests: [] })?.verificationType,
    ).toBe("task_outcome_saved");
  });

  it("이름 부른 Mission — 그 고객의 처리 또는 방문이어야 한다", () => {
    const m = log({ type: "consult_followup", area: "action", targetCustomerId: "c9", baseline: 0 });
    const other = task({ customerId: "c1", status: "done", statusChangedAt: new Date().toISOString() });
    expect(verifyMission(m, { visits: [], taskOverrides: [other], requests: [] })).toBeNull();

    const mine = task({ id: "t-c9", customerId: "c9", status: "done", statusChangedAt: new Date().toISOString() });
    expect(verifyMission(m, { visits: [], taskOverrides: [mine], requests: [] })?.verificationRef).toBe("t-c9");

    const byVisit = verifyMission(m, {
      visits: [visit({ id: "v-c9", customerId: "c9" })],
      taskOverrides: [],
      requests: [],
    });
    expect(byVisit?.verificationType).toBe("visit_created");
  });

  it("고객 요청 처리 — handledAt 이 발행 이후여야 한다", () => {
    const m = log({ type: "request_handle", area: "adoption" });
    const still = request();
    expect(verifyMission(m, { visits: [], taskOverrides: [], requests: [still] })).toBeNull();

    const done = request({ id: "r9", status: "handled", handledAt: new Date().toISOString() });
    expect(
      verifyMission(m, { visits: [], taskOverrides: [], requests: [done] })?.verificationRef,
    ).toBe("r9");
  });

  it("고객 직접사용 — 직원이 '안내했다' 로는 완료되지 않고, 고객 요청이 새로 생겨야 한다", () => {
    const m = log({ type: "portal_invite", area: "adoption" });
    const old = request({ createdAt: `${daysFromToday(-5)}T10:00:00.000Z` });
    expect(verifyMission(m, { visits: [], taskOverrides: [], requests: [old] })).toBeNull();

    const fresh = request({ id: "r-new", createdAt: new Date().toISOString() });
    expect(
      verifyMission(m, { visits: [], taskOverrides: [], requests: [fresh] })?.verificationType,
    ).toBe("request_created");
  });
});

/* ══════════ 리포트 ══════════ */

describe("7일 / 14일 리포트", () => {
  it("기간 밖의 기록은 세지 않는다", () => {
    const input = base({
      visits: [
        visit({ visitedAt: `${daysFromToday(-2)}T10:00:00` }),
        visit({ visitedAt: `${daysFromToday(-10)}T10:00:00` }),
      ],
    });
    expect(buildReport(input, [], 7).newVisits).toBe(1);
    expect(buildReport(input, [], 14).newVisits).toBe(2);
  });

  it("아무것도 없으면 없다고 적는다 — 만들지 않는다", () => {
    const r = buildReport(base(), [], 7);
    expect(r.changed.join()).toContain("아직 없습니다");
    expect(r.next.length).toBeGreaterThan(0);
  });

  it("이전 비교자료가 없으면 만들지 않는다", () => {
    expect(trendVsDaysAgo(base(), 7)).toBeNull();
  });

  it("과거 기록이 있으면 그 시점을 다시 계산할 수 있다", () => {
    const input = base({
      visits: [
        visit({ visitedAt: `${daysFromToday(-20)}T10:00:00` }),
        visit({ visitedAt: `${daysFromToday(-1)}T10:00:00` }),
      ],
    });
    const t = trendVsDaysAgo(input, 7);
    expect(t).not.toBeNull();
    // 7일 전에는 방문이 하나뿐이었으므로 지금이 낮지 않다
    expect(t!.delta).toBeGreaterThanOrEqual(0);
  });

  it("그때와 지금 잴 수 있는 영역이 다르면 비교하지 않는다", () => {
    /*
      7일 전에는 방문 기록만 잴 수 있었고, 지금은 대기 과제가 생겨
      고객관리 실행까지 잴 수 있다. 두 평균은 서로 다른 것을 잰 값이라
      빼기가 성립하지 않는다 — 화면에 "내려갔다" 고 적으면 거짓말이 된다.
    */
    const input = base({
      visits: [visit({ visitedAt: `${daysFromToday(-20)}T10:00:00` })],
      pendingTasks: [task()],
    });
    expect(trendVsDaysAgo(input, 7)).toBeNull();
  });
});
