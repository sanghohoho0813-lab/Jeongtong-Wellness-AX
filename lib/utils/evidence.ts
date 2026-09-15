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
 *   COACH      AX 코치가 낸 오늘 할 일과, 그것을 충족한 실제 기록
 *              (무엇을 하자고 했고 · 실제로 무엇이 생겼는지 · 얼마 만에)
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
import type { CoachMissionLog } from "@/lib/ax-coach/types";
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

/** AX 코치 — 사람이 읽는 이름 (코드값을 그대로 내보내면 표가 읽히지 않는다) */
const COACH_AREA: Record<string, string> = {
  record: "방문·상담 기록",
  action: "고객관리 실행",
  result: "재방문 결과",
  adoption: "고객 직접사용",
};
const COACH_MISSION: Record<string, string> = {
  visit_record: "오늘 오신 고객 기록하기",
  briefing_action: "오늘 챙길 고객 연락하기",
  task_outcome: "처리 결과 남기기",
  consult_followup: "상담 후 미예약 고객 챙기기",
  membership_care: "이용권 잔여 임박 고객 확인",
  request_handle: "고객 요청 처리하기",
  portal_invite: "고객에게 MY WELLNESS 안내",
};
const COACH_VERIFY: Record<string, string> = {
  visit_created: "새 방문·상담 기록",
  task_status_changed: "브리핑 과제 처리",
  task_outcome_saved: "처리 결과 기록",
  request_handled: "고객 요청 처리",
  request_created: "고객이 남긴 요청",
};

const day = (iso?: string) => (iso ?? "").slice(0, 10);
const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);

/**
 * RESULT 를 잇는 규칙 — 처리(ACTION) 뒤 30일 안의 실제 방문.
 *
 * 이 한 줄이 이 제품에서 가장 조심스러운 판정이다. "관리했더니 왔다" 는
 * 인과가 아니라 **시간 순서**일 뿐이므로, 창(30일)과 방향(처리 뒤)을
 * 코드 한 곳에만 두고 화면에서도 "확인됨" 이라고만 적는다.
 *
 * AX Coach 의 재방문 결과 계산도 이 함수를 그대로 쓴다 — 같은 사실을
 * 두 군데서 다르게 세면 증적과 화면의 숫자가 어긋난다.
 */
export const RESULT_WINDOW_DAYS = 30;

export function findResultVisit(
  task: Pick<BriefingTask, "customerId" | "statusChangedAt" | "status">,
  visits: Visit[],
  windowDays: number = RESULT_WINDOW_DAYS,
): Visit | undefined {
  if (task.status !== "done" || !task.statusChangedAt) return undefined;
  const from = day(task.statusChangedAt);
  return visits
    .filter(
      (v) =>
        v.customerId === task.customerId &&
        v.type === "visit" &&
        day(v.visitedAt) > from &&
        daysBetween(from, day(v.visitedAt)) <= windowDays,
    )
    .sort((x, y) => x.visitedAt.localeCompare(y.visitedAt))[0];
}

/** 처리 뒤 며칠 만에 다시 왔는지 — 화면·증적 문구에 함께 적는다 */
export function daysToResult(
  task: Pick<BriefingTask, "statusChangedAt">,
  visit: Visit,
): number {
  return daysBetween(day(task.statusChangedAt), day(visit.visitedAt));
}

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
  /** AX 코치가 낸 오늘 할 일의 이력 (없으면 COACH 행은 나오지 않는다) */
  coachMissions?: CoachMissionLog[];
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
    const after = findResultVisit(t, visits);
    if (after) {
      rows.push([
        "RESULT",
        after.visitedAt.slice(0, 16).replace("T", " "),
        name(t.customerId),
        who(after.staffId),
        CATEGORY[t.category] ?? t.category,
        `처리 ${daysToResult(t, after)}일 뒤 재방문 확인 (${after.programName ?? "프로그램 미기재"})`,
        "재방문",
        provenance,
      ]);
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

  /*
    COACH — 「무엇을 하자고 했고, 실제로 무엇이 생겼는가」.

    이 유형이 다른 넷과 다른 점은 **그 자체가 실행 절차의 증거**라는
    것이다. ACTION 은 "처리했다" 를, COACH 는 "처리하자고 먼저 정해
    두었고 그것이 실제 기록으로 충족됐다" 를 보인다. 심사에서 묻는
    「운영 체계가 있는가」 에 답하는 줄이다.

    충족되지 않은 것도 숨기지 않고 그대로 적는다 — 성공만 남기면
    그 표는 증적이 아니라 홍보물이 된다.
  */
  const missions = [...(input.coachMissions ?? [])].sort((a, b) =>
    a.issuedAt.localeCompare(b.issuedAt),
  );
  for (const m of missions) {
    const gap =
      m.verifiedAt && m.verifiedAt > m.issuedAt
        ? Math.max(
            0,
            Math.round(
              (new Date(m.verifiedAt).getTime() - new Date(m.issuedAt).getTime()) /
                3_600_000,
            ),
          )
        : undefined;
    rows.push([
      "COACH",
      m.issuedAt.slice(0, 16).replace("T", " "),
      m.targetCustomerId ? name(m.targetCustomerId) : "",
      "",
      `${COACH_AREA[m.area] ?? m.area} · ${COACH_MISSION[m.type] ?? m.type}`,
      m.verifiedAt
        ? `${COACH_VERIFY[m.verificationType ?? ""] ?? "실제 기록"} 확인${
            gap !== undefined ? ` (발행 ${gap}시간 뒤)` : ""
          }`
        : "아직 충족되지 않음",
      m.verifiedAt ? "확인됨" : "미확인",
      m.verificationRef
        ? `${provenance} · 근거 ${m.verificationRef}`
        : provenance,
    ]);
  }

  return toCsv(
    ["유형", "일시", "고객", "담당", "분류", "내용", "상태 · 결과", "출처"],
    rows,
  );
}
