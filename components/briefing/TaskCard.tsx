"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/data/store";
import {
  BriefingTask,
  TASK_CATEGORY_LABELS,
  TASK_CONTACT_RESULT_LABELS,
  TaskCategory,
  TaskContactResult,
  TaskStatus,
} from "@/lib/types";
import { daysFromToday, formatDateKr, formatTimeKr } from "@/lib/utils/date";
import { displayPhone } from "@/lib/utils/format";
import { Badge, BadgeTone, Button, TaskStatusBadge } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { CheckIcon, ChevronRightIcon, PauseIcon } from "@/components/ui/icons";
import { DateTimeField } from "@/components/ui/DateTimeField";

/** 관리 유형별 배지 색 — 유형이 한눈에 구분되도록 */
const CATEGORY_TONES: Record<TaskCategory, BadgeTone> = {
  revisit_due: "aqua",
  dormant: "danger",
  membership_low: "gold",
  new_followup: "sky",
  consult_no_booking: "violet",
  focus_care: "warn",
};

/** 카드 좌측 컬러 스트립 — 유형을 색으로 즉시 구분 */
export const CATEGORY_STRIPS: Record<TaskCategory, string> = {
  revisit_due: "from-aqua-400 to-aqua-600",
  dormant: "from-red-300 to-danger",
  membership_low: "from-gold to-gold-deep",
  new_followup: "from-sky-400 to-sky-600",
  consult_no_booking: "from-violet-400 to-violet-600",
  focus_care: "from-amber-300 to-warn",
};

/** 랭크 뱃지 색 — 1·2·3위 구분 */
const RANK_COLORS = [
  "bg-gradient-to-br from-aqua-400 to-deep-700 text-white",
  "bg-gradient-to-br from-sky-400 to-sky-600 text-white",
  "bg-gradient-to-br from-violet-400 to-violet-600 text-white",
];

/**
 * 업무 처리 액션 — 처리완료 / 보류 두 가지로 고정.
 * ("확인"은 행동이 모호하여 제거 — 고객 확인은 '고객 상세' 링크가 담당)
 */
const NEXT_ACTIONS: Array<{ status: TaskStatus; label: string }> = [
  { status: "done", label: "처리완료" },
  { status: "hold", label: "보류" },
];

