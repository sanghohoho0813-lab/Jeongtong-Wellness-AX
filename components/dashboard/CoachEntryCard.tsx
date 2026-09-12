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
    <Card dataTour="coach-entry">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold-deep ring-1 ring-gold/20">
          <CompassIcon className="h-6 w-6" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[1.0625rem] font-extrabold text-ink">AX 코치</span>
            <span className="nowrap-num text-[0.9375rem] text-ink-sub">
              실증 준비도{" "}
              <b className="text-ink">
                {coverage.overall === null ? "아직 측정 전" : `${coverage.overall}%`}
              </b>
            </span>
            {todayIssued.length > 0 && (
              <Badge tone={allDone ? "positive" : "gray"} dot>
                오늘 {todayIssued.length}개 중 {todayVerified}개 완료
              </Badge>
            )}
          </p>
          <p className="mt-1 text-[1rem] leading-relaxed text-ink-soft">
            {allDone
              ? "오늘 할 일을 모두 마치셨습니다."
              : first
                ? first.candidate.title
                : "오늘 따로 챙길 것이 없습니다."}
          </p>
        </div>

        <Link
          href="/coach"
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-1 rounded-btn bg-card-soft px-5 text-[1rem] font-extrabold text-ink-soft ring-1 ring-stone-line transition-colors hover:bg-aqua-50 hover:text-aqua-800 sm:w-auto"
        >
          AX 코치 열기
          <ChevronRightIcon className="h-5 w-5" />
        </Link>
      </div>
    </Card>
  );
}
