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
import { Hint } from "@/components/ui/Hint";
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
  reason: string;
  href: string;
  cta: string;
  /** 0 명일 때 — 숫자를 크게 쓰지 않고 조용히 넘어간다 */
  quiet?: boolean;
}) {
  const t = TONE[tone];
  return (
    /*
      작은 칸 셋을 **폰에서도 한 줄**에 세운다.

      예전에는 칸마다 라벨 · 큰 숫자 · 이유 두 줄 · 「지금 처리하기」 가
      있어서 폰에서 셋이 370px, PC 에서도 210px 이었다. 대표님 말씀:
      「오늘에 너무 많이 펼쳐져 있어서 오히려 집중이 안 된다.」

      그래서 칸에는 **이름 · 숫자 · 갈 곳(›)** 만 남긴다. 칸 전체가 누르는
      자리라 갈 곳은 그대로다. 「왜 그렇게 봤는지」 한 줄은
        - PC: 칸 아래 한 줄 (자리가 있다) + 마우스를 올리면 말풍선
        - 폰: 누르고 들어간 화면(브리핑)의 카드마다 이유가 있다
      로 옮겼다. 읽어 주는 프로그램에는 늘 같이 읽힌다(Hint).
    */
    <Hint text={reason} title={label}>
      <Link
        href={href}
        aria-label={`${label} ${count}${unit} — ${cta}`}
        style={{ "--rail": quiet ? "rgb(var(--c-line))" : t.rail } as never}
        className="rail card card-lift group flex min-w-0 flex-col !py-3 !pl-4 !pr-3 sm:!py-4 sm:!pl-5"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={`icon-pop hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 sm:flex ${
              quiet ? "bg-stone-bg-deep text-ink-faint ring-black/[0.04]" : t.tile
            }`}
          >
            {icon}
          </span>
          <span className="min-w-0 text-[0.8125rem] font-bold leading-tight text-ink-sub [word-break:keep-all] sm:text-[0.875rem]">
            {label}
          </span>
        </span>

        {/*
          숫자와 단위는 한 줄에 붙여 둔다. '4' 와 '명' 이 다른 줄로 찢어지면
          읽는 사람이 한 번 멈칫한다 (.nowrap-num).
        */}
        <span className="mt-1.5 flex items-end justify-between gap-1">
          <span className="nowrap-num tabular">
            <span
              className={`text-[1.75rem] font-extrabold leading-none tracking-tight sm:text-[2rem] ${
                quiet ? "text-ink-faint" : t.num
              }`}
            >
              {count}
            </span>
            <span className="ml-0.5 text-[0.9375rem] font-bold text-ink-sub">{unit}</span>
          </span>
          <span
            className={`mb-0.5 inline-flex shrink-0 items-center gap-0.5 text-[0.875rem] font-extrabold ${
              quiet ? "text-ink-faint" : t.cta
            }`}
          >
            <span className="hidden lg:inline">{cta}</span>
            <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </span>

        {/* 왜 그렇게 봤는지 — 자리가 있는 PC 에서만 한 줄 */}
        <span className="mt-1.5 hidden truncate text-[0.875rem] text-ink-sub md:block">
          {reason}
        </span>
      </Link>
    </Hint>
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
    <div data-decision-band className="rise-stagger grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
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
