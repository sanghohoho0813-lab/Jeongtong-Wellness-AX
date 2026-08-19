/**
 * 데이터 내보내기 — CSV / JSON
 * =============================
 * 두 가지 용도를 함께 노린다.
 *  1) 운영 성과 증빙: 고객·방문·이용권 기록을 표로 뽑아 보고 자료로 쓴다.
 *  2) Supabase 이관: 실제 DB 연동 시 현재까지 쌓인 기록을 그대로 옮긴다.
 *
 * 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM을 붙인다.
 */

import {
  BODY_PART_LABELS,
  Customer,
  Membership,
  Staff,
  Visit,
} from "@/lib/types";
import { formatPhone } from "./format";

/** CSV 한 칸 — 쉼표·따옴표·줄바꿈을 안전하게 감싼다 */
function cell(value: unknown): string {
  if (value === undefined || value === null) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(cell).join(",")];
  for (const r of rows) lines.push(r.map(cell).join(","));
  return "﻿" + lines.join("\r\n");
}

/** 브라우저에서 파일로 저장 */
export function downloadFile(
  filename: string,
  content: string,
  mime = "text/csv;charset=utf-8",
) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 즉시 해제하면 일부 브라우저에서 다운로드가 취소된다 — 잠시 뒤 정리
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const partLabel = (parts: { part: keyof typeof BODY_PART_LABELS }[]) =>
  parts.map((p) => BODY_PART_LABELS[p.part]).join(" / ");

const STATUS_LABEL: Record<string, string> = {
  active: "사용 중",
  exhausted: "소진",
  expired: "기한 만료",
};

export function customersCsv(
  customers: Customer[],
  visits: Visit[],
  memberships: Membership[],
  staff: Staff[],
): string {
  const staffName = (id?: string) =>
    staff.find((s) => s.id === id)?.name ?? "";
  return toCsv(
    [
      "고객명",
      "연락처",
      "성별",
      "출생연도",
      "등록일",
      "담당직원",
      "누적방문",
      "최근방문일",
      "다음관리예정일",
      "다음관리시간",
      "주요케어부위",
      "이용권보유",
      "이용권잔여",
      "누적구매액",
      "메모",
    ],
    customers.map((c) => {
      const vs = visits.filter(
        (v) => v.customerId === c.id && v.type === "visit",
      );
      const ms = memberships.filter((m) => m.customerId === c.id);
      const active = ms.find((m) => m.status === "active");
      const last = vs
        .map((v) => v.visitedAt.slice(0, 10))
        .sort()
        .at(-1);
      return [
        c.name,
        formatPhone(c.phone),
        c.gender === "female" ? "여성" : c.gender === "male" ? "남성" : "",
        c.birthYear ?? "",
        c.registeredAt,
        staffName(c.assignedStaffId),
        vs.length,
        last ?? "",
        c.nextManageDate ?? "",
        c.nextManageTime ?? "",
        partLabel(c.focusBodyParts),
        active?.programName ?? "",
        active ? `${active.remainingCount}/${active.totalCount}` : "",
        ms.reduce((sum, m) => sum + m.price, 0),
        c.memo ?? "",
      ];
    }),
  );
}

export function visitsCsv(
  visits: Visit[],
  customers: Customer[],
  staff: Staff[],
): string {
  const name = (id: string) =>
    customers.find((c) => c.id === id)?.name ?? "(삭제된 고객)";
  const staffName = (id?: string) =>
    staff.find((s) => s.id === id)?.name ?? "";
  return toCsv(
    [
      "일시",
      "고객명",
      "구분",
      "프로그램",
      "케어부위",
      "담당직원",
      "이용권사용",
      "현장결제액",
      "다음관리예정일",
      "고객반응",
    ],
    [...visits]
      .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))
      .map((v) => [
        v.visitedAt.slice(0, 16).replace("T", " "),
        name(v.customerId),
        v.type === "consult" ? "상담" : "방문·이용",
        v.programName ?? "",
        partLabel(v.bodyParts),
        staffName(v.staffId),
        v.membershipId ? "사용" : "",
        v.amount ?? "",
        v.nextManageDate ?? "",
        v.reaction ?? "",
      ]),
  );
}

export function membershipsCsv(
  memberships: Membership[],
  customers: Customer[],
): string {
  const name = (id: string) =>
    customers.find((c) => c.id === id)?.name ?? "(삭제된 고객)";
  return toCsv(
    [
      "고객명",
      "이용권",
      "총횟수",
      "잔여횟수",
      "사용횟수",
      "결제금액",
      "1회당금액",
      "구매일",
      "사용기한",
      "상태",
    ],
    [...memberships]
      .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt))
      .map((m) => [
        name(m.customerId),
        m.programName,
        m.totalCount,
        m.remainingCount,
        m.totalCount - m.remainingCount,
        m.price,
        m.totalCount > 0 ? Math.round(m.price / m.totalCount) : 0,
        m.purchasedAt,
        m.expiresAt ?? "",
        STATUS_LABEL[m.status] ?? m.status,
      ]),
  );
}

/** 케어 선호 · 특이사항 — 현장 응대 자산 */
export function preferencesCsv(customers: Customer[], staff: Staff[]): string {
  const staffName = (id?: string) =>
    staff.find((s) => s.id === id)?.name ?? "";
  const rows: unknown[][] = [];
  for (const c of customers) {
    for (const p of c.preferences ?? []) {
      rows.push([
        c.name,
        p.category,
        p.note,
        p.pinned ? "매번 확인" : "",
        p.createdAt.slice(0, 10),
        staffName(p.createdByStaffId),
      ]);
    }
  }
  return toCsv(
    ["고객명", "분류", "내용", "고정여부", "기록일", "기록자"],
    rows,
  );
}

/** 파일명 뒤에 붙일 날짜 */
export function stamp(today: string): string {
  return today.replace(/-/g, "");
}
