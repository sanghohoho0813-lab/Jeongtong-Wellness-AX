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
import { Card, EmptyState, FilterChip, HeroCard } from "@/components/ui";
import { SparkIcon } from "@/components/ui/icons";

/** 유형별 도트 색 — TaskCard 스트립 색과 동일 체계 */
const CATEGORY_DOTS: Record<TaskCategory, string> = {
  revisit_due: "bg-aqua-500",
  dormant: "bg-danger",
  membership_low: "bg-gold",
  new_followup: "bg-sky-500",
  consult_no_booking: "bg-violet-500",
  focus_care: "bg-warn",
};

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

  const openTasks = briefingTasks.filter(
    (t) => t.status === "pending" || t.status === "confirmed",
  );
  const doneCount = briefingTasks.filter((t) => t.status === "done").length;
  const holdCount = briefingTasks.filter((t) => t.status === "hold").length;
  const total = briefingTasks.length;
  const progress = total > 0 ? doneCount / total : 0;

  // 카테고리별 미처리 분포 (많은 순)
  const byCategory = CATEGORY_FILTERS.filter((c) => c !== "all")
    .map((c) => ({
      key: c as TaskCategory,
      count: openTasks.filter((t) => t.category === c).length,
    }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div>
      <PageHeader
        title="오늘의 실행 브리핑"
        description="고객 데이터에서 계산된 우선순위에 따라 오늘 실행할 관리 과제를 보여줍니다."
      />

      {/* Hero 요약 밴드 */}
      <HeroCard className="mb-4 !p-5 sm:!p-6 lg:mb-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-aqua-400/25 text-aqua-300 ring-1 ring-aqua-300/30">
              <SparkIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[0.8125rem] font-bold text-deep-sub">
                오늘 관리 대상
              </p>
              <p className="nowrap-num text-3xl font-extrabold tracking-tight text-white">
                {openTasks.length}
                <span className="ml-0.5 text-base font-bold text-deep-sub">
                  명
                </span>
              </p>
            </div>
          </div>
          <div>
            <p className="text-[0.8125rem] font-bold text-deep-sub">처리완료</p>
            <p className="nowrap-num text-3xl font-extrabold tracking-tight text-aqua-300">
              {doneCount}
              <span className="ml-0.5 text-base font-bold text-deep-sub">건</span>
            </p>
          </div>
          {holdCount > 0 && (
            <div>
              <p className="text-[0.8125rem] font-bold text-deep-sub">보류</p>
              <p className="nowrap-num text-3xl font-extrabold tracking-tight text-white/80">
                {holdCount}
                <span className="ml-0.5 text-base font-bold text-deep-sub">
                  건
                </span>
              </p>
            </div>
          )}
          <div className="min-w-40 flex-1">
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-deep-sub">
              <span>오늘 진행률</span>
              <span className="nowrap-num">{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/15">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-aqua-400 to-aqua-300 transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
        </div>
        {byCategory.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
            {byCategory.map((x) => (
              <button
                key={x.key}
                onClick={() =>
                  setCategory(category === x.key ? "all" : x.key)
                }
                className={`touch-target inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold transition-all ${
                  category === x.key
                    ? "bg-white text-deep-900"
                    : "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${CATEGORY_DOTS[x.key]}`} />
                {TASK_CATEGORY_LABELS[x.key]}{" "}
                <span className="nowrap-num opacity-80">{x.count}</span>
              </button>
            ))}
          </div>
        )}
      </HeroCard>

      <Card className="mb-4 !py-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {CATEGORY_FILTERS.map((c) => {
              const active = category === c;
              const dot = c === "all" ? "" : CATEGORY_DOTS[c];
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`touch-target inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold transition-all ${
                    active
                      ? "bg-deep-800 text-white shadow-sm dark:bg-aqua-600"
                      : "bg-card text-ink-sub ring-1 ring-stone-line hover:bg-aqua-50 hover:text-aqua-800"
                  }`}
                >
                  {dot && (
                    <span
                      className={`h-2 w-2 rounded-full ${active ? "bg-white/80" : dot}`}
                    />
                  )}
                  {c === "all" ? "전체 유형" : TASK_CATEGORY_LABELS[c]}
                </button>
              );
            })}
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
        <div className="rise-stagger space-y-3">
          {filtered.map((task, i) => (
            <TaskCard key={task.id} task={task} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
