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
 * 띠 아래쪽에는 판단 칸 · 바로가기 판(panel)이 걸쳐 올라온다 — 고객 앱
 * 홈의 바로가기 판과 같은 자리다.
 *
 * 모양은 공통 머리 띠(StaffBand, D-57)를 그대로 쓴다. 처음에는 이 띠만
 * 따로 그렸는데, 형제 화면들이 같은 띠를 쓰게 되자 두 벌이 조금씩
 * 어긋났다(어두운 모드에서 영업 상태 알약 글자가 사라진 것이 이 띠
 * 쪽에만 남아 있었다). 한 곳에서만 고치도록 합쳤다 (D-58).
 */

import { ReactNode, useEffect, useState } from "react";
import { useStore } from "@/lib/data/store";
import { monthDayKr, openStateAt } from "@/lib/utils/date";
import { openShell } from "@/lib/ui/shell-events";
import { ChevronRightIcon, PlusIcon } from "@/components/ui/icons";
import StaffBand, {
  BandLink,
  BandPill,
  BandProgress,
  bandGhost,
} from "@/components/layout/StaffBand";

const STATE_LABEL = {
  before: "영업 준비 중",
  open: "영업 중",
  closed: "영업 종료",
} as const;

export default function TodayHero({
  panel,
  panelClassName,
}: {
  /** 띠에 걸쳐 올라오는 판 — 판단 세 칸 + 바로가기 네 칸 */
  panel?: ReactNode;
  panelClassName?: string;
}) {
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

  return (
    <StaffBand
      className="!mb-0"
      title="대시보드"
      data={{ "today-hero": "" }}
      meta={
        <>
          {now ? monthDayKr(now) : " "}
          {settings.branchName && (
            <span className="hidden xs:inline"> · {settings.branchName}</span>
          )}
        </>
      }
      badge={state !== "unknown" ? <BandPill>{STATE_LABEL[state]}</BandPill> : undefined}
      headline={
        open > 0 ? (
          <>
            오늘 먼저 챙길 분이 <span className="nowrap-num text-aqua-300">{open}명</span>{" "}
            있습니다
          </>
        ) : done > 0 ? (
          <>
            오늘 챙길 분을 <span className="text-aqua-300">모두</span> 챙기셨습니다
          </>
        ) : (
          <>
            지금 기준에 걸린 분이 <span className="text-aqua-300">없습니다</span>
          </>
        )
      }
      actions={
        <>
          <BandLink href="/briefing">
            챙길 고객 보기
            <ChevronRightIcon className="h-4 w-4" />
          </BandLink>
          <button type="button" onClick={() => openShell("record")} className={bandGhost}>
            <PlusIcon className="h-4 w-4" strokeWidth={2.6} />
            방문 기록
          </button>
        </>
      }
      panel={panel}
      panelClassName={panelClassName}
    >
      {/* 오늘 처리 — 막대 하나 */}
      <BandProgress label="오늘 처리" done={done} total={total} />
    </StaffBand>
  );
}
