"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import TaskCard from "@/components/briefing/TaskCard";
import { useStore } from "@/lib/data/store";
import {
  TASK_CATEGORY_LABELS,
  TASK_STATUS_LABELS,
  TaskCategory,
  TaskStatus,
} from "@/lib/types";
import { Button, Card, EmptyState, FilterChip, HeroCard } from "@/components/ui";
import { PrinterIcon, SparkIcon } from "@/components/ui/icons";
import AiReadyNote from "@/components/ui/AiReadyNote";

/** 한 번에 그리는 과제 수 — 나머지는 [더 보기]로 이어 그린다 */
const PAGE_SIZE = 40;

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
  const { briefingTasks, todayHandled, customers } = useStore();
  const [category, setCategory] = useState<TaskCategory | "all">("all");
  const [status, setStatus] = useState<TaskStatus | "open" | "all">("open");
  const [onlyOpportunity, setOnlyOpportunity] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);

  /** 조건을 좁혀 둔 상태인가 — 비어 있을 때 무슨 말을 할지가 여기서 갈린다 */
  const narrowed = category !== "all" || status !== "open" || onlyOpportunity;

  /** 매출기회 과제 수 — 필터 칩 라벨과 동일 기준 */
  const opportunityTotal = briefingTasks.filter(
    (t) => t.opportunity && t.opportunity.type !== "none",
  ).length;

  const filtered = briefingTasks.filter((t) => {
    if (category !== "all" && t.category !== category) return false;
    if (onlyOpportunity && (t.opportunity?.type ?? "none") === "none")
      return false;
    if (status === "open")
      return t.status === "pending" || t.status === "confirmed";
    if (status !== "all" && t.status !== status) return false;
    return true;
  });

  // 하루에 처리할 수 있는 양을 넘어서면 화면만 무거워지므로 끊어서 그린다
  useEffect(() => setLimit(PAGE_SIZE), [category, status, onlyOpportunity]);
  const visible = filtered.slice(0, limit);

  const openTasks = briefingTasks.filter(
    (t) => t.status === "pending" || t.status === "confirmed",
  );
  /*
    오늘 처리한 건수는 **이력**에서 센다.

    이 목록은 "지금 챙길 사람" 이라 매번 새로 계산된다. 아침에 처리한
    고객이 오후에 방문하면 우선순위가 0이 되어 목록에서 내려가는데,
    건수까지 목록에서 세면 고객이 올수록 오늘 한 일이 거꾸로 줄어든다.

    그래서 목록에 남아 있는 건과 이력의 건수가 다를 수 있다. 그 차이는
    "방문으로 마무리된 건" 이고, 아래에 그대로 적어 둔다 — 숫자가 안 맞아
    보이는 채로 두면 원장님이 무엇을 믿어야 할지 알 수 없다.
  */
  const doneCount = todayHandled.length;
  const listedDone = briefingTasks.filter((t) => t.status === "done").length;
  const closedByVisit = Math.max(0, doneCount - listedDone);
  const holdCount = briefingTasks.filter((t) => t.status === "hold").length;
  const total = briefingTasks.length + closedByVisit;
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
        description={
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            오늘 챙길 고객을 우선순위대로 정리했습니다.
            {/*
              순서가 무엇으로 정해지는지 — 설명 바로 옆에 둔다.
              아래에 홀로 떠 있으면 무엇에 대한 표시인지 흐려진다.
              인쇄물에는 넣지 않는다: 고객과 함께 보는 종이에 시스템
              설명이 끼어들 이유가 없다.
            */}
            <span className="no-print">
              <AiReadyNote subject="priority" />
            </span>
          </span>
        }
        action={
          <Button
            variant="secondary"
            className="no-print"
            onClick={() => window.print()}
          >
            <PrinterIcon className="h-4 w-4" />
            오늘 할 일 인쇄
          </Button>
        }
      />

      {/* Hero 요약 밴드 */}
      <HeroCard dataTour="briefing-hero" className="mb-4 !p-5 sm:!p-6 lg:mb-5">
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
            {/* 목록에 없는 건이 섞여 있으면 왜 그런지 그 자리에서 밝힌다 */}
            {closedByVisit > 0 && (
              <p className="nowrap-num mt-0.5 text-[0.75rem] font-bold text-deep-sub">
                방문으로 마무리 {closedByVisit}건 포함
              </p>
            )}
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

      {/* 화면에서 목록을 좁히는 도구 — 종이에는 필요 없다 */}
      <Card className="no-print mb-4 !py-4">
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
                      ? "bg-sel text-sel-ink shadow-sm"
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
          <div className="flex flex-wrap items-center gap-2">
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
            {/* AX 매출기회만 보기 — 관리 필요와 별개의 축이라 색을 달리한다 */}
            {opportunityTotal > 0 && (
              <button
                onClick={() => setOnlyOpportunity((v) => !v)}
                className={`touch-target nowrap-num ml-auto rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                  onlyOpportunity
                    ? "bg-gradient-to-r from-gold to-gold-deep text-white shadow-sm"
                    : "bg-gold-soft text-gold-deep ring-1 ring-gold/25 hover:bg-gold/20"
                }`}
              >
                매출기회 {opportunityTotal}
              </button>
            )}
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        /*
          비어 있는 이유가 세 가지인데 한 문장으로 뭉뚱그려 두었었다.
          "필터를 변경하거나, 오늘의 관리 과제를 모두 완료한 상태입니다."
          — 고객이 한 명도 없는 개업 첫날 원장님에게는 사실이 아닌 말이다.
          완료한 것이 없는데 완료했다고 하면 화면을 못 믿게 된다.
          셋을 갈라 놓는다.
        */
        customers.length === 0 ? (
          <EmptyState
            title="아직 등록된 고객이 없습니다"
            description="고객을 등록하시면 그날 챙길 분들을 여기에 우선순위대로 정리해 드립니다."
            action={
              <Link href="/customers">
                <Button>고객 등록하러 가기</Button>
              </Link>
            }
          />
        ) : narrowed ? (
          <EmptyState
            title={
              onlyOpportunity
                ? "이 조건의 매출기회 과제가 없습니다"
                : "이 조건의 실행 과제가 없습니다"
            }
            description={`고른 조건에 걸리는 과제가 없습니다. 오늘 전체 과제는 ${briefingTasks.length}건입니다.`}
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setCategory("all");
                  setStatus("open");
                  setOnlyOpportunity(false);
                }}
              >
                조건 없이 전체 보기
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="오늘 챙길 고객이 없습니다"
            description={
              todayHandled.length > 0
                ? `오늘 ${todayHandled.length}건을 모두 처리하셨습니다. 수고하셨습니다.`
                : "지금 기준으로 관리가 필요한 고객이 없습니다."
            }
          />
        )
      ) : (
        <div className="rise-stagger space-y-3">
          {visible.map((task, i) => (
            <TaskCard key={task.id} task={task} rank={i + 1} />
          ))}

          {filtered.length > visible.length && (
            <div className="pt-1 text-center">
              {/* 긴 문장이라 줄바꿈이 필요하다 — nowrap 을 쓰면 좁은 화면에서 넘친다 */}
              <p className="mb-2 text-sm leading-relaxed text-ink-sub">
                <span className="nowrap-num">
                  {filtered.length}건 중 {visible.length}건
                </span>{" "}
                표시 중 · 위쪽부터 우선순위가 높은 순서입니다
              </p>
              <Button
                variant="secondary"
                onClick={() => setLimit((n) => n + PAGE_SIZE)}
              >
                더 보기 ({Math.min(PAGE_SIZE, filtered.length - visible.length)}건)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
