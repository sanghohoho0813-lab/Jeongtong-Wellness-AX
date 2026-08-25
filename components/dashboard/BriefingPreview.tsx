"use client";

/** 대시보드 Hero — AI 고객관리 · 오늘의 실행 브리핑 (Deep Teal Hero Card) */

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/data/store";
import { displayName } from "@/lib/utils/format";
import { HeroCard } from "@/components/ui";
import { ChevronRightIcon, SparkIcon } from "@/components/ui/icons";
import TaskCard from "@/components/briefing/TaskCard";
import { BriefingTask, TASK_CATEGORY_LABELS } from "@/lib/types";

/**
 * 접힌 상태의 한 줄 — 순번 · 이름 · 관리 유형 · 할 일 · [처리]
 * 여기서 필요한 정보는 "누구에게 무엇을"이 전부다.
 */
function PreviewRow({
  task,
  rank,
  onOpen,
}: {
  task: BriefingTask;
  rank: number;
  onOpen: () => void;
}) {
  const { customers, privacyMode } = useStore();
  const customer = customers.find((c) => c.id === task.customerId);
  if (!customer) return null;
  return (
    <div className="flex items-center gap-3 rounded-card bg-white/[0.07] px-3 py-2.5 ring-1 ring-white/10">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-aqua-400 text-[0.8125rem] font-extrabold text-deep-900">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        {/*
          이름은 자르지 않는다 — 누구인지가 이 줄의 전부다.
          관리 유형은 자리가 모자라면 줄고, 할 일은 두 줄까지 접어서
          '안부 연락 후 방문 …' 처럼 끊기지 않게 한다.
        */}
        <Link
          href={`/customers/${customer.id}`}
          className="tap-line text-[1.0625rem] font-extrabold text-white hover:text-aqua-200"
        >
          {displayName(customer.name, privacyMode)}
        </Link>
        <p className="line-clamp-2 text-[0.8125rem] leading-snug text-deep-sub">
          <span className="font-bold text-aqua-300">
            {TASK_CATEGORY_LABELS[task.category]}
          </span>
          {" · "}
          {task.suggestedAction}
        </p>
      </div>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${displayName(customer.name, privacyMode)} 처리하기`}
        className="touch-target inline-flex shrink-0 items-center rounded-full bg-white/15 px-4 text-sm font-extrabold text-white ring-1 ring-white/20 transition-colors hover:bg-white/25"
      >
        처리
      </button>
    </div>
  );
}

export default function BriefingPreview() {
  const { briefingTasks, todayHandled } = useStore();
  /**
   * 펼쳐 놓은 과제.
   *
   * 대시보드는 '오늘 뭘 해야 하나'를 한눈에 보는 자리다. 그런데 과제 카드를
   * 통째로 세 장 펼쳐 두면 폰에서 그것만 세 화면을 넘어가서, 정작 아래에 있는
   * 다른 현황은 아무도 보지 않게 된다.
   * 그래서 평소에는 한 줄로 접어 두고, [처리]를 누른 것 하나만 펼친다.
   * (펼친 카드에서 할 수 있는 일은 브리핑 화면과 똑같다)
   */
  const [openId, setOpenId] = useState<string | null>(null);
  const open = briefingTasks.filter(
    (t) => t.status === "pending" || t.status === "confirmed",
  );
  const top3 = open.slice(0, 3);
  /*
    오늘 처리한 건수는 **이력**에서 센다.

    위 목록(briefingTasks)은 "지금 챙길 사람" 이라 매번 새로 계산된다.
    아침에 처리한 고객이 오후에 방문하면 그 목록에서 내려가는데, 건수까지
    거기서 세면 고객이 올수록 처리 건수가 거꾸로 줄어든다.
  */
  const doneToday = todayHandled.length;
  const total = open.length + doneToday;
  const progress = total > 0 ? doneToday / total : 0;

  return (
    <HeroCard dataTour="dash-briefing" className="flex flex-col">
      {/*
        제목이 길어 [전체 보기] 옆에서 세 줄로 쪼개졌다 ("AI" 만 한 줄).
        폰에서는 짧은 이름으로, 자리가 있는 화면에서만 긴 이름으로 쓴다.
      */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2.5 text-[1.125rem] font-extrabold tracking-tight text-white sm:text-[1.25rem]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-aqua-400/25 text-aqua-300 ring-1 ring-aqua-300/30">
            <SparkIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="sm:hidden">오늘의 실행 브리핑</span>
            <span className="hidden sm:inline">
              AI 고객관리 · 오늘의 실행 브리핑
            </span>
          </span>
        </h2>
        <Link
          href="/briefing"
          className="touch-target inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full bg-white/10 px-3.5 text-sm font-bold text-white ring-1 ring-white/20 transition-colors hover:bg-white/20"
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
        <div className="mt-4 space-y-2">
          {top3.map((task, i) =>
            openId === task.id ? (
              <TaskCard
                key={task.id}
                task={task}
                rank={i + 1}
                compact
                variant="hero"
              />
            ) : (
              <PreviewRow
                key={task.id}
                rank={i + 1}
                task={task}
                onOpen={() => setOpenId(task.id)}
              />
            ),
          )}
        </div>
      )}
    </HeroCard>
  );
}
