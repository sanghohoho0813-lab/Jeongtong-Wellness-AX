"use client";

/**
 * 예정 일정 — 이번 주 줄 + 그날 오실 분 (D-62)
 * ===========================================
 *
 * 다음 관리 예정일은 날짜와 시각(오전/오후 몇 시)까지 잡는다. 그런데
 * 첫 화면의 「재방문 예정 고객」 은 날짜만 섞인 목록이었다 — 오늘 오후
 * 두 시에 누가 오시는지, 내일은 몇 분인지를 보려면 한 분씩 열어야 했다.
 * 예약 앱의 「이번 주 줄 + 그날 시간표」 로 바꾼다.
 *
 *   위    지난 예정(아직 안 오신 분) · 오늘부터 7일 날짜 칩 (그날 몇 분)
 *   아래  고른 날의 분들을 시각 순으로 — 이름 · 연락처 · [기록]
 *
 * 매장이 잡아 둔 날짜 · 시각만 쓴다 (화면이 일정을 지어내지 않는다).
 * 잡아 둔 분이 한 분도 없으면 그리지 않는다 — 전체는 재방문 관리 화면에.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/data/store";
import { displayName, displayPhone } from "@/lib/utils/format";
import { daysFromToday, formatTimeKr, todayISO, weekdayKr } from "@/lib/utils/date";
import { openShell } from "@/lib/ui/shell-events";
import { CalendarIcon, ChevronRightIcon, PlusIcon } from "@/components/ui/icons";

const DAYS = 7;

export default function ScheduleCard() {
  const { customers, derivedById, privacyMode, canSeePhone } = useStore();
  const today = todayISO();
  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => daysFromToday(i)), []);

  const { byDay, overdue } = useMemo(() => {
    const byDay = new Map<string, typeof customers>();
    const overdue: typeof customers = [];
    for (const c of customers) {
      const d = c.nextManageDate?.slice(0, 10);
      if (!d) continue;
      if (d < today) {
        /* 예정일 뒤에 이미 다녀가셨으면 지난 예정이 아니다 */
        const last = derivedById.get(c.id)?.lastVisitDate?.slice(0, 10) ?? "";
        if (last < d) overdue.push(c);
      } else if (d <= days[DAYS - 1]) {
        byDay.set(d, [...(byDay.get(d) ?? []), c]);
      }
    }
    for (const list of byDay.values()) {
      list.sort((a, b) => (a.nextManageTime ?? "99").localeCompare(b.nextManageTime ?? "99"));
    }
    overdue.sort((a, b) => (b.nextManageDate ?? "").localeCompare(a.nextManageDate ?? ""));
    return { byDay, overdue };
  }, [customers, derivedById, today, days]);

  const firstWithPeople = days.find((d) => byDay.has(d));
  const [picked, setPicked] = useState<string | "overdue" | null>(null);
  const sel = picked ?? (byDay.has(today) ? today : firstWithPeople ?? (overdue.length ? "overdue" : today));

  if (byDay.size === 0 && overdue.length === 0) return null;

  const list = sel === "overdue" ? overdue : byDay.get(sel) ?? [];
  const total = [...byDay.values()].reduce((n, l) => n + l.length, 0);

  return (
    <section
      id="schedule"
      data-schedule
      aria-labelledby="schedule-title"
      className="scroll-mt-24 overflow-hidden rounded-[20px] bg-card shadow-card ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-4 sm:px-5">
        <h2 id="schedule-title" className="flex items-center gap-2 text-[1.0625rem] font-extrabold text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-aqua-50 text-aqua-800 ring-1 ring-aqua-100 dark:bg-aqua-500/10 dark:text-aqua-300 dark:ring-aqua-500/20">
            <CalendarIcon className="h-[1.1rem] w-[1.1rem]" />
          </span>
          예정 일정
          <span className="nowrap-num text-[0.875rem] font-bold text-ink-sub">이번 주 {total}명</span>
        </h2>
        <Link
          href="/retention"
          className="touch-target inline-flex shrink-0 items-center gap-0.5 text-sm font-bold text-aqua-700 hover:text-aqua-800 dark:text-aqua-300"
        >
          전체
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </div>

      {/* 날짜 줄 — 오늘부터 7일 · 그날 몇 분 */}
      <div role="tablist" aria-label="날짜 고르기" className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 pt-2 sm:px-5">
        {overdue.length > 0 && (
          <button
            type="button"
            role="tab"
            aria-selected={sel === "overdue"}
            data-schedule-day="overdue"
            onClick={() => setPicked("overdue")}
            className={`press flex min-h-[3.75rem] shrink-0 flex-col items-center justify-center rounded-2xl px-3 ring-1 ${
              sel === "overdue"
                ? "bg-danger text-white ring-transparent"
                : "bg-red-50 text-danger-text ring-danger/20 dark:bg-red-400/10"
            }`}
          >
            <span className="text-[0.75rem] font-bold">지난 예정</span>
            <span className="nowrap-num text-[1.125rem] font-extrabold leading-tight">{overdue.length}명</span>
          </button>
        )}
        {days.map((d, i) => {
          const n = byDay.get(d)?.length ?? 0;
          const on = sel === d;
          const wd = weekdayKr(d);
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={`${i === 0 ? "오늘" : i === 1 ? "내일" : `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일 ${wd}요일`} ${n}명`}
              data-schedule-day={d}
              onClick={() => setPicked(d)}
              className={`press relative flex min-h-[3.75rem] w-[3.25rem] shrink-0 flex-col items-center justify-center rounded-2xl ring-1 ${
                on
                  ? "bg-sel text-sel-ink ring-transparent"
                  : n
                    ? "bg-card text-ink ring-stone-line hover:bg-aqua-50"
                    : "bg-card-soft text-ink-faint ring-stone-line"
              }`}
            >
              <span className={`text-[0.75rem] font-bold ${on ? "" : wd === "일" ? "text-danger-text" : wd === "토" ? "text-aqua-700" : ""}`}>
                {i === 0 ? "오늘" : i === 1 ? "내일" : wd}
              </span>
              <span className="nowrap-num tabular text-[1.125rem] font-extrabold leading-tight">
                {Number(d.slice(8, 10))}
              </span>
              {n > 0 && (
                <span
                  className={`nowrap-num absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[0.6875rem] font-extrabold ring-2 ring-card ${
                    on ? "bg-white text-deep-900" : "bg-aqua-600 text-white"
                  }`}
                >
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 그날 오실 분 — 시각 순 */}
      {list.length === 0 ? (
        <p className="border-t border-stone-line px-4 py-5 text-center text-[0.9375rem] text-ink-sub sm:px-5">
          이날 잡아 둔 분이 없습니다.
        </p>
      ) : (
        <ul role="tabpanel" className="divide-y divide-stone-line border-t border-stone-line">
          {list.map((c) => (
            <li key={c.id} data-schedule-row className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <span className="nowrap-num w-[4.5rem] shrink-0 text-[0.875rem] font-extrabold text-deep-800 dark:text-aqua-300">
                {sel === "overdue"
                  ? `${Number(c.nextManageDate!.slice(5, 7))}/${Number(c.nextManageDate!.slice(8, 10))}`
                  : formatTimeKr(c.nextManageTime) || "시간 미정"}
              </span>
              <Link href={`/customers/${c.id}`} className="min-w-0 flex-1">
                <span className="block truncate text-[1rem] font-bold text-ink">
                  {displayName(c.name, privacyMode)}
                </span>
                {canSeePhone && c.phone && (
                  <span className="nowrap-num block truncate text-[0.8125rem] text-ink-sub">
                    {displayPhone(c.phone, canSeePhone)}
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={() => openShell("recordFor", c.id)}
                aria-label={`${displayName(c.name, privacyMode)} 방문 기록`}
                className="press touch-target inline-flex shrink-0 items-center gap-1 rounded-full bg-aqua-50 px-3.5 text-[0.875rem] font-extrabold text-aqua-800 ring-1 ring-aqua-100 hover:bg-aqua-100 dark:bg-aqua-500/10 dark:text-aqua-300 dark:ring-aqua-500/20"
              >
                <PlusIcon className="h-4 w-4" strokeWidth={2.6} />
                기록
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