/** 우선도 링 (0~100) */
function PriorityRing({
  score,
  onDark = false,
}: {
  score: number;
  onDark?: boolean;
}) {
  const R = 15;
  const C = 2 * Math.PI * R;
  const ratio = Math.min(score, 100) / 100;
  return (
    <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center">
      <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
        <circle
          cx="18"
          cy="18"
          r={R}
          fill="none"
          stroke={onDark ? "rgba(255,255,255,0.18)" : "var(--chart-track)"}
          strokeWidth="3.5"
        />
        <circle
          cx="18"
          cy="18"
          r={R}
          fill="none"
          stroke={onDark ? "#2AB3AF" : "#149D9A"}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${ratio * C} ${C}`}
        />
      </svg>
      <span
        className={`absolute nowrap-num text-[0.7rem] font-extrabold ${onDark ? "text-white" : "text-deep-800 dark:text-aqua-700"}`}
      >
        {score}
      </span>
    </span>
  );
}

export default function TaskCard({
  task,
  rank,
  compact = false,
  variant = "light",
}: {
  task: BriefingTask;
  rank?: number;
  compact?: boolean;
  variant?: "light" | "hero";
}) {
  const { customers, staff, setTaskStatus, canSeePhone } = useStore();
  const toast = useToast();

  /** 열려 있는 입력 패널 — 처리완료 결과 / 보류 재확인일 */
  const [panel, setPanel] = useState<null | "done" | "hold">(null);
  const [contactResult, setContactResult] =
    useState<TaskContactResult>("contacted");
  const [revisitPlanned, setRevisitPlanned] = useState(true);
  const [nextDate, setNextDate] = useState("");
  const [nextTime, setNextTime] = useState<string | undefined>();
  const [note, setNote] = useState("");
  const [holdUntil, setHoldUntil] = useState(() => daysFromToday(3));

  const customer = customers.find((c) => c.id === task.customerId);
  if (!customer) return null;

  const handlerName = staff.find((s) => s.id === task.handledByStaffId)?.name;

  const STATUS_TOAST: Record<TaskStatus, string> = {
    pending: "대기 상태로 되돌렸습니다",
    confirmed: "확인 처리했습니다",
    done: "처리완료했습니다",
    hold: "보류 처리했습니다",
  };

  const finished = task.status === "done";
  const hero = variant === "hero";

  /** 처리완료 패널 열기 — 기존 결과 또는 고객의 현재 다음 관리일로 초기화 */
  const openDonePanel = () => {
    const o = task.outcome;
    const d = o?.nextManageDate ?? customer.nextManageDate ?? "";
    setContactResult(o?.contactResult ?? "contacted");
    setRevisitPlanned(o?.revisitPlanned ?? !!d);
    setNextDate(d);
    setNextTime(o?.nextManageTime ?? customer.nextManageTime);
    setNote(o?.note ?? "");
    setPanel("done");
  };

  const openHoldPanel = () => {
    setHoldUntil(task.holdUntil ?? daysFromToday(3));
    setPanel("hold");
  };

  const saveDone = () => {
    setTaskStatus(task.id, "done", {
      outcome: {
        contactResult,
        revisitPlanned,
        nextManageDate: revisitPlanned ? nextDate || undefined : undefined,
        nextManageTime: revisitPlanned && nextDate ? nextTime : undefined,
        note: note.trim() || undefined,
      },
    });
    setPanel(null);
    toast(`${customer.name} · 처리 결과가 저장되었습니다`);
  };

  const saveHold = () => {
    setTaskStatus(task.id, "hold", { holdUntil });
    setPanel(null);
    toast(`${customer.name} · 보류 — ${formatDateKr(holdUntil)} 재확인 예정`, "info");
  };

  /** 이미 처리된 상태에서 버튼을 다시 누르면 대기로 되돌린다 */
  const revertToPending = () => {
    setTaskStatus(task.id, "pending");
    setPanel(null);
    toast(`${customer.name} · ${STATUS_TOAST.pending}`, "info");
  };

  const panelShell = hero
    ? "rounded-card bg-white/10 ring-1 ring-white/15"
    : "rounded-card bg-card ring-1 ring-black/[0.06] dark:ring-white/10";
  const panelLabel = hero
    ? "text-[0.7rem] font-extrabold uppercase tracking-wider text-aqua-200"
    : "text-[0.7rem] font-extrabold uppercase tracking-wider text-ink-faint";
  const chipOn = hero
    ? "bg-white text-deep-900"
    : "bg-aqua-600 text-white";
  const chipOff = hero
    ? "bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20"
    : "bg-card-soft text-ink-sub ring-1 ring-stone-line hover:bg-aqua-50";
  const fieldCls = hero
    ? "w-full rounded-btn border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/50 focus:border-aqua-300"
    : "w-full rounded-btn border border-stone-line bg-card-soft px-3 py-2 text-sm text-ink outline-none focus:border-aqua-500";

  const shell = hero
    ? "rounded-card bg-white/[0.07] ring-1 ring-white/10 backdrop-blur-[2px]"
    : "rounded-card bg-card-soft ring-1 ring-black/[0.04] card-lift";

  return (
    <div
      className={`group relative overflow-hidden ${shell} p-4 pl-5 transition-opacity ${finished ? "opacity-55" : ""}`}
    >
      {/* 관리 유형 컬러 스트립 */}
      <span
        className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${CATEGORY_STRIPS[task.category]} ${hero ? "opacity-80" : ""}`}
      />
      <div className="flex items-start gap-3">
        {rank !== undefined && (
          <span
            className={`icon-pop mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold shadow-sm ${
              hero
                ? "bg-aqua-400 text-deep-900 shadow-[0_0_0_4px_rgba(42,179,175,0.18)]"
                : (RANK_COLORS[(rank - 1) % RANK_COLORS.length] ??
                  "bg-deep-800 text-white")
            }`}
          >
            {rank}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/customers/${customer.id}`}
              className={`truncate text-[1.0625rem] font-extrabold ${
                hero ? "text-white hover:text-aqua-200" : "text-ink hover:text-aqua-700"
              }`}
            >
              {customer.name}
            </Link>
            <Badge tone={hero ? "on-dark" : CATEGORY_TONES[task.category]} dot>
              {TASK_CATEGORY_LABELS[task.category]}
            </Badge>
            {!hero && <TaskStatusBadge status={task.status} />}
            <span className="ml-auto">
              <PriorityRing score={task.priorityScore} onDark={hero} />
            </span>
          </div>
          {hero ? (
            <>
              <p className="mt-1.5 text-sm leading-relaxed text-deep-sub">
                {task.reason}
              </p>
              <p className="mt-1 text-sm font-bold text-aqua-300">
                → {task.suggestedAction}
              </p>
            </>
          ) : (
            // 데이터 → 판단 → 실행 흐름을 명시적으로 표현
            <div className="mt-2 space-y-2">
              <div>
                <p className="text-[0.7rem] font-extrabold uppercase tracking-wider text-ink-faint">
                  판단 이유
                </p>
                <ul className="mt-0.5 space-y-0.5">
                  {task.reason.split(" · ").map((r, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-1.5 text-sm leading-relaxed text-ink-soft"
                    >
                      <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-aqua-400" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[0.7rem] font-extrabold uppercase tracking-wider text-ink-faint">
                  권장 행동
                </p>
                <p className="mt-0.5 text-sm font-bold text-aqua-700">
                  → {task.suggestedAction}
                </p>
              </div>
            </div>
          )}
          {!compact && (
            <p className={`mt-1 text-xs ${hero ? "text-deep-faint" : "text-ink-sub"}`}>
              {displayPhone(customer.phone, canSeePhone)}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {NEXT_ACTIONS.map((a) => {
              const active = task.status === a.status;
              const activeCls =
                a.status === "done"
                  ? "bg-aqua-500 text-white shadow-sm"
                  : "bg-warn text-white shadow-sm";
              const idleCls = hero
                ? "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20"
                : "bg-card text-ink-soft ring-1 ring-black/[0.06] hover:bg-aqua-50 dark:ring-white/10";
              const open = panel === a.status;
              return (
                <button
                  key={a.status}
                  onClick={() => {
                    if (open) return setPanel(null);
                    if (active) return revertToPending();
                    // 상태를 바로 바꾸지 않고 입력 패널을 먼저 연다
                    if (a.status === "done") openDonePanel();
                    else openHoldPanel();
                  }}
                  className={`touch-target inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors ${active || open ? activeCls : idleCls}`}
                >
                  {a.status === "done" && <CheckIcon className="h-4 w-4" />}
                  {a.status === "hold" && <PauseIcon className="h-4 w-4" />}
                  {a.label}
                </button>
              );
            })}
            {/* 처리완료 상태에서 결과를 다시 열어 수정 */}
            {finished && panel !== "done" && (
              <button
                onClick={openDonePanel}
                className={`touch-target rounded-full px-3 py-1.5 text-sm font-bold ${hero ? "text-aqua-200 hover:text-white" : "text-aqua-700 hover:text-aqua-800"}`}
              >
                결과 수정
              </button>
            )}
            <Link
              href={`/customers/${customer.id}`}
              className={`touch-target ml-auto inline-flex items-center gap-0.5 text-sm font-bold ${
                hero
                  ? "text-aqua-200 hover:text-white"
                  : "text-ink-sub hover:text-aqua-700"
              }`}
            >
              고객 상세
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </div>

          {/* 처리완료 결과 입력 — [처리완료] 직후 이 자리에서 바로 기록 */}
          {panel === "done" && (
            <div className={`mt-3 px-3.5 py-3 ${panelShell}`}>
              <p className={panelLabel}>실행 결과</p>

              <p className={`mt-2 text-xs font-bold ${hero ? "text-deep-sub" : "text-ink-sub"}`}>
                처리결과
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(
                  Object.keys(TASK_CONTACT_RESULT_LABELS) as TaskContactResult[]
                ).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setContactResult(r);
                      // 재방문 예약을 선택하면 재방문 여부도 함께 맞춰준다
                      if (r === "reserved") setRevisitPlanned(true);
                    }}
                    className={`touch-target rounded-full px-3 py-1 text-xs font-bold transition-colors ${contactResult === r ? chipOn : chipOff}`}
                  >
                    {TASK_CONTACT_RESULT_LABELS[r]}
                  </button>
                ))}
              </div>

              <div className="mt-2.5 flex flex-wrap items-end gap-3">
                <div>
                  <p className={`text-xs font-bold ${hero ? "text-deep-sub" : "text-ink-sub"}`}>
                    재방문
                  </p>
                  <div className="mt-1 flex gap-1.5">
                    {[
                      { v: true, label: "예약 예정" },
                      { v: false, label: "미정" },
                    ].map((o) => (
                      <button
                        key={o.label}
                        onClick={() => setRevisitPlanned(o.v)}
                        className={`touch-target rounded-full px-3 py-1 text-xs font-bold transition-colors ${revisitPlanned === o.v ? chipOn : chipOff}`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="min-w-40 flex-1">
                  <p className={`text-xs font-bold ${hero ? "text-deep-sub" : "text-ink-sub"}`}>
                    다음 관리일
                  </p>
                  {/* 날짜 · 시간 모두 클릭으로 지정 (타자 입력 불필요) */}
                  <div className="mt-1">
                    <DateTimeField
                      date={nextDate}
                      time={nextTime}
                      disabled={!revisitPlanned}
                      onChange={(d, t) => {
                        setNextDate(d);
                        setNextTime(t);
                      }}
                    />
                  </div>
                </div>
              </div>

              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="메모 (선택)"
                className={`mt-2.5 ${fieldCls}`}
              />

              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  variant={hero ? "on-dark" : "primary"}
                  onClick={saveDone}
                >
                  <CheckIcon className="h-4 w-4" />
                  완료 저장
                </Button>
                <button
                  onClick={() => setPanel(null)}
                  className={`touch-target rounded-full px-3 py-1.5 text-sm font-bold ${hero ? "text-deep-sub hover:text-white" : "text-ink-sub hover:text-ink"}`}
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {/* 보류 재확인일 선택 */}
          {panel === "hold" && (
            <div className={`mt-3 px-3.5 py-3 ${panelShell}`}>
              <p className={panelLabel}>보류 — 재확인 예정일</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {[
                  { d: 1, label: "내일" },
                  { d: 3, label: "3일 뒤" },
                  { d: 7, label: "1주 뒤" },
                ].map((o) => {
                  const v = daysFromToday(o.d);
                  return (
                    <button
                      key={o.label}
                      onClick={() => setHoldUntil(v)}
                      className={`touch-target rounded-full px-3 py-1 text-xs font-bold transition-colors ${holdUntil === v ? chipOn : chipOff}`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2">
                <DateTimeField
                  date={holdUntil}
                  withTime={false}
                  ariaLabel="재확인 예정일"
                  onChange={(d) => setHoldUntil(d)}
                />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  variant={hero ? "on-dark" : "primary"}
                  onClick={saveHold}
                >
                  <PauseIcon className="h-4 w-4" />
                  보류 저장
                </Button>
                <button
                  onClick={() => setPanel(null)}
                  className={`touch-target rounded-full px-3 py-1.5 text-sm font-bold ${hero ? "text-deep-sub hover:text-white" : "text-ink-sub hover:text-ink"}`}
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {/* 저장된 실행결과 / 보류 상태 요약 */}
          {panel === null && finished && task.outcome && (
            <p
              className={`mt-2.5 nowrap-num text-[0.7rem] ${hero ? "text-deep-faint" : "text-ink-faint"}`}
            >
              {TASK_CONTACT_RESULT_LABELS[task.outcome.contactResult]}
              {handlerName ? ` · ${handlerName} 처리` : ""}
              {task.statusChangedAt
                ? ` · ${formatDateKr(task.statusChangedAt)}`
                : ""}
              {task.outcome.revisitPlanned && task.outcome.nextManageDate
                ? ` · 재방문 ${formatDateKr(task.outcome.nextManageDate)}${
                    task.outcome.nextManageTime
                      ? ` ${formatTimeKr(task.outcome.nextManageTime)}`
                      : ""
                  }`
                : " · 재방문 미정"}
              {task.outcome.note ? ` · ${task.outcome.note}` : ""}
            </p>
          )}
          {panel === null && task.status === "hold" && task.holdUntil && (
            <p
              className={`mt-2.5 text-[0.7rem] font-bold ${hero ? "text-deep-faint" : "text-warn"}`}
            >
              재확인 예정 {formatDateKr(task.holdUntil)}
              {handlerName ? ` · ${handlerName} 보류` : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
