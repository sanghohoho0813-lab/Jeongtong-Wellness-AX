"use client";

/**
 * 오늘 — 머리 띠
 * ==============
 *
 * 고객 앱(MY WELLNESS) 홈과 같은 딥그린 띠다. 대표님이 내부 화면을 보시고
 * 「거의 바뀐 게 없다」 고 하셨다 — 고객 앱은 배달 앱 모양으로 바뀌었는데,
 * 매일 아침 여는 이 화면은 여전히 「화면 제목 + 카드 넉 장」 이었다.
 *
 * 띠에는 세 가지만 둔다.
 *   1) 오늘이 며칠이고 어느 지점인지          (작은 글씨 한 줄)
 *   2) 오늘 먼저 챙길 분이 몇 명인지 — 문장으로 (가장 큰 글씨)
 *   3) 그중 몇 건을 처리했는지 — 막대 하나     (진행)
 * 그리고 지금 할 일 둘을 알약 단추로: 「챙길 고객 보기」 · 「방문 기록」.
 *
 * 띠 아래쪽은 비워 둔다(pb-14). 판단 칸 · 바로가기 판이 그 위에 걸쳐
 * 올라온다 — 고객 앱 홈의 바로가기 판과 같은 자리다.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/data/store";
import { useDocumentTitle } from "@/lib/utils/title";
import { monthDayKr, openStateAt } from "@/lib/utils/date";
import { openShell } from "@/lib/ui/shell-events";
import { ChevronRightIcon, PlusIcon } from "@/components/ui/icons";

const STATE_LABEL = {
  before: "영업 준비 중",
  open: "영업 중",
  closed: "영업 종료",
} as const;

export default function TodayHero() {
  useDocumentTitle("대시보드");
  const { briefingTasks, todayHandled, settings } = useStore();
  /* 날짜는 브라우저에서만 — 서버가 그린 것과 어긋나지 않게 */
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const state = now ? openStateAt(now, settings.openHours) : "unknown";

  const open = briefingTasks.filter(
    (t) => t.status === "pending" || t.status === "confirmed",
  ).length;
  /* 처리 건수는 이력에서 센다 (BriefingPreview 와 같은 이유) */
  const done = todayHandled.length;
  const total = open + done;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const headline =
    open > 0
      ? { lead: "오늘 먼저 챙길 분이", num: `${open}명`, tail: "있습니다" }
      : done > 0
        ? { lead: "오늘 챙길 분을", num: "모두", tail: "챙기셨습니다" }
        : { lead: "지금 기준에 걸린 분이", num: "없습니다", tail: "" };

  return (
    <section
      data-today-hero
      aria-labelledby="today-h"
      className="relative isolate overflow-hidden rounded-[24px] bg-gradient-to-br from-deep-800 via-deep-900 to-deep-950 px-5 pb-14 pt-5 text-white shadow-[0_18px_40px_-24px_rgba(10,46,44,0.7)] sm:px-6 lg:px-8 lg:pb-16 lg:pt-7"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-aqua-400/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-gold/10 blur-3xl"
      />

      <div className="relative flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] font-bold text-white/70">
        <h1 id="today-h" className="font-extrabold text-white">
          대시보드
        </h1>
        <span aria-hidden>·</span>
        <span className="nowrap-num">{now ? monthDayKr(now) : " "}</span>
        {settings.branchName && (
          <>
            <span aria-hidden className="hidden xs:inline">·</span>
            <span className="hidden truncate xs:inline">{settings.branchName}</span>
          </>
        )}
        {state !== "unknown" && (
          <span className="ml-auto shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-[0.75rem] font-extrabold text-aqua-200 ring-1 ring-white/15">
            {STATE_LABEL[state]}
          </span>
        )}
      </div>

      <div className="relative mt-3 lg:flex lg:items-end lg:justify-between lg:gap-10">
        <div className="min-w-0 flex-1">
          <p className="text-[1.375rem] font-extrabold leading-snug tracking-tight [word-break:keep-all] sm:text-[1.625rem]">
            {headline.lead}{" "}
            <span className="nowrap-num text-aqua-300">{headline.num}</span>
            {headline.tail && ` ${headline.tail}`}
          </p>

          {/* 오늘 처리 — 막대 하나 */}
          <div className="mt-3.5 max-w-xl">
            <p className="flex items-baseline gap-1.5 text-[0.875rem] font-bold text-white/70">
              오늘 처리
              <span className="nowrap-num tabular text-[1.125rem] font-extrabold text-white">
                {done}
              </span>
              <span className="nowrap-num">/ {total}건</span>
              <span className="nowrap-num ml-auto font-extrabold text-aqua-300">{pct}%</span>
            </p>
            <div
              role="progressbar"
              aria-label="오늘 처리한 비율"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className="mt-1.5 h-2 rounded-full bg-white/15"
            >
              <div
                className="h-2 rounded-full bg-gradient-to-r from-aqua-400 to-aqua-300 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 lg:mt-0 lg:shrink-0">
          <Link
            href="/briefing"
            className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-white px-4 text-[0.9375rem] font-extrabold text-deep-900 shadow-[0_4px_14px_rgba(0,0,0,0.18)] transition-colors hover:bg-aqua-50"
          >
            챙길 고객 보기
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => openShell("record")}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white/10 px-4 text-[0.9375rem] font-extrabold text-white ring-1 ring-white/25 transition-colors hover:bg-white/20"
          >
            <PlusIcon className="h-4 w-4" strokeWidth={2.6} />
            방문 기록
          </button>
        </div>
      </div>
    </section>
  );
}
