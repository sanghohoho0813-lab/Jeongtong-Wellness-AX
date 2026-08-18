"use client";

import Link from "next/link";
import { useStore } from "@/lib/data/store";
import {
  BriefingTask,
  TASK_CATEGORY_LABELS,
  TaskStatus,
} from "@/lib/types";
import { formatPhone } from "@/lib/utils/format";
import { Badge, TaskStatusBadge } from "@/components/ui";
import { CheckIcon, ChevronRightIcon, PauseIcon } from "@/components/ui/icons";

const NEXT_ACTIONS: Array<{ status: TaskStatus; label: string }> = [
  { status: "confirmed", label: "확인" },
  { status: "done", label: "처리완료" },
  { status: "hold", label: "보류" },
];

export default function TaskCard({
  task,
  rank,
  compact = false,
}: {
  task: BriefingTask;
  rank?: number;
  compact?: boolean;
}) {
  const { customers, setTaskStatus } = useStore();
  const customer = customers.find((c) => c.id === task.customerId);
  if (!customer) return null;

  const finished = task.status === "done";

  return (
    <div
      className={`rounded-card bg-card-soft p-4 transition-opacity ${finished ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        {rank !== undefined && (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-aqua-600 text-sm font-bold text-white">
            {rank}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/customers/${customer.id}`}
              className="truncate font-bold text-ink hover:text-aqua-700"
            >
              {customer.name}
            </Link>
            <Badge tone="aqua">{TASK_CATEGORY_LABELS[task.category]}</Badge>
            <TaskStatusBadge status={task.status} />
            <span className="ml-auto nowrap-num text-xs font-semibold text-ink-sub">
              우선도 {task.priorityScore}
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            {task.reason}
          </p>
          <p className="mt-1 text-sm font-semibold text-aqua-700">
            → {task.suggestedAction}
          </p>
          {!compact && (
            <p className="mt-1 text-xs text-ink-sub">
              {formatPhone(customer.phone)}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {NEXT_ACTIONS.map((a) => {
              const active = task.status === a.status;
              return (
                <button
                  key={a.status}
                  onClick={() =>
                    setTaskStatus(task.id, active ? "pending" : a.status)
                  }
                  className={`touch-target inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                    active
                      ? a.status === "done"
                        ? "bg-aqua-600 text-white"
                        : a.status === "hold"
                          ? "bg-amber-500 text-white"
                          : "bg-ink-soft text-white"
                      : "bg-card text-ink-soft shadow-sm hover:bg-aqua-50"
                  }`}
                >
                  {a.status === "done" && <CheckIcon className="h-4 w-4" />}
                  {a.status === "hold" && <PauseIcon className="h-4 w-4" />}
                  {a.label}
                </button>
              );
            })}
            <Link
              href={`/customers/${customer.id}`}
              className="touch-target ml-auto inline-flex items-center gap-0.5 text-sm font-semibold text-ink-sub hover:text-aqua-700"
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
