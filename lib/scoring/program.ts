/**
 * 프로그램별 성과 집계
 * ====================
 * 프로그램 이름은 그동안 기록만 되고 아무 데서도 합쳐 보지 않았다.
 * 그래서 "어떤 프로그램이 다음 방문으로 이어지는가"를 알 수 없었고,
 * 무엇을 권할지는 감으로 정해야 했다.
 *
 * 여기서는 저장된 방문·이용권 기록만으로 그 판단 근거를 만든다.
 * 예측하거나 점수를 매기지 않는다. 센 것과 잰 것만 돌려준다.
 *
 * ── Priority Score 와의 관계 ──
 * 전혀 관여하지 않는다. 우선순위 판정은 lib/scoring/priority.ts 가 단독으로 한다.
 */

import { Membership, Visit } from "@/lib/types";
import { diffDays } from "@/lib/utils/date";
import { withParticle } from "@/lib/utils/format";

export interface ProgramStat {
  /** 프로그램 이름 (방문 기록에 적힌 그대로) */
  name: string;
  /** 이 프로그램으로 기록된 방문 수 */
  visitCount: number;
  /** 이 프로그램을 한 번이라도 이용한 고객 수 */
  customerCount: number;
  /**
   * 이 프로그램을 이용한 뒤 다시 방문한 고객 수.
   * "이 프로그램 덕분"이라는 뜻이 아니라, 이용 이후 방문 기록이 있다는 사실이다.
   */
  returnedCustomers: number;
  /**
   * 같은 프로그램을 두 번 이상 이용한 고객 수 — 다시 찾는 프로그램인지를 본다.
   */
  repeatCustomers: number;
  /**
   * 이 프로그램 이용 후 다음 방문까지 걸린 날수의 중앙값.
   * 평균 대신 중앙값을 쓴다. 한두 명의 아주 긴 공백이 전체를 왜곡하기 때문이다.
   * 이어진 방문이 없으면 undefined.
   */
  medianReturnDays?: number;
  /** 마지막으로 이 프로그램이 기록된 날 (YYYY-MM-DD) */
  lastUsedDate?: string;
  /** 이 이름으로 등록된 이용권 결제액 합계 */
  membershipRevenue: number;
  /** 이 이름으로 등록된 이용권 수 */
  membershipCount: number;
  /** 이용권 없이 현장에서 결제된 금액 합계 */
  onSiteRevenue: number;
}

/** 중앙값 — 값이 없으면 undefined */
function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * 이용권 이름을 방문 프로그램 이름과 맞춰 본다.
 *
 * 현장에서는 "쑥뜸 딥 릴랙스 케어"로 방문을 기록하고
 * 이용권은 "딥 릴랙스 10회권"으로 등록하는 식으로 표기가 갈린다.
 * 회차 표기와 공백을 걷어낸 뒤 한쪽이 다른 쪽을 품고 있으면 같은 것으로 본다.
 */
function programKey(name: string): string {
  return name
    .replace(/\d+\s*회권?/g, "")
    .replace(/[\s·・/]/g, "")
    .trim();
}

function sameProgram(a: string, b: string): boolean {
  const ka = programKey(a);
  const kb = programKey(b);
  if (!ka || !kb) return false;
  return ka === kb || ka.includes(kb) || kb.includes(ka);
}

/**
 * 프로그램별로 실제 기록을 합친다.
 *
 * @param visits      전체 방문 기록 (상담은 프로그램 이용이 아니므로 제외한다)
 * @param memberships 전체 이용권 (이름이 맞는 것끼리 매출을 붙인다)
 */
export function summarizePrograms(
  visits: Visit[],
  memberships: Membership[],
): ProgramStat[] {
  const used = visits.filter(
    (v) => v.type === "visit" && v.programName && v.programName.trim(),
  );
  if (used.length === 0) return [];

  // 고객별 방문 날짜를 미리 정렬해 둔다 (이후 방문 찾기에 반복해서 쓴다)
  const visitDatesByCustomer = new Map<string, string[]>();
  for (const v of visits) {
    if (v.type !== "visit") continue;
    const list = visitDatesByCustomer.get(v.customerId) ?? [];
    list.push(v.visitedAt);
    visitDatesByCustomer.set(v.customerId, list);
  }
  for (const list of visitDatesByCustomer.values()) list.sort();

  const byName = new Map<string, Visit[]>();
  for (const v of used) {
    const name = v.programName!.trim();
    const list = byName.get(name) ?? [];
    list.push(v);
    byName.set(name, list);
  }

  const stats: ProgramStat[] = [];
  for (const [name, rows] of byName) {
    const customers = new Set(rows.map((r) => r.customerId));

    // 같은 프로그램을 두 번 이상 이용한 고객
    const perCustomer = new Map<string, number>();
    for (const r of rows) {
      perCustomer.set(r.customerId, (perCustomer.get(r.customerId) ?? 0) + 1);
    }
    const repeatCustomers = [...perCustomer.values()].filter((n) => n > 1).length;

    // 이용 후 다시 온 고객 수와, 다음 방문까지의 날수
    const returned = new Set<string>();
    const gaps: number[] = [];
    for (const r of rows) {
      const all = visitDatesByCustomer.get(r.customerId) ?? [];
      const next = all.find((d) => d > r.visitedAt);
      if (!next) continue;
      returned.add(r.customerId);
      gaps.push(diffDays(next.slice(0, 10), r.visitedAt.slice(0, 10)));
    }

    const ms = memberships.filter((m) => sameProgram(m.programName, name));

    stats.push({
      name,
      visitCount: rows.length,
      customerCount: customers.size,
      returnedCustomers: returned.size,
      repeatCustomers,
      medianReturnDays: median(gaps),
      lastUsedDate: rows
        .map((r) => r.visitedAt.slice(0, 10))
        .sort()
        .at(-1),
      membershipRevenue: ms.reduce((sum, m) => sum + m.price, 0),
      membershipCount: ms.length,
      onSiteRevenue: rows.reduce((sum, r) => sum + (r.amount ?? 0), 0),
    });
  }

  // 많이 이용된 프로그램부터
  return stats.sort((a, b) => b.visitCount - a.visitCount);
}

/**
 * 프로그램 성과에서 읽어낼 수 있는 한 줄.
 *
 * 무엇을 팔라고 지시하지 않는다. 기록에서 눈에 띄는 사실만 짚어 준다.
 * 판단 근거가 얇으면(표본이 적으면) 아무 말도 하지 않는다.
 */
export function programHeadline(
  stats: ProgramStat[],
  minCustomers = 3,
): string | undefined {
  const solid = stats.filter((s) => s.customerCount >= minCustomers);
  if (solid.length < 2) return undefined;

  // 이용 후 다시 온 비율이 가장 높은 프로그램
  const rate = (s: ProgramStat) => s.returnedCustomers / s.customerCount;
  const best = [...solid].sort((a, b) => rate(b) - rate(a))[0];
  const worst = [...solid].sort((a, b) => rate(a) - rate(b))[0];
  if (best.name === worst.name) return undefined;

  const pct = (s: ProgramStat) => Math.round(rate(s) * 100);
  if (pct(best) - pct(worst) < 15) return undefined;

  // 프로그램 이름은 매장이 직접 입력한 말이라 조사를 맞춰 붙인다
  return `${best.name} 이용 고객은 ${best.customerCount}명 중 ${best.returnedCustomers}명이 다시 방문했고, ${withParticle(worst.name, "은는")} ${worst.customerCount}명 중 ${worst.returnedCustomers}명입니다.`;
}
