"use client";

/**
 * 대시보드에서 AX 코치로 들어가는 자리
 * =====================================
 *
 * 메뉴에도 있지만, 60대 사용자는 아침에 대시보드만 열고 하루를 시작한다.
 * "코치라는 게 있다" 를 알리는 자리가 첫 화면에 한 줄 필요하다.
 *
 * 여기서는 준비도 숫자와 오늘 할 일 **하나**만 보여 준다. 세 개를 다
 * 옮겨 놓으면 코치 화면을 두 번 만든 셈이고, 첫 화면은 그만큼 길어진다.
 */

import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { ChevronRightIcon, CompassIcon } from "@/components/ui/icons";
import { useCoach } from "@/lib/ax-coach/useCoach";

export default function CoachEntryCard() {
  const { ready, coverage, missions, todayIssued, todayVerified } = useCoach();
  if (!ready) return null;

  const first = missions.find((m) => !m.verified);
  const allDone = todayIssued.length > 0 && todayVerified === todayIssued.length;

  return (
    /*
      한 줄짜리 자리 — 줄 전체가 코치 화면으로 가는 단추다.
      예전에는 폰에서 아이콘 · 두 줄 글 · 큰 「AX 코치 열기」 단추로 190px
      이었다. 갈 곳은 그대로 두고, 높이만 한 줄로 줄였다.
    */
    <Card dataTour="coach-entry" className="!py-0">
      <Link href="/coach" className="group flex min-h-[64px] items-center gap-3 py-2.5">
        {/* 폰에서는 아이콘을 빼서 글이 한 줄에 들어갈 자리를 만든다 */}
        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold-deep ring-1 ring-gold/20 sm:flex">
          <CompassIcon className="h-5 w-5" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[1.0625rem] font-extrabold text-ink">AX 코치</span>
            <span className="nowrap-num text-[0.9375rem] text-ink-sub">
              실증 준비도{" "}
              <b className="text-ink">
                {coverage.overall === null ? "아직 측정 전" : `${coverage.overall}%`}
              </b>
            </span>
            {todayIssued.length > 0 && (
              <span className="hidden sm:inline-flex">
                <Badge tone={allDone ? "positive" : "gray"} dot>
                  오늘 {todayIssued.length}개 중 {todayVerified}개 완료
                </Badge>
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-[0.9375rem] text-ink-sub">
            {/* 폰 — 완료 수는 배지 대신 둘째 줄 앞에 짧게 */}
            {todayIssued.length > 0 && (
              <b className="nowrap-num font-bold text-ink-soft sm:hidden">
                {todayVerified}/{todayIssued.length} 완료 ·{" "}
              </b>
            )}
            {allDone
              ? "오늘 할 일을 모두 마치셨습니다."
              : first
                ? first.candidate.title
                : "오늘 따로 챙길 것이 없습니다."}
          </span>
        </span>

        {/* 폰에서는 「열기」 만 — 읽어 주는 프로그램에는 늘 「AX 코치 열기」 */}
        <span className="inline-flex shrink-0 items-center gap-0.5 text-[0.9375rem] font-extrabold text-ink-soft transition-colors group-hover:text-aqua-800">
          <span className="sr-only sm:not-sr-only">AX 코치 </span>열기
          <ChevronRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </Card>
  );
}
