"use client";

import PageHeader from "@/components/layout/PageHeader";
import KpiRow from "@/components/dashboard/KpiRow";
import BriefingPreview from "@/components/dashboard/BriefingPreview";
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
        <KpiRow />
        <div className="rise-stagger grid grid-cols-1 card-gap xl:grid-cols-2">
          <BriefingPreview />
          <BodyMapCard />
        </div>
        <div className="rise-stagger grid grid-cols-1 card-gap md:grid-cols-2 xl:grid-cols-3">
          <SegmentCard />
          <RevisitPreview />
          <BranchSummaryCard />
        </div>
      </div>
    </div>
  );
}
