"use client";

import PageHeader from "@/components/layout/PageHeader";
import KpiRow from "@/components/dashboard/KpiRow";
import FirstRunCard from "@/components/dashboard/FirstRunCard";
import BriefingPreview from "@/components/dashboard/BriefingPreview";
import CustomerInboxCard from "@/components/dashboard/CustomerInboxCard";
import OpportunityCard from "@/components/dashboard/OpportunityCard";
import BodyMapCard from "@/components/dashboard/BodyMapCard";
import SegmentCard from "@/components/dashboard/SegmentCard";
import RevisitPreview from "@/components/dashboard/RevisitPreview";
import BranchSummaryCard from "@/components/dashboard/BranchSummaryCard";
import { useStore } from "@/lib/data/store";

export default function DashboardPage() {
  const { settings, customers, visits } = useStore();
  /**
   * 아직 아무것도 쌓이지 않은 상태.
   *
   * 실제 운영을 막 시작하면 이 화면의 카드가 전부 0 이 된다. 그때
   * 빈 카드 일곱 장을 그대로 늘어놓으면 "무엇을 해야 하는지"가 0 들 사이에
   * 묻힌다. 그래서 그때는 시작 안내만 남기고 나머지는 접어 둔다.
   * (고객이 생기고 방문이 한 건이라도 기록되면 원래대로 돌아온다)
   */
  const justStarted = customers.length === 0 || visits.length === 0;

  return (
    <div>
      {/* 날짜는 위(폰)·왼쪽(PC)의 실시간 시계가 이미 보여 준다 — 여기서 또 쓰지 않는다 */}
      <PageHeader
        title="대시보드"
        description={`${settings.companyName} ${settings.branchName}`}
      />
      {/*
        순서에 담은 뜻.

        여태 이 화면은 숫자카드 넉 장으로 시작했다. 그런데 아침에 이 화면을
        여는 이유는 "몇 명인지" 를 세려는 게 아니라 "오늘 누구를 챙기지" 를
        정하려는 것이다. 숫자가 맨 위에 있으면 그 답은 한 화면 아래로 밀린다.

        그래서 **해야 할 일 → 챙길 사람 → 그다음 현황** 순으로 놓았다.
        위쪽 셋은 오늘 손이 가야 하는 것들이고, '오늘의 현황' 아래는
        확인하고 지나가는 참고 자료다. 그 경계를 선 하나로 눈에 보이게 했다.
      */}
      <div className="flex flex-col card-gap">
        {/*
          고객이 남긴 것 — 밖에서 들어온 일이라 오늘 안에 답해야 한다.
          남길 것이 없으면 스스로 숨으므로 자리를 차지하지 않는다.
        */}
        <CustomerInboxCard />
        {justStarted ? (
          <>
            {/* 아직 아무것도 없을 때는 시작 안내가 곧 오늘 할 일이다 */}
            <FirstRunCard />
            <div data-tour="dash-kpi">
              <KpiRow />
            </div>
          </>
        ) : (
          <>
            {/* ① 오늘 해야 할 일 — 화면 폭을 다 준다 */}
            <div className="rise-stagger">
              <BriefingPreview />
            </div>
            {/* ② 오늘 챙길 사람 — 매출기회 · 재방문 */}
            <div className="rise-stagger grid grid-cols-1 card-gap xl:grid-cols-2">
              <OpportunityCard />
              <RevisitPreview />
            </div>
            {/*
              도입 안내는 '오늘 할 일' 이 아니라 '자리 잡는 법' 이다.
              기록이 쌓이기 시작한 뒤에도 맨 위에 두었더니 네 단계짜리
              체크리스트가 첫 화면을 통째로 차지해, 정작 오늘의 브리핑이
              한 화면 아래로 밀렸다. 네 단계를 마치면 스스로 사라진다.
            */}
            <FirstRunCard />

            {/* ③ 여기부터는 확인하고 지나가는 자리 */}
            <div className="flex items-center gap-3 pt-1">
              <span className="shrink-0 text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-ink-faint">
                오늘의 현황
              </span>
              <span className="h-px flex-1 bg-stone-line" />
            </div>
            <div data-tour="dash-kpi">
              <KpiRow />
            </div>
            <div className="rise-stagger grid grid-cols-1 card-gap xl:grid-cols-2">
              <BodyMapCard />
              <div className="flex flex-col card-gap">
                <SegmentCard />
                <BranchSummaryCard />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
