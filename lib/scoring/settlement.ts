/**
 * 마감 정산 — 하루치를 한 장으로
 * ==============================
 *
 * 저녁에 「오늘 몇 분 · 이용권 몇 회 · 받은 돈 얼마」 를 손으로 세던 일을 없앤다.
 * 받은 돈은 두 갈래다.
 *   · 현장 결제 — 방문 기록에 적은 금액
 *   · 이용권 판매 — 그날 구매일로 등록한 이용권의 결제 금액
 * 이용권으로 차감한 방문은 돈이 오가지 않았으므로 금액에 넣지 않고 횟수로만 센다.
 *
 * 결제 수단(카드 · 현금)은 앱에 적는 칸이 없어 나누지 않는다 — 없는 칸을
 * 지어내지 않는다. 저장된 금액 그대로, 반올림 없이 원 단위로 둔다.
 */

import type { Membership, Staff, Visit } from "@/lib/types";
import { localDateOf } from "@/lib/utils/date";

export interface SettlementLine {
  key: string;
  label: string;
  visits: number;
  consults: number;
  passUses: number;
  amount: number;
}

export interface Settlement {
  date: string;
  visits: number;
  consults: number;
  passUses: number;
  /** 현장 결제 합계 */
  onSite: number;
  /** 이용권 판매 합계 */
  passSales: number;
  total: number;
  byStaff: SettlementLine[];
  byProgram: SettlementLine[];
  /** 그날의 기록 — 시간 순 */
  records: Visit[];
  /** 그날 판 이용권 */
  sold: Membership[];
}

const add = (
  map: Map<string, SettlementLine>,
  key: string,
  label: string,
  v: Visit,
) => {
  const line = map.get(key) ?? { key, label, visits: 0, consults: 0, passUses: 0, amount: 0 };
  if (v.type === "consult") line.consults++;
  else line.visits++;
  if (v.membershipId) line.passUses++;
  line.amount += v.amount ?? 0;
  map.set(key, line);
};

export function computeSettlement(
  date: string,
  visits: Visit[],
  memberships: Membership[],
  staff: Staff[],
): Settlement {
  const records = visits
    .filter((v) => localDateOf(v.visitedAt) === date)
    .sort((a, b) => a.visitedAt.localeCompare(b.visitedAt));
  const sold = memberships
    .filter((m) => (m.purchasedAt ?? "").slice(0, 10) === date)
    .sort((a, b) => a.programName.localeCompare(b.programName));

  const staffName = new Map(staff.map((s) => [s.id, s.name]));
  const byStaff = new Map<string, SettlementLine>();
  const byProgram = new Map<string, SettlementLine>();
  for (const v of records) {
    const sid = v.staffId ?? "";
    add(byStaff, sid, staffName.get(sid) ?? "담당 미지정", v);
    const prog = v.type === "consult" ? "상담" : v.programName?.trim() || "프로그램 미기재";
    add(byProgram, prog, prog, v);
  }

  const onSite = records.reduce((s, v) => s + (v.amount ?? 0), 0);
  const passSales = sold.reduce((s, m) => s + (m.price ?? 0), 0);
  const order = (a: SettlementLine, b: SettlementLine) =>
    b.visits + b.consults - (a.visits + a.consults) || a.label.localeCompare(b.label);

  return {
    date,
    visits: records.filter((v) => v.type !== "consult").length,
    consults: records.filter((v) => v.type === "consult").length,
    passUses: records.filter((v) => v.membershipId).length,
    onSite,
    passSales,
    total: onSite + passSales,
    byStaff: [...byStaff.values()].sort(order),
    byProgram: [...byProgram.values()].sort(order),
    records,
    sold,
  };
}

/** 「14:05」 — 저장 표기(UTC · 현지)와 상관없이 이 기기 시각으로 */
export function clock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(11, 16);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** CSV 한 장 — 엑셀에서 바로 열린다. 이름은 화면과 같은 규칙으로 넘겨받는다 */
export function settlementCsvRows(
  s: Settlement,
  name: (customerId: string) => string,
  staffName: (id?: string) => string,
): { headers: string[]; rows: (string | number)[][] } {
  const headers = ["구분", "시각", "고객", "내용", "담당", "이용권 차감", "금액(원)"];
  const rows: (string | number)[][] = [];
  for (const v of s.records) {
    rows.push([
      v.type === "consult" ? "상담" : "방문",
      clock(v.visitedAt),
      name(v.customerId),
      v.programName ?? "",
      staffName(v.staffId),
      v.membershipId ? "1회" : "",
      v.amount ?? 0,
    ]);
  }
  for (const m of s.sold) {
    rows.push(["이용권 판매", "", name(m.customerId), m.programName, "", "", m.price ?? 0]);
  }
  rows.push([]);
  rows.push(["합계", "", "", `방문 ${s.visits} · 상담 ${s.consults}`, "", `${s.passUses}회`, s.total]);
  rows.push(["", "", "", "현장 결제", "", "", s.onSite]);
  rows.push(["", "", "", "이용권 판매", "", "", s.passSales]);
  return { headers, rows };
}

