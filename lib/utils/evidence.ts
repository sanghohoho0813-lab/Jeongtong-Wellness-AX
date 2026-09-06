/**
 * 증적 내보내기 — Evidence Pack (Unified v3.0 §9)
 * ==============================================
 *
 * "로그가 있다" 와 "성과를 증명할 수 있다" 는 다르다. 심사자가 받아서
 * 바로 읽을 수 있는 한 장의 표로 만든다. 행마다 **유형**을 붙인다.
 *
 *   BASELINE   도입 전 기준선 (사람이 적은 값 — 출처를 그렇게 적는다)
 *   ACTION     실행 브리핑에서 직원이 처리한 과제 (언제 · 누가 · 왜 · 무엇을)
 *   RESULT     처리 뒤 30일 안에 같은 고객이 실제로 다시 온 기록
 *   ADOPTION   주별 활동일 수 — 실제로 매일 쓰는가
 *
 * 값을 만들지 않는다. 있는 기록을 유형별로 줄 세울 뿐이다. 출처 칸에는
 * 이 기록이 시연 자료인지 · 기기 저장인지 · 서버인지를 그대로 적는다.
 */

import type {
  AppSettings,
  BriefingTask,
  Customer,
  Staff,
  Visit,
} from "@/lib/types";
import { toCsv } from "./export";

const CATEGORY: Record<string, string> = {
  revisit_due: "재방문 예정",
  dormant: "장기 미방문",
  membership_low: "이용권 잔여 임박",
  new_followup: "신규 후속관리",
  consult_no_booking: "상담 후 미예약",
  focus_care: "집중 관리",
};
const STATUS: Record<string, string> = {
  pending: "처리 대기",
  done: "처리 완료",
  hold: "보류",
  skipped: "건너뜀",
};

const day = (iso?: string) => (iso ?? "").slice(0, 10);
const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);

/** ISO 주 키 — 같은 주의 활동을 묶는다 */
function weekKey(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  const day0 = (d.getDay() + 6) % 7; // 월=0
  d.setDate(d.getDate() - day0);
  return d.toISOString().slice(0, 10);
}

export function evidenceCsv(input: {
  tasks: BriefingTask[];
  customers: Customer[];
  staff: Staff[];
  visits: Visit[];
  settings: AppSettings;
  /** 출처 칸에 적을 말 — "DEMO · 시연 자료" 같은 단계 라벨 */
  provenance: string;
}): string {
  const { tasks, customers, staff, visits, settings, provenance } = input;
  const name = (id: string) => customers.find((c) => c.id === id)?.name ?? "(삭제된 고객)";
  const who = (id?: string) => staff.find((s) => s.id === id)?.name ?? "";

  const rows: unknown[][] = [];

  // BASELINE — 사람이 적은 값. 출처를 숨기지 않는다.
  const b = settings.baseline;
  if (b) {
    const src = `수기 기준선${b.asOf ? ` (${b.asOf})` : ""}${b.note ? ` — ${b.note}` : ""}`;
    const add = (label: string, v?: number, unit = "") =>
      v !== undefined && rows.push(["BASELINE", b.asOf ?? "", "", who(undefined), label, `${v}${unit}`, "", src]);
    add("월평균 재방문 인원", b.monthlyRevisitCustomers, "명");
    add("이용권 소진 뒤 재등록까지", b.renewalGapDays, "일");
    add("월평균 이용권 판매", b.monthlyMembershipSales, "건");
    add("고객 1명 관리 시간(주)", b.minutesPerCustomerWeek, "분");
    add("도입 전 고객 수", b.customersBefore, "명");
    add("도입 전 직원 수", b.staffBefore, "명");
  }

  // ACTION — 처리된 과제만. 대기 중인 것은 아직 행동이 아니다.
  const handled = tasks
    .filter((t) => t.status !== "pending" && t.statusChangedAt)
    .sort((a, c) => (a.statusChangedAt ?? "").localeCompare(c.statusChangedAt ?? ""));
  for (const t of handled) {
    rows.push([
      "ACTION",
      (t.statusChangedAt ?? "").slice(0, 16).replace("T", " "),
      name(t.customerId),
      who(t.handledByStaffId),
      CATEGORY[t.category] ?? t.category,
      `${t.reason} → ${t.suggestedAction}`,
      STATUS[t.status] ?? t.status,
      provenance,
    ]);

    // RESULT — 처리 뒤 30일 안의 실제 방문. 인과를 단정하지 않고 "확인됨" 만 적는다.
    if (t.status === "done") {
      const after = visits
        .filter(
          (v) =>
            v.customerId === t.customerId &&
            v.type === "visit" &&
            day(v.visitedAt) > day(t.statusChangedAt) &&
            daysBetween(day(t.statusChangedAt), day(v.visitedAt)) <= 30,
        )
        .sort((x, y) => x.visitedAt.localeCompare(y.visitedAt))[0];
      if (after) {
        rows.push([
          "RESULT",
          after.visitedAt.slice(0, 16).replace("T", " "),
          name(t.customerId),
          who(after.staffId),
          CATEGORY[t.category] ?? t.category,
          `처리 ${daysBetween(day(t.statusChangedAt), day(after.visitedAt))}일 뒤 재방문 확인 (${after.programName ?? "프로그램 미기재"})`,
          "재방문",
          provenance,
        ]);
      }
    }
  }

  // ADOPTION — 주별로 무언가 기록된 날이 며칠인가
  const activeDays = new Set<string>();
  for (const t of handled) activeDays.add(day(t.statusChangedAt));
  for (const v of visits) activeDays.add(day(v.visitedAt));
  const byWeek = new Map<string, number>();
  for (const d of activeDays) {
    if (!d) continue;
    const k = weekKey(d);
    byWeek.set(k, (byWeek.get(k) ?? 0) + 1);
  }
  for (const [week, n] of [...byWeek.entries()].sort()) {
    rows.push(["ADOPTION", week, "", "", "주간 활동일", `${n}일 기록됨`, "", provenance]);
  }

  return toCsv(
    ["유형", "일시", "고객", "담당", "분류", "내용", "상태 · 결과", "출처"],
    rows,
  );
}
