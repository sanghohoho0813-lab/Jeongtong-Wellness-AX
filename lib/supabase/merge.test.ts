import { describe, expect, it } from "vitest";
import type { Customer, Membership, Visit } from "@/lib/types";
import { hasWork, makeBase, planSync, type MergeData } from "./merge";
import { toUuid } from "./ids";

const B = "11111111-1111-4111-8111-111111111111";
const C1 = "22222222-2222-4222-8222-222222222222";
const C2 = "33333333-3333-4333-8333-333333333333";
const M1 = "44444444-4444-4444-8444-444444444444";

const cust = (id: string, over: Partial<Customer> = {}): Customer => ({
  id,
  branchId: B,
  name: "고객",
  phone: "",
  registeredAt: "2026-09-01",
  focusBodyParts: [],
  ...over,
});
const visit = (id: string, customerId = C1, over: Partial<Visit> = {}): Visit => ({
  id,
  branchId: B,
  customerId,
  visitedAt: "2026-10-06T10:00:00",
  type: "visit",
  bodyParts: [],
  ...over,
});
const pass = (remainingCount: number, over: Partial<Membership> = {}): Membership => ({
  id: M1,
  branchId: B,
  customerId: C1,
  programName: "대왕쑥뜸 10회권",
  totalCount: 10,
  remainingCount,
  purchasedAt: "2026-09-01",
  price: 0,
  status: "active",
  ...over,
});
const data = (over: Partial<MergeData> = {}): MergeData => ({
  customers: [cust(C1)],
  visits: [],
  memberships: [],
  products: [],
  staff: [],
  branches: [],
  ...over,
});
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("두 기기 동기화 — 받아서 합친 뒤 올린다", () => {
  it("다른 기기가 막 적은 방문을 지우지 않고 받아 온다 (예전에 지우던 경우)", () => {
    const synced = data({ visits: [visit(uuid(1))] });
    const base = makeBase(synced);
    // 태블릿: 새 방문 하나. 서버: 폰이 적은 방문 하나
    const local = data({ visits: [visit(uuid(1)), visit(uuid(2))] });
    const server = data({ visits: [visit(uuid(1)), visit(uuid(3))] });

    const plan = planSync(local, server, base);
    expect(plan.merged.visits.map((v) => v.id).sort()).toEqual(
      [uuid(1), uuid(2), uuid(3)].sort(),
    );
    expect(plan.deletes.visits).toEqual([]);
    expect(plan.upserts.visits.map((v) => v.id)).toEqual([uuid(2)]);
    expect(plan.localChanged).toBe(true);
  });

  it("이 기기에서 지운 기록은 서버에서도 지운다", () => {
    const base = makeBase(data({ visits: [visit(uuid(1)), visit(uuid(2))] }));
    const plan = planSync(
      data({ visits: [visit(uuid(1))] }),
      data({ visits: [visit(uuid(1)), visit(uuid(2))] }),
      base,
    );
    expect(plan.deletes.visits).toEqual([uuid(2)]);
    expect(plan.merged.visits).toHaveLength(1);
  });

  it("다른 기기가 지운 기록은 이 기기에서도 빠진다", () => {
    const base = makeBase(data({ visits: [visit(uuid(1)), visit(uuid(2))] }));
    const plan = planSync(
      data({ visits: [visit(uuid(1)), visit(uuid(2))] }),
      data({ visits: [visit(uuid(1))] }),
      base,
    );
    expect(plan.merged.visits.map((v) => v.id)).toEqual([uuid(1)]);
    expect(hasWork(plan)).toBe(false);
  });

  it("다른 기기가 지웠어도 그 사이 이 기기가 고쳤으면 살려서 올린다", () => {
    const base = makeBase(data({ visits: [visit(uuid(1))] }));
    const edited = visit(uuid(1), C1, { reaction: "온도 좋아하심" });
    const plan = planSync(data({ visits: [edited] }), data(), base);
    expect(plan.merged.visits).toEqual([edited]);
    expect(plan.upserts.visits).toEqual([edited]);
  });

  it("이 기기가 지웠어도 그 사이 다른 기기가 고쳤으면 지우지 않는다", () => {
    const base = makeBase(data({ visits: [visit(uuid(1))] }));
    const edited = visit(uuid(1), C1, { reaction: "다음엔 오후" });
    const plan = planSync(data(), data({ visits: [edited] }), base);
    expect(plan.deletes.visits).toEqual([]);
    expect(plan.merged.visits).toEqual([edited]);
  });

  it("다른 기기만 고쳤으면 서버 것, 이 기기만 고쳤으면 이 기기 것", () => {
    const base = makeBase(data({ customers: [cust(C1), cust(C2)] }));
    const plan = planSync(
      data({ customers: [cust(C1, { memo: "이 기기" }), cust(C2)] }),
      data({ customers: [cust(C1), cust(C2, { memo: "다른 기기" })] }),
      base,
    );
    expect(plan.merged.customers.find((c) => c.id === C1)?.memo).toBe("이 기기");
    expect(plan.merged.customers.find((c) => c.id === C2)?.memo).toBe("다른 기기");
    expect(plan.upserts.customers.map((c) => c.id)).toEqual([C1]);
    expect(plan.conflicts).toBe(0);
  });

  it("두 기기가 같은 이용권을 각각 1회씩 쓰면 2회가 빠진다 (10 → 8)", () => {
    const base = makeBase(data({ memberships: [pass(10)] }));
    const plan = planSync(
      data({ memberships: [pass(9)] }),
      data({ memberships: [pass(9)] }),
      base,
    );
    // 두 줄이 똑같이 「9」 여도 각자 1회씩 쓴 것이다
    expect(plan.merged.memberships[0].remainingCount).toBe(8);
    expect(plan.upserts.memberships[0].remainingCount).toBe(8);

    const plan3 = planSync(
      data({ memberships: [pass(9)] }),
      data({ memberships: [pass(8)] }),
      base,
    );
    expect(plan3.merged.memberships[0].remainingCount).toBe(7);
  });

  it("차감을 더해 0회가 되면 소진으로 바뀐다", () => {
    const base = makeBase(data({ memberships: [pass(2)] }));
    const plan = planSync(
      data({ memberships: [pass(1)] }),
      data({ memberships: [pass(0, { status: "exhausted" })] }),
      base,
    );
    expect(plan.merged.memberships[0].remainingCount).toBe(0);
    expect(plan.merged.memberships[0].status).toBe("exhausted");
  });

  it("같은 고객을 둘 다 고치면 — 고객 칸은 이 기기 것, 케어 선호는 둘 다 남는다", () => {
    const base = makeBase(data());
    const pref = {
      id: uuid(9),
      category: "temperature" as const,
      note: "쑥뜸 온도 낮게",
      createdAt: "2026-10-06",
    };
    const plan = planSync(
      data({ customers: [cust(C1, { memo: "연락처 바뀜" })] }),
      data({ customers: [cust(C1, { preferences: [pref] })] }),
      base,
    );
    const c = plan.merged.customers[0];
    expect(c.memo).toBe("연락처 바뀜");
    expect(c.preferences?.map((p) => p.note)).toEqual(["쑥뜸 온도 낮게"]);
    expect(plan.deletes.preferences).toEqual([]);
  });

  it("이 기기에서 지운 케어 선호는 서버에서도 지운다", () => {
    const pref = { id: uuid(9), category: "etc" as const, note: "x", createdAt: "2026-10-06" };
    const base = makeBase(data({ customers: [cust(C1, { preferences: [pref] })] }));
    const plan = planSync(
      data({ customers: [cust(C1)] }),
      data({ customers: [cust(C1, { preferences: [pref] })] }),
      base,
    );
    expect(plan.deletes.preferences).toEqual([uuid(9)]);
  });

  it("방문이 아직 가리키는 고객은 지우지 않고 다시 살린다", () => {
    const base = makeBase(data({ customers: [cust(C1), cust(C2)] }));
    // 이 기기: C2 를 합쳐서 지웠다. 다른 기기: 그 사이 C2 에게 방문을 적었다
    const plan = planSync(
      data({ customers: [cust(C1)] }),
      data({ customers: [cust(C1), cust(C2)], visits: [visit(uuid(5), C2)] }),
      base,
    );
    expect(plan.deletes.customers).toEqual([]);
    expect(plan.merged.customers.map((c) => c.id).sort()).toEqual([C1, C2].sort());
  });

  it("예전 짧은 id 와 서버 uuid 는 같은 줄로 본다", () => {
    const local = data({ customers: [cust(C1)], visits: [visit("v-mf40a1")] });
    const base = makeBase(local);
    const server = data({ customers: [cust(C1)], visits: [visit(toUuid("v-mf40a1"))] });
    const plan = planSync(local, server, base);
    expect(plan.merged.visits).toHaveLength(1);
    expect(hasWork(plan)).toBe(false);
  });

  it("빈 칸 표기 차이(없음 · null)는 바뀐 것으로 보지 않는다", () => {
    const local = data({ customers: [cust(C1, { memo: undefined, tags: [] })] });
    const base = makeBase(local);
    const server = data({ customers: [cust(C1, { tags: undefined })] });
    expect(hasWork(planSync(local, server, base))).toBe(false);
  });

  it("바뀐 것이 없으면 아무것도 올리지 않는다", () => {
    const d = data({ visits: [visit(uuid(1))], memberships: [pass(5)] });
    const plan = planSync(d, d, makeBase(d));
    expect(hasWork(plan)).toBe(false);
    expect(plan.localChanged).toBe(false);
  });
});

