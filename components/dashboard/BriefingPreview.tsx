"use client";

/**
 * 대시보드 — 오늘의 실행 브리핑 (먼저 챙길 세 분)
 * ===============================================
 *
 * 전에는 딥그린 큰 카드(Hero Card)였다. 진행 막대 · 관리 대상 수 · 처리
 * 건수가 이 카드 위쪽에 있었는데, 그 셋은 이제 화면 맨 위 머리 띠
 * (TodayHero)로 올라갔다. 어두운 판이 위아래로 둘이면 무엇이 머리인지
 * 흐려진다 — 그래서 여기는 고객 앱과 같은 **흰 목록 줄**로 바꿨다 (D-56).
 *
 *   칸 제목 + 오른쪽 「전체 보기 ›」
 *   순번 · 이름 · 관리 유형 · 할 일 · [처리]
 *
 * [처리] 를 누르면 그 줄이 그 자리에서 과제 카드로 펴진다 (화면을 옮기지
 * 않는다). 처리하고 나면 목록에서 내려가고 다음 분이 올라온다.
 */

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/data/store";
import { displayName } from "@/lib/utils/format";
import { Hint } from "@/components/ui/Hint";
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
    <li className="flex items-center gap-3 px-4 py-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.9375rem] font-extrabold ring-1 ${
          rank === 1
            ? "bg-gradient-to-br from-aqua-500 to-deep-800 text-white ring-black/10"
            : "bg-aqua-50 text-aqua-800 ring-aqua-100 dark:bg-aqua-500/10 dark:ring-aqua-500/20"
        }`}
      >
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        {/*
          이름은 자르지 않는다 — 누구인지가 이 줄의 전부다.
          .tap-line 은 손가락이 닿을 높이(44px)를 만들려고 inline-flex 다.
          max-w-full 로 상자를 가두고, 안쪽 span 에 min-w-0 을 줘서 긴
          이름이 들어와도 그 안에서 줄이 접히게 한다.
        */}
        <Link
          href={`/customers/${customer.id}`}
          className="tap-line max-w-full text-[1.0625rem] font-extrabold text-ink hover:text-aqua-800"
        >
          <span className="min-w-0 break-words">
            {displayName(customer.name, privacyMode)}
          </span>
        </Link>
        <p className="line-clamp-2 text-[0.8125rem] leading-snug text-ink-sub">
          <span className="font-bold text-aqua-700 dark:text-aqua-300">
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
        className="touch-target inline-flex shrink-0 items-center rounded-full bg-aqua-50 px-4 text-sm font-extrabold text-aqua-800 ring-1 ring-aqua-100 transition-colors hover:bg-aqua-100 dark:bg-aqua-500/10 dark:ring-aqua-500/20"
      >
        처리
      </button>
    </li>
  );
}

export default function BriefingPreview() {
  const { briefingTasks, todayHandled } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = briefingTasks.filter(
    (t) => t.status === "pending" || t.status === "confirmed",
  );
  const top3 = open.slice(0, 3);
  const total = open.length + todayHandled.length;

  return (
    <section data-tour="dash-briefing" aria-labelledby="dash-briefing-h" className="min-w-0">
      <div className="mb-2.5 flex items-end justify-between gap-3 px-1">
        {/* 「무엇을 하는 칸인지」 는 글 한 줄 대신 제목에 올리면 뜨는 말풍선으로 */}
        <Hint
          title="오늘의 실행 브리핑"
          text="고객 · 이용 기록을 보고 오늘 먼저 챙길 분을 순서대로 골랐습니다. [처리] 를 누르면 그 자리에서 결과를 남깁니다."
        >
          <h2
            id="dash-briefing-h"
            className="flex min-w-0 items-center gap-2 text-[1.125rem] font-extrabold leading-tight tracking-tight text-ink"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-aqua-50 text-aqua-700 ring-1 ring-aqua-100 dark:bg-aqua-500/10 dark:ring-aqua-500/20">
              <SparkIcon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="sm:hidden">실행 브리핑</span>
              <span className="hidden sm:inline">AI 고객관리 · 오늘의 실행 브리핑</span>
            </span>
          </h2>
        </Hint>
        <Link
          href="/briefing"
          className="tap-line inline-flex shrink-0 items-center gap-0.5 text-[0.875rem] font-bold text-aqua-700 transition-colors hover:text-aqua-800"
        >
          전체 보기
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </div>

      {top3.length === 0 ? (
        <p className="rounded-[20px] border border-dashed border-stone-line bg-card-soft px-4 py-7 text-center text-[0.9375rem] text-ink-sub">
          {total === 0
            ? "오늘 우선관리 대상 고객이 없습니다."
            : "오늘 처리할 관리 과제를 모두 완료했습니다. 수고하셨습니다."}
        </p>
      ) : (
        <ul className="divide-y divide-stone-line overflow-hidden rounded-[20px] bg-card shadow-card ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
          {top3.map((task, i) =>
            openId === task.id ? (
              <li key={task.id} className="bg-card-soft p-2">
                <TaskCard task={task} rank={i + 1} compact />
              </li>
            ) : (
              <PreviewRow
                key={task.id}
                rank={i + 1}
                task={task}
                onOpen={() => setOpenId(task.id)}
              />
            ),
          )}
        </ul>
      )}
    </section>
  );
}
