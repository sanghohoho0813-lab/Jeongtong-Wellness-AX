"use client";

/** 대시보드 Hero — AI 고객관리 · 오늘의 실행 브리핑 (Deep Teal Hero Card) */

import Link from "next/link";
import { useStore } from "@/lib/data/store";
import { HeroCard } from "@/components/ui";
import { ChevronRightIcon, SparkIcon } from "@/components/ui/icons";
import TaskCard from "@/components/briefing/TaskCard";

export default function BriefingPreview() {
  const { briefingTasks } = useStore();
  const open = briefingTasks.filter(
    (t) => t.status === "pending" || t.status === "confirmed",
  );
  const top3 = open.slice(0, 3);
  const doneToday = briefingTasks.filter((t) => t.status === "done").length;
  const total = open.length + doneToday;
  const progress = total > 0 ? doneToday / total : 0;

  return (
    <HeroCard dataTour="dash-briefing" className="flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2.5 text-[1.125rem] font-extrabold tracking-tight text-white sm:text-[1.25rem]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-aqua-400/25 text-aqua-300 ring-1 ring-aqua-300/30">
            <SparkIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0">AI 고객관리 · 오늘의 실행 브리핑</span>
        </h2>
        <Link
          href="/briefing"
          className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-bold text-white ring-1 ring-white/20 transition-colors hover:bg-white/20"
        >
          전체 보기
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </div>

      <p className="mt-2 text-[0.8125rem] leading-relaxed text-deep-sub">
        고객·이용 데이터를 분석해 오늘 우선적으로 처리할 업무를 제안합니다.
      </p>

      {/* 진행 요약 */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <p className="text-sm font-medium text-deep-sub">
          오늘 관리 대상{" "}
          <strong className="nowrap-num text-lg font-extrabold text-white">
            {open.length}명
          </strong>
        </p>
        <p className="text-sm font-medium text-deep-sub">
          처리완료{" "}
          <strong className="nowrap-num text-lg font-extrabold text-aqua-300">
            {doneToday}건
          </strong>
        </p>
        <div className="flex min-w-28 flex-1 items-center gap-2.5">
          <div className="h-1.5 flex-1 rounded-full bg-white/15">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-aqua-400 to-aqua-300 transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <span className="nowrap-num text-xs font-bold text-deep-sub">
            {Math.round(progress * 100)}%
          </span>
        </div>
      </div>

      {top3.length === 0 ? (
        <p className="mt-4 rounded-card bg-white/[0.07] py-9 text-center text-sm font-medium text-deep-sub ring-1 ring-white/10">
          {total === 0
            ? "오늘 우선관리 대상 고객이 없습니다."
            : "오늘 처리할 관리 과제를 모두 완료했습니다. 수고하셨습니다."}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {top3.map((task, i) => (
            <TaskCard key={task.id} task={task} rank={i + 1} compact variant="hero" />
          ))}
        </div>
      )}
    </HeroCard>
  );
}
