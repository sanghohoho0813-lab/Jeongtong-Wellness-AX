"use client";

import Link from "next/link";
import { useStore } from "@/lib/data/store";
import {
  BriefingTask,
  TASK_CATEGORY_LABELS,
  TASK_CONTACT_RESULT_LABELS,
  TaskCategory,
  TaskContactResult,
  TaskStatus,
} from "@/lib/types";
import { formatDateKr } from "@/lib/utils/date";
import { formatPhone } from "@/lib/utils/format";
import { Badge, BadgeTone, TaskStatusBadge } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { CheckIcon, ChevronRightIcon, PauseIcon } from "@/components/ui/icons";

/** 관리 유형별 배지 색 — 유형이 한눈에 구분되도록 */
const CATEGORY_TONES: Record<TaskCategory, BadgeTone> = {
  revisit_due: "aqua",
  dormant: "danger",
  membership_low: "gold",
  new_followup: "sky",
  consult_no_booking: "violet",
  focus_care: "warn",
};

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
  const { customers, staff, setTaskStatus } = useStore();
  const toast = useToast();
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

  const shell = hero
    ? "rounded-card bg-white/[0.07] ring-1 ring-white/10 backdrop-blur-[2px]"
    : "rounded-card bg-card-soft ring-1 ring-black/[0.04]";

  return (
    <div className={`${shell} p-4 transition-opacity ${finished ? "opacity-55" : ""}`}>
      <div className="flex items-start gap-3">
        {rank !== undefined && (
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
              hero
                ? "bg-aqua-400 text-deep-900 shadow-[0_0_0_4px_rgba(42,179,175,0.18)]"
                : "bg-deep-800 text-white"
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
              {formatPhone(customer.phone)}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {NEXT_ACTIONS.map((a) => {
              const active = task.status === a.status;
              const activeCls =
                a.status === "done"
                  ? "bg-aqua-500 text-white shadow-sm"
                  : a.status === "hold"
                    ? "bg-warn text-white shadow-sm"
                    : hero
                      ? "bg-white text-deep-900 shadow-sm"
                      : "bg-ink-soft text-white shadow-sm";
              const idleCls = hero
                ? "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20"
                : "bg-card text-ink-soft ring-1 ring-black/[0.06] hover:bg-aqua-50 dark:ring-white/10";
              return (
                <button
                  key={a.status}
                  onClick={() => {
                    const next: TaskStatus = active ? "pending" : a.status;
                    setTaskStatus(task.id, next);
                    toast(
                      `${customer.name} · ${STATUS_TOAST[next]}`,
                      next === "done" ? "success" : "info",
                    );
                  }}
                  className={`touch-target inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors ${active ? activeCls : idleCls}`}
                >
                  {a.status === "done" && <CheckIcon className="h-4 w-4" />}
                  {a.status === "hold" && <PauseIcon className="h-4 w-4" />}
                  {a.label}
                </button>
              );
            })}
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

          {/* 실행결과 축적 — 처리완료 시에만 노출되는 최소 입력 */}
          {finished && !hero && (
            <div className="mt-3 rounded-card bg-card px-3.5 py-3 ring-1 ring-black/[0.05] dark:ring-white/10">
              <p className="text-[0.7rem] font-extrabold uppercase tracking-wider text-ink-faint">
                실행 결과
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(
                  Object.keys(TASK_CONTACT_RESULT_LABELS) as TaskContactResult[]
                ).map((r) => {
                  const on = (task.outcome?.contactResult ?? "contacted") === r;
                  return (
                    <button
                      key={r}
                      onClick={() =>
                        setTaskStatus(task.id, "done", { contactResult: r })
                      }
                      className={`touch-target rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                        on
                          ? "bg-aqua-600 text-white"
                          : "bg-card-soft text-ink-sub ring-1 ring-stone-line hover:bg-aqua-50"
                      }`}
                    >
                      {TASK_CONTACT_RESULT_LABELS[r]}
                    </button>
                  );
                })}
              </div>
              <input
                defaultValue={task.outcome?.note ?? ""}
                onBlur={(e) => {
                  const note = e.target.value.trim();
                  if (note !== (task.outcome?.note ?? ""))
                    setTaskStatus(task.id, "done", { note: note || undefined });
                }}
                placeholder="처리 메모 (선택)"
                className="mt-2 w-full rounded-btn border border-stone-line bg-card-soft px-3 py-1.5 text-sm text-ink outline-none focus:border-aqua-500"
              />
              <p className="mt-1.5 nowrap-num text-[0.7rem] text-ink-faint">
                {handlerName ? `${handlerName} 처리` : "처리"}
                {task.statusChangedAt
                  ? ` · ${formatDateKr(task.statusChangedAt)}`
                  : ""}
                {task.outcome?.revisitPlanned
                  ? ` · 재방문 예정 ${formatDateKr(task.outcome.nextManageDate)}`
                  : " · 재방문 예정일 미지정"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