/**
 * 두 기기 + 서버를 메모리에서 돌려 본다 — StaffLink.runCycle 과 같은 순서.
 * 받기 → 합치기 → 이 기기에 반영 → 바뀐 것만 올리기 → base 갱신.
 */
describe("두 기기 + 서버 모의 실행", () => {
  type Device = { data: MergeData; base: ReturnType<typeof makeBase> };
  const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

  function cycle(dev: Device, server: MergeData) {
    const plan = planSync(dev.data, clone(server), dev.base);
    dev.data = clone(plan.merged);
    for (const t of ["customers", "visits", "memberships"] as const) {
      const rows = server[t] as Array<{ id: string }>;
      for (const u of plan.upserts[t] as Array<{ id: string }>) {
        const i = rows.findIndex((r) => toUuid(r.id) === toUuid(u.id));
        if (i >= 0) rows[i] = clone(u);
        else rows.push(clone(u));
      }
      const del = new Set(plan.deletes[t]);
      (server as unknown as Record<string, unknown>)[t] = rows.filter(
        (r) => !del.has(toUuid(r.id)),
      );
    }
    dev.base = makeBase(plan.merged);
  }

  /** 방문 기록 + 이용권 1회 차감 (store.addVisit 과 같은 일) */
  function record(dev: Device, id: string) {
    dev.data.visits.push(visit(id, C1, { membershipId: M1 }));
    dev.data.memberships = dev.data.memberships.map((m) => ({
      ...m,
      remainingCount: m.remainingCount - 1,
    }));
  }

  it("태블릿과 폰이 번갈아 적어도 방문은 다 남고 이용권은 쓴 만큼만 빠진다", () => {
    const server = data({ memberships: [pass(10)] });
    const tablet: Device = { data: clone(server), base: makeBase(server) };
    const phone: Device = { data: clone(server), base: makeBase(server) };

    record(phone, uuid(101)); // 폰: 1회
    cycle(phone, server);
    record(tablet, uuid(201)); // 태블릿: 폰 것을 모른 채 1회
    record(tablet, uuid(202)); // 태블릿: 1회 더
    cycle(tablet, server); // 예전에는 여기서 폰의 방문이 지워졌다
    record(phone, uuid(102)); // 폰: 또 1회
    cycle(phone, server);
    cycle(tablet, server);

    for (const d of [server, tablet.data, phone.data]) {
      expect(d.visits.map((v) => v.id).sort()).toEqual(
        [uuid(101), uuid(102), uuid(201), uuid(202)].sort(),
      );
      expect(d.memberships[0].remainingCount).toBe(6);
    }
  });

  it("한 기기가 지운 방문은 다른 기기에서도 사라지고 이용권은 되돌아간다", () => {
    const server = data({ memberships: [pass(10)] });
    const a: Device = { data: clone(server), base: makeBase(server) };
    const b: Device = { data: clone(server), base: makeBase(server) };
    record(a, uuid(1));
    cycle(a, server);
    cycle(b, server);
    expect(b.data.visits).toHaveLength(1);

    // b 가 잘못 적은 기록을 지운다 (store.removeVisit — 1회 되돌림)
    b.data.visits = [];
    b.data.memberships[0].remainingCount += 1;
    cycle(b, server);
    cycle(a, server);
    expect(a.data.visits).toHaveLength(0);
    expect(a.data.memberships[0].remainingCount).toBe(10);
    expect(server.memberships[0].remainingCount).toBe(10);
  });
});
