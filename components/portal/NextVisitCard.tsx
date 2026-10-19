"use client";

/**
 * 다음 방문 카드 — 배달 앱의 주문 추적 카드처럼
 * ===========================================
 *
 *   다음 방문 예정            [D-6]
 *   2026.10.25 (일)
 *   ●━━━━━━━━━━○──────  지난 방문 10/11 · 오늘 · 다음 10/25
 *   [ 예약 변경 요청   › ]
 *
 * 진행선의 양 끝은 지어낸 값이 아니다 — 마지막 이용일과, 매장이 잡아 둔
 * 다음 관리 예정일(없으면 평균 간격으로 계산한 참고일)이다. 오늘이 그
 * 사이 어디쯤인지를 점으로 보여 줄 뿐, 「오셔야 합니다」 라고 말하지 않는다.
 */

import { ChevronRightIcon } from "@/components/ui/icons";
import { daysAgo, diffDays, formatDateShort, formatDateWithDay, todayISO } from "@/lib/utils/date";
import { PillLink, StatusPill } from "@/components/portal/kit";

export default function NextVisitCard({
  date,
  fromStore,
  lastDate,
  cta,
  basis,
  tone = "solid",
}: {
  date?: string;
  fromStore: boolean;
  lastDate?: string;
  /** 카드 아래 단추 — 화면 아래 고정 단추가 같은 곳으로 가면 생략 */
  cta?: { href: string; label: string };
  /** 날짜가 어떻게 나왔는지 한 줄 더 (예약 화면) */
  basis?: string;
  /** glass — 홈의 딥그린 머리 띠 안에 놓일 때 (바탕이 이미 짙다) */
  tone?: "solid" | "glass";
}) {
  const left = date ? -daysAgo(date) : undefined; // 남은 날 (지나면 음수)
  const dLabel =
    left === undefined
      ? undefined
      : left > 0
        ? `D-${left}`
        : left === 0
          ? "오늘"
          : `${-left}일 지남`;

  /* 진행선 — 지난 방문일이 있고 다음 날짜가 그 뒤일 때만 그린다 */
  let pct: number | undefined;
  if (date && lastDate && date > lastDate) {
    const span = diffDays(date, lastDate);
    const passed = diffDays(todayISO(), lastDate);
    pct = Math.max(0, Math.min(100, Math.round((passed / span) * 100)));
  }

  return (
    <section
      data-next-visit
      className={`relative overflow-hidden rounded-[22px] p-5 text-white ${
        tone === "glass"
          ? "bg-white/[0.07] ring-1 ring-white/15"
          : "bg-gradient-to-br from-deep-800 to-deep-950 shadow-hero ring-1 ring-gold/20"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.8125rem] font-extrabold tracking-wide text-gold">
            다음 방문 예정
          </p>
          {date ? (
            <>
              <p className="nowrap-num tabular mt-1 text-[1.5rem] font-extrabold leading-tight">
                {formatDateWithDay(date)}
              </p>
              <p className="mt-1 text-[0.875rem] leading-snug text-white/75">
                {left !== undefined && left < 0
                  ? "예정일이 지났어요. 편하신 날짜를 알려 주세요."
                  : fromStore
                    ? "매장에서 안내드린 날짜입니다"
                    : "지금까지의 이용 간격으로 계산한 참고일입니다"}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-[1.25rem] font-extrabold leading-tight">
                아직 잡히지 않았어요
              </p>
              <p className="mt-1 text-[0.875rem] leading-snug text-white/75">
                원하시는 날짜를 남겨 주시면 매장에서 확인 후 연락드립니다.
              </p>
            </>
          )}
        </div>
        {dLabel && (
          <StatusPill tone="onDark" className="!text-[0.875rem]">
            {dLabel}
          </StatusPill>
        )}
      </div>

      {pct !== undefined && lastDate && date && (
        <div
          className="mt-4"
          role="img"
          aria-label={`지난 방문 ${formatDateShort(lastDate)}부터 다음 방문 ${formatDateShort(date)}까지 중 오늘은 ${pct}% 지점`}
        >
          <div className="relative h-2 rounded-full bg-white/15">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-aqua-400 to-gold"
              style={{ width: `${pct}%` }}
            />
            <span
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow ring-4 ring-aqua-400/35"
              style={{ left: `${pct}%` }}
            />
          </div>
          <div className="nowrap-num mt-2 flex items-center justify-between text-[0.8125rem] text-white/70">
            <span>지난 방문 {formatDateShort(lastDate)}</span>
            <span className="font-extrabold text-white">오늘</span>
            <span>다음 {formatDateShort(date)}</span>
          </div>
        </div>
      )}

      {basis && (
        <p className="mt-3 rounded-2xl bg-white/[0.07] px-3.5 py-2.5 text-[0.875rem] leading-relaxed text-white/75 ring-1 ring-white/10">
          {basis}
        </p>
      )}

      {cta && (
        <PillLink href={cta.href} tone="onDark" full between className="mt-4">
          <span>{cta.label}</span>
          <ChevronRightIcon className="h-5 w-5" />
        </PillLink>
      )}
    </section>
  );
}

