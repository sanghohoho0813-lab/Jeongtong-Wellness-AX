"use client";

import PageHeader from "@/components/layout/PageHeader";
import KpiRow from "@/components/dashboard/KpiRow";
import FirstRunCard from "@/components/dashboard/FirstRunCard";
import BriefingPreview from "@/components/dashboard/BriefingPreview";
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
      <div className="flex flex-col card-gap">
        {/* 자리를 잡을 때까지만 나오는 첫 시작 안내 */}
        <FirstRunCard />
        <div data-tour="dash-kpi">
          <KpiRow />
        </div>
        {!justStarted && (
          <>
            <div className="rise-stagger grid grid-cols-1 card-gap xl:grid-cols-2">
              <BriefingPreview />
              <OpportunityCard />
            </div>
            <div className="rise-stagger grid grid-cols-1 card-gap xl:grid-cols-2">
              <BodyMapCard />
              <SegmentCard />
            </div>
            <div className="rise-stagger grid grid-cols-1 card-gap md:grid-cols-2">
              <RevisitPreview />
              <BranchSummaryCard />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
