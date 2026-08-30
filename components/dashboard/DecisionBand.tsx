"use client";

/**
 * 오늘의 판단 — 대시보드 맨 위 세 칸
 * ==================================
 *
 * 왜 이 자리를 만들었나
 * ---------------------
 * 아침에 이 화면을 여는 이유는 "몇 명인지 세려고" 가 아니다.
 * "오늘 누구한테 전화하지" 를 정하려는 것이다.
 *
 * 그런데 지금까지 첫 화면에서 가장 크게 보이던 것은 숫자 넉 장이었다.
 * 오늘 신규 상담 3, 재방문 예정 7, 오늘 방문 5, 월 매출 …
 * 이 넷을 다 읽고 나서도 "그래서 뭘 하지" 는 답이 안 나온다. 그건 판단이
 * 아니라 **판단의 재료**이기 때문이다.
 *
 * 그래서 재료 위에 판단을 올린다. 세 칸은 각각
 *
 *     숫자   — 몇 명인가
 *     이유   — 왜 그렇게 봤는가
 *     할 일  — 그래서 지금 어디로 가면 되는가
 *
 * 이 셋을 한 덩어리로 갖는다. 숫자만 있으면 판단이 아니고, 이유 없이
 * 숫자만 크게 쓰면 그건 대시보드가 아니라 광고다.
 *
 * 지어내지 않는다
 * ---------------
 * 세 숫자는 전부 이미 계산되어 있던 값을 그대로 읽는다.
 *   오늘 챙길 고객 = 실행 브리핑의 미처리 과제 수
 *   재등록 기회    = summarizeOpportunities 의 미처리 건수
 *   이용권 임박    = 매장이 설정에 정한 기준(membershipLowCount) 이하 잔여
 * 새 판정 규칙을 만들지 않았고, Priority Score 도 건드리지 않았다.
 */

import Link from "next/link";
import { ReactNode } from "react";
import { useStore } from "@/lib/data/store";
import { summarizeOpportunities } from "@/lib/scoring/opportunity";
import { TASK_CATEGORY_LABELS } from "@/lib/types";
import { displayName } from "@/lib/utils/format";
import {
  ChevronRightIcon,
  SparkIcon,
  TicketIcon,
  TrendUpIcon,
} from "@/components/ui/icons";

type Tone = "aqua" | "gold" | "amber";

const TONE: Record<
  Tone,
  { rail: string; tile: string; num: string; cta: string }
> = {
  aqua: {
    rail: "rgb(var(--c-aqua-500))",
    tile: "bg-aqua-50 text-aqua-700 ring-aqua-100",
    num: "text-aqua-800",
    cta: "text-aqua-800 hover:bg-aqua-50",
  },
  gold: {
    rail: "rgb(var(--c-gold))",
    tile: "bg-gold-soft text-gold-deep ring-gold/25",
    num: "text-gold-deep",
    cta: "text-gold-deep hover:bg-gold-soft",
  },
  amber: {
    rail: "rgb(var(--c-warn-text))",
    tile: "bg-amber-400/15 text-amber-600 ring-amber-400/25 dark:text-amber-300",
    num: "text-warn-text",
    cta: "text-warn-text hover:bg-amber-400/10",
  },
};

function Decision({
  tone,
  icon,
  label,
  count,
  unit,
  reason,
  href,
  cta,
  quiet,
}: {
  tone: Tone;
  icon: ReactNode;
  label: string;
  count: number;
  unit: string;
  reason: ReactNode;
  href: string;
  cta: string;
  /** 0 명일 때 — 숫자를 크게 쓰지 않고 조용히 넘어간다 */
  quiet?: boolean;
}) {
  const t = TONE[tone];
  return (
    /*
      폰과 PC 에서 배치가 다르다 — 줄이는 것이 아니라 다시 놓는다.

      PC 는 세 칸이 나란히 서므로 세로로 쌓는다(라벨 → 숫자 → 이유 → 할 일).
      폰에서 그대로 쌓으면 한 칸이 230px 이 되고, 셋이면 700px —
      첫 화면이 판단 셋으로 꽉 차서 그 아래 실행이 보이지 않는다.

      그래서 폰에서는 **가로 한 줄**로 눕힌다. 숫자를 오른쪽 끝으로 보내면
      셋이 세로로 정렬되어 서로 견주기도 쉽고, 한 칸이 100px 로 줄어든다.
      지워지는 정보는 없다.
    */
    <Link
      href={href}
      style={{ "--rail": quiet ? "rgb(var(--c-line))" : t.rail } as never}
      className="rail card card-lift group flex min-w-0 items-center gap-3.5 !py-4 !pl-5 md:flex-col md:items-stretch md:gap-0"
    >
      {/* 아이콘 — 폰에서는 줄 맨 앞 */}
      <span
        className={`icon-pop flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 md:hidden ${
          quiet ? "bg-stone-bg-deep text-ink-faint ring-black/[0.04]" : t.tile
        }`}
      >
        {icon}
      </span>

      <div className="hidden items-center gap-2.5 md:flex">
        <span
          className={`icon-pop flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${
            quiet ? "bg-stone-bg-deep text-ink-faint ring-black/[0.04]" : t.tile
          }`}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-bold tracking-wide text-ink-sub">
          {label}
        </span>
      </div>

      <div className="min-w-0 flex-1 md:contents">
        <span className="block truncate text-[0.8125rem] font-bold tracking-wide text-ink-sub md:hidden">
          {label}
        </span>

        {/*
          숫자와 단위는 한 줄에 붙여 둔다. '4' 와 '명' 이 다른 줄로 찢어지면
          읽는 사람이 한 번 멈칫한다 (.nowrap-num).
        */}
        <p className="nowrap-num tabular hidden md:mt-2.5 md:block">
          <span
            className={`text-[2.125rem] font-extrabold leading-none tracking-tight ${
              quiet ? "text-ink-faint" : t.num
            }`}
          >
            {count}
          </span>
          <span className="ml-1 text-[1rem] font-bold text-ink-sub">{unit}</span>
        </p>

        {/* 왜 그렇게 봤는지 — 폰은 두 줄, PC 는 자리를 고정해 세 칸 높이를 맞춘다 */}
        <p className="mt-0.5 line-clamp-2 text-[0.875rem] leading-snug text-ink-sub md:mt-1.5 md:min-h-[2.4em]">
          {reason}
        </p>

        <span
          className={`mt-1.5 inline-flex items-center gap-0.5 self-start rounded-btn -ml-2 px-2 py-1 text-[0.875rem] font-extrabold transition-colors md:mt-3 ${
            quiet ? "text-ink-faint hover:bg-stone-bg" : t.cta
          }`}
        >
          {cta}
          <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>

      {/* 폰 — 숫자는 오른쪽 끝. 셋이 세로로 맞춰져 견주기 쉽다 */}
      <p className="nowrap-num tabular shrink-0 text-right md:hidden">
        <span
          className={`text-[2rem] font-extrabold leading-none tracking-tight ${
            quiet ? "text-ink-faint" : t.num
          }`}
        >
          {count}
        </span>
        <span className="ml-0.5 text-[0.9375rem] font-bold text-ink-sub">
          {unit}
        </span>
      </p>
    </Link>
  );
}

