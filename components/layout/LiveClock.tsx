"use client";

/**
 * 실시간 날짜 · 시계
 * ==================
 * 현장에서 방문을 기록할 때 "지금 몇 시더라"를 폰 잠금화면으로 확인하러
 * 나가는 일이 없도록, 화면 안에 날짜와 시각을 초 단위로 띄운다.
 * 영업 중인지도 함께 보여 준다 — 마감 시간이 가까우면 오늘 남은 일을
 * 서두를지 판단하는 데 쓰인다.
 *
 * 서버에서 미리 그려 둔 시각과 브라우저의 시각은 다를 수밖에 없어서,
 * 처음 한 번은 빈 자리로 그린 뒤 브라우저에서 채운다(자리 크기는 미리 잡아 둔다).
 * 그렇게 하지 않으면 화면이 잠깐 어긋났다가 다시 그려진다.
 */

import { useEffect, useState } from "react";
import { useStore } from "@/lib/data/store";
import {
  clockText,
  clockTextKr,
  fullDateKr,
  monthDayKr,
  openStateAt,
  type OpenState,
} from "@/lib/utils/date";

const STATE_LABEL: Record<Exclude<OpenState, "unknown">, string> = {
  before: "영업 준비 중",
  open: "영업 중",
  closed: "영업 종료",
};

const STATE_STYLE: Record<Exclude<OpenState, "unknown">, string> = {
  before: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
  open: "bg-emerald-50 text-positive-text ring-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  closed: "bg-stone-bg-deep text-ink-sub ring-black/[0.04]",
};

/** 1초마다 다시 그리는 현재 시각 (브라우저에서만) */
function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export default function LiveClock({
  variant = "sidebar",
}: {
  /** sidebar: PC 왼쪽 메뉴 / header: 폰 위쪽 제목줄 아래 */
  variant?: "sidebar" | "header";
}) {
  const { settings } = useStore();
  const now = useNow();
  const state = now ? openStateAt(now, settings.openHours) : "unknown";

  // ---------- 폰 헤더 ----------
  if (variant === "header") {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 leading-none">
        {/* 폰 제목줄 — 연도를 빼 한 줄에 담는다 (글자 크게 설정에서도) */}
        <span className="nowrap-num text-sm font-bold text-ink-soft">
          {now ? monthDayKr(now) : " "}
        </span>
        <span
          className="nowrap-num text-base font-extrabold tabular tracking-tight text-deep-800 dark:text-aqua-700"
          aria-label={now ? `현재 시각 ${clockTextKr(now)}` : undefined}
        >
          {now ? clockText(now) : "  :  :  "}
        </span>
        {state !== "unknown" && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-extrabold ring-1 ${STATE_STYLE[state]}`}
          >
            {STATE_LABEL[state]}
          </span>
        )}
      </div>
    );
  }

  // ---------- PC 사이드바 ----------
  return (
    <div className="rounded-card bg-card-soft px-3 py-2.5 ring-1 ring-black/[0.04]">
      <div className="flex items-baseline justify-between gap-2">
        <p className="nowrap-num min-w-0 truncate text-xs font-bold text-ink-sub">
          {now ? fullDateKr(now) : " "}
        </p>
        {state !== "unknown" && (
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[0.625rem] font-extrabold ring-1 ${STATE_STYLE[state]}`}
          >
            {STATE_LABEL[state]}
          </span>
        )}
      </div>
      <p
        className="nowrap-num mt-0.5 text-2xl font-extrabold tabular leading-none tracking-tight text-ink"
        aria-label={now ? `현재 시각 ${clockTextKr(now)}` : undefined}
      >
        {now ? clockText(now) : "  :  :  "}
      </p>
      {settings.openHours && (
        <p className="nowrap-num mt-1 truncate text-[0.6875rem] text-ink-faint">
          영업 {settings.openHours}
        </p>
      )}
    </div>
  );
}
