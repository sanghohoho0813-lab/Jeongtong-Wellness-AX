"use client";

import { useStore } from "@/lib/data/store";
import { calcDashboardKpis, calcMonthlyMetrics } from "@/lib/scoring/metrics";
import { daysAgo } from "@/lib/utils/date";
import { formatKrw } from "@/lib/utils/format";
import { KpiCard, MiniBars } from "@/components/ui";
import {
  CalendarIcon,
  LeafIcon,
  TrendUpIcon,
  UsersIcon,
} from "@/components/ui/icons";

export default function KpiRow() {
  const { customers, visits, memberships, settings, isManager, briefingTasks } =
    useStore();
  const kpis = calcDashboardKpis(
    customers,
    visits,
    memberships,
    settings.careRules,
  );
  const monthly = calcMonthlyMetrics(customers, visits, memberships, 6);

  // 보조 지표 (모두 실데이터)
  const consults7d = visits.filter(
    (v) => v.type === "consult" && daysAgo(v.visitedAt) <= 7,
  ).length;
  const overdue = customers.filter(
    (c) => c.nextManageDate && daysAgo(c.nextManageDate) > 0,
  ).length;
  const visits7d = visits.filter(
    (v) => v.type === "visit" && daysAgo(v.visitedAt) <= 7,
  ).length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <KpiCard
        label="오늘 신규 상담"
        value={kpis.todayNewConsults}
        unit="명"
        sub={`최근 7일 상담 ${consults7d}건`}
        icon={<UsersIcon className="h-5 w-5" />}
        tint="sky"
      />
      <KpiCard
        label="재방문 예정 고객"
        value={kpis.revisitDueCount}
        unit="명"
        sub={
          overdue > 0 ? (
            <span className="font-bold text-danger">
              관리일 경과 {overdue}명
            </span>
          ) : (
            "관리일 경과 없음"
          )
        }
        icon={<CalendarIcon className="h-5 w-5" />}
      />
      <KpiCard
        label="오늘 방문 완료"
        value={kpis.todayVisits}
        unit="건"
        sub={`최근 7일 방문 ${visits7d}건`}
        icon={<LeafIcon className="h-5 w-5" />}
        tint="emerald"
      />
      {isManager ? (
        <KpiCard
          label="월 매출 (누적)"
          value={formatKrw(kpis.monthRevenue)}
          sub="최근 6개월 추이"
          chart={<MiniBars values={monthly.map((m) => m.revenue)} />}
          icon={<TrendUpIcon className="h-5 w-5" />}
          tint="amber"
        />
      ) : (
        // 직원 계정: 매출 대신 오늘의 관리 대상 표시
        <KpiCard
          label="오늘 관리 대상"
          value={
            briefingTasks.filter(
              (t) => t.status === "pending" || t.status === "confirmed",
            ).length
          }
          unit="명"
          sub={`처리완료 ${briefingTasks.filter((t) => t.status === "done").length}건`}
          icon={<TrendUpIcon className="h-5 w-5" />}
          tint="amber"
        />
      )}
    </div>
  );
}
