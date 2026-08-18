"use client";

import Link from "next/link";
import { useStore } from "@/lib/data/store";
import {
  BriefingTask,
  TASK_CATEGORY_LABELS,
  TaskCategory,
  TaskStatus,
} from "@/lib/types";
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

const NEXT_ACTIONS: Array<{ status: TaskStatus; label: string }> = [
  { status: "confirmed", label: "확인" },
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
  const { customers, setTaskStatus } = useStore();
  const toast = useToast();
  const customer = customers.find((c) => c.id === task.customerId);
  if (!customer) return null;

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
          <p
            className={`mt-1.5 text-sm leading-relaxed ${hero ? "text-deep-sub" : "text-ink-soft"}`}
          >
            {task.reason}
          </p>
          <p
            className={`mt-1 text-sm font-bold ${hero ? "text-aqua-300" : "text-aqua-700"}`}
          >
            → {task.suggestedAction}
          </p>
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
        </div>
      </div>
    </div>
  );
}
