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

function todayLabel(): string {
  const d = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

export default function DashboardPage() {
  const { settings } = useStore();
  return (
    <div>
      <PageHeader
        title="대시보드"
        description={`${todayLabel()} · ${settings.companyName} ${settings.branchName}`}
      />
      <div className="flex flex-col card-gap">
        {/* 고객이 한 명도 없을 때만 나오는 첫 시작 안내 */}
        <FirstRunCard />
        <div data-tour="dash-kpi">
          <KpiRow />
        </div>
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
      </div>
    </div>
  );
}
