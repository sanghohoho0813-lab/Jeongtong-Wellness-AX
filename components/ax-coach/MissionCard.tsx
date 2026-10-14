"use client";

/**
 * 오늘 이것만 해보세요 — Mission 카드 한 장
 * =========================================
 *
 * 「완료」 단추가 없다. 일부러 없다.
 *
 * 사람이 눌러서 채우는 체크리스트는 아무것도 증명하지 못한다. 이 카드가
 * 완료로 바뀌는 길은 하나뿐이다 — 업무 화면에서 실제로 일하고, 그
 * 기록이 남는 것. 그래서 단추는 업무 화면으로 보내는 것 하나뿐이고,
 * 그 아래에 "무엇이 생겨야 완료인지" 를 미리 적어 둔다.
 */

import Link from "next/link";
import type { CoachMissionView } from "@/lib/ax-coach/useCoach";
import { VERIFY_LABEL } from "@/lib/ax-coach/verify";
import { CheckIcon, ChevronRightIcon } from "@/components/ui/icons";
import { formatDateTimeKr } from "@/lib/utils/date";
import { Hint } from "@/components/ui/Hint";

export default function MissionCard({
  index,
  view,
}: {
  index: number;
  view: CoachMissionView;
}) {
  const { candidate: c, verified, verifiedAt } = view;

  return (
    <li
      data-coach-mission={c.type}
      data-verified={verified ? "1" : "0"}
      className={`rounded-card px-4 py-4 ring-1 sm:px-5 ${
        verified
          ? "bg-aqua-50/70 ring-aqua-200 dark:bg-aqua-500/10"
          : "bg-card ring-stone-line"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[1rem] font-extrabold ${
            verified
              ? "bg-aqua-500 text-white"
              : "bg-stone-bg-deep text-ink-soft"
          }`}
        >
          {verified ? <CheckIcon className="h-5 w-5" strokeWidth={2.6} /> : index}
        </span>

        {/*
          PC 에서는 단추를 줄 오른쪽에 — 제목 · 이유 · 완료 조건이 왼쪽에
          쌓이고 단추가 그 옆에 서면 카드 한 장이 190px → 120px 로 준다.
          폰에서는 그대로 아래에 (손가락이 닿는 너비).
        */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <div className="min-w-0 flex-1">
            <Hint text={c.why} title={c.title}>
              <h3 className="text-[1.125rem] font-extrabold leading-snug text-ink">
                {c.title}
              </h3>
            </Hint>
            {/* 왜 하는지 — PC 는 한 줄. 폰에서는 글을 줄이려고 뺀다 (완료 조건은 늘 보인다) */}
            <p className="mt-0.5 hidden text-[0.9375rem] leading-relaxed text-ink-soft sm:block">
              {c.why}
            </p>

            {verified ? (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[1rem] font-bold text-aqua-800">
                <CheckIcon className="h-5 w-5 shrink-0" strokeWidth={2.6} />
                {c.verified}
                {verifiedAt && (
                  <span className="nowrap-num font-medium text-ink-sub">
                    {formatDateTimeKr(verifiedAt.slice(0, 10), verifiedAt.slice(11, 16))}
                  </span>
                )}
              </p>
            ) : (
              <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-sub">
                {VERIFY_LABEL[c.verifyBy]} · {c.waiting}
              </p>
            )}
          </div>

          {/* 단추는 하나. 업무 화면으로 보낼 뿐, 여기서 완료 처리하지 않는다 */}
          {!verified && (
            <Link
              href={c.ctaHref}
              className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-1.5 self-start rounded-btn bg-gradient-to-b from-aqua-650 to-aqua-850 px-5 text-[1.0625rem] font-extrabold text-white shadow-[0_2px_8px_rgba(14,127,125,0.35)] transition-colors hover:from-aqua-850 hover:to-deep-700 sm:self-center"
            >
              {c.ctaLabel}
              <ChevronRightIcon className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}
