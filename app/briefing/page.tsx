"use client";

import { useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import TaskCard from "@/components/briefing/TaskCard";
import { useStore } from "@/lib/data/store";
import {
  TASK_CATEGORY_LABELS,
  TASK_STATUS_LABELS,
  TaskCategory,
  TaskStatus,
} from "@/lib/types";
import { Card, EmptyState, FilterChip } from "@/components/ui";

const CATEGORY_FILTERS: Array<TaskCategory | "all"> = [
  "all",
  "revisit_due",
  "dormant",
  "membership_low",
  "new_followup",
  "consult_no_booking",
];

const STATUS_FILTERS: Array<TaskStatus | "open" | "all"> = [
  "open",
  "done",
  "hold",
  "all",
];

export default function BriefingPage() {
  const { briefingTasks } = useStore();
  const [category, setCategory] = useState<TaskCategory | "all">("all");
  const [status, setStatus] = useState<TaskStatus | "open" | "all">("open");

  const filtered = briefingTasks.filter((t) => {
    if (category !== "all" && t.category !== category) return false;
    if (status === "open")
      return t.status === "pending" || t.status === "confirmed";
    if (status !== "all" && t.status !== status) return false;
    return true;
  });

  const openCount = briefingTasks.filter(
    (t) => t.status === "pending" || t.status === "confirmed",
  ).length;
  const doneCount = briefingTasks.filter((t) => t.status === "done").length;

  return (
    <div>
      <PageHeader
        title="오늘의 실행 브리핑"
        description={`관리 대상 ${openCount}명 · 처리완료 ${doneCount}건 — 우선순위가 높은 고객부터 실행하세요.`}
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {CATEGORY_FILTERS.map((c) => (
              <FilterChip
                key={c}
                active={category === c}
                onClick={() => setCategory(c)}
              >
                {c === "all" ? "전체 유형" : TASK_CATEGORY_LABELS[c]}
              </FilterChip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((s) => (
              <FilterChip
                key={s}
                tone="ink"
                active={status === s}
                onClick={() => setStatus(s)}
              >
                {s === "open"
                  ? "미처리"
                  : s === "all"
                    ? "전체 상태"
                    : TASK_STATUS_LABELS[s]}
              </FilterChip>
            ))}
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="해당 조건의 실행 과제가 없습니다"
          description="필터를 변경하거나, 오늘의 관리 과제를 모두 완료한 상태입니다."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((task, i) => (
            <TaskCard key={task.id} task={task} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