export default function DecisionBand() {
  const {
    briefingTasks,
    customers,
    memberships,
    settings,
    privacyMode,
    todayHandled,
  } = useStore();

  const open = briefingTasks.filter(
    (t) => t.status === "pending" || t.status === "confirmed",
  );

  // ① 오늘 챙길 고객 — 가장 많은 관리 유형을 이유로 쓴다
  const byCategory = new Map<string, number>();
  for (const t of open) {
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + 1);
  }
  const topCategory = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
  const firstName = open[0]
    ? displayName(
        customers.find((c) => c.id === open[0].customerId)?.name ?? "",
        privacyMode,
      )
    : "";

  // ② 재등록 기회 — 이미 있는 집계를 그대로 읽는다
  const oppSummary = summarizeOpportunities(briefingTasks);
  const oppOpen = briefingTasks.filter(
    (t) => t.opportunity && t.opportunity.type !== "none" && t.status !== "done",
  );
  const oppHigh = oppOpen.filter((t) => t.opportunity?.level === "high").length;

  // ③ 이용권 임박 — 기준은 매장이 설정에서 정한 값
  const lowLimit = settings.careRules.membershipLowCount;
  const lowPasses = memberships.filter(
    (m) => m.status === "active" && m.remainingCount <= lowLimit,
  );
  const exhausted = memberships.filter(
    (m) => m.status === "active" && m.remainingCount === 0,
  ).length;

  return (
    <div className="rise-stagger grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
      <Decision
        tone="aqua"
        icon={<SparkIcon className="h-[1.15rem] w-[1.15rem]" />}
        label="오늘 챙길 고객"
        count={open.length}
        unit="명"
        quiet={open.length === 0}
        reason={
          open.length === 0
            ? todayHandled.length > 0
              ? `오늘 ${todayHandled.length}건을 모두 처리했습니다`
              : "지금 기준에 걸린 고객이 없습니다"
            : topCategory
              ? `${firstName ? firstName + " 님 외 " : ""}${TASK_CATEGORY_LABELS[topCategory[0] as keyof typeof TASK_CATEGORY_LABELS]} ${topCategory[1]}명이 가장 많습니다`
              : "관리 기준에 걸린 고객이 있습니다"
        }
        href="/briefing"
        cta={open.length === 0 ? "브리핑 열기" : "지금 처리하기"}
      />

      <Decision
        tone="gold"
        icon={<TrendUpIcon className="h-[1.15rem] w-[1.15rem]" />}
        label="재등록 상담 기회"
        count={oppOpen.length}
        unit="명"
        quiet={oppOpen.length === 0}
        reason={
          oppOpen.length === 0
            ? oppSummary.total > 0
              ? `이번 기회 ${oppSummary.total}건은 모두 상담을 마쳤습니다`
              : "재등록을 말씀드릴 자리가 아직 없습니다"
            : oppHigh > 0
              ? `이용권을 다 쓰셨거나 곧 끝나는 분이 ${oppHigh}명 포함되어 있습니다`
              : "이용 간격과 잔여 회차가 상담 기준에 닿았습니다"
        }
        href="/briefing"
        cta={oppOpen.length === 0 ? "기준 확인" : "대상 보기"}
      />

      <Decision
        tone="amber"
        icon={<TicketIcon className="h-[1.15rem] w-[1.15rem]" />}
        label={`이용권 ${lowLimit}회 이하`}
        count={lowPasses.length}
        unit="건"
        quiet={lowPasses.length === 0}
        reason={
          lowPasses.length === 0
            ? "잔여가 적은 이용권이 없습니다"
            : exhausted > 0
              ? `이 중 ${exhausted}건은 이미 다 쓰셨습니다 — 지금이 다시 말씀드릴 자리입니다`
              : "다음 방문 때 재등록을 함께 안내하시면 됩니다"
        }
        href="/customers?opportunity=1"
        cta={lowPasses.length === 0 ? "고객 목록" : "해당 고객 보기"}
      />
    </div>
  );
}
